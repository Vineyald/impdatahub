'use client';

import { Card, CardBody, CardHeader, Input, Divider, Spacer, Image, Select, SelectItem, Chip } from '@nextui-org/react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';
import ClientsSection from './home-components/clients-section';
import RotasListTable from './userpages/routes-list/page';

const LineChart = dynamic(() => import('@/components/charts/line-chart/line-chart-comp'), { ssr: false });

interface GraphConfig {
  name: string;
  xaxis: string[];
  xaxistitle: string;
  yaxis: number[];
  yaxistitle: string;
  text?: string[];
  type?: "scatter" | "bar"; // Support multiple chart types
  slider?: boolean;
}

interface PeriodSales {
  id: number;
  data_compra: string;
  canal_venda: Date;
  value: number;
  quantity: number;
  vendedor: string;
}

interface ChannelData {
  canal_venda: string;
  venda_count: number;
  item_count: number;
  venda_total: string;
}

interface SalesRoute {
  routeName: string;
  value: number;
}

interface Metrics {
  totalPdvSales: string;
  totalEcommerceSales: string;
  totalCanceledSales: string;
  startDate: string;
  endDate: string;
  channelData: ChannelData[];
  lastWeekSales: PeriodSales[];
  lastMonthSales: PeriodSales[];
  totalDaySales: number;
  totalWeekSales: number;
  totalMonthSales: number;
  averageSalesPerLastMonth: number;
  averageSalesPerLastTwoMonths: number;
  salesPerRoute: SalesRoute[];
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
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [startDate, setStartDate] = useState(formatDateToDDMMYYYY(firstDayOfMonth.toISOString().split('T')[0])); // Initial default
  const [endDate, setEndDate] = useState(formatDateToDDMMYYYY(today.toISOString().split('T')[0])); // Initial default
  const [grouping, setGrouping] = useState<'day' | 'week'>('day'); // State for grouping
  const [lastMonthGraphs, setLastMonthGraphs] = useState<GraphConfig[]>([]); // State for the chart
  const [salesBySellerGraph, setSalesBySellerGraph] = useState<GraphConfig[]>([{
    name: '',
    xaxis: [],
    xaxistitle: '',
    yaxis: [],
    yaxistitle: ''
  }]);
  const [selectedPeriod, setSelectedPeriod] = useState<"month" | "week">("month");

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

  // Utility to update the chart data
  const getUpdatedChartData = (): GraphConfig[] => {
    if (!metrics) return [];
    const lastMonthData =
      grouping === 'day'
        ? aggregateByDate(metrics.lastMonthSales, 'value')
        : groupByWeek(metrics.lastMonthSales);

    return [
      createGraphConfig(
        lastMonthData,
        `Vendas Mensais (${grouping === 'day' ? 'Dias' : 'Semanas'})`,
        'Total Value (R$)',
        true
      ),
    ];
  };

  // Effect to fetch metrics
  useEffect(() => {
    fetchMetrics();
  }, [startDate, endDate]);

  // Effect to update chart data
  useEffect(() => {
    if (metrics) {
      setLastMonthGraphs(getUpdatedChartData());
      setSalesBySellerGraph([aggregateSalesBySeller(metrics.lastMonthSales)]);
    }
  }, [grouping, metrics]);

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
  
