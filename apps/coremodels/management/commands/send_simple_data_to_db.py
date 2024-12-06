import os
import pandas as pd
from django.core.management.base import BaseCommand
from django.apps import apps
from django.db import transaction, IntegrityError
from decimal import Decimal, InvalidOperation
from datetime import datetime
import logging
import re
import traceback
from django.db import models
import time


logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Importa dados de um arquivo CSV para os modelos Clientes, Vendedores, Vendas e Produtos'

    UNIQUE_FIELDS = {
        'Produtos': ['sku'],
        'Clientes': ['id'],
        'Vendas': ['numero', 'loja'],
    }

    REQUIRED_FIELDS = {
        'Produtos': ['sku', 'descricao'],
        'Clientes': ['id', 'nome'],
        'Vendas': ['numero', 'loja', 'data_compra'],
    }

    COLUMN_MAPPINGS = {
        'Produtos': {
            'código (sku)': 'sku',
            'descrição': 'descricao',
            'unidade': 'unidade',
            'preço': 'preco',
            'preço promocional': 'preco_promocional',
            'estoque disponível': 'estoque_disponivel',
            'custo': 'custo'
        },
        'Clientes': {
            'id': 'id',
            'nome': 'nome',
            'fantasia': 'fantasia',
            'endereço': 'endereco',
            'número': 'numero',
            'complemento': 'complemento',
            'bairro': 'bairro',
            'cep': 'cep',
            'cidade': 'cidade',
            'estado': 'estado',
            'cnpj / cpf': 'cpf_cnpj',
            'celular': 'celular',
            'fone': 'fone',
            'tipo pessoa': 'tipo_pessoa',
            'contribuinte': 'contribuinte',
            'código de regime tributário': 'codigo_regime_tributario',
            'limite de crédito': 'limite_credito'
        },
        'Vendas': {
            'número': 'numero',
            'data da venda': 'data_compra',
            'e-commerce': 'canal_venda',
            'situação da venda': 'situacao',
            'loja': 'loja'
        },
    }

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Caminho para o arquivo CSV a ser importado')

    def handle(self, *args, **kwargs):
        start_time = time.time()

        csv_file = kwargs['csv_file']
        model_name = self.get_model_name_from_file(csv_file)
        model = self.get_model(model_name)
        if not model:
            return

        self.stdout.write(f'Importing file: {csv_file}')
        self.stdout.write(f'Model: {model.__name__}')

        column_mapping = self.get_column_mapping(model)
        if not column_mapping:
            self.stdout.write(self.style.ERROR(f'No column mapping defined for model "{model.__name__}".'))
            return

        data_frame = self.load_csv(csv_file)
        self.stdout.write(f'Loaded CSV with {len(data_frame)} rows')
        self.validate_csv_columns(data_frame, column_mapping)

        self.stdout.write('Validating columns...')
        with transaction.atomic():
            self.clean_consumidor_final(model)
            existing_objects = self.get_existing_objects(model, data_frame, column_mapping, model_name)
            new_records, updated_records = self.prepare_records(data_frame, column_mapping, existing_objects, model, model_name)

            self.stdout.write(f'Creating {len(new_records)} new records')
            self.bulk_create_new_records(model, new_records)
            self.stdout.write(f'Updating {len(updated_records)} existing records')
            self.bulk_update_existing_records(model, updated_records)

        total_time = time.time() - start_time
        self.stdout.write(self.style.SUCCESS(f'Import completed successfully in {total_time:.2f} seconds.'))

    def get_model_name_from_file(self, csv_file):
        return os.path.splitext(os.path.basename(csv_file))[0]

    def get_model(self, model_name):
        try:
            return apps.get_model('coremodels', model_name)
        except LookupError:
            self.stdout.write(self.style.ERROR(f'Modelo "{model_name}" não encontrado'))
            return None

    def get_column_mapping(self, model):
        return self.COLUMN_MAPPINGS.get(model.__name__)

    def load_csv(self, csv_file):
        """
        Load the CSV file and normalize column names.
        """
        try:
            df = pd.read_csv(csv_file, encoding='utf-8', low_memory=False)
            # Normalize columns by stripping and lowercasing
            df.columns = [col.strip().lower() for col in df.columns]
            return df
        except Exception as e:
            logger.error(f'Erro ao carregar CSV: {e}')
            raise

    def validate_csv_columns(self, df: pd.DataFrame, column_mapping: dict) -> None:
        """
        Validate that the CSV columns match the expected column mapping.
        """
        # Normalize the expected column names for comparison
        expected_columns = {k.lower(): v for k, v in column_mapping.items()}
        df_columns = {col.lower() for col in df.columns}

        missing_columns = set(expected_columns.keys()) - df_columns
        if missing_columns:
            raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")

        extra_columns = df_columns - set(expected_columns.keys())
        if extra_columns:
            logger.warning(f"Extra columns in CSV: {', '.join(extra_columns)}")

    def clean_consumidor_final(self, model):
        if model.__name__ == 'Clientes':
            model.objects.filter(nome='Consumidor Final').delete()

    def get_existing_objects(self, model, df, column_mapping, model_name):
        """
        Retrieve existing objects based on unique fields, with caching for efficiency.
        """
        if not hasattr(self, 'existing_objects_cache'):
            self.existing_objects_cache = {}

        cache_key = f"{model_name}_existing_objects"
        if cache_key in self.existing_objects_cache:
            return self.existing_objects_cache[cache_key]

        from django.db.models import Q

        unique_fields = self.UNIQUE_FIELDS.get(model_name, [])
        if not unique_fields:
            raise ValueError(f"No unique fields defined for model '{model_name}'.")

        df_normalized = df.copy()
        for csv_col, model_field in column_mapping.items():
            if model_field in unique_fields:
                df_normalized[csv_col] = (
                    df_normalized[csv_col]
                    .astype(str)
                    .str.strip()
                    .str.lower()
                )

        unique_values_set = {
            tuple(
                str(row[csv_col]).strip().lower() if pd.notna(row[csv_col]) else None
                for csv_col, field in column_mapping.items() if field in unique_fields
            )
            for _, row in df_normalized.iterrows()
            if None not in [
                row[csv_col] for csv_col in column_mapping if column_mapping[csv_col] in unique_fields
            ]
        }

        query_filters = (
            Q(
                *[
                    Q(**{f"{field}__iexact": value for field, value in zip(unique_fields, values)})
                    for values in unique_values_set
                ],
                _connector=Q.OR
            )
            if unique_values_set else Q()
        )

        queryset = model.objects.filter(query_filters)
        self.existing_objects_cache[cache_key] = queryset
        return queryset

    def prepare_records(self, df, mapping, existing_objects, model, model_name):
        """
        Prepare records for creation or updating.
        """
        new_records = []
        updated_records = []
        processed_unique_keys = set()

        unique_fields = self.UNIQUE_FIELDS.get(model_name)
        if not unique_fields:
            raise ValueError(f"No unique fields defined for model '{model_name}'.")

        # Create a lookup for existing objects by unique key
        def normalize_value(value):
            if value is None:
                return None
            if isinstance(value, (int, float, Decimal)):
                return str(value)  # Convert numeric values to string
            return str(value).strip().lower()  # Normalize strings

        existing_objects_lookup = {
            tuple(normalize_value(getattr(obj, field)) for field in unique_fields): obj
            for obj in existing_objects
        }

        for index, row in df.iterrows():
            record_data = self.process_row(mapping, row, model)

            if record_data is None:
                continue

            # Debugging logs for missing fields
            missing_fields = [field for field in unique_fields if field not in record_data]
            if missing_fields:
                logger.error(f"Row {index}: Missing required unique fields: {missing_fields}")
                continue  # Skip rows with missing unique fields

            unique_key = tuple(
                normalize_value(record_data.get(field)) for field in unique_fields
            )

            if unique_key in processed_unique_keys:
                continue

            processed_unique_keys.add(unique_key)

            existing_record = existing_objects_lookup.get(unique_key)

            if existing_record:
                for field, value in record_data.items():
                    setattr(existing_record, field, value)
                updated_records.append(existing_record)
            else:
                new_records.append(model(**record_data))

        return new_records, updated_records

    def process_row(self, mapping, row, model):
        """Process a single row of data from the CSV and clean it based on the model fields."""

        data = {}
        for csv_column, model_field in mapping.items():
            # Normalize CSV column name to match with column_mapping
            csv_column = csv_column.lower().strip()
            if csv_column in row:
                raw_value = row[csv_column]
                cleaned_value = self.clean_value(model_field, model, raw_value)

                if model.__name__ == 'Vendas' and model_field == 'canal_venda':
                    cleaned_value = cleaned_value or 'Pdv'

                data[model_field] = cleaned_value

        # Debugging logs for processed data
        logger.debug(f"Processed row data: {data}")
        return data

    def clean_value(self, field_name, model, value):
        if pd.isna(value) or value in (None, '', '-'):
            return None
    
        # Get the field type from the model
        field = model._meta.get_field(field_name)
    
        # Handle different field types
        try:
            if isinstance(field, models.DecimalField):
                # Handle commas and convert to Decimal
                value = re.sub(r'[^\d.,-]', '', str(value))
                return Decimal(value.replace(',', '.'))
            elif isinstance(field, models.DateField):
                # Parse date in multiple formats
                for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y'):
                    try:
                        return datetime.strptime(value, fmt).date()
                    except ValueError:
                        continue
                raise ValueError(f"Invalid date format for field '{field_name}': {value}")
            elif isinstance(field, models.BooleanField):
                # Normalize boolean values
                return str(value).lower() in ('true', '1', 'yes', 'sim')
            elif isinstance(field, models.IntegerField):
                return int(value)  # No need to call strip on integer values
            elif isinstance(field, models.CharField):
                return str(value).strip()
            elif isinstance(field, models.EmailField):
                # Validate email format
                return str(value).strip()
            # Add more field types as needed
            return value
        except (ValueError, InvalidOperation, TypeError) as e:
            logger.error(f"Error converting value '{value}' for field '{field_name}': {e}")
            return None

    def bulk_create_new_records(self, model, new_records):
        if new_records:
            print(f'Creating new records of model {model.__name__}')
            print(f'Number of new records: {len(new_records)}')
            try:
                model.objects.bulk_create(new_records, ignore_conflicts=True)
                print(f'Finished creating new records of model {model.__name__}')
            except IntegrityError as e:
                logger.error(f'Erro ao criar novos registros: {e}')
                print(f'Erro ao criar novos registros: {e}')
                raise

    def bulk_update_existing_records(self, model, updated_records):
        if not updated_records:
            return

        fields_to_update = [field.name for field in model._meta.fields if field.name != model._meta.pk.name]

        try:
            model.objects.bulk_update(updated_records, fields=fields_to_update)
        except IntegrityError as exc:
            logger.error(f'Erro ao atualizar registros: {exc}')
            raise

    def handle_error(self, error: Exception) -> None:
        """Handle an error by printing it to stderr in a readable format."""
        error_details = traceback.format_exception(type(error), error, error.__traceback__)
        error_message = "".join(error_details[:2])
        self.stderr.write(self.style.ERROR(f"An error occurred: {error_message}"))

    def get_key_from_value(self, mapping, search_value):
        return next((key for key, value in mapping.items() if value == search_value), None)
