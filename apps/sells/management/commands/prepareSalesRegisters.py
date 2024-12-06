# file: your_project/your_app/management/commands/combine_sales_orders.py

import pandas as pd
from pathlib import Path
from django.core.management.base import BaseCommand
import logging
import unidecode

# Set up logging for debugging
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Combine CSV files with normalization and merging based on client data into a single file.'

    def handle(self, *args, **kwargs):
        base_folder = Path('datasets/basefiles/sellorders')
        combined_folder = Path('datasets/csv')
        combined_file_path = combined_folder / "itemVenda.csv"
        combined_folder.mkdir(parents=True, exist_ok=True)

        # Define the structures to process
        structures = ['servi', 'imp']

        # Load and normalize the client mapping CSV
        clients_file = combined_folder / "Clientes.csv"
        if clients_file.is_file():
            try:
                clients_df = pd.read_csv(clients_file)
                # Normalize client names for comparison
                clients_df['normalized_name'] = clients_df['Nome'].apply(lambda x: unidecode.unidecode(str(x)).lower())
            except Exception as e:
                self.stderr.write(self.style.ERROR(f"Failed to read 'Clientes.csv': {str(e)}"))
                return
        else:
            self.stderr.write(self.style.ERROR(f"Clients file '{clients_file}' does not exist."))
            return

        combined_data = []  # Collect all data here

        for structure in structures:
            structure_folder = base_folder / structure / 'csv'

            if not structure_folder.is_dir():
                self.stderr.write(self.style.ERROR(f"Folder '{structure_folder}' does not exist or is not a directory."))
                continue

            # Traverse the directory and read all CSV files
            for year_folder in structure_folder.iterdir():
                if not year_folder.is_dir():
                    continue

                for zip_folder in year_folder.iterdir():
                    if not zip_folder.is_dir():
                        continue

                    for csv_file in zip_folder.glob("*.csv"):
                        try:
                            df = pd.read_csv(csv_file)

                            # Validate required columns
                            required_columns = {'ID contato', 'Nome do contato'}
                            if not required_columns.issubset(df.columns):
                                missing = required_columns - set(df.columns)
                                self.stderr.write(
                                    self.style.ERROR(
                                        f"Skipping file '{csv_file}' due to missing columns: {', '.join(missing)}"
                                    )
                                )
                                continue

                            # Add the loja column to indicate origin
                            df['loja'] = structure

                            # ...
                            
                            # Normalize "Nome do contato" and map to "ID"
                            df['normalized_nome_contato'] = df['Nome do contato'].apply(lambda x: unidecode.unidecode(str(x)).lower())

                            # Merge with clients_df to map IDs
                            df = df.merge(
                                clients_df[['ID', 'normalized_name']],
                                left_on='normalized_nome_contato',
                                right_on='normalized_name',
                                how='left'
                            )

                            # Rename 'ID_y' to 'ID' if it exists after merging
                            if 'ID_y' in df.columns:
                                df = df.rename(columns={'ID_y': 'ID'})

                            # Retain original "ID contato" if no match is found in Clientes.csv
                            df['ID contato'] = df['ID'].combine_first(df['ID contato'])

                            # Drop temporary columns used for normalization and merging
                            df.drop(columns=['normalized_nome_contato', 'normalized_name', 'ID_x'], errors='ignore', inplace=True)

                            combined_data.append(df)
                            self.stdout.write(self.style.SUCCESS(f"Read and processed file: {csv_file}"))
                        except pd.errors.EmptyDataError:
                            self.stderr.write(self.style.ERROR(f"Skipping empty file: {csv_file}"))
                        except Exception as e:
                            self.stderr.write(self.style.ERROR(f"Failed to read '{csv_file}': {str(e)}"))

        # Combine all dataframes into one and save
        if combined_data:
            final_combined_df = pd.concat(combined_data, ignore_index=True)
            final_combined_df.to_csv(combined_file_path, index=False)
            self.stdout.write(self.style.SUCCESS(f"Combined CSV saved to {combined_file_path}"))
        else:
            self.stderr.write(self.style.WARNING("No valid files found to combine."))
