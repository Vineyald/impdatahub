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
    ElementNotInteractableException,
    WebDriverException,
)
import time
import os
import logging
import threading
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
    help = 'Automatiza o login no Tiny Olist e baixa os relatórios disponíveis para múltiplas contas.'

    def handle(self, *args, **options):

        accounts = [
            {
                'username': settings.TINY_OLIST_USERNAME_SERVI,
                'password': settings.TINY_OLIST_PASSWORD,
                'download_dir': os.path.join(os.getcwd(), 'temporary_files\servi')
            },
            {
                'username': settings.TINY_OLIST_USERNAME_IMP,
                'password': settings.TINY_OLIST_PASSWORD,
                'download_dir': os.path.join(os.getcwd(), 'temporary_files\imp')
            },
        ]

        threads = []

        for account in accounts:
            thread = threading.Thread(target=self.download_reports, args=(account,))
            threads.append(thread)
            thread.start()

        for thread in threads:
            thread.join()

        self.stdout.write(self.style.SUCCESS("Todos os downloads foram processados."))
        logger.info("Todos os downloads foram processados.")

    def download_reports(self, account):

        username = account['username']
        password = account['password']
        download_dir = account['download_dir']

        # Verificação das variáveis
        if not username or not password:
            self.stderr.write(self.style.ERROR(
                "Variáveis de configuração TINY_OLIST_USERNAME, TINY_OLIST_PASSWORD ou CHROMEDRIVER_PATH não estão definidas."
            ))
            logger.error(
                "Variáveis de configuração TINY_OLIST_USERNAME, TINY_OLIST_PASSWORD ou CHROMEDRIVER_PATH não estão definidas.")
            return

        # Criar diretório de download se não existir
        if not os.path.exists(download_dir):
            os.makedirs(download_dir)
            logger.info(f"Diretório de download criado em: {download_dir}")

        # Configurar opções do Chrome
        chrome_options = Options()
        chrome_options.add_argument('--headless=new')  # Executa o Chrome em modo headless (descomente para rodar em headless)
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        prefs = {
            "download.default_directory": download_dir,
            "download.prompt_for_download": False,
            "download.directory_upgrade": True,
            "safebrowsing.enabled": True
        }
        chrome_options.add_experimental_option("prefs", prefs)

        # Inicializar o WebDriver com webdriver-manager
        try:
            service = Service(ChromeDriverManager().install())  # Gerenciado automaticamente
            driver = webdriver.Chrome(service=service, options=chrome_options)
            logger.info("WebDriver inicializado com sucesso usando webdriver-manager.")
        except WebDriverException as e:
            self.stderr.write(self.style.ERROR(f"Erro ao inicializar o WebDriver: {e}"))
            logger.error(f"Erro ao inicializar o WebDriver: {e}")
            return

        wait = WebDriverWait(driver, 60)

        try:
            self.stdout.write(f"Acessando o site do Tiny Olist para {username}...")
            driver.get('https://erp.tiny.com.br/login/')
            logger.info(f"Página de login acessada para {username}.")

            # Esperar o campo de username estar presente
            self.stdout.write("Esperando o campo de E-mail ou Login...")
            username_field = wait.until(EC.presence_of_element_located((By.NAME, 'username')))
            logger.info("Campo de E-mail ou Login encontrado.")

            # Preencher o campo de username
            self.stdout.write("Preenchendo o campo de E-mail ou Login...")
            username_field.clear()
            username_field.send_keys(username)
            logger.info("Campo de E-mail ou Login preenchido.")

            # Esperar o campo de senha
            self.stdout.write("Esperando o campo de Senha...")
            password_field = wait.until(EC.presence_of_element_located((By.NAME, 'password')))
            logger.info("Campo de Senha encontrado.")

            # Preencher o campo de senha
            self.stdout.write("Preenchendo a senha...")
            password_field.clear()
            password_field.send_keys(password)
            logger.info("Campo de Senha preenchido.")

            # Clicar no botão de login
            self.stdout.write("Esperando o botão de login...")
            login_button = wait.until(
                EC.element_to_be_clickable((By.XPATH, '//button[contains(text(), "entrar no Olist Tiny")]'))
            )
            logger.info("Botão de login encontrado.")

            self.stdout.write("Clicando no botão de login...")
            login_button.click()
            logger.info("Botão de login clicado.")

            time.sleep(6)  # Aguardar resposta do login

            try:
                # Aguarda até que o modal esteja presente
                WebDriverWait(driver, 15).until(
                    EC.presence_of_element_located((By.CLASS_NAME, "modal-dialog"))
                )
                logger.info("Modal detectado.")

                # Verifica se o texto do modal corresponde à mensagem esperada
                modal_title = driver.find_element(By.CLASS_NAME, "modal-title").text
                if "Este usuário já está logado em outro dispositivo" in modal_title:
                    # Clica no botão "login" na modal
                    login_modal_button = driver.find_element(By.XPATH, "//button[contains(text(), 'login')]")
                    login_modal_button.click()
                    logger.info(f"Login realizado em nova sessão para {username}.")
                else:
                    logger.info("Modal com mensagem de login múltiplo não encontrado.")
            except NoSuchElementException:
                logger.info("Nenhum modal detectado.")
            except TimeoutException:
                logger.info("Nenhum modal detectado dentro do tempo esperado.")
            except Exception as e:
                logger.error(f"Erro ao tentar realizar o login em nova sessão para {username}: {e}")
                self.stderr.write(
                    self.style.ERROR(f"Erro ao tentar realizar o login em nova sessão para {username}: {e}"))

            # Verificar se o login foi bem-sucedido
            time.sleep(5)  # Aguardar redirecionamento

            # Navegar para a página de exportação de produtos
            self.stdout.write(f"Navegando para a página de exportação de produtos para {username}...")
            driver.get('https://erp.tiny.com.br/relatorio_produtos_lista_precos')
            logger.info(f"Página de exportação de produtos acessada para {username}.")

            # Aplicar filtro de estoque usando Select
            self.stdout.write("Aplicando filtros de estoque...")
            try:
                stock_filter_select_element = wait.until(EC.element_to_be_clickable((By.ID, 'exibir_estoque')))
                stock_select = Select(stock_filter_select_element)
                stock_select.select_by_value('D')  # Seleciona "Estoque disponível"
                logger.info("Filtro de estoque aplicado.")
            except (NoSuchElementException, ElementNotInteractableException) as e:
                logger.error(f"Erro ao aplicar filtro de estoque para {username}: {e}")
                self.stderr.write(
                    self.style.ERROR(f"Erro ao aplicar filtro de estoque para {username}: {e}"))
                return

            # Aplicar filtro de custo usando Select
            self.stdout.write("Aplicando filtros de custo...")
            try:
                cost_filter_select_element = wait.until(EC.element_to_be_clickable((By.ID, 'exibir_custo')))
                cost_select = Select(cost_filter_select_element)
                cost_select.select_by_value('M')  # Seleciona "Custo médio"
                logger.info("Filtro de custo aplicado.")
            except (NoSuchElementException, ElementNotInteractableException) as e:
                logger.error(f"Erro ao aplicar filtro de custo para {username}: {e}")
                self.stderr.write(
                    self.style.ERROR(f"Erro ao aplicar filtro de custo para {username}: {e}"))
                return

            # Clicar no botão visualizar
            self.stdout.write("Clicando no botão visualizar...")
            try:
                btn_view = wait.until(EC.element_to_be_clickable((By.ID, "btn-visualizar")))
                btn_view.click()
                logger.info("Botão visualizar clicado.")
            except (NoSuchElementException, ElementNotInteractableException) as e:
                logger.error(f"Erro ao clicar no botão visualizar para {username}: {e}")
                self.stderr.write(
                    self.style.ERROR(f"Erro ao clicar no botão visualizar para {username}: {e}"))
                return

            time.sleep(15)  # Aguardar a geração do relatório

            # Clicar no botão de download
            self.stdout.write("Clicando no botão de download...")
            try:
                btn_download = wait.until(EC.element_to_be_clickable((By.ID, "btn-download")))
                btn_download.click()
                logger.info("Botão de download clicado.")
            except (NoSuchElementException, ElementNotInteractableException) as e:
                logger.error(f"Erro ao clicar no botão de download para {username}: {e}")
                self.stderr.write(
                    self.style.ERROR(f"Erro ao clicar no botão de download para {username}: {e}"))
                return

            # Clicar no botão de exportação do relatório
            self.stdout.write("Clicando no botão de exportação do relatório...")
            try:
                btn_export = wait.until(EC.element_to_be_clickable((By.ID, "btnExportarRelatorio")))
                btn_export.click()
                logger.info("Botão de exportação do relatório clicado.")
            except (NoSuchElementException, ElementNotInteractableException) as e:
                logger.error(f"Erro ao clicar no botão de exportação do relatório para {username}: {e}")
                self.stderr.write(
                    self.style.ERROR(f"Erro ao clicar no botão de exportação do relatório para {username}: {e}"))
                return

            # Esperar o download ser concluído
            self.stdout.write("Esperando o download ser concluído...")
            try:
                time.sleep(15)
                self.wait_for_download(download_dir)
                self.stdout.write(f"Download concluído com sucesso para {username}!")
                logger.info(f"Download concluído com sucesso para {username}.")
            except Exception as e:
                logger.error(f"Erro ao esperar pelo download para {username}: {e}")
                self.stderr.write(
                    self.style.ERROR(f"Erro ao esperar pelo download para {username}: {e}"))

        except TimeoutException as te:
            logger.error(f"Timeout ao esperar por um elemento para {username}: {te}")
            self.stderr.write(self.style.ERROR(f"Timeout ao esperar por um elemento para {username}: {te}"))
        except Exception as e:
            logger.error(f"Ocorreu um erro durante a automação para {username}: {e}")
            self.stderr.write(self.style.ERROR(f"Ocorreu um erro para {username}: {e}"))
        finally:
            driver.quit()
            logger.info(f"Navegador fechado para {username}.")

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
