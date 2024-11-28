'use client';

import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { Card, CardBody } from '@nextui-org/react';
import { PlotMouseEvent } from 'plotly.js';

interface Purchase {
  id: string;
  data_compra: string;
  produto: string;
  quantidade_produto: number;
  preco_unitario: number;
  valor_desconto: number;
  valor_total: number;
  frete: number;
  preco_final: number;
  situacao: string;
}

interface MonthlyData {
  month: string;
  value: number;
}

interface ClientProfileChartsProps {
  purchases: Purchase[];
  onMonthSelect: (month: string) => void;
}

const ClientProfileCharts: React.FC<ClientProfileChartsProps> = ({ purchases, onMonthSelect }) => {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);

  useEffect(() => {
    // Aggregate monthly data
    const monthlyExpenses = purchases.reduce<Record<string, number>>((acc, purchase) => {
      const date = new Date(purchase.data_compra);
      const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month as 2-digit string
      const year = date.getFullYear();
      const key = `${year}-${month}`; // Format YYYY-MM
      
      if (!acc[key]) {
        acc[key] = 0; // Initialize total for the month
      }

      // Only add non-cancelled purchases
      if (purchase.situacao !== 'Cancelado') {
        acc[key] += Number(purchase.valor_total) || 0; // Use Number() for conversion
      }

      return acc;
    }, {});

    // Transform aggregated data into sorted array
    const sortedData = Object.entries(monthlyExpenses)
      .sort(([a], [b]) => a.localeCompare(b)) // Sort by month (key)
      .map(([month, value]) => ({
        month,
        value: Number(value) || 0, // Ensure value is a number
      }));

    setMonthlyData(sortedData);
  }, [purchases]);

  const handleClick = (event: Readonly<PlotMouseEvent>) => {
    if (event.points?.[0]) {
      const selectedMonth = event.points[0].x ?? ''; // Provide a default value if selectedMonth is null
      onMonthSelect(selectedMonth.toString());
    }
  };

  return (
    <Card className="md:max-w-5xl 2xl:max-w-screen-2xl mx-auto">
      <CardBody className="container">
        <Plot
          data={[
            {
              x: monthlyData.map((item) => item.month),
              y: monthlyData.map((item) => item.value),
              type: 'bar',
              marker: { color: '#e9d8a6' },
              text: monthlyData.map((item) => `R$ ${item.value.toFixed(2)}`), // Safely call toFixed
              textposition: 'auto',
              name: 'Colunas',
            },
            {
              x: monthlyData.map((item) => item.month),
              y: monthlyData.map((item) => item.value),
              type: 'scatter',
              mode: 'lines',
              line: {
                shape: 'spline',
                color: '#005f73',
                width: 4,
                dash: 'dashdot',
              },
              name: 'Traçado',
            },
          ]}
          layout={{
            title: 'Clique nas barras para filtrar a tabela',
            plot_bgcolor: '#FFFFFF',
            paper_bgcolor: '#FFFFFF',
            autosize: true,
            margin: { t: 40, r: 20, l: 60, b: 60 },
            xaxis: {
              title: { text: 'Data', standoff: 20 },
              automargin: true,
              tickfont: { size: 12 },
            },
            yaxis: {
              title: { text: 'Valor gasto (R$)', standoff: 20 },
              automargin: true,
              tickfont: { size: 12 },
              gridcolor: '#E5E5E5',
            },
          }}
          onClick={handleClick}
          style={{ width: '100%', height: '400px' }}
          config={{ displayModeBar: false, responsive: true }}
        />
      </CardBody>
    </Card>
  );
};

export default ClientProfileCharts;
