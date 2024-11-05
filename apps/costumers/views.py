from datetime import timedelta
from django.shortcuts import get_object_or_404
from apps.coremodels.models import Clientes, ItemVenda
from rest_framework.response import Response
from rest_framework.decorators import api_view
from .serializers import ClientSerializer, PurchaseSerializer
from django.core.cache import cache  # Para caching
from django.db.models import Q, Max, Value
from django.db.models.functions import Coalesce
from django.utils.timezone import now
from collections import defaultdict
import time
from django.utils.timezone import now


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

@api_view(['GET'])
def all_active_clients_with_pdv_sales(request):
    try:
        # Verificar se os dados estão em cache
        cached_data = cache.get("clientes_ativos_com_vendas_pdv")
        if cached_data:
            return Response(cached_data, status=200)

        hoje = now().date()
        data_padrao = hoje

        # Buscar clientes e anotar a última compra por origem
        clientes_filtrados = Clientes.objects.annotate(
            ultima_compra=Coalesce(
                Max("compras_cliente__venda__data_compra", filter=Q(compras_cliente__venda__canal_venda="Pdv")),
                Value(data_padrao)
            )
        ).exclude(nome__iexact="Consumidor Final")

        # Agrupar clientes por nome para identificar origens
        clientes_por_nome = defaultdict(list)
        for cliente in clientes_filtrados:
            clientes_por_nome[cliente.nome].append(cliente)

        # Carregar todas as compras relevantes de uma vez
        todas_compras = ItemVenda.objects.filter(
            venda__canal_venda="Pdv",
            cliente_id__in=[cliente.id for cliente in clientes_filtrados]
        ).select_related("venda", "produto").only(
            "cliente_id", "produto__descricao", "produto__preco_unitario",
            "venda__numero_venda_original", "venda__data_compra",
            "quantidade_produto", "valor_total", "valor_desconto", "frete", "preco_final"
        )

        # Agrupar compras por cliente
        compras_por_cliente = defaultdict(list)
        for compra in todas_compras:
            compras_por_cliente[compra.cliente_id].append(compra)

        # Estrutura para armazenar clientes inativos
        clientes_inativos = {}

        for nome, clientes in clientes_por_nome.items():
            if len(clientes) < 2:
                continue  # Ignorar se não houver opostos para comparar

            # Determinar a última compra e origem final com base nas compras mais recentes
            cliente_imp = next((c for c in clientes if c.origem == "imp"), None)
            cliente_servi = next((c for c in clientes if c.origem == "servi"), None)

            if not cliente_imp or not cliente_servi:
                continue  # Ignorar se faltar uma das origens

            # Verificar datas de inatividade
            dias_inativo_imp = (hoje - cliente_imp.ultima_compra).days
            dias_inativo_servi = (hoje - cliente_servi.ultima_compra).days

            if dias_inativo_imp > 30 and dias_inativo_servi > 30:
                # Definir a última compra e origem mais recente
                if cliente_imp.ultima_compra >= cliente_servi.ultima_compra:
                    ultima_compra = cliente_imp.ultima_compra
                    origem_final = "imp"
                    cliente_final = cliente_imp
                else:
                    ultima_compra = cliente_servi.ultima_compra
                    origem_final = "servi"
                    cliente_final = cliente_servi

                # Usar as compras pré-carregadas para o cliente
                compras_cliente = compras_por_cliente[cliente_final.id]

                # Serializar dados do cliente e compras
                clientes_inativos[nome] = {
                    "info": {
                        "id": cliente_final.id,
                        "origem": origem_final,
                        "nome": cliente_final.nome,
                        "cep": cliente_final.cep,
                        "cpf_cnpj": cliente_final.cpf_cnpj,
                        "tipo_pessoa": cliente_final.tipo_pessoa,
                        "ultima_compra": ultima_compra,
                    },
                    "purchases": [
                        {
                            "numero_venda": item.venda.numero_venda_original,
                            "data_compra": item.venda.data_compra,
                            "produto": item.produto.descricao,
                            "quantidade_produto": item.quantidade_produto,
                            "preco_unitario": item.produto.preco_unitario,
                            "valor_total": item.valor_total,
                            "valor_desconto": item.valor_desconto,
                            "frete": item.frete,
                            "preco_final": item.preco_final,
                        }
                        for item in compras_cliente
                    ],
                }

        # Cachear os resultados
        cache.set("clientes_ativos_com_vendas_pdv", clientes_inativos, timeout=3600)

        return Response(clientes_inativos, status=200)

    except Exception as e:
        return Response({"error": "Ocorreu um erro inesperado.", "details": str(e)}, status=500)