# Generated by Django 5.1.3 on 2024-11-21 20:58

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('coremodels', '0015_alter_clientes_options_alter_produtos_options_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='clientes',
            name='rota',
            field=models.CharField(blank=True, max_length=120, null=True),
        ),
        migrations.AlterField(
            model_name='clientes',
            name='vendedor',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='cliente_vendedor', to='coremodels.vendedores'),
        ),
    ]
