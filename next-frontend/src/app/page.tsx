'use client';

import { Card, CardBody, CardHeader, Input, Divider, Spacer, Image } from '@nextui-org/react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';
import RoutesSection from './home-components/routes-section';
import ClientsSection from './home-components/clients-section';

const LineChart = dynamic(() => import('@/components/charts/line-chart/line-chart-comp'), { ssr: false });

interface GraphConfig {
  name: string;
  xaxis: string[];
  xaxistitle: string;
  yaxis: number[];
  yaxistitle: string;
  text?: string[];
  type?: "scatter" | "bar"; // Support multiple chart types
}

interface PeriodSales {
  id: number;
  data_compra: string;
  canal_venda: Date;
  value: number;
  quantity: number;
}

interface ChannelData {
  canal_venda: string;
  venda_count: number;
  item_count: number;
  venda_total: string;
}

interface Metrics {
  totalPdvSales: string;
  totalEcommerceSales: string;
  totalCanceledSales: string;
  startDate: string;
  endDate: string;
  channelData: ChannelData[];
  todaySales: PeriodSales[];
  lastWeekSales: PeriodSales[];
  lastMonthSales: PeriodSales[];
}

const SpaceDivider = () => {
  return (
    <>
      <Spacer y={4} className='col-span-3'/>
      <Divider className='col-span-3 bg-gray-500'/>
      <Spacer y={4} className='col-span-3'/>
    </>
  )
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Utility function to convert date format to dd-mm-yyyy
const formatDateToDDMMYYYY = (date: string): string => {
  const [year, month, day] = date.split('-');
  return `${day}-${month}-${year}`;
};

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

  // Utility function to aggregate values by date and sort
  const aggregateByDate = (
    data: PeriodSales[],
    field: "value" | "quantity"
  ): { x: string; value: number }[] => {
    const aggregated = data.reduce((acc, curr) => {
      const date = curr.data_compra;
      const numericValue = typeof curr[field] === "string" ? parseFloat(curr[field]) : curr[field];
      acc[date] = (acc[date] || 0) + numericValue;
      return acc;
    }, {} as Record<string, number>);
  
    return Object.entries(aggregated).map(([date, total]) => ({
      x: new Date(date).toLocaleDateString("pt-BR"),
      value: total,
    }));
  };

  // Graph configurations
  const createGraphConfig = (
    aggregatedData: { x: string; value: number }[],
    name: string,
    yaxistitle: string
  ): GraphConfig => ({
    name,
    xaxis: aggregatedData.map((entry) => entry.x),
    xaxistitle: "Date",
    yaxis: aggregatedData.map((entry) => entry.value),
    yaxistitle,
    text: aggregatedData.map((entry) => entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })),
  });

  const lastWeekSalesValueAggregated = aggregateByDate(metrics.lastWeekSales, "value");
  const lastMonthSalesValueAggregated = aggregateByDate(metrics.lastMonthSales, "value");

  const lastWeekGraphs = [
    createGraphConfig(lastWeekSalesValueAggregated, "Vendas Semanais (R$)", "Total Value (R$)")
  ];
  const lastMonthGraphs = [
    createGraphConfig(lastMonthSalesValueAggregated, "Vendas Mensais (R$)", "Total Value (R$)")
  ];

  return (
    <div className="grid grid-cols-3 gap-3 mx-auto p-4 xl:max-w-full">
      <div className="mx-auto col-span-3 relative w-full max-w-full">
        <Image
          src="https://www.imperiodaschapas.com/images/banner-01.png"
          alt="foto da loja"
          className="object-cover"
          width="100%"
          height="100%"
        />
        <div className="absolute bottom-0 left-0 w-full text-center p-4 z-10 mb-3">
          <h1 className="text-white text-5xl font-bold">Bem vindo ao Impdatahub</h1>
          <p className="text-white mt-2 text-2xl">
            O sistema de relatórios da Imperio das chapas
          </p>
        </div>
      </div>

      <SpaceDivider/>

      <div className="col-span-3">
        <div className="mb-8 text-center">
          <h1 className="text-white text-3xl font-bold">Resumo de Vendas</h1>
          <p className="text-white">
            De {startDate} até {endDate}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 flex flex-col">
            <div className="flex gap-4 mb-4">
              <Input
                type="date"
                label="Data inicial"
                onChange={(e) => setStartDate(formatDateToDDMMYYYY(e.target.value))}
                classNames={{
                  base: 'text-white',
                  label: '!text-white',
                  inputWrapper: 'card-style mr-2',
                }}
                variant="bordered"
              />
              <Input
                type="date"
                label="Data final"
                onChange={(e) => setEndDate(formatDateToDDMMYYYY(e.target.value))}
                classNames={{
                  base: 'text-white',
                  label: '!text-white',
                  inputWrapper: 'card-style mr-2',
                }}
                variant="bordered"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 flex-grow">
              {/* Ecommerce Sales Card */}
              <Card className="card-style-secondary text-white flex flex-col h-full">
                <CardHeader className="justify-center">
                  <h2 className="text-center text-lg md:text-3xl font-bold">Vendas no Ecommerce</h2>
                </CardHeader>
                <CardBody className="flex-grow flex items-center justify-center">
                  <h3 className="text-3xl md:text-6xl font-bold text-center">
                    R$ {parseFloat(metrics.totalEcommerceSales).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </h3>
                </CardBody>
              </Card>

              {/* PDV Sales Card */}
              <Card className="card-style-primary text-white flex flex-col h-full">
                <CardHeader className="justify-center">
                  <h2 className="text-center text-lg md:text-3xl font-bold">Vendas no PDV</h2>
                </CardHeader>
                <CardBody className="flex-grow flex items-center justify-center">
                  <h3 className="text-3xl md:text-6xl font-bold text-center">
                    R$ {parseFloat(metrics.totalPdvSales).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </h3>
                </CardBody>
              </Card>
              {/* Canceled Sales Card */}
              <Card className="card-style-danger text-white flex flex-col h-full">
                <CardHeader className="justify-center">
                  <h2 className="text-center text-lg md:text-3xl font-bold">Cancelados</h2>
                </CardHeader>
                <CardBody className="flex-grow flex items-center justify-center">
                  <h3 className="text-3xl md:text-6xl font-bold text-center">
                    R$ {parseFloat(metrics.totalCanceledSales).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </h3>
                </CardBody>
              </Card>
            </div>
          </div>
          <div className="col-span-1 flex">
            {/* Vertical Divider */}
            <Divider orientation="vertical" className="self-stretch bg-gray-500 w-px mr-3" />
            {/* Content Section */}
            <div className="flex flex-col flex-grow">
              <h2 className="text-white text-xl font-bold mb-4">Detalhamento por Canal</h2>
              <div className="grid grid-cols-1 gap-4 flex-grow">
                {metrics.channelData.map((channel, index) => (
                  <Card key={index} className="card-style text-white h-full">
                    <CardHeader>
                      <h3 className="text-lg font-bold">{channel.canal_venda}</h3>
                    </CardHeader>
                    <CardBody>
                      <p>
                        <strong>Vendas:</strong> {channel.venda_count.toLocaleString('pt-BR')}
                      </p>
                      <p>
                        <strong>Itens Vendidos:</strong> {channel.item_count.toLocaleString('pt-BR', {
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      <p>
                        <strong>Total:</strong>{' '}
                        R$ {parseFloat(channel.venda_total).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Spacer y={8} />
      <div className="col-span-3">
        <div className="text-white text-center">
          <h1 className="text-3xl font-bold">Vendas por periodo</h1>
        </div>
        <Spacer y={8} />
        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
          <Card className="card-style text-white flex flex-col h-full">
            <CardHeader className="justify-center">
              <Spacer y={4} />
              <h2 className="text-lg md:text-2xl font-bold">Vendas da semana</h2>
            </CardHeader>
            <CardBody className="flex-grow flex items-center justify-center">
              <LineChart graphs={lastWeekGraphs} numberOfGraphs={1}/>
            </CardBody>
          </Card>
          <Card className="card-style text-white flex flex-col h-full">
            <CardHeader className="justify-center">
              <Spacer y={4} />
              <h2 className="text-lg md:text-2xl font-bold">Vendas do mes</h2>
            </CardHeader>
            <CardBody className="flex-grow flex items-center justify-center">
              <LineChart graphs={lastMonthGraphs} numberOfGraphs={1}/>
            </CardBody>
          </Card>
        </div>
      </div>

      <SpaceDivider/>

      <ClientsSection />

      <SpaceDivider/>

      <RoutesSection />

      <SpaceDivider/>

    </div>
  );
}
