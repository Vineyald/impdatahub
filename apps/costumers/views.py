from datetime import datetime, timedelta
from decimal import Decimal
from django.shortcuts import get_object_or_404
from apps.coremodels.models import Clientes, ItemVenda
from rest_framework.response import Response
from rest_framework.decorators import api_view
from .serializers import ClientSerializer, PurchaseSerializer
from django.core.cache import cache  # Para caching
from django.db.models import Count, Q, Max, Value, Prefetch, Sum, DecimalField, Subquery, OuterRef
from django.db.models.functions import Coalesce
from django.utils.timezone import now
import json
import pandas as pd
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from bisect import bisect_left

@api_view(['GET', 'PUT'])
def client_profile_api(request, client_id):
    try:
        # Retrieve the client by ID or return a 404 error if not found
        cliente = get_object_or_404(Clientes, id=client_id)

        # Retrieve all purchases for the current client
        compras_cliente = ItemVenda.objects.filter(cliente=cliente).select_related('venda', 'produto')

        # Serialize client and purchase data
        client_data = ClientSerializer(cliente).data
        purchases_data = PurchaseSerializer(compras_cliente, many=True).data

        if request.method == 'PUT':
            # Update client data with provided request data
            data = request.data
            cliente.nome = data.get('nome', cliente.nome)
            cliente.fantasia = data.get('fantasia', cliente.fantasia)
            cliente.tipo_pessoa = data.get('tipo_pessoa', cliente.tipo_pessoa)
            cliente.cpf_cnpj = data.get('cpf_cnpj', cliente.cpf_cnpj)
            cliente.email = data.get('email', cliente.email)
            cliente.celular = data.get('celular', cliente.celular)
            cliente.fone = data.get('fone', cliente.fone)
            cliente.cep = data.get('cep', cliente.cep)
            cliente.rota = data.get('rota', cliente.rota)
            cliente.endereco = data.get('endereco', cliente.endereco)
            cliente.numero = data.get('numero', cliente.numero)
            cliente.complemento = data.get('complemento', cliente.complemento)
            cliente.bairro = data.get('bairro', cliente.bairro)
            cliente.cidade = data.get('cidade', cliente.cidade)
            cliente.estado = data.get('estado', cliente.estado)
            cliente.situacao = data.get('situacao', cliente.situacao)
            cliente.vendedor = data.get('vendedor', cliente.vendedor)
            cliente.contribuinte = data.get('contribuinte', cliente.contribuinte)
            cliente.codigo_regime_tributario = data.get('codigo_regime_tributario', cliente.codigo_regime_tributario)

            cliente.save()

        return Response({
            'client': client_data,
            'purchases': purchases_data,
        })
    except Exception as e:
        return Response({
            'error': str(e),
        }, status=500)
    
