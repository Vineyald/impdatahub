from rest_framework import serializers
from apps.coremodels.models import Clientes, ItemVenda
from django.db.models import Q, Value, Max
from django.db.models.functions import Coalesce

class ClientSerializer(serializers.ModelSerializer):
    ultima_compra = serializers.SerializerMethodField()

    class Meta:
        model = Clientes
        fields = '__all__'

    def get_ultima_compra(self, obj):
        ultima_compra = Clientes.objects.annotate(
            ultima_compra=Coalesce(
                Max(
                    "compras_cliente__venda__data_compra",
                    filter=Q(compras_cliente__venda__canal_venda="Pdv") & ~Q(compras_cliente__venda__situacao="Cancelado")
                ),
                Value(None)
            )
        ).get(id=obj.id).ultima_compra
        return ultima_compra

class PurchaseSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='venda.id', read_only=True)
    data_compra = serializers.DateField(source='venda.data_compra', read_only=True)
    situacao = serializers.CharField(source='venda.situacao', read_only=True)
    produto = serializers.CharField(source='produto.descricao', read_only=True)
    preco_unitario = serializers.DecimalField(source='produto.preco', max_digits=10, decimal_places=2, read_only=True)
    quantidade_produto = serializers.DecimalField(max_digits=10, decimal_places=2)
    valor_total = serializers.DecimalField(max_digits=10, decimal_places=2)
    valor_desconto = serializers.DecimalField(max_digits=10, decimal_places=2)
    frete = serializers.DecimalField(max_digits=10, decimal_places=2)
    preco_final = serializers.DecimalField(max_digits=10, decimal_places=2)
    origem = serializers.CharField(source='cliente.origem', read_only=True)

    class Meta:
        model = ItemVenda
        fields = [
            'id',
            'data_compra',
            'situacao',
            'produto',
            'preco_unitario',
            'quantidade_produto',
            'valor_total',
            'valor_desconto',
            'frete',
            'preco_final',
            'origem',
        ]
