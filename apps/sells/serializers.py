# serializers.py
from rest_framework import serializers
from apps.coremodels.models import Rotas, CidadesRotas, Vendas, ItemVenda

class RotaSerializer(serializers.ModelSerializer):
    cidades = serializers.SerializerMethodField()

    class Meta:
        model = Rotas
        fields = ['nome_rota', 'numero_rota', 'dia_semana', 'cidades']

    def get_cidades(self, obj):
        # Extract all cities for the route
        return [cidade.cidade for cidade in obj.cidades.all()]

class ItemVendaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemVenda
        fields = [
            'id_item_venda', 
            'produto', 
            'quantidade_produto', 
            'valor_unitario', 
            'valor_total', 
            'valor_desconto', 
            'preco_final', 
            'loja'
        ]

class VendasSerializer(serializers.ModelSerializer):
    itens_venda = ItemVendaSerializer(many=True, read_only=True)  # Serialize related items

    class Meta:
        model = Vendas
        fields = [
            'id', 
            'numero', 
            'canal_venda', 
            'data_compra', 
            'situacao', 
            'loja', 
            'itens_venda'
        ]