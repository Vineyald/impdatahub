from django.contrib import admin
from django.urls import (
    path, 
    include, 
    re_path
)
from apps.coremodels.views import ( 
    login_view, 
    RegisterUserView,
    get_user_name
)
from apps.costumers.views import (
    client_profile_api,
    InactiveClientsWithPdvSales,
    get_cities_and_coordinates_from_ceps,
    all_clients_with_pdv_sales,
    top_20_clients
    )
from apps.main.views import index
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from apps.products.views import (
    AllProductsView,
    ProductDetailView,
    homePageData,
    ProductInfoView,
)
from apps.sells.views import (
    RotaListView,
    SingleRouteView,
    VendasListAPIView,
)
from debug_toolbar.toolbar import debug_toolbar_urls
from django.conf.urls.static import static
from django.conf import settings

# Django Admin
urlpatterns = [
    path('admin/', admin.site.urls),
]

# Debug
urlpatterns += [
    path('__debug__/', include('debug_toolbar.urls')),
]

# Apps
urlpatterns += [
    path('sells/', include('apps.sells.urls')),
]

# Clientes
urlpatterns += [
    path('api/clientes_inativos/', InactiveClientsWithPdvSales.as_view(), name='clientes_inativos_pdv_api'),
    path('api/clientes_ranking/', top_20_clients, name='clientes_ranking'),
    path('api/clientes/<int:client_id>/', client_profile_api, name='client_profile_api'),
    path('api/clientes_listagem/', all_clients_with_pdv_sales, name='all_clients_with_pdv_sales'),
]

# Autenticao
urlpatterns += [
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

# Produtos
urlpatterns += [
    path('api/products/', AllProductsView.as_view(), name='AllProductsView'),
    path('api/products/<str:sku>/', ProductDetailView.as_view(), name='product_detail'),
    path('api/products-list/', ProductInfoView.as_view(), name='product_detail'),
]

# Login
urlpatterns += [
    path('api/login/', login_view, name='login'),
    path('api/register/', RegisterUserView.as_view(), name='register'),
]

# Vendas
urlpatterns += [
    path('api/vendas/', VendasListAPIView.as_view(), name='vendasList'),
]

# Outras
urlpatterns += [
    path('api/homepage/', homePageData, name='homePageData'),
    path('api/rotas/', RotaListView.as_view(), name='rotasList'),
    path('api/rota/<int:rota_id>/', SingleRouteView.as_view(), name='rotaPage'),
    path('api/ceps_to_latitude/', get_cities_and_coordinates_from_ceps, name='register'),
    path('api/user/', get_user_name, name='user'),
]+ debug_toolbar_urls()+static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
