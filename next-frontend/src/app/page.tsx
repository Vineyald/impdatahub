'use client';

import { Card, CardBody, CardHeader, Input } from '@nextui-org/react';
import { useEffect, useState } from 'react';
import axios from 'axios';

interface ChannelData {
  canal_venda: string;
  venda_count: number;
  item_count: number;
  total_sales: string;
}

interface Metrics {
  totalPdvSales: string;
  totalEcommerceSales: string;
  totalCanceledSales: string;
  startDate: string;
  endDate: string;
  channelData: ChannelData[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function Home() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [startDate, setStartDate] = useState('01-01-2024'); // Initial default
  const [endDate, setEndDate] = useState('31-12-2024'); // Initial default

  const fetchMetrics = async () => {
    try {
      console.log('Data de inicio:', startDate, 'Data de fim:', endDate);
      const response = await axios.get(`${API_URL}/homepage/`, {
        params: {
          startDate,
          endDate,
        },
      });
      setMetrics(response.data);
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [startDate, endDate]);

  if (!metrics) {
    return <div className="container mx-auto p-4">Carregando dados...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mt-8 mb-8 text-center">
        <h1 className="text-5xl font-bold">Bem vindo ao Impdatahub</h1>
        <p className="mt-5 text-2xl text-gray-600">
          O sistema de relatórios da Imperio das chapas
        </p>
      </div>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Resumo de Vendas</h1>
        <p className="text-gray-600">
          De {startDate} até {endDate}
        </p>
      </div>
      <div className="flex gap-4 mb-4">
        <Input
          type="date"
          label="Data Inicial"
          value={new Date(startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}
          placeholder={new Date(startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}
          onChange={(e) => setStartDate(new Date(e.target.value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-'))}
          className="w-full"
        />
        
        <Input
          type="date"
          label="Data Final"
          value={new Date(endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}
          placeholder={new Date(endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}
          onChange={(e) => setEndDate(new Date(e.target.value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-'))}
          className="w-full"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-9 gap-6">
        <Card className="col-span-2">
          <CardHeader>
            <h2 className="mx-auto text-md font-bold">Vendas no Ecommerce</h2>
          </CardHeader>
          <CardBody>
            <h3 className="text-2xl font-semibold text-blue-600 text-center">
              R$ {parseFloat(metrics.totalEcommerceSales).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}
            </h3>
          </CardBody>
        </Card>
        <Card className="col-span-5">
          <CardHeader>
            <h2 className="mx-auto text-3xl font-bold">Vendas no PDV</h2>
          </CardHeader>
          <CardBody>
            <h3 className="text-6xl font-bold text-green-700 text-center">
              R$ {parseFloat(metrics.totalPdvSales).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}
            </h3>
          </CardBody>
        </Card>
        <Card className="col-span-2">
          <CardHeader>
            <h2 className="mx-auto text-md font-bold">Cancelados</h2>
          </CardHeader>
          <CardBody>
            <h3 className="text-2xl font-semibold text-red-600 text-center">
              R$ {parseFloat(metrics.totalCanceledSales).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}
            </h3>
          </CardBody>
        </Card>
      </div>
      <div className="mt-12">
        <h2 className="text-xl font-bold mb-4">Detalhamento por Canal</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.channelData.map((channel, index) => (
            <Card key={index}>
              <CardHeader>
                <h3 className="text-lg font-bold">{channel.canal_venda}</h3>
              </CardHeader>
              <CardBody>
                <p>
                  <strong>Vendas:</strong> {channel.venda_count.toLocaleString('pt-BR')}
                </p>
                <p>
                  <strong>Itens Vendidos:</strong> {channel.item_count.toLocaleString('pt-BR')}
                </p>
                <p>
                  <strong>Total:</strong>{' '}
                  R$ {parseFloat(channel.total_sales).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
