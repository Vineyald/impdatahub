import os
import requests
from django.core.management.base import BaseCommand
from django.conf import settings

class Command(BaseCommand):
    help = 'Make an API request to Tiny sells API'

    def handle(self, *args, **options):
        api_tokens = {
            'servi': settings.TINY_ACESS_TOKEN_SERVI,
            'imp': settings.TINY_ACESS_TOKEN_IMP
        }
        url = 'https://api.tiny.com.br/api2/pedidos.pesquisa.php'
        payloadServi = {'token': api_tokens['servi'], 'formato': 'JSON'}
        payloadImp = {'token': api_tokens['imp'], 'formato': 'JSON'}
        savePath = os.path.join(os.getcwd(), 'datasets/csv/')

        responses = {}

        for loja, payload in [('Servi', payloadServi), ('Imp', payloadImp)]:
            try:
                response = requests.post(url, data=payload)
                response.raise_for_status()  # Raise an error for bad responses
                response_json = response.json()

                if response_json is None:
                    raise ValueError(f'API response for {loja} is null')

                responses[loja] = response_json

            except requests.exceptions.RequestException as e:
                self.stdout.write(self.style.ERROR(f'API request failed for {loja}: {e}'))
        
        if responses['Servi'] and responses['Imp']:
            self.stdout.write(self.style.SUCCESS('API requests succeeded for both stores'))
            for loja, response_json in responses.items():
                self.stdout.write(f'Response for {loja}:')
                self.stdout.write('--------')
                self.stdout.write('Status: {}'.format(response_json['retorno']['status']))
                self.stdout.write('Page: {}'.format(response_json['retorno']['pagina']))
                self.stdout.write('Number of pages: {}'.format(response_json['retorno']['numero_paginas']))

                if 'pedidos' in response_json['retorno']:
                    self.stdout.write('First order:')
                    self.stdout.write('------------')
                    first_order = response_json['retorno']['pedidos'][10]['pedido']
                    self.stdout.write('ID: {}'.format(first_order['id']))
                    self.stdout.write('Number: {}'.format(first_order['numero']))
                    self.stdout.write('E-commerce number: {}'.format(first_order['numero_ecommerce']))
                    self.stdout.write('Order date: {}'.format(first_order['data_pedido']))
                    self.stdout.write('Expected date: {}'.format(first_order['data_prevista']))
                    self.stdout.write('Name: {}'.format(first_order['nome']))
                    self.stdout.write('Value: {}'.format(first_order['valor']))
                    self.stdout.write('Seller ID: {}'.format(first_order['id_vendedor']))
                    self.stdout.write('Seller name: {}'.format(first_order['nome_vendedor']))
                    self.stdout.write('Status: {}'.format(first_order['situacao']))
                else:
                    self.stdout.write('No orders found.')

        
        

        
