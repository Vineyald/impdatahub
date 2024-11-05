from rest_framework import serializers
from .models import Clientes, Vendas, ItemVenda, Produtos

class VendasSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendas
        fields = '__all__'

class ProdutosSerializer(serializers.ModelSerializer):
    class Meta:
        model = Produtos
        fields = ['codigo', 'descricao', 'preco_unitario']

class ItemVendaSerializer(serializers.ModelSerializer):
    produto = ProdutosSerializer()

    class Meta:
        model = ItemVenda
        fields = ['produto', 'quantidade_produto', 'valor_total']

class CompraSerializer(serializers.ModelSerializer):
    itens_venda = ItemVendaSerializer(many=True, source='itens_venda')

    class Meta:
        model = Vendas
        fields = ['id', 'data_compra', 'canal_venda', 'itens_venda', 'preco_final']

class ClienteSerializer(serializers.ModelSerializer):
    compras = CompraSerializer(many=True, source='compras_cliente')

    class Meta:
        model = Clientes
        fields = ['nome', 'id', 'origem', 'compras']

from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['email', 'password', 'name', 'admin_password']  # Adicione os campos necessários

    def create(self, validated_data):
        user = User(
            email=validated_data['email'],
            name=validated_data['name'],
        )
        user.set_password(validated_data['password'])  # Certifique-se de usar set_password para criptografar
        user.save()
        return user