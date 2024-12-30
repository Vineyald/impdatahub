from datetime import date, datetime, timedelta
from decimal import Decimal
from django.forms import DecimalField
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from apps.coremodels.models import Produtos, ItemVenda, Clientes, Vendas
from django.db.models import Count, Sum, F, Q, Prefetch
from django.db.models.functions import Cast
from .serializers import ProdutoSerializer
from time import time
import logging
from django.db.models.functions import Coalesce

# Set up logging configuration
logger = logging.getLogger(__name__)

class AllProductsView(APIView):
    def get(self, request):
        t0 = time()

        # Query to fetch only necessary fields and annotate with number of sells and total quantity sold
        produtos = Produtos.objects.all().only(
            'sku', 'descricao', 'preco', 'preco_promocional', 
            'estoque_disponivel', 'unidade', 'custo'
        ).annotate(
            numero_vendas=Count('itens_produto'),  # Count the number of ItemVenda instances related to each product
            total_vendido=Sum('itens_produto__quantidade_produto')  # Sum the quantities sold from ItemVenda
        )
        
        t1 = time()
        logger.info(f'Produtos Query Time: {t1 - t0} seconds')

        # Convert queryset to a list of dictionaries
        produtos_data = list(produtos.values(
            'sku', 'descricao', 'preco', 'preco_promocional', 
            'estoque_disponivel', 'unidade', 'custo', 
            'numero_vendas', 'total_vendido'
        ))

        t2 = time()
        logger.info(f'Produtos Data Conversion Time: {t2 - t1} seconds')

        # Return the products data
        logger.info(f'Total Request Time: {t2 - t0} seconds')
        
        return Response(produtos_data, status=status.HTTP_200_OK)

