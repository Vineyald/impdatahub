from django.db import models
from django.contrib.auth.models import (
    AbstractBaseUser, 
    BaseUserManager, 
    PermissionsMixin, 
    Group, 
    Permission
)
from decimal import Decimal
from django.db.models import Sum, F

'''
==========================================================
                    Model de Clientes
==========================================================
'''

class Clientes(models.Model):
    # Identificação Básica
    id = models.AutoField(primary_key=True)
    nome = models.CharField(max_length=255)
    fantasia = models.CharField(max_length=255, null=True, blank=True)
    tipo_pessoa = models.CharField(
        max_length=100,
        choices=[('F', 'Física'), ('J', 'Jurídica')],
        null=False
    )
    cpf_cnpj = models.CharField(max_length=180, unique=True)

    # Contato
    email = models.EmailField(max_length=255, unique=False, null=True, blank=True)
    celular = models.CharField(max_length=150, null=True, blank=True)
    fone = models.CharField(max_length=150, null=True, blank=True)

    # Endereço
    cep = models.CharField(max_length=100)
    rota = models.ForeignKey('Rotas', on_delete=models.CASCADE, related_name='clientes_rota', null=True, blank=True)
    endereco = models.CharField(max_length=255)
    numero = models.CharField(max_length=100, null=True, blank=True)
    complemento = models.CharField(max_length=255, null=True, blank=True)
    bairro = models.CharField(max_length=100, null=True, blank=True)
    cidade = models.CharField(max_length=100, null=True, blank=True)
    estado = models.CharField(max_length=100, null=True, blank=True)

    # Classificação e Situação
    situacao = models.CharField(
        max_length=200,
        choices=[('ativo', 'Ativo'), ('inativo', 'Inativo')],
        default='ativo'
    )
    vendedor = models.ForeignKey('Vendedores', on_delete=models.CASCADE, related_name='cliente_vendedor', null=True)
    contribuinte = models.BooleanField(default=False)
    codigo_regime_tributario = models.CharField(max_length=50, null=True, blank=True)
    limite_credito = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    def __str__(self):
        return f"Cliente {self.nome} ({self.cpf_cnpj})"

    def total_compras(self):
        """Retorna o valor total de compras realizadas por este cliente."""
        return self.compras_cliente.aggregate(total=Sum('preco_final'))['total'] or Decimal('0.00')

    def total_descontos(self):
        """Retorna o valor total de descontos em todas as compras do cliente."""
        return self.compras_cliente.aggregate(total=Sum('valor_desconto'))['total'] or Decimal('0.00')

    class Meta:
        verbose_name = "Cliente"
        verbose_name_plural = "Clientes"
        ordering = ['nome']

'''
==========================================================
                    Model de Produtos
==========================================================
'''

class Produtos(models.Model):
    sku = models.CharField(primary_key=True, max_length=100, unique=True)
    descricao = models.CharField(max_length=255)
    preco = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    preco_promocional = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    estoque_disponivel = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    unidade = models.CharField(max_length=50, default="un", null=True, blank=True)
    custo = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def __str__(self):
        return f"Produto {self.sku} - {self.descricao}"

    def em_promocao(self):
        return self.preco_promocional is not None and self.preco_promocional < self.preco

    def estoque_suficiente(self, quantidade):
        return self.estoque_disponivel >= quantidade
    
    class Meta:
        verbose_name = "Produto"
        verbose_name_plural = "Produtos"
        ordering = ['descricao']

'''
==========================================================
                    Model de Vendedores
==========================================================
'''

class Vendedores(models.Model):
    id = models.IntegerField(primary_key=True)
    nome = models.CharField(max_length=255)

    def __str__(self):
        return f"Vendedor N° {self.id} - {self.nome}"

    def total_vendas(self):
        """Retorna o total de vendas realizadas por este vendedor."""
        return self.vendas_vendedor.aggregate(total=Sum('valor_total'))['total'] or Decimal('0.00')

    def total_itens_vendidos(self):
        """Retorna o total de itens vendidos por este vendedor."""
        return self.vendas_vendedor.aggregate(total=Sum('quantidade_produto'))['total'] or Decimal('0.00')

