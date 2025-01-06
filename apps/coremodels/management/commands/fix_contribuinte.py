# app/management/commands/process_csvs.py
import os
import pandas as pd
from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'Processa CSVs em uma pasta, ajusta colunas e divide o resultado em partes menores'

    def handle(self, *args, **kwargs):
        input_dir = "E:/08 - Imperio DataHub/impdatahub/temporary_files/servi"
        output_dir = "E:/08 - Imperio DataHub/impdatahub/temporary_files"

        # Verifica se os diretórios existem
        if not os.path.isdir(input_dir):
            self.stderr.write(self.style.ERROR(f"Diretório de entrada não encontrado: {input_dir}"))
            return

        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        # Lê todos os arquivos CSV no diretório
        csv_files = [os.path.join(input_dir, f) for f in os.listdir(input_dir) if f.endswith('.csv')]

        if not csv_files:
            self.stderr.write(self.style.ERROR(f"Nenhum arquivo CSV encontrado em: {input_dir}"))
            return

        # Combina todos os CSVs em um único DataFrame
        self.stdout.write(self.style.SUCCESS(f"Lendo {len(csv_files)} arquivos CSV..."))
        combined_df = pd.concat((pd.read_csv(f) for f in csv_files), ignore_index=True)

        # Processa a coluna "Tipo pessoa"
        self.stdout.write("Ajustando a coluna 'Contribuinte'...")
        combined_df['Contribuinte'] = combined_df['Tipo pessoa'].map({
            'Pessoa Física': 9,
            'Pessoa Jurídica': 1
        }).fillna(0).astype(int)

        # Divide o DataFrame em partes de até 2000 linhas
        num_files = 0
        for i in range(0, len(combined_df), 2000):
            chunk = combined_df.iloc[i:i + 2000]
            output_file = os.path.join(output_dir, f'processed_part_{num_files + 1}.csv')
            chunk.to_csv(output_file, index=False)
            self.stdout.write(self.style.SUCCESS(f"Arquivo salvo: {output_file}"))
            num_files += 1

        self.stdout.write(self.style.SUCCESS(f"Processamento concluído. {num_files} arquivos criados."))