@api_view(['GET'])
def all_inactive_clients_with_pdv_sales(request):
    """
    Retrieve all active clients with PDV sales.

    Checks cache for existing data; if not present, fetches from database,
    filters, structures, and caches the results before returning them.

    Args:
        request: The HTTP request object.

    Returns:
        Response: JSON response with active clients and their PDV sales data.
    """
    try:
        # Check if data is already cached
        cached_data = cache.get("clientes_ativos_com_vendas_pdv")
        if cached_data:
            return Response(cached_data, status=200)

        # Set today's date for filtering
        hoje = now().date()
        data_padrao = hoje

        # Fetch clients from pdv and annotate with last purchase date, excluding canceled sales
        clientes_filtrados = Clientes.objects.annotate(
            ultima_compra=Coalesce(
                Max(
                    "compras_cliente__venda__data_compra",
                    filter=Q(compras_cliente__venda__canal_venda="Pdv") & ~Q(compras_cliente__venda__situacao="Cancelado")
                ),
                Value(None)  # Default value will be None for easier filtering
            )
        ).exclude(
            nome__iexact="Consumidor Final"
        ).filter(
            ultima_compra__lt=data_padrao - timedelta(days=30)  # Only clients with no purchase in the last 30 days
        ).prefetch_related(
            Prefetch(
                "compras_cliente",
                queryset=ItemVenda.objects.select_related("venda", "produto").only(
                    "cliente_id", "produto__descricao", "produto__preco",
                    "venda__numero", "venda__data_compra",
                    "quantidade_produto", "valor_total", "valor_desconto", "frete", "preco_final", "venda__situacao"
                ).filter(
                    Q(venda__canal_venda="Pdv") & ~Q(venda__situacao="Cancelado"),
                ),
                to_attr="compras"
            )
        )

        # Filter out clients without purchases
        clientes_filtrados = [cliente for cliente in clientes_filtrados if len(cliente.compras) > 0]

        # Structure data for clients and their purchases
        clientes_ativos = {}
        # Structure data for clients and their purchases
        clientes_ativos = {}
        for cliente in clientes_filtrados:
            # Serialize client data and their purchases
            clientes_ativos[cliente.nome] = {
                "info": {
                    "id": cliente.id,
                    "nome": cliente.nome,
                    "fantasia": cliente.fantasia,
                    "tipo_pessoa": cliente.tipo_pessoa,
                    "cpf_cnpj": cliente.cpf_cnpj,
                    "email": cliente.email,
                    "celular": cliente.celular,
                    "fone": cliente.fone,
                    "cep": cliente.cep,
                    "rota": cliente.rota,
                    "endereco": cliente.endereco,
                    "numero": cliente.numero,
                    "complemento": cliente.complemento,
                    "bairro": cliente.bairro,
                    "cidade": cliente.cidade,
                    "estado": cliente.estado,
                    "situacao": cliente.situacao,
                    "vendedor": cliente.vendedor,
                    "contribuinte": cliente.contribuinte,
                    "codigo_regime_tributario": cliente.codigo_regime_tributario,
                    "limite_credito": cliente.limite_credito,
                    "ultima_compra": cliente.ultima_compra
                },
                "purchases": [
                    {
                        "id": compra.venda.id,
                        "data_compra": compra.venda.data_compra,
                        "produto": compra.produto.sku,
                        "quantidade_produto": compra.quantidade_produto,
                        "valor_total": compra.valor_total,
                        "valor_desconto": compra.valor_desconto,
                        "frete": compra.frete,
                        "preco_final": compra.preco_final,
                        "situacao": compra.venda.situacao
                    }
                    for compra in cliente.compras
                ]
            }

        # Cache the results
        cache.set("clientes_ativos_com_vendas_pdv", clientes_ativos, timeout=3600)
        return Response(clientes_ativos, status=200)

    except Exception as e:
        # Return error response in case of an unexpected error
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
    try:
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
        else:
            return JsonResponse({'error': 'Método não permitido.'}, status=405)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['GET'])
