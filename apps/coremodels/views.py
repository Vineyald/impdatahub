from rest_framework.response import Response
from rest_framework.decorators import api_view
from .serializers import ClienteInativoSerializer, ClienteSerializer
from .models import Clientes, ItemVenda
from django.db.models import OuterRef, Subquery, Sum, F, Prefetch, Case, When, FloatField, Max, Q
from collections import defaultdict
from django.utils import timezone
from datetime import timedelta
from datetime import datetime


# Função para filtrar por PDV e origem
def clientes_inativos_pdv_intervalo(dias_min, dias_max=None, origem=None):
    hoje = timezone.now().date()
    data_limite_min = hoje - timedelta(days=dias_min)
    data_limite_max = hoje - timedelta(days=dias_max) if dias_max else None

    # Subquery para pegar a última data de compra feita no PDV e por origem
    ultima_venda_subquery = ItemVenda.objects.filter(
        cliente_id=OuterRef('pk'),
        venda__canal_venda='Pdv',
        venda__origem=origem  # Filtro pela origem
    ).order_by('-venda__data_compra').values('venda__data_compra')[:1]

    clientes = Clientes.objects.annotate(ultima_compra=Subquery(ultima_venda_subquery))

    # Filtra os clientes por data de compra
    if data_limite_max:
        return clientes.filter(ultima_compra__gte=data_limite_max, ultima_compra__lt=data_limite_min)
    else:
        return clientes.filter(ultima_compra__lt=data_limite_min)

# Função para filtrar os clientes por origem
def filtrar_clientes_pdv_por_origem():
    # Filtra por origem 'servi' e 'imp'
    df_servi_30_60 = clientes_inativos_pdv_intervalo(30, 60, origem='servi')
    df_servi_60_90 = clientes_inativos_pdv_intervalo(60, 90, origem='servi')
    df_servi_90_120 = clientes_inativos_pdv_intervalo(90, 120, origem='servi')
    df_servi_mais_120 = clientes_inativos_pdv_intervalo(120, origem='servi')

    df_imp_30_60 = clientes_inativos_pdv_intervalo(30, 60, origem='imp')
    df_imp_60_90 = clientes_inativos_pdv_intervalo(60, 90, origem='imp')
    df_imp_90_120 = clientes_inativos_pdv_intervalo(90, 120, origem='imp')
    df_imp_mais_120 = clientes_inativos_pdv_intervalo(120, origem='imp')

    # Concatenar os dados gerais
    df_geral_30_60 = df_servi_30_60.union(df_imp_30_60)
    df_geral_60_90 = df_servi_60_90.union(df_imp_60_90)
    df_geral_90_120 = df_servi_90_120.union(df_imp_90_120)
    df_geral_mais_120 = df_servi_mais_120.union(df_imp_mais_120)

    return {
        'geral': {
            '30_60': df_geral_30_60, '60_90': df_geral_60_90, '90_120': df_geral_90_120, 'mais_120': df_geral_mais_120
        },
        'servi': {
            '30_60': df_servi_30_60, '60_90': df_servi_60_90, '90_120': df_servi_90_120, 'mais_120': df_servi_mais_120
        },
        'imp': {
            '30_60': df_imp_30_60, '60_90': df_imp_60_90, '90_120': df_imp_90_120, 'mais_120': df_imp_mais_120
        }
    }

@api_view(['GET'])
def clientes_inativos_pdv_api(request):
    data = filtrar_clientes_pdv_por_origem()

    response_data = {
        'geral': {
            '30_60': ClienteInativoSerializer(data['geral']['30_60'], many=True).data,
            '60_90': ClienteInativoSerializer(data['geral']['60_90'], many=True).data,
            '90_120': ClienteInativoSerializer(data['geral']['90_120'], many=True).data,
            'mais_120': ClienteInativoSerializer(data['geral']['mais_120'], many=True).data,
        },
        'servi': {
            '30_60': ClienteInativoSerializer(data['servi']['30_60'], many=True).data,
            '60_90': ClienteInativoSerializer(data['servi']['60_90'], many=True).data,
            '90_120': ClienteInativoSerializer(data['servi']['90_120'], many=True).data,
            'mais_120': ClienteInativoSerializer(data['servi']['mais_120'], many=True).data,
        },
        'imp': {
            '30_60': ClienteInativoSerializer(data['imp']['30_60'], many=True).data,
            '60_90': ClienteInativoSerializer(data['imp']['60_90'], many=True).data,
            '90_120': ClienteInativoSerializer(data['imp']['90_120'], many=True).data,
            'mais_120': ClienteInativoSerializer(data['imp']['mais_120'], many=True).data,
        }
    }

    return Response(response_data)

# Função para padronizar os nomes (capitalizar corretamente)
def padronizar_nome(nome):
    return nome.strip().title()

