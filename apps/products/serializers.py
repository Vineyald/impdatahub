from rest_framework import serializers
from apps.coremodels.models import Produtos

class ProdutoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Produtos
        fields = ['sku', 'descricao', 'preco', 'preco_promocional', 'estoque_disponivel', 'unidade', 'custo']
