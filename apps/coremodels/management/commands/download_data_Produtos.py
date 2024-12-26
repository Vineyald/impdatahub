# automacao/management/commands/baixar_relatorios.py

from django.core.management.base import BaseCommand
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait, Select
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
from django.conf import settings

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
    help = 'Automatiza o login no Tiny Olist e baixa os relatórios disponíveis para a conta Servisign.'

    def handle(self, *args, **options):
        account = {
            'username': settings.TINY_OLIST_USERNAME_SERVI,
            'password': settings.TINY_OLIST_PASSWORD,
            'download_dir': os.path.join(os.getcwd(), 'temporary_files\servi')
        }

        # Executa o download dos relatórios para a conta Servisign
        self.download_reports(account)

        self.stdout.write(self.style.SUCCESS("Download concluído para a conta Servisign."))
        logger.info("Download concluído para a conta Servisign.")

    def download_reports(self, account):
        username = account['username']
        password = account['password']
        download_dir = account['download_dir']

        # Verificar as variáveis de configuração
        if not username or not password:
            self.stderr.write(self.style.ERROR(
                "Variáveis de configuração TINY_OLIST_USERNAME_SERVI ou TINY_OLIST_PASSWORD não estão definidas."
            ))
            logger.error("As variáveis de configuração necessárias não estão definidas.")
            return

        # Criar o diretório de download, se necessário
        if not os.path.exists(download_dir):
            os.makedirs(download_dir)
            logger.info(f"Diretório de download criado em: {download_dir}")

        # Configurar opções do Chrome
        chrome_options = Options()
        #chrome_options.add_argument('--headless=new')  # Modo headless
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        prefs = {
            "download.default_directory": download_dir,
            "download.prompt_for_download": False,
            "download.directory_upgrade": True,
            "safebrowsing.enabled": True
        }
        chrome_options.add_experimental_option("prefs", prefs)

        # Inicializar o WebDriver
        try:
            service = Service(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service, options=chrome_options)
            logger.info("WebDriver inicializado com sucesso.")
        except WebDriverException as e:
            self.stderr.write(self.style.ERROR(f"Erro ao inicializar o WebDriver: {e}"))
            logger.error(f"Erro ao inicializar o WebDriver: {e}")
            return

        wait = WebDriverWait(driver, 60)

        try:
            # Acessar o site e realizar o login
            self.perform_login(driver, wait, username, password)

            time.sleep(5)

            # Verificar e lidar com uma sessão existente
            self.handle_existing_session(driver, wait)

            time.sleep(5)

            # Navegar para a página de exportação e baixar os relatórios
            self.export_reports(driver, wait)

            # Esperar o download ser concluído
            self.stdout.write("Esperando o download ser concluído...")
            self.wait_for_download(download_dir)
            self.stdout.write(f"Download concluído com sucesso para {username}!")
            logger.info(f"Download concluído com sucesso para {username}.")

        except Exception as e:
            logger.error(f"Ocorreu um erro durante a automação para {username}: {e}")
            self.stderr.write(self.style.ERROR(f"Ocorreu um erro para {username}: {e}"))
        finally:
            driver.quit()
            logger.info(f"Navegador fechado para {username}.")


    def perform_login(self, driver, wait, username, password):
        """Realiza o login no sistema."""
        self.stdout.write(f"Acessando o site do Tiny Olist para {username}...")
        driver.get('https://erp.tiny.com.br/login/')
        logger.info(f"Página de login acessada para {username}.")

        # Preencher os campos de login
        username_field = wait.until(EC.presence_of_element_located((By.NAME, 'username')))
        username_field.clear()
        username_field.send_keys(username)

        password_field = wait.until(EC.presence_of_element_located((By.NAME, 'password')))
        password_field.clear()
        password_field.send_keys(password)

        # Clicar no botão de login
        login_button = wait.until(EC.element_to_be_clickable((By.XPATH, '//button[contains(text(), "entrar no Olist Tiny")]')))
        login_button.click()
        logger.info(f"Login realizado para {username}.")
        time.sleep(6)

    def export_reports(self, driver, wait):
        """Exporta os relatórios aplicando filtros necessários."""
        self.stdout.write("Navegando para a página de exportação de produtos...")
        driver.get('https://erp.tiny.com.br/relatorio_produtos_lista_precos')
        logger.info("Página de exportação de produtos acessada.")

        # Aplicar filtros e iniciar download
        self.stdout.write("Aplicando filtros de estoque...")
        stock_filter_select_element = wait.until(EC.element_to_be_clickable((By.ID, 'exibir_estoque')))
        Select(stock_filter_select_element).select_by_value('D')  # Estoque disponível

        self.stdout.write("Aplicando filtros de custo...")
        cost_filter_select_element = wait.until(EC.element_to_be_clickable((By.ID, 'exibir_custo')))
        Select(cost_filter_select_element).select_by_value('M')  # Custo médio

        # Visualizar relatório
        btn_view = wait.until(EC.element_to_be_clickable((By.ID, "btn-visualizar")))
        btn_view.click()
        time.sleep(15)

        # Baixar o relatório
        btn_download = wait.until(EC.element_to_be_clickable((By.ID, "btn-download")))
        btn_download.click()

        # Exportar o relatório
        btn_export = wait.until(EC.element_to_be_clickable((By.ID, "btnExportarRelatorio")))
        btn_export.click()
        logger.info("Exportação do relatório iniciada.")

    def wait_for_download(self, download_dir, timeout=120):
        """Espera até que todos os arquivos de download sejam concluídos no diretório especificado."""
        seconds = 0
        while seconds < timeout:
            time.sleep(10)
            if not any(filename.endswith('.crdownload') for filename in os.listdir(download_dir)):
                return
            seconds += 1
            if seconds % 10 == 0:
                logger.info(f"Aguardando conclusão do download... {seconds} segundos passados.")
        raise Exception("O download não foi concluído dentro do tempo esperado.")
    
    def handle_existing_session(self, driver, wait):
        """Lida com situações em que o login detecta uma sessão ativa."""
        try:
            logger.info("Verificando se a sessão já está ativa em outro dispositivo...")
            
            # Esperar o modal de sessão ativa
            modal_dialog = wait.until(
                EC.presence_of_element_located((By.CLASS_NAME, "modal-dialog"))
            )
            modal_title = modal_dialog.find_element(By.CLASS_NAME, "modal-title").text
            logger.info(f"Modal detectado com o título: {modal_title}")

            if "Sua sessão expirou" in modal_title or "Este usuário já está logado" in modal_title:
                logger.info("Sessão ativa detectada. Tentando reconexão.")
                
                # Clicar no botão de reconexão
                login_modal_button = modal_dialog.find_element(By.XPATH, ".//button[@class='btn btn-primary' and text()='login']")
                login_modal_button.click()
                logger.info("Reconexão realizada com sucesso.")
            else:
                logger.warning("O modal detectado não contém a mensagem esperada.")

        except TimeoutException:
            logger.warning("Modal de sessão ativa não apareceu dentro do tempo esperado.")
        except NoSuchElementException as e:
            logger.error(f"Erro ao localizar elementos no modal: {e}")
        except Exception as e:
            logger.error(f"Erro inesperado ao lidar com a sessão existente: {e}")
