from django.shortcuts import get_object_or_404
from apps.coremodels.models import Clientes, ItemVenda
from rest_framework.response import Response
from rest_framework.decorators import api_view
from .serializers import ClientSerializer, PurchaseSerializer
from django.core.cache import cache  # Para caching
from django.db.models import Q, Max, Value, Prefetch
from django.db.models.functions import Coalesce
from django.contrib.postgres.aggregates import ArrayAgg
from concurrent.futures import ThreadPoolExecutor
from django.db import transaction
from django.utils.timezone import now
from collections import defaultdict
import time
import json
import pandas as pd
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from bisect import bisect_left

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

        # Buscar clientes e anotar a última compra por origem (ignorando vendas canceladas)
        clientes_filtrados = Clientes.objects.annotate(
            ultima_compra=Coalesce(
                Max(
                    "compras_cliente__venda__data_compra",
                    filter=Q(compras_cliente__venda__canal_venda="Pdv") & ~Q(compras_cliente__venda__situacao="Cancelado")
                ),
                Value(data_padrao)
            )
        ).exclude(nome__iexact="Consumidor Final")

        # Agrupar clientes por nome para identificar origens
        clientes_por_nome = defaultdict(list)
        for cliente in clientes_filtrados:
            clientes_por_nome[cliente.nome].append(cliente)

        # Carregar todas as compras relevantes de uma vez (ignorando vendas canceladas)
        todas_compras = ItemVenda.objects.filter(
            Q(venda__canal_venda="Pdv") & ~Q(venda__situacao="Cancelado"),
            cliente_id__in=[cliente.id for cliente in clientes_filtrados]
        ).select_related("venda", "produto").only(
            "cliente_id", "produto__descricao", "produto__preco_unitario",
            "venda__numero_venda_original", "venda__data_compra",
            "quantidade_produto", "valor_total", "valor_desconto", "frete", "preco_final", "venda__situacao"
        )

        # Agrupar compras por cliente
        compras_por_cliente = defaultdict(list)
        for compra in todas_compras:
            compras_por_cliente[compra.cliente_id].append(compra)

        # Estrutura para armazenar clientes inativos
        clientes_inativos = {}

        for nome, clientes in clientes_por_nome.items():

            # Determinar a última compra e origem final com base nas compras mais recentes
            cliente_imp = next((c for c in clientes if c.origem == "imp"), None)
            cliente_servi = next((c for c in clientes if c.origem == "servi"), None)

            if not cliente_imp or not cliente_servi:
                continue  # Ignorar se faltar uma das origens

            # Verificar datas de inatividade
            dias_inativo_imp = (hoje - cliente_imp.ultima_compra).days
            dias_inativo_servi = (hoje - cliente_servi.ultima_compra).days

            print(f"cliente: {nome} | {dias_inativo_imp, dias_inativo_servi}")

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
                            "situacao": item.venda.situacao,  # Acessando o atributo no relacionamento
                        }
                        for item in compras_cliente
                    ],
                }

        # Cachear os resultados
        cache.set("clientes_ativos_com_vendas_pdv", clientes_inativos, timeout=3600)
        print(clientes_inativos)
        return Response(clientes_inativos, status=200)

    except Exception as e:
        return Response({"error": "Ocorreu um erro inesperado.", "details": str(e)}, status=500)
    
# Load the CEP range table
file_path = 'datasets/Lista_de_CEPs.xlsx'
cep_table = pd.read_excel(file_path)

# Preprocess the CEP ranges and cities into a sorted list
cep_ranges = []
for _, row in cep_table.iterrows():
    faixa_inicio, faixa_fim = row['Faixa de CEP'].split(' a ')
    faixa_inicio = int(faixa_inicio.replace('-', ''))
    faixa_fim = int(faixa_fim.replace('-', ''))
    localidade = row['Localidade']
    cep_ranges.append((faixa_inicio, faixa_fim, localidade))

# Sort the ranges by their start values for efficient searching
cep_ranges.sort()

# Optimized function to get the city by CEP using binary search
def get_city_by_cep(cep: str) -> str:
    numeric_cep = int(cep.replace('-', ''))
    # Binary search to find the correct range
    idx = bisect_left([faixa[0] for faixa in cep_ranges], numeric_cep)
    
    if idx < len(cep_ranges):
        faixa_inicio, faixa_fim, localidade = cep_ranges[idx]
        if faixa_inicio <= numeric_cep <= faixa_fim:
            return localidade
    
    # Check the previous range if the binary search is at an exact end
    if idx > 0:
        faixa_inicio, faixa_fim, localidade = cep_ranges[idx - 1]
        if faixa_inicio <= numeric_cep <= faixa_fim:
            return localidade
    
    return "Localidade não encontrada"

