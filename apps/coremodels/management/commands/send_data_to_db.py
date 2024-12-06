import pandas as pd
from django.core.management.base import BaseCommand
from django.apps import apps
from django.db import transaction
from decimal import Decimal
import re

from apps.coremodels.models import Clientes, ItemVenda, Produtos, Vendas, Vendedores

class Command(BaseCommand):
    help = 'Importa dados de um arquivo CSV para o modelo ItemVenda'

    FIELD_TYPE_MAPPINGS = {
        # Integer fields
        'id': 'int',
        'numero': 'int',
        'cliente': 'int',

        # Float fields
        'quantidade_produto': 'float',
        'valor_unitario': 'float',
        'valor_desconto': 'float',
        'valor_total': 'float',
        'preco_final': 'float',
        'frete': 'float',
        'despesas_rateadas': 'float',
        'desconto_rateado': 'float',
        'frete_rateado': 'float',

        # String fields
        'venda': 'str',
        'produto': 'str',
        'loja': 'str',
        'rastreamento': 'str',
        'ordem_compra': 'str',
        'destinatario': 'str',
        'cpf_cnpj_entrega': 'str',
        'cep_entrega': 'str',
        'municipio_entrega': 'str',
        'estado_entrega': 'str',
        'endereco_entrega': 'str',
        'numero_entrega': 'str',
        'complemento_entrega': 'str',
        'bairro_entrega': 'str',
        'fone_entrega': 'str',
        'vendedor': 'str',
    }

    COLUMN_MAPPINGS = {
        'número do pedido': 'venda',
        'código (sku)': 'produto',
        'id contato' : 'cliente',
        'quantidade': 'quantidade_produto',
        'valor unitário': 'valor_unitario',
        'desconto item': 'valor_desconto',
        'frete pedido': 'frete',
        'despesas pedido rateado': 'despesas_rateadas',
        'desconto do pedido rateado': 'desconto_rateado',
        'frete pedido rateado': 'frete_rateado',
        'loja': 'loja',
        'código de rastreamento': 'rastreamento',
        'número da ordem de compra': 'ordem_compra',
        'destinatário': 'destinatario',
        'cpf/cnpj entrega': 'cpf_cnpj_entrega',
        'cep entrega': 'cep_entrega',
        'município entrega': 'municipio_entrega',
        'uf entrega': 'estado_entrega',
        'endereço entrega': 'endereco_entrega',
        'endereço nro entrega': 'numero_entrega',
        'complemento entrega': 'complemento_entrega',
        'bairro entrega': 'bairro_entrega',
        'fone entrega': 'fone_entrega',
        'vendedor': 'vendedor',
    }

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Caminho para o arquivo CSV de ItemVenda')

    def handle(self, *args, **kwargs):
        csv_file_path = kwargs['csv_file']

        print(f"Loading ItemVenda model...")
        # Load the ItemVenda model
        item_venda_model = self.get_model('ItemVenda')

        print(f"Loading data from CSV file: {csv_file_path}")
        # Load data from the CSV file
        data_df = self.load_csv(csv_file_path)

        print("Mapping columns and validating...")
        # Map columns and validate
        self.validate_csv_columns(data_df)

        print("Preparing caches...")
        # Prepare caches
        caches = self.prepare_related_caches()

        print("Processing records...")
        # Process records
        new_records, updated_records = self.prepare_records(data_df, item_venda_model, caches)

        print("Bulk creating new records...")
        # Bulk create and update
        self.bulk_create_new_records(item_venda_model, new_records)
        print("Bulk creating new records... done")

        print("Bulk updating existing records...")
        self.bulk_update_existing_records(item_venda_model, updated_records)
        print("Bulk updating existing records... done")

    def get_model(self, model_name):
        try:
            return apps.get_model('coremodels', model_name)
        except LookupError:
            raise ValueError(f"Model '{model_name}' not found.")

    def load_csv(self, csv_file):
        try:
            df = pd.read_csv(csv_file, encoding='utf-8', low_memory=False)
            df.columns = [col.strip().lower() for col in df.columns]
            return df
        except Exception as e:
            raise ValueError(f"Error loading CSV file: {e}")

    def validate_csv_columns(self, df):
        missing_cols = [col for col in self.COLUMN_MAPPINGS if col not in df.columns]
        if missing_cols:
            raise ValueError(f'Colunas faltando no CSV: {", ".join(missing_cols)}')

    def prepare_related_caches(self):
        """
        Load caches for related models with corrected client IDs.
        """
        caches = {
            'vendas_cache': self.load_cache('Vendas', 'numero', 'loja'),
            'vendedores_cache': self.load_cache('Vendedores', 'nome'),
            'produtos_cache': self.load_cache('Produtos', 'sku'),
            'clientes_cache': self.load_cache('Clientes', 'id'),  # Keep as is, but ensure proper int casting
        }

        # Convert all client IDs in the cache to integers for consistent comparison
        caches['clientes_cache'] = {str(int(key)): value for key, value in caches['clientes_cache'].items()}
        return caches

    def load_cache(self, model_name: str, *fields: str) -> dict:
        """
        Load a cache of objects from the given model.

        :param model_name: The name of the model to load.
        :param fields: The fields to use as the cache key.
        :return: A dictionary mapping cache keys to model objects.
        """
        model = apps.get_model('coremodels', model_name)
        queryset = model.objects.all()
        cache = {}
        for obj in queryset:
            key = '|'.join(str(getattr(obj, field)).strip().lower() for field in fields)
            cache[key] = obj
        return cache

    def prepare_records(self, dataframe: pd.DataFrame, model, caches: dict) -> tuple:
        dataframe.rename(columns=self.COLUMN_MAPPINGS, inplace=True)

        # Ensure numeric fields are properly cleaned
        def clean_numeric(value):
            if pd.isna(value):  # Handle NaN
                return 0.0
            if isinstance(value, str):
                value = re.sub(r'[^\d,\.]', '', value)  # Remove invalid characters
                value = value.replace(',', '.')  # Convert commas to dots for decimals
            try:
                return float(value)
            except ValueError:
                return 0.0

        # Calculate `valor_total`
        def calculate_valor_total(row):
            try:
                return row['valor_unitario'] * row['quantidade_produto']
            except TypeError:
                return None  # Handle missing or invalid data gracefully

        numeric_columns = ['quantidade_produto', 'valor_unitario', 'valor_desconto', 'frete',
                        'despesas_rateadas', 'desconto_rateado', 'frete_rateado']
        for column in numeric_columns:
            if column in dataframe.columns:
                dataframe[column] = dataframe[column].apply(clean_numeric)

        dataframe['valor_total'] = dataframe.apply(calculate_valor_total, axis=1)
        print(f'valor total:{dataframe['valor_total'].head()}')
        
        numeric_columns = ['valor_total']
        for column in numeric_columns:
            if column in dataframe.columns:
                dataframe[column] = dataframe[column].apply(clean_numeric)

        # Calculate `preco_final` (total for each `venda`) and subtract `frete`
        dataframe['venda'] = dataframe['venda'].fillna('').astype(str).str.strip().str.lower()

        # Group by `venda` and calculate `preco_final` using Decimal
        preco_final_df = (
            dataframe.groupby('venda')
            .apply(lambda group: sum(group['valor_total']))
            .reset_index(name='preco_final')
        )

        print(f'venda = 564265: {preco_final_df.loc[preco_final_df["venda"] == "564265"]}')

        dataframe = dataframe.merge(preco_final_df, on='venda', how='left')
        
        print(f'preco final:{dataframe["preco_final"].head()}')

        # Additional processing and normalization
        dataframe['loja'] = dataframe['loja'].fillna('').astype(str).str.strip().str.lower()
        dataframe['venda_key'] = dataframe['venda'] + "|" + dataframe['loja']
        dataframe['produto_key'] = dataframe['produto'].fillna('').astype(str).str.strip().str.lower()
        dataframe['cliente_key'] = dataframe['cliente'].fillna(0).astype(int).astype(str)
        dataframe['vendedor_key'] = dataframe['vendedor'].fillna('').astype(str).str.strip().str.lower()

        # Perform lookup
        dataframe['venda'] = dataframe['venda_key'].map(caches['vendas_cache'])
        dataframe['produto'] = dataframe['produto_key'].map(caches['produtos_cache'])
        dataframe['cliente'] = dataframe['cliente_key'].map(caches['clientes_cache'])
        dataframe['vendedor'] = dataframe['vendedor_key'].map(caches['vendedores_cache'])

        # Check for missing mappings
        missing_vendas = dataframe[dataframe['venda'].isnull()]
        if not missing_vendas.empty:
            print("[DEBUG] Missing 'venda' mappings for the following keys:", missing_vendas['venda_key'].unique())

        dataframe.dropna(subset=['venda', 'produto', 'quantidade_produto', 'cliente'], inplace=True)

        existing_records = set(
            model.objects.filter(
                venda__in=dataframe['venda'],
                produto__in=dataframe['produto'],
            ).values_list('venda_id', 'produto_id')
        )
        dataframe_existing = dataframe[
            dataframe.apply(lambda row: (row['venda'].numero, row['produto'].sku) in existing_records, axis=1)
        ]
        dataframe_new = dataframe[
            dataframe.apply(lambda row: (row['venda'].numero, row['produto'].sku) not in existing_records, axis=1)
        ]

        # Filter columns to match model fields
        model_fields = [f.name for f in model._meta.fields]
        dataframe_new = dataframe_new[[col for col in dataframe_new.columns if col in model_fields]]
        dataframe_existing = dataframe_existing[[col for col in dataframe_existing.columns if col in model_fields]]

        new_records = dataframe_new.apply(self.clean_record, axis=1).tolist()
        updated_records = dataframe_existing.apply(self.clean_record, axis=1).to_dict(orient='records')

        print(f"Prepared {len(new_records)} new records and {len(updated_records)} updated records.")
        return new_records, updated_records


    def clean_record(self, record_data):
        """
        Clean a single record and prepare it for insertion/update in the database.
        """
        normalized_data = self.normalize_data(record_data)
        cleaned_data = {}

        for field_name, value in normalized_data.items():
            # Handle foreign key validations
            if field_name == 'venda' and not isinstance(value, Vendas):
                raise ValueError(f"`venda` value must be a Vendas instance. Got: {type(value)}")
            elif field_name == 'produto' and not isinstance(value, Produtos):
                raise ValueError(f"`produto` value must be a Produtos instance. Got: {type(value)}")
            elif field_name == 'cliente' and not isinstance(value, Clientes):
                raise ValueError(f"`cliente` value must be a Clientes instance. Got: {type(value)}")
            elif field_name == 'vendedor':
                if isinstance(value, Vendedores) or value is None:
                    cleaned_value = value
                elif pd.isna(value):  # Check for nan values
                    cleaned_value = None
                else:
                    raise ValueError(f"`vendedor` value must be a Vendedores instance or None. Got: {type(value)} - {value}")
            else:
                cleaned_value = value

            cleaned_data[field_name] = cleaned_value

        return cleaned_data
    
    def normalize_data(self, record_data):
        """
        Normalize data for a single record, skipping foreign key fields.
        """
        normalized_data = {}
        for field_name, value in record_data.items():
            # Skip foreign key fields
            if field_name in ['venda', 'produto', 'cliente', 'vendedor']:
                normalized_data[field_name] = value
                continue

            field_type = self.FIELD_TYPE_MAPPINGS.get(field_name, 'str')
            
            try:
                if field_type == 'int':
                    normalized_data[field_name] = int(value) if not pd.isna(value) else None
                elif field_type == 'float':
                    if isinstance(value, str):
                        # Handle the case for `valor_total` and `preco_final` where commas and periods may be used incorrectly
                        if field_name in ['valor_total', 'preco_final']:
                            # Replace commas with periods for decimals and remove periods for thousands
                            value = value.replace('.', '').replace(',', '.')
                        else:
                            # Standard float conversion logic
                            value = value.replace(',', '.').replace('.', '', 1) if ',' in value else value
                    normalized_data[field_name] = float(value) if value not in [None, '', 'NaN'] else None
                elif field_type == 'str':
                    normalized_data[field_name] = str(value).strip() if not pd.isna(value) else ''
                else:
                    # Default case: assign the value as-is
                    normalized_data[field_name] = value
            except (ValueError, TypeError) as e:
                raise ValueError(f"Error normalizing field '{field_name}': {value} ({e})")

        return normalized_data

    def bulk_create_new_records(self, model, new_records):
        print(f"Creating {len(new_records)} new records...")
        try:
            item_venda_instances = [model(**record) for record in new_records]
            model.objects.bulk_create(item_venda_instances, batch_size=500, ignore_conflicts=True)
            print(f"Created {len(new_records)} new records.")
        except Exception as e:
            print(f"[ERROR] Failed to create new records: {e}")
    
    def bulk_update_existing_records(self, model, updated_records):
        print("[DEBUG] Entering bulk_update_existing_records method.")
        if updated_records:
            print(f"[DEBUG] Number of records to update: {len(updated_records)}")
            fields = [f.name for f in model._meta.fields if f.name != model._meta.pk.name]
            print(f"[DEBUG] Fields to update: {fields}")
            try:
                model.objects.bulk_update(updated_records, fields=fields, batch_size=500, ignore_conflicts=True)
                self.stdout.write(f"[INFO] Updated {len(updated_records)} records.")
            except Exception as e:
                print(f"[ERROR] An error occurred during bulk update: {e}")
        else:
            print("[DEBUG] No records to update.")
