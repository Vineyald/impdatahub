from django.contrib import admin
from django.urls import path, include, re_path
from apps.coremodels.views import clientes_inativos_pdv_api, clientes_ranking, clientes_radar
from apps.costumers.views import client_profile_api
from apps.main.views import index

urlpatterns = [
    path('admin/', admin.site.urls),
    path('sells/', include('apps.sells.urls')),
    path('api/clientes_inativos/', clientes_inativos_pdv_api, name='clientes_inativos_pdv_api'),
    path('api/clientes_ranking/', clientes_ranking, name='clientes_ranking'),
    path('api/clientes_radar/', clientes_radar, name='clientes_radar'),
    path('api/clientes/<int:client_id>/', client_profile_api, name='client_profile_api'),
    path('', index),
    re_path(r'^(?!api/).*$', index),
]
