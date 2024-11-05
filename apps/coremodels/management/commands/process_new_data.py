# apps/coremodels/management/commands/executar_comandos.py

from django.core.management.base import BaseCommand
from django.core.management import call_command
import json
import time


class Command(BaseCommand):
    help = 'Executa comandos Django em sequência'

    def add_arguments(self, parser):
        parser.add_argument('model', type=str, help='Modelo para atualizar')

    def handle(self, *args, **kwargs):
        model = kwargs['model']

        link = {}

        if model == 'ItemVenda':
            link = {
                "Servi": "https://erp.tiny.com.br/relatorios_personalizados#/view/19",
                "Imp": "https://erp.tiny.com.br/relatorios_personalizados#/view/809"
            }

        elif model == 'Vendas':
            link = {
                "Servi": "https://erp.tiny.com.br/relatorios_personalizados#/view/496",
                "Imp": "https://erp.tiny.com.br/relatorios_personalizados#/view/810"
            }

        # Converte o dicionário de links para JSON
        links_json = json.dumps(link)

        try:
            caminho_csv = f"datasets/csv/{model}.csv"

            # Para os modelos Vendas e ItemVenda, faz o download com os links
            if model == "Vendas" or model == "ItemVenda":
                self.stdout.write("Fazendo o download dos dados pelo Tiny")

                # Passa o link como argumento para o comando
                call_command(f'download_data_Vendas', '--link', links_json)

                if model == "Vendas":
                    #Continua com os outros comandos
                    self.stdout.write("Concatenando os arquivos")
                    call_command('concate_csv', model)

                    self.stdout.write("Subindo no banco de dados")
                    call_command(f'send_simple_data_to_db', caminho_csv)

                else:
                    # Continua com os outros comandos
                    self.stdout.write("Concatenando os arquivos")
                    call_command('concate_csv', model)

                    self.stdout.write("Subindo no banco de dados")
                    call_command(f'send_data_to_db', caminho_csv)

            else:
                self.stdout.write("Fazendo o download dos dados pelo Tiny")
                call_command(f'download_data_{model}')

                # Continua com os outros comandos
                self.stdout.write("Concatenando os arquivos")
                call_command('concate_csv', model)

                self.stdout.write("Subindo no banco de dados")
                call_command(f'send_simple_data_to_db', caminho_csv)

            self.stdout.write(self.style.SUCCESS("Todos os comandos foram executados com sucesso!"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Ocorreu um erro: {e}"))
