import os
import pandas as pd
from django.core.management.base import BaseCommand
from django.apps import apps
from django.db import transaction, IntegrityError
from decimal import Decimal, InvalidOperation
from datetime import datetime
import logging
import re
from django.db.models import Q

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Importa dados de um arquivo CSV para os modelos Clientes, Vendedores, Vendas e Produtos'

    UNIQUE_FIELDS = {
        'Produtos': ['codigo'],
        'Clientes': ['id_original', 'origem'],
        'Vendas': ['numero_venda_original', 'origem'],
    }

    REQUIRED_FIELDS = {
        'Produtos': ['codigo', 'descricao'],
        'Clientes': ['id_original', 'origem', 'nome'],
        'Vendas': ['numero_venda_original', 'origem'],
    }

    COLUMN_MAPPINGS = {
        'Produtos': {
            'Código (SKU)': 'codigo',
            'Descrição': 'descricao',
            'Preço': 'preco_unitario',
            'Estoque disponível': 'estoque',
            'Custo': 'custo'
        },
        'Clientes': {
            'ID': 'id_original',
            'Nome': 'nome',
            'origem': 'origem',
            'CEP': 'cep',
            'CNPJ / CPF': 'cpf_cnpj',
            'Celular': 'celular',
            'Endereço': 'endereco',
            'Tipo pessoa': 'tipo_pessoa'
        },
        'Vendas': {
            'Número': 'numero_venda_original',
            'origem': 'origem',
            'Data da venda': 'data_compra',
            'E-commerce': 'canal_venda',
            'Situação da venda': 'situacao',
        }
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
            self.handle_error(e, csv_file)

    def get_model_name_from_file(self, csv_file):
        file_name = os.path.basename(csv_file)
        model_name, _ = os.path.splitext(file_name)
        return model_name

    def get_model(self, model_name):
        try:
            return apps.get_model('coremodels', model_name)
        except LookupError:
            self.stdout.write(self.style.ERROR(f'Modelo "{model_name}" não encontrado'))
            return None

    def get_column_mapping(self, model):
        return self.COLUMN_MAPPINGS.get(model.__name__, None)

    def load_csv(self, csv_file):
        try:
            df = pd.read_csv(csv_file, encoding='utf-8', low_memory=False)
            return df
        except Exception as e:
            logger.error(f'Erro ao carregar CSV: {e}')
            raise

    def validate_csv_columns(self, df, mapping):
        csv_columns = df.columns.tolist()
        missing_cols = [csv_col for csv_col in mapping.keys() if csv_col not in csv_columns]
        if missing_cols:
            raise ValueError(f'Colunas faltando no CSV: {", ".join(missing_cols)}')

    def clean_consumidor_final(self, model):
        """
        Remove registros duplicados de 'Consumidor Final' e mantém um único com ID 1.
        """
        if model.__name__ == 'Clientes':
            model.objects.filter(nome='Consumidor Final').delete()

    def get_existing_objects(self, model, df, mapping, model_name):
        unique_fields = self.UNIQUE_FIELDS.get(model_name)
        if not unique_fields:
            return {}

        unique_mapping_keys = [self.get_key_from_value(mapping, field) for field in unique_fields]
        unique_values = df[unique_mapping_keys].drop_duplicates().dropna()
        keys = unique_values.apply(lambda row: '|'.join(str(row[col]).strip().lower() for col in unique_mapping_keys), axis=1).tolist()

        existing_objects = {}
        for obj in model.objects.filter(Q(**{unique_fields[0]: keys})):
            key = '|'.join([str(getattr(obj, field)).strip().lower() for field in unique_fields])
            existing_objects[key] = obj

        return existing_objects

    def prepare_records(self, df, mapping, existing_objects, model, model_name):
        unique_fields = self.UNIQUE_FIELDS.get(model_name, [])
        unique_mapping_keys = [self.get_key_from_value(mapping, field) for field in unique_fields]
        df = df.drop_duplicates(subset=unique_mapping_keys)

        new_records, updated_records = [], []
        seen_unique_values = set()

        for _, row in df.iterrows():
            data = self.process_row(mapping, row, model_name)
            if data is None:
                continue

            unique_values = tuple(data[field] for field in unique_fields)
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

    def process_row(self, mapping, row, model_name):
        data = {}
        for csv_col, model_field in mapping.items():
            if csv_col in row:
                raw_value = row[csv_col]
                cleaned_value = self.clean_value(model_field, raw_value)
                data[model_field] = cleaned_value
        return data

    def clean_value(self, field, value):
        """
        Limpa e padroniza o valor com base no tipo de campo.
        """
        if pd.isna(value) or value in (None, '', '-'):
            if field == 'canal_venda':
                return 'Pdv'
            return None  # Tratar como nulo

        # Para strings, remover espaços em excesso
        if isinstance(value, str):
            value = value.strip()

        # Para números (int, float), converter para string se necessário
        if isinstance(value, (int, float)):
            value = str(value)

        try:
            if field in {'preco_unitario', 'estoque', 'custo'}:
                # Remover caracteres não numéricos e converter para Decimal
                value = re.sub(r'[^\d.,-]', '', value)
                return Decimal(value.replace(',', '.'))

            if field == 'data_compra':
                # Tentar converter a data em múltiplos formatos
                for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y'):
                    try:
                        return datetime.strptime(value, fmt).date()
                    except ValueError:
                        continue
                logger.error(f'Formato de data inválido para o campo "{field}": {value}')
                return None  # Retorna None se nenhum formato corresponder

            # Substituir valores vazios ou nulos em 'canal_venda' por 'Pdv'
            if field == 'canal_venda' and (not value or value.lower() == 'null'):
                return 'Pdv'
            return value
        except (InvalidOperation, ValueError, TypeError):
            logger.error(f'Erro ao limpar o campo "{field}" com valor "{value}"')
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

    def handle_error(self, error, csv_file):
        logger.error(f'Ocorreu um erro: {error}')
        self.stdout.write(self.style.ERROR(f'Ocorreu um erro: {error}'))

    def get_key_from_value(self, mapping, search_value):
        return next((key for key, value in mapping.items() if value == search_value), None)
