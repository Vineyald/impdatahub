import os
import pandas as pd
from django.core.management.base import BaseCommand
import logging
from pathlib import Path
import mimetypes
import xlrd
import openpyxl

# Configurar o logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Concatena arquivos (CSV, Excel, etc.), exporta o resultado como CSV e exclui os arquivos originais.'

    def add_arguments(self, parser):
        parser.add_argument('name', type=str, help='Nome do arquivo CSV final')

    def handle(self, *args, **kwargs):
        name = kwargs['name']
        pre_process_dirs = {
            'servi': Path('temporary_files/servi'),
            'imp': Path('temporary_files/imp')
        }
        final_csv_dir = Path('datasets/csv')
        final_csv_name = f"{name}.csv"

        # Verificar se o diretório de destino existe, senão criar
        if not final_csv_dir.exists():
            final_csv_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Diretório de destino criado em: {final_csv_dir}")

        # Suportes de formatos de arquivo
        supported_formats = ['*.csv', '*.xlsx', '*.xls']

        # Lista para armazenar os DataFrames
        csv_dataframes = []

        # Processar os arquivos em cada diretório de origem
        for loja, pre_process_dir in pre_process_dirs.items():
            if not pre_process_dir.exists():
                logger.warning(f"Diretório de origem {pre_process_dir} não encontrado. Pulando.")
                continue

            for pattern in supported_formats:
                for file in pre_process_dir.glob(pattern):
                    if not self.is_valid_file(file):
                        logger.warning(f"Arquivo {file.name} está corrompido ou vazio. Pulando.")
                        self.stdout.write(self.style.WARNING(f"Arquivo {file.name} está corrompido ou vazio. Pulando."))
                        continue

                    try:
                        if file.suffix.lower() == '.csv':
                            df = pd.read_csv(file, dtype=str, encoding='utf-8', low_memory=False)
                        elif file.suffix.lower() == '.xlsx':
                            df = pd.read_excel(file, dtype=str, engine='openpyxl')
                        elif file.suffix.lower() == '.xls':
                            workbook = xlrd.open_workbook(file, ignore_workbook_corruption=True)
                            df = pd.read_excel(workbook, dtype=str, engine='xlrd')
                        else:
                            logger.warning(f"Formato de arquivo não suportado: {file}")
                            self.stdout.write(self.style.WARNING(f"Formato de arquivo não suportado: {file}"))
                            continue

                        # Adicionar a coluna "loja" se necessário
                        if name in ['Clientes','Vendas', 'ItemVenda']:
                            df['loja'] = loja
                            logger.info(f"Coluna 'loja' adicionada com valor '{loja}' para o arquivo {file.name}.")

                        csv_dataframes.append(df)
                        logger.info(f"Arquivo {file.name} lido com sucesso.")
                    except Exception as e:
                        logger.error(f"Erro ao ler o arquivo {file.name}: {e}")
                        self.stdout.write(self.style.ERROR(f"Erro ao ler o arquivo {file.name}: {e}"))
                        continue

        if not csv_dataframes:
            self.stdout.write(self.style.ERROR("Nenhum arquivo válido foi processado."))
            logger.error("Nenhum arquivo válido foi processado.")
            return

        try:
            # Concatenar todos os DataFrames
            self.stdout.write("Concatenando os DataFrames...")
            final_df = pd.concat(csv_dataframes, ignore_index=True, sort=False)
            logger.info("Todos os DataFrames foram concatenados.")

            # Remover registros duplicados
            final_df.drop_duplicates(inplace=True)
            self.stdout.write(self.style.SUCCESS("Registros duplicados removidos."))
            logger.info("Registros duplicados removidos.")

            # Salvar o DataFrame final como CSV
            final_csv_path = final_csv_dir / final_csv_name
            final_df.to_csv(final_csv_path, index=False, encoding='utf-8')
            self.stdout.write(
                self.style.SUCCESS(f"Arquivo {final_csv_name} exportado com sucesso para {final_csv_dir}."))
            logger.info(f"Arquivo {final_csv_name} exportado com sucesso para {final_csv_dir}.")

            # Deletar todos os arquivos processados
            for pre_process_dir in pre_process_dirs.values():
                for file in pre_process_dir.glob('*'):
                    try:
                        os.remove(file)
                        self.stdout.write(f"Arquivo {file.name} deletado.")
                        logger.info(f"Arquivo {file.name} deletado.")
                    except Exception as e:
                        logger.error(f"Erro ao deletar o arquivo {file.name}: {e}")
                        self.stdout.write(self.style.ERROR(f"Erro ao deletar o arquivo {file.name}: {e}"))

            self.stdout.write(self.style.SUCCESS("Todos os arquivos foram deletados."))
            logger.info("Todos os arquivos foram deletados.")

        except Exception as e:
            logger.error(f"Erro durante a execução do comando: {e}")
            self.stdout.write(self.style.ERROR(f"Erro durante a execução do comando: {e}"))

    def is_valid_file(self, file_path):
        """ Verifica se o arquivo não está corrompido e pode ser lido. """
        if file_path.stat().st_size == 0:
            return False
        file_type = mimetypes.guess_type(file_path)[0]
        if file_type not in ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']:
            return False
        return True
    
