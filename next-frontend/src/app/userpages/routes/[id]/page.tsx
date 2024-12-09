'use client';

import React, { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import {
  Input,
  Button,
  Spacer,
  Card,
  CardBody,
  Divider,
  Select,
  SelectItem,
  SharedSelection
} from "@nextui-org/react";

const API_URL = process.env.NEXT_PUBLIC_API_URL as string;

interface Route {
  id: number;
  rota_nome: string;
  rota_numero: number;
  rota_dia: number; // Store as number in state
  cidades: string[];
}

export default function RoutePage() {
  const params = useParams() as Record<string, string | string[]> | null;
  const routeId = params?.id as string | undefined;

  const [routeData, setRouteData] = useState<Route | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(routeData?.rota_dia || null);

  useEffect(() => {
    const fetchRouteData = async () => {
      if (routeId) {
        setIsLoading(true);
        setError(null);
        try {
          const response = await axios.get(`${API_URL}/rota/${routeId}/`);
          const routeData: Route = response.data;

          // Save to localStorage
          localStorage.setItem("routeData", JSON.stringify(routeData));
          setRouteData(routeData);
        } catch (error) {
          setError("Erro ao carregar dados da rota");
          console.error("Erro ao carregar dados da rota:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchRouteData();
  }, [routeId]);

  const daysOfWeek: Record<number, string> = {
    1: "Domingo",
    2: "Segunda",
    3: "Terça",
    4: "Quarta",
    5: "Quinta",
    6: "Sexta",
    7: "Sábado",
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (routeData) {
      setRouteData({
        ...routeData,
        [name]: name === "rota_dia" ? Number(value) : value, // Convert rota_dia to number
      });
    }
  };

  const handleCitiesChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
    if (routeData) {
      const newCities = [...routeData.cidades];
      newCities[index] = e.target.value;

      setRouteData({
        ...routeData,
        cidades: newCities,
      });
    }
  };

  const addNewCity = () => {
    if (routeData) {
      setRouteData({
        ...routeData,
        cidades: [...routeData.cidades, ""],
      });
    }
  };

  const removeCity = (index: number) => {
    if (routeData) {
      const newCities = routeData.cidades.filter((_, i) => i !== index);
      setRouteData({
        ...routeData,
        cidades: newCities,
      });
    }
  };

  const handleSelectionChange = (keys: SharedSelection) => {
    if (routeData) {
      if (typeof keys === 'number') {
        setSelectedDay(keys);
        setRouteData({
          ...routeData,
          rota_dia: keys,
        });
      } else if (typeof keys === 'object' && 'anchorKey' in keys && 'currentKey' in keys) {
        // Handle the range selection case here
      }
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (routeData) {
      try {
        // Convert rota_dia to number before submission
        const updatedRouteData = {
          ...routeData,
          rota_dia: Number(routeData.rota_dia),
        };
        console.log("Updating route:", updatedRouteData);
        const response = await axios.post(`${API_URL}/rota/${routeId}/`, updatedRouteData);
        console.log("Route updated successfully:", response.data);

        // Update local state with the response data
        setRouteData(response.data);
        localStorage.setItem("routeData", JSON.stringify(response.data));
        setIsEditing(false);
      } catch (error) {
        console.error("Error updating route:", error);
      }
    }
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!routeData) {
    return <div>Rota não encontrada.</div>;
  }

  return (
    <div className="routeProfile">
      <div className="text-center p-5">
        <Spacer y={10} />
        <div className="container mx-auto md:max-w-5xl">
          <div className="items-center text-center">
            <p className="text-5xl font-bold capitalize">
              {routeData.rota_nome || "Rota"}
            </p>
          </div>
        </div>
      </div>
      <div className="container md:max-w-5xl 2xl:max-w-screen-2xl mx-auto">
        <Spacer y={5} />
        <Card className="p-6 shadow-lg md">
          {isEditing ? (
            <CardBody>
              <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-4">
                <Input
                  required
                  label="Nome da Rota"
                  name="rota_nome"
                  placeholder="Digite o nome da rota"
                  value={routeData.rota_nome}
                  onChange={handleInputChange}
                  fullWidth
                  className="col-span-3"
                />
                <Input
                  required
                  label="Número da Rota"
                  name="rota_numero"
                  placeholder="Digite o número da rota"
                  value={routeData.rota_numero.toString()}
                  onChange={handleInputChange}
                  fullWidth
                  className="col-span-3"
                />
                <Select
                  label="Dia da rota"
                  placeholder="Selecione o dia da rota"
                  className="md:col-span-3"
                  selectedKeys={selectedDay?.toString()}
                  onSelectionChange={(keys: SharedSelection) => handleSelectionChange(keys)}
                >
                  {Object.entries(daysOfWeek).map(([key, value]) => (
                    <SelectItem key={key}>{value}</SelectItem>
                  ))}
                </Select>
                <Divider className="col-span-3 my-4" />
                <h2 className="col-span-3 text-lg font-bold">Cidades</h2>
                {routeData.cidades.map((city, index) => (
                  <div key={index} className="flex gap-2 col-span-3">
                    <Input
                      label={`Cidade ${index + 1}`}
                      value={city}
                      onChange={(e) => handleCitiesChange(e, index)}
                      fullWidth
                      className="col-span-2"
                    />
                    <Button
                      color="danger"
                      onClick={() => removeCity(index)}
                      className="col-span-1"
                    >
                      Remover
                    </Button>
                  </div>
                ))}
                <Button fullWidth color="secondary" onClick={addNewCity}>
                  Adicionar Cidade
                </Button>
                <Button
                  className="col-span-3"
                  type="submit"
                  color="primary"
                >
                  Salvar
                </Button>
              </form>
            </CardBody>
          ) : (
            <CardBody>
              <div className="text-left space-y-8">
                <h2 className="text-xl font-bold">Detalhes da Rota</h2>
                <p><strong>Nome:</strong> {routeData.rota_nome}</p>
                <p><strong>Número:</strong> {routeData.rota_numero}</p>
                <p><strong>Dia da Semana:</strong> {daysOfWeek[routeData.rota_dia]}</p>
                <Divider className="my-6" />
                <h2 className="text-xl font-bold">Cidades</h2>
                <div className="grid grid-cols-2 gap-4">
                {routeData.cidades.map((city, index) => (
                  <p key={index}>{city}</p>
                ))}
                </div>

                <Button
                  onClick={() => setIsEditing(true)}
                  className="mt-4"
                  color="primary"
                >
                  Editar
                </Button>
              </div>
            </CardBody>
          )}
        </Card>
      </div>
    </div>
  );
}
