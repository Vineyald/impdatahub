from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin, Group, Permission
class Clientes(models.Model):
    id = models.AutoField(primary_key=True)  # Gerar um novo ID único no banco consolidado
    id_original = models.CharField(max_length=255, default='nun')  # Manter o ID original de cada site
    origem = models.CharField(max_length=50, default='nun')  # Diferenciar a origem (ex: 'site_A', 'site_B')
    nome = models.CharField(max_length=255)
    cep = models.CharField(max_length=22, null=False)
    cpf_cnpj = models.CharField(max_length=22, null=False)
    celular = models.CharField(max_length=22, null=False)
    endereco = models.CharField(max_length=255, null=False)
    tipo_pessoa = models.CharField(max_length=50, choices=[('F', 'Física'), ('J', 'Jurídica')], null=False)

    class Meta:
        unique_together = ('id_original', 'origem')  # Definir unicidade combinada

    def __str__(self):
        return f"Cliente N° {self.id} (Origem: {self.origem}) - {self.nome}"

class Produtos(models.Model):
    codigo = models.CharField(primary_key=True, unique=True, max_length=100)  # Não há necessidade de alterações, pois é único por produto
    descricao = models.CharField(max_length=255)
    custo = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    preco_unitario = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    estoque = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def __str__(self):
        return f"Produto {self.codigo} - {self.descricao}"

class Vendedores(models.Model):
    id = models.AutoField(primary_key=True)  # Gerar um novo ID único no banco consolidado
    id_original = models.CharField(max_length=255, default='nun')  # ID original de cada site
    origem = models.CharField(max_length=50, default='nun')  # Diferenciar a origem
    nome = models.CharField(max_length=255)

    def __str__(self):
        return f"Vendedor N° {self.id} (Origem: {self.origem}) - {self.nome}"

class Vendas(models.Model):
    id = models.AutoField(primary_key=True)
    numero_venda_original = models.CharField(max_length=255, default='nun')  # Manter o ID original da venda de cada site
    origem = models.CharField(max_length=50, default='nun')  # Diferenciar a origem (ex: 'site_A', 'site_B')
    canal_venda = models.CharField(max_length=255, null=True)  # Permitindo nulo para preencher com "Pdv"
    data_compra = models.DateField()
    situacao = models.CharField(max_length=255, null=True)

    class Meta:
        unique_together = ('numero_venda_original', 'origem')  # Definir unicidade combinada

    def __str__(self):
        return f"Pedido {self.numero_venda_original} (Origem: {self.origem}) - {self.data_compra}"
class ItemVenda(models.Model):
    id_item_venda = models.AutoField(primary_key=True)  # Novo ID gerado no banco consolidado
    venda = models.ForeignKey(Vendas, on_delete=models.CASCADE, related_name='itens_venda')  # Nome único
    cliente = models.ForeignKey(Clientes, on_delete=models.CASCADE, related_name='compras_cliente')  # Nome mais claro
    vendedor = models.ForeignKey(Vendedores, on_delete=models.CASCADE, related_name='vendas_vendedor')  # Nome mais claro
    produto = models.ForeignKey(Produtos, on_delete=models.CASCADE, related_name='itens_produto')  # Nome único
    quantidade_produto = models.DecimalField(max_digits=10, decimal_places=2)
    valor_total = models.DecimalField(max_digits=10, decimal_places=2)
    valor_desconto = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    frete = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    preco_final = models.DecimalField(max_digits=10, decimal_places=2)
    origem = models.CharField(max_length=50, default='nun')  # Diferenciar a origem (ex: 'site_A', 'site_B')

    class Meta:
        unique_together = ('venda', 'produto', 'origem')


    def __str__(self):
        return f"Item {self.produto} do pedido {self.venda}"

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