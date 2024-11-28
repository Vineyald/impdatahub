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
    all_inactive_clients_with_pdv_sales,
    get_cities_and_coordinates_from_ceps,
    all_clients_with_pdv_sales,
    top_20_clients
    )
from apps.main.views import index
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('sells/', include('apps.sells.urls')),
    path('api/clientes_inativos/', all_inactive_clients_with_pdv_sales, name='clientes_inativos_pdv_api'),
    path('api/clientes_ranking/', top_20_clients, name='clientes_ranking'),
    path('api/clientes/<int:client_id>/', client_profile_api, name='client_profile_api'),
    path('api/clientes_listagem/', all_clients_with_pdv_sales, name='all_clients_with_pdv_sales'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/login/', login_view, name='login'),
    path('api/register/', RegisterUserView.as_view(), name='register'),
    path('api/ceps_to_latitude/', get_cities_and_coordinates_from_ceps, name='register'),
    path('api/user/', get_user_name, name='user'),
]
