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
        link = get_link(model)
        links_json = json.dumps(link)
        caminho_csv = f"datasets/csv/{model}.csv"

        try:

            # Download data from tiny website
            if model in ["Vendas"]:
                self.stdout.write("Fazendo o download dos dados pelo Tiny")
                call_command(f'download_data_Vendas', '--link', links_json)
            elif model == "ItemVenda":
                    self.stdout.write("Fazendo o download dos dados pelo Tiny")
            else:
                self.stdout.write("Fazendo o download dos dados pelo Tiny")
                call_command(f'download_data_{model}')
            
            # Join the download files in a singular csv
            call_command('concate_csv', model)

            # If its Clients, fix the ids
            if model == "Clientes":
                if model == "Clientes":
                    call_command(
                        f'Fix_clientes', 
                        "E:/08 - Imperio DataHub/impdatahub/datasets/csv/Clientes.csv", 
                        "E:/08 - Imperio DataHub/impdatahub/datasets/csv"
                    )
    
            if model == "ItemVenda":
                self.stdout.write("Subindo no banco de dados")
                call_command(
                    f'send_data_to_db',
                    caminho_csv,
                    "datasets/csv/Clientes.csv"
                )
            else:
                self.stdout.write("Subindo no banco de dados")
                call_command('send_simple_data_to_db', caminho_csv)

            self.stdout.write(self.style.SUCCESS("Todos os comandos foram executados com sucesso!"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Ocorreu um erro: {e}"))

def get_link(model):
    link = {}
    
    if model == 'Vendas':
        link = {
            "Servi": "https://erp.tiny.com.br/relatorios_personalizados#/view/496",
            "Imp": "https://erp.tiny.com.br/relatorios_personalizados#/view/810"
        }
    return link
