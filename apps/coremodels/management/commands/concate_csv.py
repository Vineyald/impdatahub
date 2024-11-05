import os
import pandas as pd
from django.core.management.base import BaseCommand
import logging
from pathlib import Path
import mimetypes
import xlrd

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
    help = 'Agrupa todos os arquivos baixados (CSV, Excel, etc.), exporta o arquivo final em CSV e deleta os registros antigos.'

    def add_arguments(self, parser):
        parser.add_argument('name', type=str, help='Modelo para atualizar')

    def handle(self, *args, **kwargs):
        # Diretórios de origem e destino
        pre_process_dirs = {
            'imp': Path('temporary_files/imp'),
            'servi': Path('temporary_files/servi')
        }
        final_csv_dir = Path('datasets/csv')
        final_csv_name = f"{kwargs['name']}.csv"

        # Verificar se o diretório de destino existe, senão criar
        if not final_csv_dir.exists():
            final_csv_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Diretório de destino criado em: {final_csv_dir}")

        # Suportes de formatos de arquivo
        supported_formats = ['*.csv', '*.xlsx', '*.xls']

        # Inicializando uma lista para armazenar os DataFrames
        csv_dataframes = []

        # Loop pelos diretórios de origem (imp e servi)
        for origem, pre_process_dir in pre_process_dirs.items():
            if not pre_process_dir.exists():
                self.stdout.write(self.style.WARNING(f"Diretório de origem {pre_process_dir} não existe. Pulando."))
                logger.warning(f"Diretório de origem {pre_process_dir} não existe. Pulando.")
                continue

            # Lista de arquivos na pasta de pré-processamento
            csv_files = []
            for pattern in supported_formats:
                csv_files.extend(pre_process_dir.glob(pattern))

            if not csv_files:
                self.stdout.write(self.style.WARNING(f"Nenhum arquivo encontrado no diretório {pre_process_dir}."))
                logger.warning(f"Nenhum arquivo encontrado no diretório {pre_process_dir}.")
                continue

            # Processar cada arquivo
            for file in csv_files:
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

                    # Adicionar coluna de origem ao DataFrame
                    df['origem'] = origem
                    csv_dataframes.append(df)
                    logger.info(f"Arquivo {file.name} lido com sucesso.")

                except Exception as e:
                    logger.error(f"Erro ao ler o arquivo {file.name}: {e}")
                    self.stdout.write(self.style.ERROR(f"Erro ao ler o arquivo {file.name}: {e}"))
                    continue

        if not csv_dataframes:
            self.stdout.write(self.style.ERROR("Nenhum DataFrame foi criado a partir dos arquivos lidos."))
            logger.error("Nenhum DataFrame foi criado a partir dos arquivos lidos.")
            return

        try:
            # Concatenar todos os DataFrames
            self.stdout.write("Concatenando os DataFrames...")
            final_df = pd.concat(csv_dataframes, ignore_index=True, sort=False)
            logger.info("Todos os DataFrames foram concatenados.")

            # Se o modelo for 'Produtos', aplicar a lógica específica
            if kwargs['name'].lower() == "produtos":
                final_df = self.processar_produtos(final_df)  # Atribui o DataFrame retornado

            else:
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

            # Deletar todos os arquivos da pasta de pré-processamento
            for origem, pre_process_dir in pre_process_dirs.items():
                csv_files = pre_process_dir.glob('*')
                for file in csv_files:
                    try:
                        os.remove(file)
                        self.stdout.write(f"Arquivo {file.name} deletado.")
                        logger.info(f"Arquivo {file.name} deletado.")
                    except Exception as e:
                        logger.error(f"Erro ao deletar o arquivo {file.name}: {e}")
                        self.stdout.write(self.style.ERROR(f"Erro ao deletar o arquivo {file.name}: {e}"))


            self.stdout.write(self.style.SUCCESS("Todos os arquivos foram deletados das pastas de pré-processamento."))
            logger.info("Todos os arquivos foram deletados das pastas de pré-processamento.")

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

    def processar_produtos(self, df):
        """ Processa os ajustes específicos para o modelo Produtos """
        self.stdout.write("Processando ajustes para Produtos...")
        logger.info("Processando ajustes específicos para Produtos...")

        # Converter a coluna 'Estoque disponível' para numérico
        df['Estoque disponível'] = pd.to_numeric(df['Estoque disponível'], errors='coerce')

        # Remover duplicatas com estoque zero ou negativo
        for origem, df_group in df.groupby('origem'):
            # Mantém apenas as linhas que NÃO são duplicadas ou têm estoque zero, NaN, ou SKU vazio
            df_group_clean = df_group[~((df_group['Código (SKU)'].duplicated(keep=False)) &
                                        ((df_group['Estoque disponível'].isna()) |
                                         (df_group['Estoque disponível'] <= 0) |
                                         (df_group['Código (SKU)'].isna()))
                                        )]

            # Atualiza o DataFrame principal removendo as duplicatas e linhas inválidas
            df = df[df['origem'] != origem]  # Remove o grupo atual
            df = pd.concat([df, df_group_clean], ignore_index=True)

        # Verifica se ambas as origens 'servi' e 'imp' estão presentes no DataFrame
        if 'servi' in df['origem'].unique() and 'imp' in df['origem'].unique():
            # Separa os DataFrames por origem
            df_servi = df[df['origem'] == 'servi'].copy()
            df_imp = df[df['origem'] == 'imp'].copy()

            # Faz o merge dos dois DataFrames com base no 'Código (SKU)' que aparece em ambas as origens
            merged_df = pd.merge(df_servi, df_imp, on='Código (SKU)', how='outer', suffixes=('_servi', '_imp'))

            # Preenche NaN com 0 para somar corretamente os estoques, mesmo que sejam valores negativos
            merged_df['Estoque disponível_servi'] = merged_df['Estoque disponível_servi'].fillna(0)
            merged_df['Estoque disponível_imp'] = merged_df['Estoque disponível_imp'].fillna(0)

            # Soma os valores de 'Estoque disponível' das duas origens (considerando valores negativos)
            merged_df['Estoque disponível_total'] = merged_df['Estoque disponível_servi'] + merged_df[
                'Estoque disponível_imp']

            # Atualiza o DataFrame de 'servi' com o novo estoque total
            df_servi = df_servi.set_index('Código (SKU)')
            df_servi.update(merged_df[['Código (SKU)', 'Estoque disponível_total']].set_index('Código (SKU)').rename(
                columns={'Estoque disponível_total': 'Estoque disponível'}))

            # Atualiza o DataFrame principal com os valores corrigidos de 'servi'
            df.update(df_servi.reset_index())

            # Remove as linhas da origem 'imp' que foram mescladas
            df = df[df['origem'] != 'imp']

        logger.info("Ajustes específicos para Produtos foram concluídos.")
        self.stdout.write(self.style.SUCCESS("Ajustes específicos para Produtos foram concluídos."))

        return df  # Retorna o DataFrame modificado