'''
==========================================================
                    Model de Vendas
==========================================================
'''

class Vendas(models.Model):
    id = models.AutoField(primary_key=True)
    numero = models.IntegerField(null=False, default='1')
    canal_venda = models.CharField(max_length=255, null=True)
    data_compra = models.DateField()
    situacao = models.CharField(max_length=255, null=True)
    loja = models.CharField(max_length=255, null=True)

    def __str__(self):
        return f"Pedido {self.id} - {self.data_compra}"

    def total_itens(self):
        """Retorna o número total de itens nesta venda."""
        return self.itens_venda.aggregate(total=Sum('quantidade_produto'))['total'] or 0

    def valor_total(self):
        """Calcula o valor total desta venda."""
        return self.itens_venda.aggregate(total=Sum(F('preco_final') - F('valor_desconto')))['total'] or Decimal('0.00')

'''
==========================================================
                Model de Itens por Venda
==========================================================
'''
    
class ItemVenda(models.Model):
    id_item_venda = models.AutoField(primary_key=True)
    venda = models.ForeignKey('Vendas', on_delete=models.CASCADE, related_name='itens_venda')
    cliente = models.ForeignKey('Clientes', on_delete=models.CASCADE, related_name='compras_cliente')
    vendedor = models.ForeignKey('Vendedores', on_delete=models.CASCADE, related_name='vendas_vendedor', blank=True, null=True)
    produto = models.ForeignKey('Produtos', on_delete=models.CASCADE, related_name='itens_produto')
    quantidade_produto = models.FloatField()
    valor_unitario = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    valor_total = models.DecimalField(max_digits=10, decimal_places=2)
    valor_desconto = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    desconto_rateado = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    frete_rateado = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    despesas_rateadas = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    frete = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    preco_final = models.DecimalField(max_digits=10, decimal_places=2)
    loja = models.CharField(max_length=255, null=True)
    rastreamento = models.CharField(max_length=255, null=True, blank=True)
    ordem_compra = models.CharField(max_length=255, null=True, blank=True)
    destinatario = models.CharField(max_length=255, null=True, blank=True)
    cpf_cnpj_entrega = models.CharField(max_length=180, null=True, blank=True)
    cep_entrega = models.CharField(max_length=100, null=True, blank=True)
    municipio_entrega = models.CharField(max_length=100, null=True, blank=True)
    estado_entrega = models.CharField(max_length=100, null=True, blank=True)
    endereco_entrega = models.CharField(max_length=255, null=True, blank=True)
    numero_entrega = models.CharField(max_length=100, null=True, blank=True)
    complemento_entrega = models.CharField(max_length=255, null=True, blank=True)
    bairro_entrega = models.CharField(max_length=100, null=True, blank=True)
    fone_entrega = models.CharField(max_length=150, null=True, blank=True)

    class Meta:
        unique_together = ('venda', 'produto')

    def __str__(self):
        return f"Item {self.produto} do pedido {self.venda}"

'''
==========================================================
                    Rotas Models
==========================================================
'''

class Rotas(models.Model):
    id = models.AutoField(primary_key=True)
    nome_rota = models.CharField(max_length=255)
    dia_semana = models.IntegerField()
    Numero_rota = models.IntegerField()

    def __str__(self):
        return self.nome_rota
    
class CidadesRotas(models.Model):
    id = models.AutoField(primary_key=True)
    rota = models.ForeignKey('Rotas', on_delete=models.CASCADE, related_name='cidades_rota')
    cidade = models.CharField(max_length=255)

    def __str__(self):
        return self.cidade
    
'''
==========================================================
                    User Auth Models
==========================================================
'''

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("O email é obrigatório")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    admin_password = models.CharField(max_length=128, blank=True, null=True)  # Senha ADM

    groups = models.ManyToManyField(
        Group,
        related_name="core_user_set",
        blank=True,
        help_text="Os grupos a que o usuário pertence.",
        verbose_name="grupos",
    )
    user_permissions = models.ManyToManyField(
        Permission,
        related_name="core_user_permissions_set",
        blank=True,
        help_text="As permissões específicas do usuário.",
        verbose_name="permissões de usuário",
    )

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    def __str__(self):
        return self.email