    return Object.entries(aggregated)
      .sort(([dateA], [dateB]) => {
        const formattedDateA = new Date(dateA).toLocaleDateString("pt-BR", { year: "numeric", month: "2-digit", day: "2-digit" });
        const formattedDateB = new Date(dateB).toLocaleDateString("pt-BR", { year: "numeric", month: "2-digit", day: "2-digit" });
      
        if (formattedDateA < formattedDateB) {
          return -1;
        }
      
        if (formattedDateA > formattedDateB) {
          return 1;
        }
      
        return 0;
      })
      .map(([date, total]) => ({
        x: new Date(date).toLocaleDateString("pt-BR", { year: "numeric", month: "2-digit", day: "2-digit" }),
        value: total,
      }));
  };

  const aggregateSalesBySeller = (sales: PeriodSales[]): GraphConfig => {
    if (!sales) return { name: "", xaxis: [], yaxis: [], xaxistitle: "", yaxistitle: "" };

    const aggregated = sales.reduce((acc, sale) => {
      const value = typeof sale.value === "string" ? parseFloat(sale.value) : sale.value;
      if (!acc[sale.vendedor]) {
        acc[sale.vendedor] = 0;
      }
      acc[sale.vendedor] += value;
      return acc;
    }, {} as Record<string, number>);

    const vendedores = Object.keys(aggregated);
    const valores = Object.values(aggregated);

    return {
      name: `Vendas por Vendedor (${selectedPeriod === "month" ? "Mês" : "Semana"})`,
      xaxis: vendedores,
      xaxistitle: "Vendedor",
      yaxis: valores.map((value) => parseFloat(value.toFixed(2))),
      yaxistitle: "Valor Vendido (R$)",
      text: valores.map((value) =>
        new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
          minimumFractionDigits: 2,
        }).format(value)
      ),
      type: "bar",
    };
  };

  const groupByWeek = (data: PeriodSales[]): { x: string; value: number }[] => {
    const weekData: Record<string, { start: string; end: string; total: number }> = {};
  
    data.forEach((item) => {
      const date = new Date(item.data_compra);
      const dayOfWeek = date.getDay(); // 0 for Sunday, 6 for Saturday
      const startOfWeek = new Date(date);
      const endOfWeek = new Date(date);
  
      // Adjust start and end dates to Sunday and Saturday
      startOfWeek.setDate(date.getDate() - dayOfWeek);
      endOfWeek.setDate(date.getDate() + (6 - dayOfWeek));
  
      // Format start and end dates for display
      const startStr = startOfWeek.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const endStr = endOfWeek.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  
      // Create a unique key for the week
      const weekKey = `${startStr} a ${endStr}`;
      const numericValue = typeof item.value === 'string' ? parseFloat(item.value) : item.value;
  
      // Aggregate totals for the week
      if (!weekData[weekKey]) {
        weekData[weekKey] = { start: startStr, end: endStr, total: 0 };
      }
      weekData[weekKey].total += numericValue;
    });
  
    // Convert to an array and add week numbers
    const weeks = Object.entries(weekData)
      .sort(([aKey], [bKey]) => new Date(aKey.split(' a ')[0]).getTime() - new Date(bKey.split(' a ')[0]).getTime())
      .map(([range, { total }], index) => ({
        x: `Semana ${index + 1} (${range})`,
        value: total,
      }));
  
    return weeks;
  };

  // Graph configurations
  const createGraphConfig = (
    aggregatedData: { x: string; value: number }[],
    name: string,
    yaxistitle: string,
    slider?: boolean
  ): GraphConfig => ({
    name,
    xaxis: aggregatedData.map((entry) => entry.x),
    xaxistitle: "Date",
    yaxis: aggregatedData.map((entry) => entry.value),
    yaxistitle,
    text: aggregatedData.map((entry) => 
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(entry.value)),
    slider,
  });

  const lastWeekSalesValueAggregated = aggregateByDate(metrics.lastWeekSales, "value");

  const lastWeekGraphs = [
    createGraphConfig(lastWeekSalesValueAggregated, "Vendas Semanais (R$)", "Total Value (R$)")
  ];

  const salesData =
    selectedPeriod === "month" ? metrics.lastMonthSales : metrics.lastWeekSales;

  const updatedSalesBySellerGraph = aggregateSalesBySeller(salesData);

  const salesPerRouteGraph: GraphConfig = {
    name: "Vendas por Rota",
    xaxis: metrics.salesPerRoute.map((entry) => entry.routeName),
    xaxistitle: "Rota",
    yaxis: metrics.salesPerRoute.map((entry) => entry.value),
    yaxistitle: "Valor total (R$)",
    text: metrics.salesPerRoute.map((entry) =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(entry.value)
    ),
    type: "bar", // Set the type property to "bar"
  };

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
      <div className="col-span-3">
        <div className="text-white text-center">
          <h1 className="text-3xl font-bold">Vendas por Vendedor</h1>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-1 gap-6 mt-6">
          {salesBySellerGraph[0].xaxis.length > 0 && (
            // ...
            <Card className="card-style text-white flex flex-col h-full">
              <CardHeader className="flex justify-between items-center">
                <h2 className="text-lg md:text-2xl font-bold">Resumo por Vendedor</h2>
                <div className="flex gap-2">
                  <Chip
                    className={selectedPeriod === "month" ? "card-style-primary" : "default"}
                    onClick={() => setSelectedPeriod("month")}
                  >
                    Mês
                  </Chip>
                  <Chip
                    className={selectedPeriod === "week" ? "card-style-primary" : "default"}
                    onClick={() => setSelectedPeriod("week")}
                  >
                    Semana
                  </Chip>
                </div>
              </CardHeader>
              <CardBody className="flex-grow flex items-center justify-center">
                <LineChart graphs={[updatedSalesBySellerGraph]} numberOfGraphs={1} />
              </CardBody>
            </Card>
          )}
        </div>
      </div>
      <Spacer y={8} />
      <div className="col-span-3">
        <div className="text-white text-center">
          <h1 className="text-3xl font-bold">Vendas por período</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-3 gap-6 mt-6">
          <Card className="card-style">
            <CardHeader>
              <h1 className="text-white">Vendas de hoje</h1>
            </CardHeader>
            <CardBody>
              <h3 className="text-white text-2xl md:text-5xl font-bold text-center">
                R$ {parseFloat(String(metrics.totalDaySales)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </h3>
            </CardBody>
          </Card>
          <Card className="card-style">
            <CardHeader>
              <h1 className="text-white">Vendas da semana (7 dias)</h1>
            </CardHeader>
            <CardBody>
              <h3 className="text-white text-2xl md:text-5xl font-bold text-center">
                R$ {parseFloat(String(metrics.totalWeekSales)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </h3>
            </CardBody>
          </Card>
          <Card className="card-style">
            <CardHeader>
              <h1 className="text-white">Vendas do mês (30 dias)</h1>
            </CardHeader>
            <CardBody>
              <h3 className="text-white text-2xl md:text-5xl font-bold text-center">
                R$ {parseFloat(String(metrics.totalMonthSales)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </h3>
            </CardBody>
          </Card>
        </div>
        <Spacer y={8} />
        <div className="grid grid-cols-3 2xl:grid-cols-3 gap-6">
          <Card className="card-style text-white col-span-2">
            <CardHeader className="justify-center">
              <Spacer y={4} />
              <h2 className="text-lg md:text-2xl font-bold">Vendas da semana</h2>
            </CardHeader>
            <CardBody className="flex-grow flex items-center justify-center">
              <LineChart graphs={lastWeekGraphs} numberOfGraphs={1} />
            </CardBody>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            <Card
              className={`card-style ${
                metrics.averageSalesPerLastMonth > metrics.averageSalesPerLastTwoMonths ? "card-style-primary" : "card-style-danger"
              }`}
            >
              <CardHeader>
                <h1 className="text-white">Média últimos 30 dias</h1>
              </CardHeader>
              <CardBody>
                <h3 className="text-white text-2xl md:text-5xl font-bold text-center">
                  R$ {parseFloat(String(metrics.averageSalesPerLastMonth)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </h3>
              </CardBody>
            </Card>

            <Card
              className={`card-style ${
                metrics.averageSalesPerLastMonth < metrics.averageSalesPerLastTwoMonths ? "card-style-primary" : "card-style-danger"
              }`}
            >
              <CardHeader>
                <h1 className="text-white">Média do mês passado</h1>
              </CardHeader>
              <CardBody>
                <h3 className="text-white text-2xl md:text-5xl font-bold text-center">
                  R$ {parseFloat(String(metrics.averageSalesPerLastTwoMonths)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </h3>
              </CardBody>
            </Card>
          </div>
        </div>
        <Spacer y={8} />
        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
          <Card className="card-style text-white flex flex-col h-full">
            <CardHeader className="flex flex-col">
              <Spacer y={4} />
              <h2 className="text-lg md:text-2xl font-bold">Vendas do mês</h2>
              <Select
                label="Agrupar por"
                classNames={{
                  base: "text-white",
                  value: "text-white",
                  label: "text-white",
                  mainWrapper: 'card-style',
                }}
                value="day"
                variant="bordered"
                onChange={(value) => setGrouping((value as unknown) as 'day' | 'week')}
              >
                <SelectItem value="day">Dias</SelectItem>
                <SelectItem value="week">Semanas</SelectItem>
              </Select>
            </CardHeader>
            <CardBody className="flex-grow flex items-center justify-center">
              <LineChart graphs={lastMonthGraphs} numberOfGraphs={1} />
            </CardBody>
          </Card>
        </div>
      </div>

      <SpaceDivider/>

      <ClientsSection />

      <SpaceDivider/>

      <div className="col-span-3">
        <div className="text-white text-center">
          <h1 className="text-3xl font-bold">Resumo das rotas</h1>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-6">
          <div className="col-span-2 text-white">
            <RotasListTable />
          </div>
          <div className="flex h-full">
            <Divider orientation="vertical" className="self-stretch bg-gray-500 w-px mr-3" />
            <div className="flex flex-col gap-4 flex-grow h-full">
              <Card className="card-style text-white p-4 rounded-lg shadow-md flex-grow">
                <CardHeader>
                  <h2 className="text-lg font-semibold">Card 1</h2>
                </CardHeader>
                <CardBody>
                  <p>Detalhes do Card 1.</p>
                </CardBody>
              </Card>
              <Card className="card-style text-white p-4 rounded-lg shadow-md flex-grow">
                <CardHeader>
                  <h2 className="text-lg font-semibold">Card 2</h2>
                </CardHeader>
                <CardBody>
                  <p>Detalhes do Card 2.</p>
                </CardBody>
              </Card>
              <Card className="card-style text-white p-4 rounded-lg shadow-md flex-grow">
                <CardHeader>
                  <h2 className="text-lg font-semibold">Card 3</h2>
                </CardHeader>
                <CardBody>
                  <p>Detalhes do Card 3.</p>
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
        <div className='col-span-3 grid grid-cols-1 md:grid-cols-1 xl:grid-cols-1 gap-6 mt-6'>
          <Card className='card-style'>
            <CardHeader className="justify-center">
              <Spacer y={4} />
              <h2 className="text-white text-lg md:text-2xl font-bold">Vendas por rota</h2>
            </CardHeader>
            <CardBody>
              <LineChart graphs={[salesPerRouteGraph]} numberOfGraphs={1} />
            </CardBody>
          </Card>
        </div>
      </div>
      <SpaceDivider/>

    </div>
  );
}
