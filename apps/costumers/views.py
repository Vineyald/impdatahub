from django.shortcuts import get_object_or_404
from apps.coremodels.models import Clientes, Vendas, ItemVenda
from rest_framework.response import Response
from rest_framework.decorators import api_view
from .serializers import ClientSerializer, PurchaseSerializer
from django.db.models import Q


@api_view(['GET', 'PUT'])
def client_profile_api(request, client_id):
    # Buscar o cliente pelo ID
    cliente = get_object_or_404(Clientes, id=client_id)
    origem_oposta = 'imp' if cliente.origem == 'servi' else 'servi'

    # Tentar encontrar um cliente com o mesmo nome na origem oposta
    cliente_oposto = Clientes.objects.filter(nome=cliente.nome, origem=origem_oposta).first()

    # Buscar todas as compras do cliente atual
    compras_cliente = ItemVenda.objects.filter(cliente=cliente).select_related('venda', 'produto')

    # Buscar as compras do cliente na origem oposta, se houver
    if cliente_oposto:
        compras_cliente_oposto = ItemVenda.objects.filter(cliente=cliente_oposto).select_related('venda', 'produto')
        compras_cliente = compras_cliente.union(compras_cliente_oposto)  # Unir as compras de ambas origens

    # Serializar dados do cliente e das compras
    client_data = ClientSerializer(cliente).data
    purchases_data = PurchaseSerializer(compras_cliente, many=True).data

    if request.method == 'PUT':
        # Atualização dos dados do cliente
        data = request.data
        cliente.cep = data.get('cep', cliente.cep)
        cliente.cpf_cnpj = data.get('cpf_cnpj', cliente.cpf_cnpj)
        cliente.celular = data.get('celular', cliente.celular)
        cliente.endereco = data.get('endereco', cliente.endereco)
        cliente.tipo_pessoa = data.get('tipo_pessoa', cliente.tipo_pessoa)
        cliente.save()

        return Response({'message': 'Dados atualizados com sucesso!'})

    return Response({
        'client': client_data,
        'purchases': purchases_data,
    })
