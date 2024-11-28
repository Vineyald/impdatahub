from django.conf import settings
from rest_framework.response import Response
from rest_framework.decorators import (
    api_view,
    permission_classes
)
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import (
    generics, 
    status
)
from rest_framework.permissions import (
    AllowAny, 
    IsAuthenticated
)
from .serializers import (
    UserSerializer
)
from .models import (
    Clientes, 
    ItemVenda,
    User
)
from django.db.models import (
    Sum, 
    Prefetch, 
    Max, 
    Q
)
from django.contrib.auth import authenticate
from collections import defaultdict
from django.utils import timezone
from datetime import timedelta
from datetime import datetime

ADMIN_PASSWORD = settings.ADMINPASS

@api_view(['POST'])
def login_view(request):
    email = request.data.get('email')
    password = request.data.get('password')
    user = authenticate(request, username=email, password=password)

    if user is not None:
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })
    # Mensagem de erro personalizada para login inválido
    return Response({'error': 'Credenciais inválidas. Por favor, verifique seu email e senha.'}, status=400)

class RegisterUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]  # Permitir acesso a qualquer um

    def create(self, request, *args, **kwargs):
        admin_password = request.data.get('admin_password')
        if admin_password != ADMIN_PASSWORD:
            return Response({"error": "Senha de administrador incorreta."}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_name(request):
    user = request.user
    return Response({"name": user.name})