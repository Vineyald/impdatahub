from django.contrib import admin
from django.urls import (
    path, 
    include, 
    re_path
)
from apps.coremodels.views import (
    clientes_inativos_pdv_api, 
    clientes_ranking, 
    clientes_radar, 
    login_view, 
    RegisterUserView,
    get_user_name
)
from apps.costumers.views import client_profile_api
from apps.main.views import index
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('sells/', include('apps.sells.urls')),
    path('api/clientes_inativos/', clientes_inativos_pdv_api, name='clientes_inativos_pdv_api'),
    path('api/clientes_ranking/', clientes_ranking, name='clientes_ranking'),
    path('api/clientes_radar/', clientes_radar, name='clientes_radar'),
    path('api/clientes/<int:client_id>/', client_profile_api, name='client_profile_api'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/login/', login_view, name='login'),
    path('api/register/', RegisterUserView.as_view(), name='register'),
    path('api/user/', get_user_name, name='user'),
    path('', index),
    re_path(r'^(?!api/).*$', index),
]