class ProductDetailView(APIView):
    def get(self, request, sku):
        print(f"GET /api/products/{sku}")
        try:
            produto = Produtos.objects.select_related().get(sku=sku)

            vendas = ItemVenda.objects.filter(produto=produto).select_related(
                'venda', 'cliente', 'itemvenda'
            ).annotate(
                id_venda=F('venda__id'),
                data_compra=F('venda__data_compra'),
                nome_cliente=F('cliente__nome'),
                id_cliente=F('cliente__id'),
                #valor_total=F('preco_final')  # Use F() expression to reference preco_final field
            ).values(
                'id_venda', 'data_compra', 'quantidade_produto', 'id_cliente', 'nome_cliente', 'valor_total'
            )

            data = {
                'produto': {
                    'sku': produto.sku,
                    'descricao': produto.descricao,
                    'preco': str(produto.preco),
                    'preco_promocional': str(produto.preco_promocional) if produto.preco_promocional else None,
                    'estoque_disponivel': str(produto.estoque_disponivel),
                    'unidade': produto.unidade,
                    'custo': str(produto.custo),
                    'vendas': list(vendas)
                }
            }

            print(f"Returning response data for produto {sku}")
            return Response(data, status=status.HTTP_200_OK)

        except Produtos.DoesNotExist:
            print(f"Produto {sku} does not exist")
            return Response({'error': 'Produto não encontrado'}, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            print(f"Error retrieving produto {sku}: {str(e)}")
            return Response({'error': 'Internal server error', 'details': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    def put(self, request, sku):
        print(f"PUT /api/products/{sku}")
        try:
            produto = Produtos.objects.get(sku=sku)

            # Update the product using the serializer
            serializer = ProdutoSerializer(produto, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                print(f"Updated produto {sku} successfully")
                return Response(serializer.data, status=status.HTTP_200_OK)
            else:
                print(f"Validation error for produto {sku}: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except Produtos.DoesNotExist:
            print(f"Produto {sku} does not exist")
            return Response({'error': 'Produto não encontrado'}, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            print(f"Error updating produto {sku}: {str(e)}")
            return Response({'error': 'Internal server error', 'details': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

from django.db.models import F, Sum, Q, DecimalField, Value
from django.db.models.functions import Coalesce
from decimal import Decimal
from datetime import datetime, date, timedelta
from django.http import JsonResponse

def homePageData(request):
    
    try:
        # Default start and end dates
        default_start_date = date(2024, 1, 1)
        default_end_date = date.today()

        # Parse date filters from request query parameters
        start_date_str = request.GET.get('startDate', default_start_date.strftime('%d-%m-%Y'))
        end_date_str = request.GET.get('endDate', default_end_date.strftime('%d-%m-%Y'))

        # Validate date formats
        try:
            start_date = datetime.strptime(start_date_str, '%d-%m-%Y').date()
            end_date = datetime.strptime(end_date_str, '%d-%m-%Y').date()
        except ValueError as ve:
            error_msg = f"Invalid date format. Use DD-MM-YYYY. Error: {ve}"
            print(error_msg)
            return JsonResponse({"error": error_msg}, status=400)

        # Filter valid (non-canceled) sales
        valid_sales = Vendas.objects.filter(
            ~Q(situacao__iexact='Cancelado'),
            data_compra__range=(start_date, end_date)
        )

        # Total PDV Sales
        total_pdv_sales = (
            valid_sales
            .filter(canal_venda='Pdv')
            .annotate(
                venda_total=Coalesce(Sum(F('itens_venda__valor_total')), Decimal('0.00'))
            )
            .aggregate(total=Sum('venda_total'))['total']
        )

        # Total Ecommerce Sales
        total_ecommerce_sales = (
            valid_sales
            .exclude(canal_venda='Pdv')
            .annotate(
                venda_total=Coalesce(Sum(F('itens_venda__valor_total')), Decimal('0.00'))
            )
            .aggregate(total=Sum('venda_total'))['total']
        )

        # Total Canceled Sales
        total_canceled_sales = (
            Vendas.objects
            .filter(situacao__iexact='Cancelado', data_compra__range=(start_date, end_date))
            .annotate(
                venda_total=Coalesce(Sum(F('itens_venda__valor_total')), Decimal('0.00'))
            )
            .aggregate(total=Sum('venda_total'))['total']
        )

        # Channel Data
        channel_data = (
            valid_sales
            .annotate(
                venda_total=Coalesce(Sum(F('itens_venda__valor_total'), output_field=DecimalField(max_digits=10, decimal_places=2)), Decimal('0.00'))
            )
            .values('canal_venda', 'venda_total')
            .annotate(
                venda_count=Count('id'),
                item_count=Cast(
                    Coalesce(Sum(F('itens_venda__quantidade_produto'), output_field=DecimalField(max_digits=10, decimal_places=2)), Decimal('0.00')),
                    output_field=DecimalField(max_digits=10, decimal_places=2))
            )
            .order_by('canal_venda')
        )

        # Define time periods
        today = date.today()
        one_week_ago = today - timedelta(days=7)
        one_month_ago = today - timedelta(days=30)

        # Helper to aggregate sales data
        def aggregate_sales(queryset):
            return list(
                queryset.annotate(
                    value=Coalesce(F('itens_venda__valor_total'), Decimal('0.00')),
                    quantity=Coalesce(Sum(F('itens_venda__quantidade_produto'), output_field=DecimalField()), Decimal('0.00'))
                ).values('id', 'data_compra', 'value', 'quantity')
            )

        # Today's Sales
        today_sales = aggregate_sales(valid_sales.filter(data_compra=today))

        # Last Week's Sales
        last_week_sales = aggregate_sales(valid_sales.filter(data_compra__range=(one_week_ago, today)))

        # Last Month's Sales
        last_month_sales = aggregate_sales(valid_sales.filter(data_compra__range=(one_month_ago, today)))

        # Calculate average sales
        total_sales = valid_sales.aggregate(total=Sum(F('itens_venda__valor_total')))['total'] or Decimal('0.00')
        total_days = (end_date - start_date).days or 1  # Avoid division by zero
        average_sales = total_sales / total_days

        # Average sales for the last 30 days
        total_last_month_sales = valid_sales.filter(data_compra__range=(one_month_ago, today)).aggregate(total=Sum(F('itens_venda__valor_total')))['total'] or Decimal('0.00')
        average_sales_per_month = total_last_month_sales / 30  # Assuming 30 days for monthly average

        # Average sales for the last 7 days
        total_last_week_sales = valid_sales.filter(data_compra__range=(one_week_ago, today)).aggregate(total=Sum(F('itens_venda__valor_total')))['total'] or Decimal('0.00')
        average_sales_per_week = total_last_week_sales / 7  # 7 days for weekly average

        # Sales per Route
        sales_per_route = (
            valid_sales
            .filter(itens_venda__cliente__rota__isnull=False)
            .values('itens_venda__cliente__rota__nome_rota')
            .annotate(
                total_sales=Coalesce(Sum(F('itens_venda__valor_total')), Decimal('0.00'))
            )
            .order_by('itens_venda__cliente__rota__nome_rota')
        )

        # Prepare response with detailed sales per route
        response_data = {
            "totalPdvSales": total_pdv_sales,
            "totalEcommerceSales": total_ecommerce_sales,
            "totalCanceledSales": total_canceled_sales,
            "startDate": start_date.strftime('%Y-%m-%d'),
            "endDate": end_date.strftime('%Y-%m-%d'),
            "channelData": list(channel_data),
            "todaySales": today_sales,
            "lastWeekSales": last_week_sales,
            "lastMonthSales": last_month_sales,
            "averageSales": round(average_sales, 2),
            "averageSalesPerMonth": round(average_sales_per_month, 2),
            "averageSalesPerWeek": round(average_sales_per_week, 2),
            "salesPerRoute": [
                {"routeName": entry["itens_venda__cliente__rota__nome_rota"], "value": entry["total_sales"]}
                for entry in sales_per_route
            ],
        }

        return JsonResponse(response_data, safe=False)

    except Exception as e:
        error_msg = f"Unexpected error: {e}"
        print(error_msg)
        return JsonResponse({"error": error_msg}, status=500)

class ProductInfoView(APIView):
    def get(self, request):
        print("GET /api/products-list")
        try:
            # Configurar Prefetch para itens de venda
            item_vendas_prefetch = Prefetch(
                'itens_produto',  # Utilize o related_name no modelo Produtos
                queryset=ItemVenda.objects.select_related('venda', 'cliente').annotate(
                    id_venda=F('venda__id'),
                    data_compra=F('venda__data_compra'),
                    nome_cliente=F('cliente__nome'),
                    id_cliente=F('cliente__id'),
                    numero_vendas=Count('id_item_venda'),
                    total_vendido=Sum('quantidade_produto')
                ),
                to_attr='prefetched_vendas'
            )

            # Buscar produtos com pré-carregamento
            produtos = Produtos.objects.all().prefetch_related(item_vendas_prefetch)

            # Preparar a resposta
            data = {'produtos': []}

            for produto in produtos:
                produto_data = {
                    'sku': produto.sku,
                    'descricao': produto.descricao,
                    'preco': str(produto.preco),
                    'estoque_disponivel': str(produto.estoque_disponivel),
                    'custo': str(produto.custo),
                    'total_vendido': str(sum(venda.total_vendido for venda in produto.prefetched_vendas)),
                    'numero_vendas': str(len(produto.prefetched_vendas)),
                    'valor_total_vendido': None,
                    'vendas': []
                }
            
                for venda in produto.prefetched_vendas:
                    produto_data['vendas'].append({
                        'data_compra': venda.data_compra,
                        'valor_vendido': venda.valor_total,
                    })
            
                produto_data['valor_total_vendido'] = str(sum(venda['valor_vendido'] for venda in produto_data['vendas']))
            
                data['produtos'].append(produto_data)

            print("Returning response data for all products")
            return Response(data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Error retrieving products: {str(e)}")
            return Response({'error': 'Internal server error', 'details': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
