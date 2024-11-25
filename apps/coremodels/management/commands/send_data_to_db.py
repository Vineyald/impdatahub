import os
import pandas as pd
from django.core.management.base import BaseCommand
from django.apps import apps
from django.db import transaction, IntegrityError
from decimal import Decimal
from datetime import datetime
import re


class Command(BaseCommand):
    help = 'Importa dados de um arquivo CSV para o modelo ItemVenda'

    UNIQUE_FIELDS = {'ItemVenda': ['venda', 'produto', 'loja']}
    REQUIRED_FIELDS = {'ItemVenda': ['venda', 'produto', 'quantidade_produto', 'valor_total', 'valor_desconto', 'frete',
                                     'preco_final']}
    COLUMN_MAPPINGS = {
        'ItemVenda': {
            'número': 'venda',
            'nome do cliente': 'cliente',
            'vendedor': 'vendedor',
            'código (sku)': 'produto',
            'quantidade de produtos': 'quantidade_produto',
            'preço total': 'valor_total',
            'preço unitário': 'valor_desconto',
            'frete pago pelo cliente': 'frete',
            'valor total da venda': 'preco_final',
            'loja': 'loja',
        }
    }

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Caminho para o arquivo CSV de ItemVenda')
        parser.add_argument('clientes_csv', type=str, help='Caminho para o arquivo CSV de Clientes')

    def handle(self, *args, **kwargs):
        csv_file = kwargs['csv_file']
        clientes_csv = kwargs['clientes_csv']
        model = self.get_model('ItemVenda')
        mapping = self.get_column_mapping(model)

        if not mapping:
            return

        # Carregar os dados dos arquivos CSV
        df_itemvenda = self.load_csv(csv_file)
        df_clientes = self.load_csv(clientes_csv)

        self.validate_csv_columns(df_itemvenda, mapping)

        with transaction.atomic():
            related_caches = self.prepare_related_caches(df_itemvenda, df_clientes, mapping)
            new_records, updated_records = self.prepare_records(df_itemvenda, mapping, related_caches, model)

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
            raise ValueError(f'Erro ao carregar o arquivo CSV: {e}')

    def validate_csv_columns(self, df, mapping):
        missing_cols = [col for col in mapping if col not in df.columns]
        if missing_cols:
            raise ValueError(f'Colunas faltando no CSV: {", ".join(missing_cols)}')

    def prepare_related_caches(self, df_itemvenda, df_clientes, mapping):
        # Pré-carregar caches de vendas, vendedores e produtos
        related_models = {
            'Vendas': apps.get_model('coremodels', 'Vendas'),
            'Vendedores': apps.get_model('coremodels', 'Vendedores'),
            'Produtos': apps.get_model('coremodels', 'Produtos'),
        }

        vendas_cache = self.load_cache(related_models['Vendas'], 'numero', 'loja')
        vendedores_cache = self.load_cache(related_models['Vendedores'], 'nome')
        produtos_cache = self.load_cache(related_models['Produtos'], 'sku')

        # Criar cache de clientes com base no CSV de clientes
        clientes_cache = self.create_clientes_cache(df_clientes)

        return {
            'clientes_cache': clientes_cache,
            'vendas_cache': vendas_cache,
            'vendedores_cache': vendedores_cache,
            'produtos_cache': produtos_cache,
        }

    def create_clientes_cache(self, df_clientes):
        """Cria o cache de clientes a partir do CSV de clientes."""
        clientes_cache = {}
        for _, row in df_clientes.iterrows():
            cliente_nome = str(row['nome']).strip().lower()
            cliente_id = row['id']
            clientes_cache[cliente_nome] = cliente_id
        return clientes_cache

    def load_cache(self, model, *fields):
        """Carrega o cache com base nos campos fornecidos, com verificação de tipo."""
        queryset = model.objects.all()
        cache = {}

        for obj in queryset:
            key_parts = []
            for field in fields:
                value = getattr(obj, field)
                if isinstance(value, str):
                    key_parts.append(value.strip().lower())
                else:
                    key_parts.append(str(value).lower())  # Converter não-strings para string

            key = "|".join(key_parts)
            cache[key] = obj

        return cache


    def prepare_records(self, df, mapping, caches, model):
        new_records = []
        updated_records = []

        for index, row in df.iterrows():
            cliente_nome = str(row['nome do cliente']).strip().lower()
            cliente_id = caches['clientes_cache'].get(cliente_nome)

            venda_key = f"{str(row['número']).strip().lower()}|{str(row['loja']).strip().lower()}"
            produto_key = str(row['código (sku)']).strip().lower()
            vendedor_key = str(row['vendedor']).strip().lower()  # Normalização

            # Buscar objetos do cache
            venda = caches['vendas_cache'].get(venda_key)
            produto = caches['produtos_cache'].get(produto_key)
            vendedor = caches['vendedores_cache'].get(vendedor_key)

            if not vendedor:
                self.stdout.write(f"[ERRO] Vendedor não encontrado: {row['vendedor']}. Chaves disponíveis: {list(caches['vendedores_cache'].keys())}")

            if not venda or not cliente_id or not produto or not vendedor:
                continue  # Ignorar registros incompletos

            data = {
                'venda': venda,
                'cliente_id': cliente_id,
                'vendedor': vendedor,
                'produto': produto,
                'quantidade_produto': row['quantidade de produtos'],
                'valor_total': self.clean_numeric(row['preço total']),
                'valor_desconto': self.clean_numeric(row['preço unitário']),
                'frete': self.clean_numeric(row['frete pago pelo cliente']),
                'preco_final': self.clean_numeric(row['valor total da venda']),
                'loja': row['loja'],
            }

            unique_key = f'{venda.id}_{produto.sku}'
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
