# automacao/management/commands/baixar_relatorios.py

from django.core.management.base import BaseCommand, CommandError
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.expected_conditions import staleness_of, invisibility_of_element_located, presence_of_element_located
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from selenium.common.exceptions import (
    TimeoutException,
    NoSuchElementException,
    WebDriverException,
)
import time
import os
import logging
import threading
from django.conf import settings
from datetime import datetime

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
    help = 'Automatiza o login no Tiny Olist e baixa os relatórios disponíveis para múltiplas contas.'

    def handle(self, *args, **options):
        accounts = [
            {
                'type': 'Servi',
                'username': settings.TINY_OLIST_USERNAME_SERVI,
                'password': settings.TINY_OLIST_PASSWORD,
                'download_dir': os.path.join(os.getcwd(), 'temporary_files\servi')
            },
            {
                'type': 'Imp',
                'username': settings.TINY_OLIST_USERNAME_IMP,
                'password': settings.TINY_OLIST_PASSWORD,
                'download_dir': os.path.join(os.getcwd(), 'temporary_files\imp')
            },
        ]

        threads = []

        for account in accounts:
            account_type = account['type']
            link = "https://erp.tiny.com.br/vendas#"
            if not link:
                self.stderr.write(self.style.ERROR(
                    f"Link não fornecido para a conta do tipo '{account_type}'."
                ))
                logger.error(f"Link não fornecido para a conta do tipo '{account_type}'.")
                continue  # Pula para a próxima conta

            thread = threading.Thread(target=self.download_reports, args=(account, link))
            threads.append(thread)
            thread.start()

        for thread in threads:
            thread.join()

        self.stdout.write(self.style.SUCCESS("Todos os downloads foram processados."))
        logger.info("Todos os downloads foram processados.")

    def download_reports(self, account: dict, link: str) -> None:
        username = account['username']
        password = account['password']
        account_type = account['type']
        
        # Get the month name and number
        today = datetime.today()
        month_number = today.month
        month_name = today.strftime("%B").capitalize()  # Month name in Portuguese
        file_name = f"{month_number} - {month_name}.zip"

        # Determine the download directory based on the account type
        if account_type == "Servi":
            base_dir = os.path.join("datasets", "basefiles", "sellorders", "servi", "zipfiles")
        elif account_type == "Imp":
            base_dir = os.path.join("datasets", "basefiles", "sellorders", "imp", "zipfiles")
        else:
            self.stderr.write(self.style.ERROR(f"Unknown account type: {account_type}"))
            return

        # Create download directory if it doesn't exist
        if not os.path.exists(base_dir):
            os.makedirs(base_dir)
            logger.info(f"Download directory created at {base_dir}")

        download_path = os.path.join(base_dir, file_name)

        # Remove existing file if it exists
        if os.path.exists(download_path):
            os.remove(download_path)
            logger.info(f"Existing file {file_name} removed.")

        # Configure Chrome options
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        prefs = {
            "download.default_directory": os.path.abspath(base_dir),  # Use absolute path for reliability
            "download.prompt_for_download": False,
            "download.directory_upgrade": True,
            "safebrowsing.enabled": True,
        }
        chrome_options.add_experimental_option("prefs", prefs)

        # Initialize WebDriver with webdriver-manager
        try:
            service = Service(ChromeDriverManager().install())  # Automatically managed
            driver = webdriver.Chrome(service=service, options=chrome_options)
            logger.info(f"WebDriver initialized with Chrome, downloading to {os.path.abspath(base_dir)}.")
        except WebDriverException as e:
            self.stderr.write(self.style.ERROR(f"Error initializing WebDriver: {e}"))
            return


        wait = WebDriverWait(driver, 20)  # Maximum wait time

        try:
            # Login to Olist Tiny
            driver.get('https://erp.tiny.com.br/login/')
            username_field = wait.until(EC.presence_of_element_located((By.NAME, 'username')))
            username_field.clear()
            username_field.send_keys(username)

            password_field = wait.until(EC.presence_of_element_located((By.NAME, 'password')))
            password_field.clear()
            password_field.send_keys(password)

            login_button = wait.until(EC.element_to_be_clickable((By.XPATH, '//button[contains(text(), "entrar no Olist Tiny")]')))
            login_button.click()

            time.sleep(6)  # Wait for login response

            # Check if login was successful
            try:
                WebDriverWait(driver, 15).until(
                    EC.presence_of_element_located((By.CLASS_NAME, "modal-dialog"))
                )
                modal_title = driver.find_element(By.CLASS_NAME, "modal-title").text
                if "Este usuário já está logado em outro dispositivo" in modal_title:
                    # Click on the "login" button in the modal
                    login_modal_button = driver.find_element(By.XPATH, "//button[contains(text(), 'login')]")
                    login_modal_button.click()
                else:
                    logger.info("Modal with multiple login message not found.")
            except NoSuchElementException:
                logger.info("No modal detected.")
            except TimeoutException:
                logger.info("No modal detected within the expected time.")
            except Exception as e:
                logger.error(f"Error logging in to Olist Tiny for {username}: {e}")
                self.stderr.write(self.style.ERROR(f"Error logging in to Olist Tiny for {username}: {e}"))

            # Navigate to the specific URL for the account
            time.sleep(5)
            driver.get(link)

            # Step 1: Locate and click the "Período" dropdown link
            periodo_dropdown = wait.until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "li.filter-active a.filter-label.filter-toggle"))
            )
            periodo_dropdown.click()

            # Step 2: Wait for and select the "Do mês" option
            do_mes_button = wait.until(
                EC.element_to_be_clickable((By.ID, "opc-per-mes"))
            )
            do_mes_button.click()

            # Step 3: Click the "Aplicar" button
            aplicar_button = wait.until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "button.btn-primary.filter-apply"))
            )
            aplicar_button.click()

            # Export the report
            mais_acoes_button = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "button.btn.btn-menu-acoes.dropdown-toggle"))
            )
            mais_acoes_button.click()

            exportar_pedidos_option = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "a.act-exportar"))
            )
            exportar_pedidos_option.click()

            # Wait until the label element for CSV is visible and clickable
            csv_label = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//label[input[@name='tipoExportacao' and @value='CSV']]"))
            )
            # Click the label to select the radio button
            csv_label.click()

            exportar_vendas_button = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.ID, "btnExportarVendasPlanilha"))
            )
            exportar_vendas_button.click()

            time.sleep(5)

            # Wait for the download to complete
            self.wait_for_download(base_dir, timeout=120)

            # Rename the downloaded file to the desired format
            self.rename_downloaded_file(
                download_dir=base_dir,
                expected_name=file_name
            )

        except TimeoutException as te:
            logger.error(f"Timeout waiting for an element for {username}: {te}")
            self.stderr.write(self.style.ERROR(f"Timeout waiting for an element for {username}: {te}"))
        except Exception as e:
            logger.error(f"Error while downloading report for {username}: {e}")
            self.stderr.write(self.style.ERROR(f"Error while downloading report for {username}: {e}"))
        finally:
            driver.quit()
            logger.info(f"Browser closed for {username}.")

    def wait_for_download(self, download_dir, timeout=120):
        """
        Espera até que todos os arquivos de download sejam concluídos no diretório especificado.
        """
        seconds = 0
        download_complete = False
        while not download_complete and seconds < timeout:
            time.sleep(1)
            download_complete = True
            for filename in os.listdir(download_dir):
                if filename.endswith('.crdownload'):
                    download_complete = False
                    break
            seconds += 1
            if seconds % 10 == 0:
                logger.info(f"Aguardando conclusão do download... {seconds} segundos passados.")
        if not download_complete:
            raise Exception("O download não foi concluído dentro do tempo esperado.")

    def wait_for_loading_bar(self, driver: webdriver.Chrome, timeout: int = 250) -> None:
        """
        Waits until the loading bar disappears.
        """
        wait = WebDriverWait(driver, timeout)
    
        try:
            # Wait until the loading bar is invisible
            wait.until_not(EC.visibility_of_element_located(
                (By.CSS_SELECTOR, '.card-body-space-progress')
            ))
    
        except TimeoutException as timeout_exception:
            raise Exception("The loading bar did not disappear within the expected time.") from timeout_exception
        except Exception as exception:
            raise Exception("An error occurred while waiting for the loading bar to disappear.") from exception

    def rename_downloaded_file(self, download_dir, expected_name):
        """
        Renames the latest downloaded file in the directory to the expected name.
        Deletes the original file after renaming to avoid duplication.
        """
        logger.info(f"Renaming file in {download_dir} to {expected_name}")
        for filename in os.listdir(download_dir):
            if filename.endswith(".csv") or filename.endswith(".zip"):  # Adjust based on the downloaded file type
                old_file_path = os.path.join(download_dir, filename)
                new_file_path = os.path.join(download_dir, expected_name)
                
                # If a file with the new name already exists, delete it
                if os.path.exists(new_file_path):
                    os.remove(new_file_path)
                    logger.info(f"Deleted existing file with the name {expected_name}")
                
                # Rename the original file
                os.rename(old_file_path, new_file_path)
                logger.info(f"File renamed from {filename} to {expected_name}")
                break

