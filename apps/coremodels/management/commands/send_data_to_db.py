import os
import pandas as pd
from django.core.management.base import BaseCommand
from django.apps import apps
from django.db import transaction, IntegrityError
from decimal import Decimal
from datetime import datetime
import re
from django.db.models import Q

class Command(BaseCommand):
    help = 'Importa dados de um arquivo CSV para o modelo ItemVenda'

    # Mantemos os mesmos mapeamentos de colunas e campos obrigatórios
    UNIQUE_FIELDS = {'ItemVenda': ['venda', 'produto', 'origem']}
    REQUIRED_FIELDS = {'ItemVenda': ['venda', 'produto', 'quantidade_produto', 'valor_total', 'valor_desconto', 'frete',
                                     'preco_final']}
    COLUMN_MAPPINGS = {
        'ItemVenda': {
            'número': 'venda',
            'nome do cliente': 'cliente',
            'vendedor': 'nome',
            'código (sku)': 'produto',
            'quantidade de produtos': 'quantidade_produto',
            'preço total': 'valor_total',
            'preço unitário': 'valor_desconto',
            'frete pago pelo cliente': 'frete',
            'valor total da venda': 'preco_final',
            'origem': 'origem',
        }
    }

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Caminho para o arquivo CSV a ser importado')

    def handle(self, *args, **kwargs):
        csv_file = kwargs['csv_file']
        model = self.get_model('ItemVenda')
        mapping = self.get_column_mapping(model)

        if not mapping:
            return

        df = self.load_csv(csv_file)
        self.validate_csv_columns(df, mapping)

        with transaction.atomic():
            related_caches = self.prepare_related_caches(df, mapping)
            new_records, updated_records = self.prepare_records(df, mapping, related_caches, model)

            # Bulk create and update the records
            self.bulk_create_new_records(model, new_records)
            self.bulk_update_existing_records(model, updated_records)

    def get_model(self, model_name):
        try:
            return apps.get_model('coremodels', model_name)
        except LookupError:
            return None

    def get_column_mapping(self, model):
        return self.COLUMN_MAPPINGS.get(model.__name__)

    def load_csv(self, csv_file):
        try:
            df = pd.read_csv(csv_file, encoding='utf-8', low_memory=False)
            df.columns = [col.lower() for col in df.columns]  # Padronizar colunas
            return df
        except Exception as e:
            raise

    def validate_csv_columns(self, df, mapping):
        missing_cols = [col for col in mapping if col not in df.columns]
        if missing_cols:
            raise ValueError(f'Colunas faltando no CSV: {", ".join(missing_cols)}')

    def prepare_related_caches(self, df, mapping):
        # Pré-carregar caches de clientes, vendas, vendedores e produtos
        related_models = {
            'Clientes': apps.get_model('coremodels', 'Clientes'),
            'Vendas': apps.get_model('coremodels', 'Vendas'),
            'Vendedores': apps.get_model('coremodels', 'Vendedores'),
            'Produtos': apps.get_model('coremodels', 'Produtos'),
        }

        caches = {
            'clientes_cache': self.load_cache(related_models['Clientes'], 'nome', 'origem'),
            'vendas_cache': self.load_cache(related_models['Vendas'], 'numero_venda_original', 'origem'),
            'vendedores_cache': self.load_cache(related_models['Vendedores'], 'nome'),
            'produtos_cache': self.load_cache(related_models['Produtos'], 'codigo'),
        }

        return caches

    def load_cache(self, model, *fields):
        """Carrega o cache com base nos campos fornecidos."""
        queryset = model.objects.all()
        if len(fields) == 2:
            return {f"{getattr(obj, fields[0])}|{getattr(obj, fields[1])}".lower(): obj for obj in queryset}
        else:
            return {getattr(obj, fields[0]): obj for obj in queryset}

    def prepare_records(self, df, mapping, caches, model):
        new_records = []
        updated_records = []

        for index, row in df.iterrows():
            venda_key = f"{str(row['número']).strip().lower()}|{str(row['origem']).strip().lower()}"
            cliente_key = f"{str(row['nome do cliente']).strip().lower()}|{str(row['origem']).strip().lower()}"
            produto_key = str(row['código (sku)']).strip()
            vendedor_key = str(
                row['vendedor']).strip().capitalize()  # Certifique-se de que o nome do vendedor esteja em minúsculas

            # Tentar obter os objetos do cache
            venda = caches['vendas_cache'].get(venda_key)
            cliente = caches['clientes_cache'].get(cliente_key)
            produto = caches['produtos_cache'].get(produto_key)
            vendedor = caches['vendedores_cache'].get(vendedor_key)  # Buscar o vendedor pelo nome no cache

            if not venda or not cliente or not produto:
                continue  # Pular registros incompletos

            data = {
                'venda': venda,
                'cliente': cliente,
                'vendedor': vendedor,  # Atribuir o vendedor ao registro
                'produto': produto,
                'quantidade_produto': row['quantidade de produtos'],
                'valor_total': self.clean_numeric(row['preço total']),
                'valor_desconto': self.clean_numeric(row['preço unitário']),
                'frete': self.clean_numeric(row['frete pago pelo cliente']),
                'preco_final': self.clean_numeric(row['valor total da venda']),
                'origem': row['origem'],
            }

            unique_key = f'{venda.id}_{produto.codigo}'
            if unique_key in caches.get('existing_objects', {}):
                existing_obj = caches['existing_objects'][unique_key]
                for field, value in data.items():
                    setattr(existing_obj, field, value)
                updated_records.append(existing_obj)
            else:
                new_records.append(model(**data))

        return new_records, updated_records

    def clean_numeric(self, value):
        value = re.sub(r'[^\d.,-]', '', str(value)).replace(',', '.')
        try:
            return Decimal(value)
        except:
            return None

    def bulk_create_new_records(self, model, new_records):
        if new_records:
            model.objects.bulk_create(new_records, batch_size=500, ignore_conflicts=True)

    def bulk_update_existing_records(self, model, updated_records):
        if updated_records:
            fields = [f.name for f in model._meta.fields if f.name != model._meta.pk.name]
            model.objects.bulk_update(updated_records, fields=fields, batch_size=500)
