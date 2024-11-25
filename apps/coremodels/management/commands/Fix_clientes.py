# myapp/management/commands/process_csv.py
import csv
import os
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Processa um CSV de clientes conforme requisitos, mescla duplicatas, divide em arquivos menores e remove a coluna 'origem'"

    def add_arguments(self, parser):
        parser.add_argument('input_csv', type=str, help="Caminho do arquivo CSV de entrada")
        parser.add_argument('output_dir', type=str, help="Diretório para salvar os arquivos CSV de saída")

    def handle(self, *args, **kwargs):
        input_csv = kwargs['input_csv']
        output_dir = kwargs['output_dir']

        if not os.path.exists(input_csv):
            self.stderr.write(self.style.ERROR(f"Arquivo {input_csv} não encontrado!"))
            return

        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        try:
            processed_rows = self.process_csv(input_csv)
            self.write_csv_in_chunks(output_dir, processed_rows, chunk_size=30000)
            self.stdout.write(self.style.SUCCESS(f"CSV processado e arquivos salvos em {output_dir}"))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Erro ao processar CSV: {e}"))

    def process_csv(self, input_csv):
        rows = []
        merged = {}

        def normalize_text(text):
            """Normaliza texto para comparação, removendo espaços e ignorando capitalização."""
            return ' '.join(word.capitalize() for word in text.split())

        with open(input_csv, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                # Normalizar o nome para comparação
                normalized_name = normalize_text(row['Nome'])
                origem = row.get('loja', '').strip().lower()
                row['Nome'] = normalized_name  # Atualiza para Camel Case no resultado

                # Agrupar por Nome (chave normalizada)
                if normalized_name not in merged:
                    merged[normalized_name] = {'servi': None, 'imp': None}

                # Armazenar linha com base na origem
                if origem == 'servi':
                    merged[normalized_name]['servi'] = row
                elif origem == 'imp':
                    merged[normalized_name]['imp'] = row

        # Resolver duplicatas priorizando servi
        for name, sources in merged.items():
            if sources['servi']:
                # Se houver um servi, usar o ID de servi
                rows.append(sources['servi'])
            elif sources['imp']:
                # Se não houver servi, usar o imp
                rows.append(sources['imp'])

        # Remover a coluna 'origem'
        for row in rows:
            if 'origem' in row:
                del row['origem']

        return rows

    def write_csv_in_chunks(self, output_dir, rows, chunk_size=900000):
        file_count = 0

        for i in range(0, len(rows), chunk_size):
            file_count += 1
            chunk = rows[i:i + chunk_size]
            output_file = os.path.join(output_dir, f"Clientes.csv")

            with open(output_file, 'w', newline='', encoding='utf-8') as file:
                writer = csv.DictWriter(file, fieldnames=chunk[0].keys())
                writer.writeheader()
                writer.writerows(chunk)
