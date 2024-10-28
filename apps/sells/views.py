from django.shortcuts import render
from rest_framework import generics
from apps.coremodels.models import Vendas
from apps.coremodels.serializers import VendasSerializer

class VendasListView(generics.ListAPIView):
    queryset = Vendas.objects.all()
    serializer_class = VendasSerializer