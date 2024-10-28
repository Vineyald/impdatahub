# sales/urls.py
from django.urls import path
from .views import VendasListView

urlpatterns = [
    path('api/vendas/', VendasListView.as_view(), name='vendas-list'),
]
