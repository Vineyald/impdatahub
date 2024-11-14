# automacao/management/commands/baixar_relatorios.py

from django.core.management.base import BaseCommand
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException,
    NoSuchElementException,
    ElementNotInteractableException,
    WebDriverException,
)
import time
import os
import logging
from django.conf import settings
import threading
import re

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
    help = 'Automatiza o login no Tiny Olist e baixa os relatórios disponíveis.'

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
        chrome_options.add_argument('--headless=new')  # Executa o Chrome em modo headless
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

        wait = WebDriverWait(driver, 20)  # Espera máxima de 20 segundos

        try:
            self.stdout.write("Acessando o site do Tiny Olist...")
            driver.get('https://erp.tiny.com.br/login/')
            logger.info("Página de login acessada.")

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

            time.sleep(6)

            try:
                # Aguarda até que o modal esteja presente
                WebDriverWait(driver, 15).until(
                    EC.presence_of_element_located((By.CLASS_NAME, "modal-dialog"))
                )

                # Verifica se o texto do modal corresponde à mensagem esperada
                modal_title = driver.find_element(By.CLASS_NAME, "modal-title").text
                if "Este usuário já está logado em outro dispositivo" in modal_title:
                    # Clica no botão "login"
                    login_button = driver.find_element(By.XPATH, "//button[contains(text(), 'login')]")
                    login_button.click()
                    print("Login realizado em nova sessão.")
                else:
                    print("Modal com mensagem de login múltiplo não encontrado.")
            except NoSuchElementException:
                print("Nenhum modal detectado.")
            except Exception as e:
                print(f"Erro ao tentar realizar o login: {e}")

            # Verificar se o login foi bem-sucedido
            time.sleep(5)  # Aguardar redirecionamento
            current_url = driver.current_url
            if "dashboard" not in current_url.lower():
                self.stderr.write(self.style.ERROR("Login pode não ter sido realizado com sucesso. Verifique as credenciais."))
                logger.warning(f"URL atual após login: {current_url}")
                # Opcional: Levantar uma exceção ou continuar dependendo do caso
            else:
                self.stdout.write("Login realizado com sucesso!")
                logger.info("Login realizado com sucesso.")

            # Navegar para a página de exportação de contatos
            self.stdout.write("Navegando para a página de exportação de contatos...")
            driver.get('https://erp.tiny.com.br/exportacao_contatos?campoPesquisa=nenhum&criterio=opc-todos&dataInativoDesde=&idMunicipio=0&descricaoMunicipio=&idVendedor=0&nomeVendedor=&ordenacao=nome&pesquisa=&tipo=opc-todos&uf=&tipoPeriodo=no_filter&dataIni=&dataFim=&mesAno=11%252F2024')
            logger.info("Página de exportação de contatos acessada.")

            time.sleep(10)

            # Esperar os botões de download estarem presentes
            self.stdout.write("Esperando os botões de download aparecerem...")
            wait.until(EC.presence_of_all_elements_located((By.XPATH, '//a[contains(@onclick, "baixarArquivo(")]')))
            logger.info("Botões de download encontrados.")

            # Procurar label associada ao botão de seletor CSV
            self.stdout.write("Encontrando label associada ao seletor CSV...")
            csv_label = wait.until(
                EC.presence_of_element_located((By.XPATH, "//label[contains(., 'Exportar no formato texto (.csv)')]"))
            )
            logger.info("Label associada ao botão seletor CSV encontrada.")

            # Clicar na label para selecionar o formato CSV
            self.stdout.write("Selecionando o formato CSV através da label...")
            csv_label.click()
            logger.info("Formato CSV selecionado.")

            # Encontrar todos os botões de download disponíveis
            download_buttons = driver.find_elements(By.XPATH, '//a[contains(@onclick, "baixarArquivo(")]')
            logger.info(f"Total de botões de download encontrados: {len(download_buttons)}")

            if not download_buttons:
                self.stdout.write(self.style.WARNING("Nenhum botão de download encontrado na página."))
                logger.warning("Nenhum botão de download encontrado na página.")
                return

            # Extrair os índices N dos botões de download
            download_indices = []
            for button in download_buttons:
                onclick_value = button.get_attribute('onclick')
                if onclick_value:
                    try:
                        # Usar expressão regular para capturar o número antes da vírgula
                        match = re.search(r'baixarArquivo\((\d+),', onclick_value)
                        if match:
                            index = int(match.group(1))
                            download_indices.append(index)
                            logger.debug(f"Índice de download encontrado: {index}")
                        else:
                            raise ValueError("Índice não encontrado no atributo 'onclick'.")
                    except (IndexError, ValueError) as e:
                        logger.warning(f"Não foi possível extrair o índice do botão: {onclick_value} - {e}")

            logger.info(f"Índices de download extraídos: {download_indices}")

            if not download_indices:
                self.stdout.write(self.style.WARNING("Nenhum índice de download válido encontrado."))
                logger.warning("Nenhum índice de download válido encontrado.")
                return

            # Remover duplicatas e ordenar os índices
            download_indices = sorted(set(download_indices))
            logger.info(f"Índices de download únicos e ordenados: {download_indices}")

            # Iterar sobre os índices e chamar a função JavaScript diretamente
            for index in download_indices:
                try:
                    self.stdout.write(f"Iniciando o download {index}...")
                    logger.info(f"Iniciando o download {index}.")

                    # Executar a função JavaScript baixarArquivo(N)
                    driver.execute_script(f'baixarArquivo({index});')
                    logger.info(f"Função baixarArquivo({index}) executada.")

                    # Esperar o download ser concluído
                    self.wait_for_download(download_dir)
                    self.stdout.write(f"Download {index} concluído com sucesso!")
                    logger.info(f"Download {index} concluído com sucesso!")

                    time.sleep(2)  # Pequena pausa entre downloads

                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Erro durante o download {index}: {e}"))
                    logger.error(f"Erro durante o download {index}: {e}")

            self.stdout.write(self.style.SUCCESS("Todos os downloads foram processados."))
            logger.info("Todos os downloads foram processados.")

        except TimeoutException as te:
            logger.error(f"Timeout ao esperar por um elemento: {te}")
            self.stderr.write(self.style.ERROR(f"Timeout ao esperar por um elemento: {te}"))
        except Exception as e:
            logger.error(f"Ocorreu um erro durante a automação: {e}")
            self.stderr.write(self.style.ERROR(f"Ocorreu um erro: {e}"))
        finally:
            driver.quit()
            logger.info("Navegador fechado.")

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
