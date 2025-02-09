# Generated by Django 5.1.3 on 2024-11-22 14:14

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('coremodels', '0018_alter_clientes_estado'),
    ]

    operations = [
        migrations.AlterField(
            model_name='clientes',
            name='celular',
            field=models.CharField(blank=True, max_length=150, null=True),
        ),
        migrations.AlterField(
            model_name='clientes',
            name='cep',
            field=models.CharField(max_length=100),
        ),
        migrations.AlterField(
            model_name='clientes',
            name='cpf_cnpj',
            field=models.CharField(max_length=180, unique=True),
        ),
        migrations.AlterField(
            model_name='clientes',
            name='fone',
            field=models.CharField(blank=True, max_length=150, null=True),
        ),
        migrations.AlterField(
            model_name='clientes',
            name='numero',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
    ]
