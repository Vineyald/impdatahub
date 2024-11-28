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
    ElementNotInteractableException,
    WebDriverException,
)
import time
import os
import logging
import threading
from django.conf import settings
from datetime import datetime
import json

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

    def add_arguments(self, parser):
        parser.add_argument(
            '--links',
            type=str,
            required=True,
            help='Dicionário JSON contendo os links para cada conta no formato {"Servi": "link_servi", "Imp": "link_imp"}'
        )

    def handle(self, *args, **options):
        links_json = options['links']
        try:
            links = json.loads(links_json)
            if not isinstance(links, dict):
                raise ValueError
            if 'Servi' not in links or 'Imp' not in links:
                raise ValueError("O dicionário de links deve conter as chaves 'Servi' e 'Imp'.")
        except ValueError:
            raise CommandError(
                "O argumento --links deve ser um dicionário JSON válido com as chaves 'Servi' e 'Imp'. Exemplo: "
                "'{\"Servi\": \"https://link_servi.com\", \"Imp\": \"https://link_imp.com\"}'"
            )

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
            link = links.get(account_type)
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
        download_dir = account['download_dir']

        # Verify configuration variables
        if not username or not password:
            self.stderr.write(self.style.ERROR("TINY_OLIST_USERNAME or TINY_OLIST_PASSWORD not set."))
            return

        # Create download directory if it doesn't exist
        if not os.path.exists(download_dir):
            os.makedirs(download_dir)
            logger.info(f"Download directory created at {download_dir}")

        # Configure Chrome options
        chrome_options = Options()
        chrome_options.add_argument('--headless=new')  # Run Chrome headless
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        prefs = {
            "download.default_directory": download_dir,
            "download.prompt_for_download": False,
            "download.directory_upgrade": True,
            "safebrowsing.enabled": True
        }
        chrome_options.add_experimental_option("prefs", prefs)

        # Initialize WebDriver with webdriver-manager
        try:
            service = Service(ChromeDriverManager().install())  # Automatically managed
            driver = webdriver.Chrome(service=service, options=chrome_options)
            logger.info("WebDriver initialized with webdriver-manager.")
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

            # Interact with the page as requested

            # 1. Click on the "Últimos 7 dias" button to open the menu
            try:
                ultimos_7_dias_button = wait.until(
                    EC.element_to_be_clickable(
                        (By.XPATH, '//a[contains(@class, "filter-label") and contains(text(), "Últimos 7 dias")]')
                    )
                )
                ultimos_7_dias_button.click()
            except TimeoutException:
                logger.error("Button 'Últimos 7 dias' not found or not clickable.")
                self.stderr.write(self.style.ERROR("Button 'Últimos 7 dias' not found or not clickable."))
                return

            # 2. Select the "Período" item
            try:
                periodo_button = wait.until(
                    EC.element_to_be_clickable(
                        (By.XPATH, '//button[contains(text(), "Período")]')
                    )
                )
                periodo_button.click()
            except TimeoutException:
                logger.error("Button 'Período' not found or not clickable.")
                self.stderr.write(self.style.ERROR("Button 'Período' not found or not clickable."))
                return

            # 3. Fill in the dates
            try:
                # Fill in the start date
                data_inicial_input = wait.until(
                    EC.presence_of_element_located(
                        (By.XPATH, '//div[@class="tab-search-periodo"]//input[@class="form-control hasDatepicker"][1]')
                    )
                )
                data_inicial_input.clear()
                data_inicial_input.send_keys("01/01/2021")

            except TimeoutException:
                self.stderr.write(self.style.ERROR("Date fields not found."))
                return

            # 4. Click on the "Aplicar" button
            try:
                aplicar_button = wait.until(
                    EC.element_to_be_clickable(
                        (By.XPATH, '//div[@class="filter-controls"]//button[contains(text(), "Aplicar")]')
                    )
                )
                aplicar_button.click()
            except TimeoutException:
                logger.error("Button 'Aplicar' not found or not clickable.")
                self.stderr.write(self.style.ERROR("Button 'Aplicar' not found or not clickable."))
                return

            # 6. Click on the "download" button
            try:
                time.sleep(15)
                btn_download = wait.until(
                    EC.element_to_be_clickable(
                        (By.XPATH, '//button[@class="btn btn-default" and contains(.,"download")]')
                    )
                )
                btn_download.click()
            except TimeoutException:
                logger.error("Button 'download' not found or not clickable.")

            try:
                logger.info(f"Iniciando processamento para a conta: {account['type']}.")
                
                # Verifica a presença do loadbar e aguarda sua remoção
                skip_process = False
                try:
                    logger.info("Verificando presença da barra de progresso...")
                    time.sleep(5)
                    loadbar = wait.until(wait.until_not(EC.visibility_of_element_located(
                        (By.CSS_SELECTOR, '.card-body-space-progress')
                    )))
                    logger.info("Barra de progresso visível. Aguardando remoção...")

                    # Aguarda a barra desaparecer (ou timeout)
                    wait.until(staleness_of(loadbar))
                    logger.info("Barra de progresso removida.")
                    skip_process = True
                except TimeoutException:
                    logger.info("Barra de progresso não detectada ou não removida dentro do tempo limite. Prosseguindo.")
                except Exception as e:
                    logger.error(f"Erro inesperado ao verificar a barra de progresso: {e}")
                    skip_process = False  # Continua mesmo com erro

                # Tenta clicar no botão "Processar Outro Arquivo" caso necessário
                time.sleep(5)
                if not skip_process:
                    try:
                        logger.info(f"Tentando clicar no botão 'Processar Outro Arquivo' para a conta {account['type']}...")
                        processar_outro_button = wait.until(
                            EC.element_to_be_clickable(
                                (By.XPATH, '//button[contains(@class, "btn-ghost") and contains(.,"processar outro arquivo")]')
                            )
                        )
                        processar_outro_button.click()
                        logger.info(f"Botão 'Processar Outro Arquivo' clicado para a conta {account['type']}.")
                    except TimeoutException:
                        logger.info("Botão 'Processar Outro Arquivo' não encontrado ou não clicável. Tentando próximo passo.")
                    except Exception as e:
                        logger.error(f"Erro inesperado ao clicar no botão 'Processar Outro Arquivo': {e}")

                # Tenta clicar no botão "Continuar" caso "Processar Outro Arquivo" não tenha sido clicado
                time.sleep(5)
                if not skip_process:
                    try:
                        logger.info(f"Tentando clicar no botão 'Continuar' para a conta {account['type']}...")
                        continuar_button = wait.until(
                            EC.element_to_be_clickable(
                                (By.XPATH, '//div[@class="modal-footer"]//button[contains(text(), "continuar")]')
                            )
                        )
                        continuar_button.click()
                        logger.info(f"Botão 'Continuar' clicado com sucesso para a conta {account['type']}.")
                    except TimeoutException:
                        logger.error("Botão 'Continuar' não encontrado ou não clicável.")
                        self.stderr.write(self.style.ERROR("Botão 'Continuar' não encontrado ou não clicável dentro do tempo limite."))
                    except Exception as e:
                        logger.error(f"Erro inesperado ao clicar no botão 'Continuar': {e}")

            except Exception as e:
                logger.error(f"Erro inesperado ao processar a conta {account['type']}: {e}")
                self.stderr.write(self.style.ERROR(f"Erro inesperado ao processar a conta {account['type']}: {e}"))
                    
            # 9. Wait for the loading bar to finish
            try:
                time.sleep(100)
                self.wait_for_loading_bar(driver)
            except Exception as e:
                logger.error(f"Error waiting for the loading bar to finish: {e}")
                self.stderr.write(self.style.ERROR(f"Error waiting for the loading bar to finish: {e}"))
                return

            # 10. Click on the "Baixar" button to start the download
            try:
                baixar_button = WebDriverWait(driver, 30).until(
                    EC.element_to_be_clickable(
                        (By.XPATH, '//div[@class="modal-footer"]//button[contains(@class, "btn-primary") and contains(text(), "Baixar")]')
                    )
                )
                baixar_button.click()
            except TimeoutException:
                logger.error("Button 'Baixar' not found or not clickable.")
                self.stderr.write(self.style.ERROR("Button 'Baixar' not found or not clickable."))
                return

            # 11. Wait for the download to finish
            try:
                self.wait_for_download(download_dir)
                self.stdout.write(f"Download finished successfully for {username}!")
                logger.info(f"Download finished successfully for {username}.")
            except Exception as e:
                logger.error(f"Error waiting for the download to finish for {username}: {e}")
                self.stderr.write(self.style.ERROR(f"Error waiting for the download to finish for {username}: {e}"))

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

    def wait_for_loading_bar(self, driver: webdriver.Chrome, timeout: int = 180) -> None:
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

