# Generated by Django 5.1.3 on 2024-11-22 14:13

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('coremodels', '0017_itemvenda_loja_vendas_loja'),
    ]

    operations = [
        migrations.AlterField(
            model_name='clientes',
            name='estado',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
    ]