@csrf_exempt
def get_cities_and_coordinates_from_ceps(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            ceps = data.get('ceps', [])

            if not isinstance(ceps, list):
                return JsonResponse({'error': 'Formato de entrada inválido. A lista de CEPs é esperada.'}, status=400)

            response = {}
            for cep in ceps:
                city = get_city_by_cep(cep)
                if city != "Localidade não encontrada":
                    response[cep] = {
                        'cidade': city,
                    }

            return JsonResponse(response, status=200)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'JSON inválido.'}, status=400)

    return JsonResponse({'error': 'Método não permitido.'}, status=405)

@api_view(['GET'])
def all_clients_with_pdv_sales(request):
    try:
        start_time = time.time()
        print("Execution started.")

        hoje = now().date()
        data_padrao = None

        # Check cache
        cached_data = cache.get("todos_clientes_com_vendas_pdv")
        if cached_data:
            return Response(cached_data, status=200)

        # Fetch clients excluding "Consumidor Final" and null "tipo_pessoa"
        clients = Clientes.objects.exclude(
            nome__iexact="Consumidor Final"
        ).exclude(
            tipo_pessoa__isnull=True
        ).annotate(
            ultima_compra=Coalesce(
                Max(
                    "compras_cliente__venda__data_compra",
                    filter=Q(compras_cliente__venda__canal_venda="Pdv") & ~Q(compras_cliente__venda__situacao="Cancelado")
                ),
                Value(data_padrao)
            )
        ).prefetch_related(
            Prefetch("compras_cliente", queryset=ItemVenda.objects.select_related("venda", "produto"))
        )

        # Group clients by name
        clients_by_name = defaultdict(list)
        for client in clients:
            clients_by_name[client.nome].append(client)

        # Fetch and group sales data for "Pdv" channel
        sales_data = (
            ItemVenda.objects.filter(venda__canal_venda="Pdv")
            .values("cliente_id")
            .annotate(compras=ArrayAgg("id_item_venda", distinct=True))
        )
        sales_by_client = {sale["cliente_id"]: sale["compras"] for sale in sales_data}

        # Process clients and purchases using parallel processing
        with ThreadPoolExecutor(max_workers=10) as executor:
            processed_clients = list(executor.map(
                lambda name: process_client_group(name, clients_by_name[name], sales_by_client),
                clients_by_name.keys()
            ))

        clients_to_delete = [data["id_to_delete"] for data in processed_clients if data["id_to_delete"]]
        if clients_to_delete:
            # Removemos os clientes da seleção, sem alterar o banco de dados
            processed_clients = [data for data in processed_clients if data["id_to_delete"] not in clients_to_delete]

        # Combine results and cache
        client_data = {data["name"]: data["client_data"] for data in processed_clients}
        cache.set("todos_clientes_com_vendas_pdv", client_data, timeout=3600)

        print(f"Total execution time: {time.time() - start_time:.2f} seconds.")
        return Response(client_data, status=200)

    except Exception as e:
        return Response({"error": "Unexpected error occurred.", "details": str(e)}, status=500)

def process_client_group(name, client_list, sales_by_client):
    """
    Process a group of clients with the same name and their purchases.
    Optimized for use with parallel processing.
    """
    client_servi = next((c for c in client_list if c.origem == "servi"), None)
    client_imp = next((c for c in client_list if c.origem == "imp"), None)
    purchases = combine_purchases(client_servi, client_imp, sales_by_client)

    id_to_delete = client_imp.id if client_imp and client_servi else None
    main_client = client_servi or client_imp
    client_data = serialize_client_data(main_client, purchases) if main_client else None

    return {
        "name": name,
        "client_data": client_data,
        "id_to_delete": id_to_delete,
    }


def combine_purchases(client_servi, client_imp, sales_by_client):
    """
    Combine purchases for 'servi' and 'imp' clients.
    """
    purchases = []
    if client_servi:
        ids = sales_by_client.get(client_servi.id, [])
        purchases.extend(
            ItemVenda.objects.filter(id_item_venda__in=ids).select_related("venda", "produto")
        )
    if client_imp:
        ids = sales_by_client.get(client_imp.id, [])
        purchases.extend(
            ItemVenda.objects.filter(id_item_venda__in=ids).select_related("venda", "produto")
        )
    return purchases


def serialize_client_data(client, purchases):
    """
    Serialize client information and purchases.
    """
    return {
        "info": {
            "id": client.id,
            "origem": client.origem,
            "nome": client.nome,
            "cep": client.cep,
            "cpf_cnpj": client.cpf_cnpj,
            "tipo_pessoa": client.tipo_pessoa,
            "ultima_compra": client.ultima_compra,
        },
        "purchases": [
            {
                "numero_venda": purchase.venda.numero_venda_original,
                "data_compra": purchase.venda.data_compra,
                "produto": purchase.produto.descricao,
                "quantidade_produto": purchase.quantidade_produto,
                "preco_unitario": purchase.produto.preco_unitario,
                "valor_total": purchase.valor_total,
                "valor_desconto": purchase.valor_desconto,
                "frete": purchase.frete,
                "preco_final": purchase.preco_final,
                "situacao": purchase.venda.situacao,
            }
            for purchase in purchases
        ],
    }
