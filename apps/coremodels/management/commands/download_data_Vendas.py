# automacao/management/commands/baixar_relatorios.py

from django.core.management.base import BaseCommand, CommandError
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
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

    def download_reports(self, account, link):

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
        chrome_options.add_argument('--headless=new')  # Executa o Chrome em modo headless (descomente para rodar com interface)
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

        wait = WebDriverWait(driver, 60)  # Espera máxima de 20 segundos

        try:
            driver.get('https://erp.tiny.com.br/login/')

            # Esperar o campo de username estar presente
            username_field = wait.until(EC.presence_of_element_located((By.NAME, 'username')))

            # Preencher o campo de username
            username_field.clear()
            username_field.send_keys(username)

            # Esperar o campo de senha
            password_field = wait.until(EC.presence_of_element_located((By.NAME, 'password')))

            # Preencher o campo de senha
            password_field.clear()
            password_field.send_keys(password)

            # Clicar no botão de login
            login_button = wait.until(
                EC.element_to_be_clickable((By.XPATH, '//button[contains(text(), "entrar no Olist Tiny")]'))
            )

            login_button.click()

            time.sleep(6)  # Aguardar resposta do login

            try:
                # Aguarda até que o modal esteja presente
                WebDriverWait(driver, 15).until(
                    EC.presence_of_element_located((By.CLASS_NAME, "modal-dialog"))
                )

                # Verifica se o texto do modal corresponde à mensagem esperada
                modal_title = driver.find_element(By.CLASS_NAME, "modal-title").text
                if "Este usuário já está logado em outro dispositivo" in modal_title:
                    # Clica no botão "login" na modal
                    login_modal_button = driver.find_element(By.XPATH, "//button[contains(text(), 'login')]")
                    login_modal_button.click()
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

            # Acessar a URL específica para a conta
            driver.get(link)

            # Agora, implementar as interações conforme solicitado

            # 1. Clicar no botão "Últimos 7 dias" para abrir o menu
            try:
                ultimos_7_dias_button = wait.until(
                    EC.element_to_be_clickable(
                        (By.XPATH, '//a[contains(@class, "filter-label") and contains(text(), "Últimos 7 dias")]')
                    )
                )
                ultimos_7_dias_button.click()
            except TimeoutException:
                logger.error("Botão 'Últimos 7 dias' não encontrado ou não clicável.")
                self.stderr.write(self.style.ERROR("Botão 'Últimos 7 dias' não encontrado ou não clicável."))
                return

            # 2. Selecionar o item "Período"
            try:
                periodo_button = wait.until(
                    EC.element_to_be_clickable(
                        (By.XPATH, '//button[contains(text(), "Período")]')
                    )
                )
                periodo_button.click()
            except TimeoutException:
                logger.error("Botão 'Período' não encontrado ou não clicável.")
                self.stderr.write(self.style.ERROR("Botão 'Período' não encontrado ou não clicável."))
                return

            # 3. Preencher as datas
            try:
                # Definir a data inicial
                data_inicial_input = wait.until(
                    EC.presence_of_element_located(
                        (By.XPATH, '//div[@class="tab-search-periodo"]//input[@class="form-control hasDatepicker"][1]')
                    )
                )
                data_inicial_input.clear()
                data_inicial_input.send_keys("01/01/2021")

            except TimeoutException:
                self.stderr.write(self.style.ERROR("Campos de data não encontrados."))
                return
            except Exception as e:
                self.stderr.write(self.style.ERROR(f"Erro ao preencher as datas: {e}"))
                return

            # 4. Clicar no botão "Aplicar"
            try:
                aplicar_button = wait.until(
                    EC.element_to_be_clickable(
                        (By.XPATH, '//div[@class="filter-controls"]//button[contains(text(), "Aplicar")]')
                    )
                )
                aplicar_button.click()
            except TimeoutException:
                logger.error("Botão 'Aplicar' não encontrado ou não clicável.")
                self.stderr.write(self.style.ERROR("Botão 'Aplicar' não encontrado ou não clicável."))
                return

            # 6. Clicar no botão de download na página
            self.stdout.write("Clicando no botão de download do relatório...")
            try:
                self.stderr.write(f'Clicando em download para {account["type"]}')
                time.sleep(20)
                btn_download = wait.until(
                    EC.element_to_be_clickable(
                        (By.XPATH, '//button[@class="btn btn-default" and contains(.,"download")]')
                    )
                )
                btn_download.click()
                self.stderr.write(f'Botão clicado para {account["type"]}')
            except TimeoutException:
                self.stderr.write(self.style.ERROR("Botão de download do relatório não encontrado ou não clicável."))
                return

            # 7. Clicar no botão "processar outro arquivo"
            self.stdout.write("Clicando no botão 'processar outro arquivo'...")
            try:
                self.stderr.write(f'Clicando em processar para {account["type"]}')
                processar_outro_button = wait.until(
                    EC.element_to_be_clickable(
                        (By.XPATH, '//button[contains(@class, "btn-ghost") and contains(.,"processar outro arquivo")]')
                    )
                )
                processar_outro_button.click()
                logger.info("Botão 'processar outro arquivo' clicado.")
            except TimeoutException:
                logger.error("Botão 'processar outro arquivo' não encontrado ou não clicável.")
                self.stderr.write(self.style.ERROR(f"Botão 'processar outro arquivo' não encontrado ou não clicável para {account["type"]}."))
                return

            # 8. Clicar em "Continuar" na aba aberta
            self.stdout.write("Clicando no botão 'Continuar'...")
            try:
                continuar_button = WebDriverWait(driver, 40).until(
                    EC.element_to_be_clickable(
                        (By.XPATH, '//div[@class="modal-footer"]//button[contains(text(), "continuar")]')
                    )
                )
                continuar_button.click()
                logger.info("Botão 'Continuar' clicado.")
            except TimeoutException:
                logger.error("Botão 'Continuar' não encontrado ou não clicável.")
                self.stderr.write(self.style.ERROR("Botão 'Continuar' não encontrado ou não clicável."))
                return

            time.sleep(60)

            # 9. Aguardar a barra de carregamento terminar
            self.stdout.write("Aguardando a conclusão da barra de carregamento...")
            try:
                self.wait_for_loading_bar(driver)
                logger.info("Barra de carregamento concluída.")
            except Exception as e:
                logger.error(f"Erro ao aguardar a conclusão da barra de carregamento: {e}")
                self.stderr.write(self.style.ERROR(f"Erro ao aguardar a conclusão da barra de carregamento: {e}"))
                return
            
            # 10. Clicar no botão "Baixar" para iniciar o download
            self.stdout.write("Clicando no botão 'Baixar' para iniciar o download...")
            try:
                baixar_button = WebDriverWait(driver, 30).until(
                    EC.element_to_be_clickable(
                        (By.XPATH, '//div[@class="modal-footer"]//button[contains(@class, "btn-primary") and contains(text(), "Baixar")]')
                    )
                )
                baixar_button.click()
                logger.info("Botão 'Baixar' clicado.")
            except TimeoutException:
                logger.error("Botão 'Baixar' não encontrado ou não clicável.")
                self.stderr.write(self.style.ERROR("Botão 'Baixar' não encontrado ou não clicável."))
                return

            # 11. Esperar o download terminar
            self.stdout.write("Esperando o download ser concluído...")
            try:
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

    def wait_for_loading_bar(self, driver, timeout=120):
        """
        Espera até que a barra de carregamento termine.
        """
        wait = WebDriverWait(driver, timeout)
        try:
            # Aguarda até que a barra de carregamento desapareça
            wait.until(EC.invisibility_of_element_located(
                (By.XPATH, '//div[@class="card-body-space-progress"]//div[@class="progress"]')
            ))
        except TimeoutException:
            raise Exception("A barra de carregamento não desapareceu dentro do tempo esperado.")
