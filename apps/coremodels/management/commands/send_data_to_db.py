import os
import pandas as pd
from django.core.management.base import BaseCommand
from django.apps import apps
from django.db import transaction, IntegrityError
from decimal import Decimal
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
        item_venda_csv_path = kwargs['csv_file']
        clientes_csv_path = kwargs['clientes_csv']
        
        item_venda_model = self.get_model('ItemVenda')
        column_mapping = self.get_column_mapping(item_venda_model)

        if not column_mapping:
            return

        # Load data from CSV files
        item_venda_df = self.load_csv(item_venda_csv_path)
        clientes_df = self.load_csv(clientes_csv_path)

        self.validate_csv_columns(item_venda_df, column_mapping)

        with transaction.atomic():
            caches = self.prepare_related_caches(item_venda_df, clientes_df, column_mapping)
            missing_clients = self.validate_cliente_ids(item_venda_df, caches['clientes_cache'])
            
            if missing_clients:
                self.add_missing_clients_to_cache(missing_clients, caches['clientes_cache'])

            new_records, updated_records = self.prepare_records(item_venda_df, column_mapping, caches, item_venda_model)

            # Bulk create and update the records
            self.bulk_create_new_records(item_venda_model, new_records)
            self.bulk_update_existing_records(item_venda_model, updated_records)

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
            df.columns = [col.lower() for col in df.columns]  # Standardize columns
            return df
        except Exception as e:
            raise ValueError(f'Erro ao carregar o arquivo CSV: {e}')

    def validate_csv_columns(self, df, mapping):
        missing_cols = [col for col in mapping if col not in df.columns]
        if missing_cols:
            raise ValueError(f'Colunas faltando no CSV: {", ".join(missing_cols)}')

    def prepare_related_caches(self, df_itemvenda, df_clientes, mapping):
        # Pre-load caches for vendas, vendedores, and produtos
        related_models = {
            'Vendas': apps.get_model('coremodels', 'Vendas'),
            'Vendedores': apps.get_model('coremodels', 'Vendedores'),
            'Produtos': apps.get_model('coremodels', 'Produtos'),
        }

        vendas_cache = self.load_cache(related_models['Vendas'], 'numero', 'loja')
        vendedores_cache = self.load_cache(related_models['Vendedores'], 'nome')
        produtos_cache = self.load_cache(related_models['Produtos'], 'sku')

        # Create client cache based on the CSV of clients
        clientes_cache = self.create_clientes_cache(df_clientes)

        return {
            'clientes_cache': clientes_cache,
            'vendas_cache': vendas_cache,
            'vendedores_cache': vendedores_cache,
            'produtos_cache': produtos_cache,
        }

    def create_clientes_cache(self, df_clientes):
        """Create a cache of clients using both the CSV and the database."""
        clientes_model = apps.get_model('coremodels', 'Clientes')
        clientes_cache = {}
        
        # Load clients from CSV
        for _, row in df_clientes.iterrows():
            cliente_nome = str(row['nome']).strip().lower()
            cliente_id = row['id']
            clientes_cache[cliente_nome] = cliente_id

        # Add any missing clients from the database
        for client in clientes_model.objects.all():
            cliente_nome = client.nome.strip().lower()
            if cliente_nome not in clientes_cache:
                clientes_cache[cliente_nome] = client.id

        self.stdout.write(f"[DEBUG] Total clients in cache: {len(clientes_cache)}")
        return clientes_cache

    def add_missing_clients_to_cache(self, missing_clients, clientes_cache):
        """Add missing clients to the database and update the cache."""
        clientes_model = apps.get_model('coremodels', 'Clientes')
        new_clients = []

        for cliente_nome in missing_clients:
            new_clients.append(clientes_model(nome=cliente_nome))  # Add required fields if necessary

        # Bulk create new clients
        created_clients = clientes_model.objects.bulk_create(new_clients, ignore_conflicts=True)

        # Update the cache
        for client in created_clients:
            clientes_cache[client.nome.strip().lower()] = client.id

        self.stdout.write(f"[INFO] Created {len(created_clients)} placeholder clients.")

    def validate_cliente_ids(self, item_venda_df, clientes_cache):
        """Validate if all cliente_id values in the ItemVenda CSV exist in the clientes_cache."""
        missing_clients = []
        for _, row in item_venda_df.iterrows():
            cliente_nome = str(row['nome do cliente']).strip().lower()
            if cliente_nome not in clientes_cache:
                missing_clients.append(cliente_nome)
        
        if missing_clients:
            self.stdout.write(f"[ERROR] Missing cliente_id for the following names: {', '.join(missing_clients[:10])}")
            self.stdout.write(f"[INFO] Total missing clients: {len(missing_clients)}")

        return set(missing_clients)

    def load_cache(self, model, *fields):
        """Load cache based on the provided fields."""
        queryset = model.objects.all()
        cache = {}

        for obj in queryset:
            key_parts = []
            for field in fields:
                value = getattr(obj, field)
                if isinstance(value, str):
                    key_parts.append(value.strip().lower())
                else:
                    key_parts.append(str(value).lower())  # Convert non-strings to string

            key = "|".join(key_parts)
            cache[key] = obj

        return cache

    def prepare_records(self, df, mapping, caches, model):
        new_records = []
        updated_records = []
        skipped_records = 0
        error_records = 0
    
        for index, row in df.iterrows():
            try:
                cliente_nome = str(row['nome do cliente']).strip().lower()
                cliente_id = caches['clientes_cache'].get(cliente_nome)
    
                venda_key = f"{str(row['número']).strip().lower()}|{str(row['loja']).strip().lower()}"
                produto_key = str(row['código (sku)']).strip().lower()
                vendedor_key = str(row['vendedor']).strip().lower()
    
                # Fetch objects from cache
                venda = caches['vendas_cache'].get(venda_key)
                produto = caches['produtos_cache'].get(produto_key)
                vendedor = caches['vendedores_cache'].get(vendedor_key)
    
                if not venda or not cliente_id or not produto or not vendedor:
                    self.stdout.write(f"[INFO] Registro incompleto: {index+1}. Pulando...")
                    skipped_records += 1
                    continue
    
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
                existing_obj = caches.get('existing_objects', {}).get(unique_key)
    
                if existing_obj:
                    self.stdout.write(f"[INFO] Updating existing record: {unique_key}")
                    for field, value in data.items():
                        setattr(existing_obj, field, value)
                    updated_records.append(existing_obj)
                else:
                    self.stdout.write(f"[INFO] Creating new record: {unique_key}")
                    new_records.append(model(**data))
    
            except Exception as e:
                self.stdout.write(f"[ERROR] Error processing record {index+1}: {e}")
                error_records += 1
    
        self.stdout.write(f"[INFO] Total processed: {len(df)}")
        self.stdout.write(f"[INFO] New records: {len(new_records)}")
        self.stdout.write(f"[INFO] Updated records: {len(updated_records)}")
        self.stdout.write(f"[INFO] Skipped records: {skipped_records}")
        self.stdout.write(f"[INFO] Error records: {error_records}")
    
        return new_records, updated_records

    def clean_numeric(self, value):
        value = re.sub(r'[^\d.,-]', '', str(value)).replace(',', '.')
        try:
            return Decimal(value)
        except:
            return None

    def bulk_create_new_records(self, model, new_records):
        if new_records:
            clientes_model = apps.get_model('coremodels', 'Clientes')
            existing_cliente_ids = set(clientes_model.objects.values_list('id', flat=True))
            valid_new_records = []
    
            for record in new_records:
                if record.cliente_id in existing_cliente_ids:
                    valid_new_records.append(record)
                else:
                    self.stdout.write(f"[ERROR] Invalid cliente_id: {record.cliente_id}")
    
            model.objects.bulk_create(valid_new_records, batch_size=500, ignore_conflicts=True)
            print("New records created!")

    def bulk_update_existing_records(self, model, updated_records):
        if updated_records:
            fields = [f.name for f in model._meta.fields if f.name != model._meta.pk.name]
            model.objects.bulk_update(updated_records, fields=fields, batch_size=500, ignore_conflicts=True)