def all_clients_with_pdv_sales(request):
    """
    Retrieve all clients, including those without PDV sales, excluding inactive ones.
    
    Checks cache first; if not found, queries the database, structures data,
    caches it, and returns the result.
    """
    try:
        # Check cache
        cached_data = cache.get("all_clients_with_pdv_sales")
        if cached_data:
            return Response(cached_data, status=200)

        # Fetch and annotate clients with their last PDV purchase
        clientes = Clientes.objects.annotate(
            ultima_compra=Coalesce(
                Max(
                    "compras_cliente__venda__data_compra",
                    filter=~Q(compras_cliente__venda__situacao="Cancelado")
                ),
                Value(None)
            )
        ).exclude(
            nome__iexact="Consumidor Final"
        ).prefetch_related(
            Prefetch(
                "compras_cliente",
                queryset=ItemVenda.objects.select_related("venda", "produto").filter(
                    ~Q(venda__situacao="Cancelado")
                ),
                to_attr="compras"
            )
        )

        # Serialize data for clients and their purchases
        clientes_data = {
            cliente.nome: {
                "info": {
                    "id": cliente.id,
                    "nome": cliente.nome,
                    "fantasia": cliente.fantasia,
                    "tipo_pessoa": cliente.tipo_pessoa,
                    "cpf_cnpj": cliente.cpf_cnpj,
                    "email": cliente.email,
                    "celular": cliente.celular,
                    "fone": cliente.fone,
                    "cep": cliente.cep,
                    "rota": cliente.rota,
                    "endereco": cliente.endereco,
                    "numero": cliente.numero,
                    "complemento": cliente.complemento,
                    "bairro": cliente.bairro,
                    "cidade": cliente.cidade,
                    "estado": cliente.estado,
                    "situacao": cliente.situacao,
                    "vendedor": cliente.vendedor,
                    "contribuinte": cliente.contribuinte,
                    "codigo_regime_tributario": cliente.codigo_regime_tributario,
                    "limite_credito": cliente.limite_credito,
                    "ultima_compra": cliente.ultima_compra
                },
                "purchases": [
                    {
                        "data_compra": purchase.venda.data_compra,
                        "produto": purchase.produto.descricao,
                        "quantidade": purchase.quantidade_produto,
                        "valor_total": purchase.valor_total,
                        "valor_desconto": purchase.valor_desconto,
                        "frete": purchase.frete,
                        "preco_final": purchase.preco_final,
                        "canal": purchase.venda.canal_venda,
                    }
                    for purchase in cliente.compras
                ] if cliente.compras else [],  # Handle clients with no purchases
            }
            for cliente in clientes
        }

        # Cache the results
        cache.set("all_clients_with_pdv_sales", clientes_data, timeout=3600)

        return Response(clientes_data, status=200)

    except Exception as e:
        return Response({"error": "Unexpected error occurred.", "details": str(e)}, status=500)

@api_view(["GET"])
def top_20_clients(request):
    try:
        # Get the current date
        default_date = datetime.now().date()

        # Capture date parameters from request
        start_date = request.GET.get("start_date")
        end_date = request.GET.get("end_date")

        # Set default date range if not provided
        if not start_date:
            start_date = "1900-01-01"  # Arbitrarily old date to include all data
        if not end_date:
            end_date = default_date.strftime("%Y-%m-%d")  # Default to today

        # Parse dates
        try:
            start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
            end_date = datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)

        # Filter sales within the date range and not cancelled
        sales_in_date_range = ItemVenda.objects.filter(
            venda__canal_venda="Pdv"
        ).exclude(
            venda__situacao="Cancelado"
        ).filter(
            venda__data_compra__gte=start_date,
            venda__data_compra__lte=end_date
        )

        # Aggregate data based only on the filtered sales
        total_gasto_subquery = sales_in_date_range.filter(
            cliente_id=OuterRef('id')
        ).values('cliente_id').annotate(
            total_gasto=Coalesce(
                Sum('valor_total'),
                Value(Decimal("0.00"), output_field=DecimalField())
            )
        ).values('total_gasto')

        numero_compras_subquery = sales_in_date_range.filter(
            cliente_id=OuterRef('id')
        ).values('cliente_id').annotate(
            numero_compras=Count('venda', distinct=True)
        ).values('numero_compras')

        ultima_compra_subquery = sales_in_date_range.filter(
            cliente_id=OuterRef('id')
        ).values('cliente_id').annotate(
            ultima_compra=Max('venda__data_compra')
        ).values('ultima_compra')

        # Filter and annotate clients
        clientes_filtrados = Clientes.objects.annotate(
            total_gasto=Subquery(total_gasto_subquery),
            numero_compras=Subquery(numero_compras_subquery),
            ultima_compra=Subquery(ultima_compra_subquery)
        ).exclude(
            nome__iexact="Consumidor Final"
        ).filter(
            total_gasto__gt=0  # Only include clients with purchases in the period
        ).order_by("-total_gasto")[:20]

        # Serialize client data
        clientes_serializados = [
            {
                "id": cliente.id,
                "nome": cliente.nome,
                "ultima_compra": cliente.ultima_compra,
                "total_gasto": cliente.total_gasto,
                "numero_compras": cliente.numero_compras,
            }
            for cliente in clientes_filtrados
        ]
        return Response(clientes_serializados, status=200)
    except Exception as e:
        return Response({"error": str(e)}, status=400)
