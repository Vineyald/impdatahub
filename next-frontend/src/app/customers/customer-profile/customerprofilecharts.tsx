'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardBody, Spacer } from '@nextui-org/react';
import dynamic from 'next/dynamic';
import { PlotMouseEvent } from 'plotly.js';

const LineChart = dynamic(() => import('@/components/charts/line-chart/line-chart-comp'), { ssr: false });

interface Purchase {
  id: string;
  data_compra: string;
  produto: string;
  sku: string;
  quantidade_produto: number;
  preco_unitario: number;
  valor_desconto: number;
  valor_total: number;
  frete: number;
  preco_final: number;
  situacao: string;
}

interface ClientProfileChartsProps {
  purchases: Purchase[];
  onMonthSelect: (month: string) => void;
}

interface GraphConfig {
  name: string;
  xaxis: string[];
  xaxistitle: string;
  yaxis: number[];
  yaxistitle: string;
  text: string[];
}

const aggregateByMonth = (purchases: Purchase[]): { x: string; value: number }[] => {
  const monthlyExpenses = purchases.reduce<Record<string, number>>((acc, purchase) => {
    const date = new Date(purchase.data_compra);
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month as 2-digit string
    const year = date.getFullYear();
    const key = `${year}-${month}`; // Format YYYY-MM

    if (!acc[key]) {
      acc[key] = 0;
    }

    if (purchase.situacao !== 'Cancelado') {
      acc[key] += Number(purchase.valor_total) || 0;
    }

    return acc;
  }, {});

  return Object.entries(monthlyExpenses)
    .sort(([a], [b]) => a.localeCompare(b)) // Sort by month
    .map(([month, value]) => ({
      x: month,
      value: Number(value) || 0,
    }));
};

const createGraphConfig = (
  aggregatedData: { x: string; value: number }[],
  name: string,
  yaxistitle: string
): GraphConfig => ({
  name,
  xaxis: aggregatedData.map((entry) => entry.x),
  xaxistitle: 'Data',
  yaxis: aggregatedData.map((entry) => entry.value),
  yaxistitle,
  text: aggregatedData.map((entry) =>
    entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  ),
});

const ClientProfileCharts: React.FC<ClientProfileChartsProps> = ({ purchases, onMonthSelect }) => {
  const [graphConfig, setGraphConfig] = useState<GraphConfig[]>([]);

  useEffect(() => {
    const aggregatedData = aggregateByMonth(purchases);
    const config = createGraphConfig(aggregatedData, 'Vendas Mensais (R$)', 'Valor total (R$)');
    setGraphConfig([config]);
  }, [purchases]);

  return (
    <Card className="card-style text-white mx-auto w-[95%]">
      <CardHeader className="justify-center">
        <Spacer y={4} />
        <h2 className="text-lg md:text-2xl font-bold">Vendas do mês</h2>
      </CardHeader>
      <CardBody className="items-center justify-center">
        <LineChart 
          graphs={graphConfig} 
          numberOfGraphs={1} 
          onClick={(event: Readonly<PlotMouseEvent>) => {
            const point = event.points[0];
            const xValue = point?.x ?? '';
            if (typeof xValue === 'string') {
              onMonthSelect(xValue);
            } else {
              // handle the case where xValue is not a string
              console.error('xValue is not a string:', xValue);
            }
          }}
        />
      </CardBody>
    </Card>
  );
};

export default ClientProfileCharts;
