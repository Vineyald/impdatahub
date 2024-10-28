from rest_framework import serializers
from apps.coremodels.models import Clientes, Vendas, ItemVenda

class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Clientes
        fields = ['id', 'id_original', 'origem', 'nome', 'cep', 'cpf_cnpj', 'celular', 'endereco', 'tipo_pessoa']

class PurchaseSerializer(serializers.ModelSerializer):
    numero_venda = serializers.CharField(source='venda.numero_venda_original')
    data_compra = serializers.DateField(source='venda.data_compra')
    produto = serializers.CharField(source='produto.descricao')
    preco_unitario = serializers.DecimalField(source='produto.preco_unitario', max_digits=10, decimal_places=2)
    quantidade_produto = serializers.DecimalField(max_digits=10, decimal_places=2)
    valor_total = serializers.DecimalField(max_digits=10, decimal_places=2)
    valor_desconto = serializers.DecimalField(max_digits=10, decimal_places=2)
    frete = serializers.DecimalField(max_digits=10, decimal_places=2)
    preco_final = serializers.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        model = ItemVenda
        fields = [
            'numero_venda', 'data_compra', 'produto', 'quantidade_produto',
            'preco_unitario', 'valor_total', 'valor_desconto', 'frete', 'preco_final', 'origem'
        ]
