# file: your_project/your_app/management/commands/unzip_sales_orders.py

import zipfile
from pathlib import Path
from datetime import datetime
from django.core.management.base import BaseCommand
import logging

# Set up logging for debugging
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Unzip sales orders and organize into a structured folder hierarchy.'

    def handle(self, *args, **kwargs):
        # Convert base_folder to a Path object
        base_folder = Path('datasets/basefiles/')
        zip_folder = base_folder / 'sellorders' / 'servi' / 'zipfiles'
        csv_folder = base_folder / 'sellorders' / 'servi' / 'csv'

        if not zip_folder.is_dir():
            self.stderr.write(self.style.ERROR(f"Zip folder '{zip_folder}' does not exist or is not a directory."))
            return

        csv_folder.mkdir(parents=True, exist_ok=True)

        # Create a directory for the current year within the csv folder
        year_folder = csv_folder / str(datetime.now().year)
        year_folder.mkdir(parents=True, exist_ok=True)

        for zip_path in zip_folder.glob("*.zip"):
            try:
                with zipfile.ZipFile(zip_path, 'r') as zip_file:
                    zip_name = zip_path.stem  # Extract the name without extension

                    # Create a subdirectory named after the zip file within the year folder
                    zip_output_folder = year_folder / zip_name
                    zip_output_folder.mkdir(parents=True, exist_ok=True)

                    for file_name in zip_file.namelist():
                        # Skip directories in zip
                        if file_name.endswith('/'):
                            continue

                        # Construct the output file path
                        output_file_path = zip_output_folder / Path(file_name).name

                        # Extract the file to the designated location
                        with zip_file.open(file_name) as source_file, open(output_file_path, 'wb') as target_file:
                            target_file.write(source_file.read())

                        logger.info(f"Extracted to: {output_file_path}")
                        self.stdout.write(self.style.SUCCESS(f"Processed {output_file_path}"))

            except zipfile.BadZipFile:
                self.stderr.write(self.style.ERROR(f"Failed to process '{zip_path}' (not a valid zip file)."))
            except Exception as e:
                self.stderr.write(self.style.ERROR(f"An error occurred while processing '{zip_path}': {str(e)}"))
