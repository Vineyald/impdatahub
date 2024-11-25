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
        'Vendas': ['numero', 'loja'],
    }

    COLUMN_MAPPINGS = {
        'Produtos': {
            'código (SKU)': 'sku',  # Ensure this matches your CSV column
            'descrição': 'descricao',
            'unidade': 'unidade',
            'preço': 'preco',
            'preço promocional': 'preco_promocional',
            'estoque disponível': 'estoque_disponivel',
            'custo': 'custo'
        },
            'Clientes': {
            'id': 'id',  # Mapeado ao campo primário
            'nome': 'nome',
            'fantasia': 'fantasia',
            'endereço': 'endereco',
            'número': 'numero',
            'complemento': 'complemento',
            'bairro': 'bairro',
            'cep': 'cep',
            'cidade': 'cidade',
            'estado': 'estado',
            'cnpj / cpf': 'cpf_cnpj',  # Normalized header
            'celular': 'celular',
            'fone': 'fone',
            'tipo pessoa': 'tipo_pessoa',
            'contribuinte': 'contribuinte',
            'código de regime tributário': 'codigo_regime_tributario',
            'limite de crédito': 'limite_credito'
        },
        'Vendas': {
            'número': 'numero',  # Campo primário
            'data da venda': 'data_compra',
            'e-commerce': 'canal_venda',
            'situação da venda': 'situacao',
            'loja': 'loja'
        },
    }

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Caminho para o arquivo CSV a ser importado')

    def handle(self, *args, **kwargs):
        csv_file = kwargs['csv_file']
        model_name = self.get_model_name_from_file(csv_file)
        model = self.get_model(model_name)
        if not model:
            return

        mapping = self.get_column_mapping(model)
        if not mapping:
            self.stdout.write(self.style.ERROR(f'Nenhum mapeamento de coluna definido para o modelo "{model.__name__}".'))
            return

        try:
            df = self.load_csv(csv_file)
            self.validate_csv_columns(df, mapping)

            with transaction.atomic():
                self.clean_consumidor_final(model)
                existing_objects = self.get_existing_objects(model, df, mapping, model_name)
                new_records, updated_records = self.prepare_records(df, mapping, existing_objects, model, model_name)

                self.bulk_create_new_records(model, new_records)
                self.bulk_update_existing_records(model, updated_records)

            self.stdout.write(self.style.SUCCESS('Importação concluída com sucesso.'))

        except Exception as e:
            self.handle_error(e)

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
        try:
            return pd.read_csv(csv_file, encoding='utf-8', low_memory=False)
        except Exception as e:
            logger.error(f'Erro ao carregar CSV: {e}')
            raise

    def validate_csv_columns(self, df, mapping):
    # Normalize CSV headers to lowercase and remove extra spaces
        df.columns = df.columns.str.strip().str.lower()
        normalized_mapping = {k.lower().strip(): v for k, v in mapping.items()}

        missing_cols = [k for k in normalized_mapping if k not in df.columns]
        extra_cols = [col for col in df.columns if col not in normalized_mapping]

        if missing_cols:
            error_msg = f"Missing required columns: {', '.join(missing_cols)}"
            logger.error(error_msg)
            raise ValueError(error_msg)

        if extra_cols:
            logger.warning(f"Extra columns in CSV: {extra_cols}")

    def clean_consumidor_final(self, model):
        if model.__name__ == 'Clientes':
            model.objects.filter(nome='Consumidor Final').delete()

    def get_existing_objects(self, model, df, mapping, model_name):
        unique_fields = self.UNIQUE_FIELDS.get(model_name, [])
        if not unique_fields:
            logger.error(f"No unique fields defined for model '{model_name}'.")
            return {}

        # Map unique fields to the CSV columns
        unique_field_column = mapping.get(unique_fields[0])
        if not unique_field_column:
            logger.error(f"No mapping found for unique field '{unique_fields[0]}' in model '{model_name}'.")
            return {}

        if unique_field_column not in df.columns:
            logger.error(f"Column '{unique_field_column}' not found in the CSV for model '{model_name}'.")
            return {}

        # Extract unique field values
        unique_field_values = df[unique_field_column].dropna().unique()
        if not unique_field_values.any():
            logger.warning(f"No valid unique field values found for column '{unique_field_column}' in the CSV.")
            return {}

        # Use __in lookup for filtering
        filter_criteria = {f"{unique_fields[0]}__in": unique_field_values}
        existing_objects = {
            getattr(obj, unique_fields[0]): obj
            for obj in model.objects.filter(**filter_criteria)
        }

        return existing_objects

    def prepare_records(self, df, mapping, existing_objects, model, model_name):
        unique_fields = self.UNIQUE_FIELDS.get(model_name, [])
        if not unique_fields:
            raise ValueError(f"No unique fields defined for model '{model_name}'.")

        new_records, updated_records = [], []
        seen_unique_values = set()

        for _, row in df.iterrows():
            data = self.process_row(mapping, row, model)
            if data is None:
                continue

            # Create a unique identifier based on unique fields
            unique_values = tuple(data.get(field, None) for field in unique_fields)
            if None in unique_values:
                logger.warning(f"Skipping row due to missing unique fields: {unique_fields}")
                continue

            standardized_unique = '|'.join([str(value).strip().lower() for value in unique_values])
            if standardized_unique in seen_unique_values:
                continue

            seen_unique_values.add(standardized_unique)
            existing_obj = existing_objects.get(standardized_unique)

            if existing_obj:
                for field, value in data.items():
                    setattr(existing_obj, field, value)
                updated_records.append(existing_obj)
            else:
                new_records.append(model(**data))

        return new_records, updated_records

    def process_row(self, mapping, row, model):
        """
        Process a single row of data from the CSV and clean it based on the model fields.
        """
        data = {}
        for csv_col, model_field in mapping.items():
            # Normalize the column name before accessing the row
            normalized_csv_col = csv_col.lower().strip()
            if normalized_csv_col in row:
                raw_value = row[normalized_csv_col]
                cleaned_value = self.clean_value(model_field, model, raw_value)
                
                # Especial para o campo canal_venda no modelo Vendas
                if model.__name__ == 'Vendas' and model_field == 'canal_venda':
                    # Preencher com 'Pdv' se estiver vazio ou nulo
                    if not cleaned_value:
                        cleaned_value = 'Pdv'
                
                data[model_field] = cleaned_value
        return data



    def clean_value(self, field_name, model, value):
        """
        Clean and convert a value to match the type of a Django model field.
        """
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
                return int(value)
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
            try:
                model.objects.bulk_create(new_records, ignore_conflicts=True)
            except IntegrityError as e:
                logger.error(f'Erro ao criar novos registros: {e}')
                raise

    def bulk_update_existing_records(self, model, updated_records):
        if updated_records:
            fields_to_update = [field.name for field in model._meta.fields if field.name != model._meta.pk.name]
            try:
                model.objects.bulk_update(updated_records, fields=fields_to_update)
            except IntegrityError as e:
                logger.error(f'Erro ao atualizar registros: {e}')
                raise

    def handle_error(self, error):
        # Usa traceback.format_exception para obter uma versão detalhada do erro
        error_details = traceback.format_exception(type(error), error, error.__traceback__)
        
        # Limita a 2 primeiras linhas
        error_lines = error_details[:19]
        
        # Exibe as duas primeiras linhas
        self.stdout.write(self.style.ERROR(f'Ocorreu um erro: {"\n".join(error_lines)}'))

    def get_key_from_value(self, mapping, search_value):
        return next((key for key, value in mapping.items() if value == search_value), None)
