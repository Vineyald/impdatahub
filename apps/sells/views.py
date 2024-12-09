# views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.coremodels.models import Rotas, CidadesRotas, Vendas
from rest_framework import status
from django.db import transaction
from .serializers import VendasSerializer


class RotaListView(APIView):
    def get(self, request, *args, **kwargs):
        # Mapping of day numbers to names
        days_of_week = {
            2: "segunda",
            3: "terça",
            4: "quarta",
            5: "quinta",
            6: "sexta",
        }

        # Query all routes
        routes = Rotas.objects.prefetch_related('cidades_rota').all()

        # Build the JSON response
        data = {}
        for route in routes:
            # Fetch route details
            route_name = route.nome_rota
            route_number = route.Numero_rota
            route_day = days_of_week.get(route.dia_semana, "unknown")
            
            # Fetch associated cities
            cities = list(route.cidades_rota.values_list('cidade', flat=True))

            # Add route data to JSON structure
            data[route_name] = {
                "id": route.id,
                "numero_rota": route_number,
                "dia_semana": route_day,
                "cidades": cities,
            }

        return Response(data)
    
class SingleRouteView(APIView):
    def get(self, request, rota_id, *args, **kwargs):
        """
        Retrieve a single route and its data.
        """
        print(f"Entering SingleRouteView.get with route_id={rota_id}")
        try:
            print("Trying to retrieve route")
            route = Rotas.objects.prefetch_related('cidades_rota').get(id=rota_id)
            print(f"Retrieved route {route}")

            data = {
                "id": route.id,
                "rota_nome": route.nome_rota,
                "rota_numero": route.Numero_rota,
                "rota_dia": route.dia_semana,
                "cidades": list(route.cidades_rota.values_list('cidade', flat=True)),
            }

            print(f"Returning data {data}")
            return Response(data, status=status.HTTP_200_OK)
        except Rotas.DoesNotExist:
            print(f"Route {rota_id} not found")
            return Response({"error": "Route not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"Error: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request, rota_id, *args, **kwargs):
        """
        Edit route data, including adding/removing cities.
        """
        try:
            route = Rotas.objects.get(id=rota_id)

            # Extract request data
            route_name = request.data.get("rota_nome", route.nome_rota)
            route_number = request.data.get("rota_numero", route.Numero_rota)
            route_day = request.data.get("rota_dia", route.dia_semana)
            city_list = request.data.get("cidades", [])

            # Debugging input data
            print(f"Route ID: {rota_id}")
            print(f"Request Data: {request.data}")
            print(f"City List in Request: {city_list}")

            # Update the route
            route.nome_rota = route_name
            route.Numero_rota = route_number
            route.dia_semana = route_day
            route.save()

            # Current cities linked to the route
            current_cities = set(route.cidades_rota.values_list('cidade', flat=True))
            print(f"Current Cities: {current_cities}")

            # Identify cities to add or remove
            new_cities = set(city_list)
            cities_to_delete = current_cities - new_cities
            cities_to_add = new_cities - current_cities

            # Delete old cities
            CidadesRotas.objects.filter(rota=route, cidade__in=cities_to_delete).delete()
            print(f"Deleted Cities: {cities_to_delete}")

            # Add new cities
            with transaction.atomic():
                for city in cities_to_add:
                    CidadesRotas.objects.create(rota=route, cidade=city)
                    print(f"Added City: {city}")

            # Final cities linked
            final_cities = list(route.cidades_rota.values_list('cidade', flat=True))
            print(f"Final Cities Linked to Route: {final_cities}")

            # Return success response
            return Response(
                {
                    "message": "Rota atualizada com sucesso!",
                    "id": route.id,
                    "rota_nome": route.nome_rota,
                    "rota_numero": route.Numero_rota,
                    "rota_dia": route.dia_semana,
                    "cidades": final_cities,
                },
                status=status.HTTP_200_OK,
            )

        except Rotas.DoesNotExist:
            return Response({"error": "Rota não encontrada!"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"Error: {e}")
            return Response({"error": "Erro ao atualizar rota!"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class VendasListAPIView(APIView):
    def get(self, request, *args, **kwargs):
        vendas = Vendas.objects.prefetch_related('itens_venda').all()
        serializer = VendasSerializer(vendas, many=True)
        return Response(serializer.data)