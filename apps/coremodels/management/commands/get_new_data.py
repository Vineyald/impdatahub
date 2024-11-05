# apps/coremodels/management/commands/executar_comandos.py

from django.core.management.base import BaseCommand
from django.core.management import call_command
import time


class Command(BaseCommand):
    help = 'Executa comandos Django em sequÃªncia'

    def handle(self, *args, **kwargs):

        try:

            self.stdout.write("Processando os dados de Clientes")
            call_command(f'process_new_data', 'Clientes')

            self.stdout.write("Processando os dados de Produtos")
            call_command(f'process_new_data', 'Produtos')

            self.stdout.write("Processando os dados de Vendas")
            call_command(f'process_new_data', 'Vendas')

            self.stdout.write("Processando os dados de ItemVenda")
            call_command(f'process_new_data', 'ItemVenda')

            self.stdout.write(self.style.SUCCESS("Todos os comandos foram executados com sucesso!"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Ocorreu um erro: {e}"))

