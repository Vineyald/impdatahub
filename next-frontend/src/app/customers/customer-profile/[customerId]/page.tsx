"use client";

import React, { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { 
  Input, 
  Button, 
  Spacer, 
  Card, 
  CardBody,
} from "@nextui-org/react";
import dynamic from 'next/dynamic';

const ClientProfileCharts = dynamic(() => import('../customerprofilecharts'), {
  ssr: false,
});

const ClientProfileTable = dynamic(() => import('../customerprofiletable'), {
  ssr: false,
});

const API_URL = process.env.NEXT_PUBLIC_API_URL as string;

interface ClientData {
  nome: string;
  email: string;
  cep: string;
  cpf_cnpj: string;
  celular: string;
  endereco: string;
  tipo_pessoa: string;
}

interface PurchasesData {
  numero_venda: string;
  data_compra: string;
  produto: string;
  quantidade_produto: number;
  preco_unitario: number;
  valor_desconto: number;
  valor_total: number;
  valor_frete: number;
  preco_final: number;
}

export default function ClientProfilePage() {
  const params = useParams() as Record<string, string | string[]> | null;
  const customerId = params?.customerId as string | undefined;

  const [client, setClient] = useState<ClientData | null>(null);
  const [purchases, setPurchases] = useState<PurchasesData[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClientData = async () => {
      if (customerId) {
        setIsLoading(true);
        setError(null);
        try {
          const response = await axios.get(`${API_URL}/clientes/${customerId}/`);
          setClient(response.data.client);
          setPurchases(response.data.purchases);
        } catch (error) {
          setError('Erro ao carregar dados do cliente');
          console.error('Erro ao carregar dados do cliente:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    // Verifica se customerId foi carregado
    if (customerId) {
      fetchClientData();
    }
  }, [customerId]);

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!client) {
    return <div>Dados do cliente não encontrados.</div>;
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setClient(prevClient => (prevClient ? { ...prevClient, [name]: value } : null));
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (customerId && client) {
        await axios.put(`${API_URL}/clientes/${customerId}/`, client);
        alert('Dados atualizados com sucesso!');
        setIsEditing(false);
      }
    } catch (error) {
      setError('Erro ao atualizar dados');
      console.error('Erro ao atualizar dados', error);
    }
  };

  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month.slice(0, 7));
  };

  const handleResetFilter = () => {
    setSelectedMonth(null);
  };

  const filteredPurchases = purchases
    .filter(purchase =>
      purchase.produto.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(purchase => (selectedMonth ? purchase.data_compra.startsWith(selectedMonth) : true));


  return (
    <div className="clientProfile">
      <div className="text-center p-5">
        <Spacer y={10} />
        <div className="container mx-auto md:max-w-5xl">
          <div className="items-center text-center">
            <p className="text-5xl font-bold capitalize">
              Perfil de {client?.nome || 'Cliente'}
            </p>
          </div>
        </div>
      </div>
      <div className="container md:max-w-5xl 2xl:max-w-screen-2xl mx-auto">
        <Spacer y={5} />
        <Card className="fs-5 text-left">
          {isEditing ? (
            <CardBody>
              <form onSubmit={handleSubmit}>
                <Input
                  required
                  label="CEP"
                  name="cep"
                  value={client?.cep || ''}
                  onChange={handleInputChange}
                  fullWidth
                />
                <Spacer y={1} />
                <Input
                  label="CPF/CNPJ"
                  name="cpf_cnpj"
                  value={client?.cpf_cnpj || ''}
                  onChange={handleInputChange}
                  fullWidth
                />
                <Spacer y={1} />
                <Input
                  label="Celular"
                  name="celular"
                  value={client?.celular || ''}
                  onChange={handleInputChange}
                  fullWidth
                />
                <Spacer y={1} />
                <Input
                  label="Endereço"
                  name="endereco"
                  value={client?.endereco || ''}
                  onChange={handleInputChange}
                  fullWidth
                />
                <Spacer y={1} />
                <Input
                  label="Tipo de Pessoa"
                  name="tipo_pessoa"
                  value={client?.tipo_pessoa || ''}
                  onChange={handleInputChange}
                  fullWidth
                />
                <Spacer y={5} />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button type="submit" color="success">
                    Atualizar
                  </Button>
                  <Button color="default" onClick={() => setIsEditing(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardBody>
          ) : (
            <CardBody className='text-lg'>
              <h1><b>CEP:</b> {client?.cep}</h1>
              <h1><b>CPF/CNPJ:</b> {client?.cpf_cnpj}</h1>
              <h1><b>Celular:</b> {client?.celular}</h1>
              <h1><b>Endereço:</b> {client?.endereco}</h1>
              <h1><b>Tipo de Pessoa:</b> {client?.tipo_pessoa}</h1>
              <Spacer y={5} />
              <Button onClick={() => setIsEditing(true)}>
                Editar
              </Button>
            </CardBody>
          )}
        </Card>
        <div>
          <Spacer y={10} />
          <div className="container mx-auto">
            <div className="items-center text-center">
              <p className="text-3xl font-semibold">Gastos por mês</p>
            </div>
          </div>
          <Spacer y={5} />
          <ClientProfileCharts purchases={purchases} onMonthSelect={handleMonthSelect} />
          {selectedMonth && (
            <div className='container mx-auto items-center'>
              <Spacer y={5} />
              <Button className="reset-button" onClick={handleResetFilter} color="primary">
                Ver todas as compras
              </Button>
            </div>
          )}
        </div>
      </div>
      <div className="purchases-table">
        <Spacer y={10} />
        <div className="container mx-auto">
          <div className="items-center text-center">
            <p className="text-3xl font-semibold">Compras do cliente por item</p>
          </div>
        </div>
        <Spacer y={8} />
        <Card className="md:max-w-5xl 2xl:max-w-screen-2xl mx-auto mb-6">
          <CardBody className='flex flex-col items-center'>
            <span>Pesquise um produto: </span>
            <Spacer y={2} />
            <Input
              placeholder="Produto"
              value={searchTerm}
              onChange={handleSearchChange}
              fullWidth
            />
          </CardBody>
        </Card>
        <Spacer y={5} />
        <ClientProfileTable purchases={filteredPurchases} />
      </div>
    </div>
  );
};