@api_view(['GET'])
def clientes_ranking(request):
    # Capturar parâmetros de data
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')

    # Aplicar filtro de data
    date_filter = Q()
    if start_date:
        start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
        date_filter &= Q(compras_cliente__venda__data_compra__gte=start_date)
    if end_date:
        end_date = datetime.strptime(end_date, "%Y-%m-%d").date()
        date_filter &= Q(compras_cliente__venda__data_compra__lte=end_date)

    # Filtrar clientes e calcular o total gasto
    clientes = (
        Clientes.objects
        .exclude(nome__icontains='Consumidor Final')
        .filter(date_filter)
        .annotate(total_gasto=Sum('compras_cliente__valor_total'))
        .values('id', 'nome', 'origem', 'total_gasto')
    )

    # Consultar última compra de cada cliente baseado nas origens
    compras_por_cliente = (
        ItemVenda.objects
        .filter(venda__canal_venda='Pdv', venda__origem__in=['servi', 'imp'])
        .values('cliente_id', 'venda__origem')
        .annotate(ultima_compra=Max('venda__data_compra'))
    )

    # Dicionários para armazenar última compra por origem
    ultima_compra_servi_dict = {compra['cliente_id']: compra['ultima_compra'] for compra in compras_por_cliente if compra['venda__origem'] == 'servi'}
    ultima_compra_imp_dict = {compra['cliente_id']: compra['ultima_compra'] for compra in compras_por_cliente if compra['venda__origem'] == 'imp'}

    # Dicionário geral de clientes
    clientes_geral = defaultdict(lambda: {'nome': '', 'total_gasto': 0, 'ultima_compra_servi': None, 'ultima_compra_imp': None})
    clientes_servi = []
    clientes_imp = []

    for cliente in clientes:
        cliente_id = cliente['id']
        cliente_nome = cliente['nome'].capitalize()
        cliente_dados = {
            'nome': cliente_nome,
            'id': cliente_id,
            'total_gasto': cliente['total_gasto'] or 0,
            'ultima_compra_servi': ultima_compra_servi_dict.get(cliente_id),
            'ultima_compra_imp': ultima_compra_imp_dict.get(cliente_id)
        }

        # Inicializa o nome do cliente apenas se ainda não estiver preenchido
        if not clientes_geral[cliente_nome]['nome']:
            clientes_geral[cliente_nome]['nome'] = cliente_nome.capitalize()

        if cliente_dados['ultima_compra_imp']:
            clientes_geral[cliente_nome]['ultima_compra_imp'] = cliente_dados['ultima_compra_imp']

        if cliente_dados['ultima_compra_servi']:
            clientes_geral[cliente_nome]['ultima_compra_servi'] = cliente_dados['ultima_compra_servi']

        clientes_geral[cliente_nome]['total_gasto'] += cliente_dados['total_gasto']
        clientes_geral[cliente_nome]['id'] = cliente_id

        # Separar por origem
        if cliente['origem'] == 'servi':
            clientes_servi.append({
                'nome': cliente_nome,
                'id': cliente_id,
                'total_gasto': cliente_dados['total_gasto'],
                'ultima_compra': cliente_dados['ultima_compra_servi']
            })
        elif cliente['origem'] == 'imp':
            clientes_imp.append({
                'nome': cliente_nome,
                'id': cliente_id,
                'total_gasto': cliente_dados['total_gasto'],
                'ultima_compra': cliente_dados['ultima_compra_imp']
            })

    # Ordenação e corte para o top 20 de cada ranking
    ranking_geral = sorted(clientes_geral.values(), key=lambda x: x['total_gasto'], reverse=True)[:20]
    ranking_servi = sorted(clientes_servi, key=lambda x: x['total_gasto'], reverse=True)[:20]
    ranking_imp = sorted(clientes_imp, key=lambda x: x['total_gasto'], reverse=True)[:20]

    return Response({
        'Geral': ranking_geral,
        'Servi': ranking_servi,
        'Imp': ranking_imp
    })


@api_view(['GET'])
def clientes_radar(request):
    data_atual = timezone.now().date()
    data_60_dias = data_atual - timedelta(days=60)
    data_120_dias = data_atual - timedelta(days=120)

    clientes = Clientes.objects.exclude(nome__icontains='Consumidor Final').prefetch_related(
        Prefetch('compras_cliente', queryset=ItemVenda.objects.select_related('venda'))
    )

    clientes_totais = defaultdict(lambda: {'total_60_dias': 0, 'total_61_120_dias': 0})

    for cliente in clientes:
        cliente_nome = padronizar_nome(cliente.nome)

        total_60_dias = cliente.compras_cliente.filter(venda__data_compra__gte=data_60_dias).aggregate(total=Sum('valor_total'))['total'] or 0
        total_61_120_dias = cliente.compras_cliente.filter(venda__data_compra__lt=data_60_dias, venda__data_compra__gte=data_120_dias).aggregate(total=Sum('valor_total'))['total'] or 0

        clientes_totais[cliente_nome]['total_60_dias'] += total_60_dias
        clientes_totais[cliente_nome]['total_61_120_dias'] += total_61_120_dias

    resultado_radar = [{'nome': nome, **totais} for nome, totais in clientes_totais.items()]

    # Ordena e retorna os 6 clientes que mais compraram nos últimos 60 dias
    ranking_radar = sorted(resultado_radar, key=lambda x: x['total_60_dias'], reverse=True)[:6]

    return Response({
        'Geral': ranking_radar,
        'Servi': [cliente for cliente in ranking_radar if cliente['origem'] == 'servi'][:6],
        'Imp': [cliente for cliente in ranking_radar if cliente['origem'] == 'imp'][:6]
    })

