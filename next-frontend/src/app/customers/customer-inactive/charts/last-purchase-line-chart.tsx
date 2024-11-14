'use client';

import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { useRouter } from 'next/navigation';

interface ClientInfo {
  id: string;
  origem: string;
  nome: string;
  cep: string;
  cpf_cnpj: string;
  tipo_pessoa: string;
  ultima_compra: string;
}

interface ClientData {
  info: ClientInfo;
}

interface LineChartData {
  x: string[];
  y: number[];
}

const LastPurchaseLineChart: React.FC = () => {
  const [lineChartData, setLineChartData] = useState<LineChartData>({ x: [], y: [] });
  const [clientsByMonth, setClientsByMonth] = useState<Record<string, ClientData[]>>({});
  const router = useRouter();

  useEffect(() => {
    const storedData = localStorage.getItem('inactiveClientsData');
    if (storedData) {
      try {
        const parsedData: Record<string, ClientData> = JSON.parse(storedData);
        const monthCounts: Record<string, number> = {};
        const clientsGroupedByMonth: Record<string, ClientData[]> = {};

        Object.values(parsedData).forEach((client) => {
          const lastPurchaseDate = new Date(client.info.ultima_compra);
          if (!isNaN(lastPurchaseDate.getTime())) {
            const monthKey = `${lastPurchaseDate.getFullYear()}-${String(lastPurchaseDate.getMonth() + 1).padStart(2, '0')}`;

            monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;

            if (!clientsGroupedByMonth[monthKey]) {
              clientsGroupedByMonth[monthKey] = [];
            }
            clientsGroupedByMonth[monthKey].push(client);
          }
        });

        const sortedMonths = Object.keys(monthCounts).sort();
        const xValues = sortedMonths;
        const yValues = sortedMonths.map((month) => monthCounts[month]);

        setLineChartData({ x: xValues, y: yValues });
        setClientsByMonth(clientsGroupedByMonth);
      } catch (error) {
        console.error('Erro ao analisar JSON:', error);
      }
    }
  }, []);

  // Função para navegar para a lista de clientes
  const navigateToClientList = (clients: ClientData[]) => {
    const currentDate = new Date();
    const clientList = clients.map((client) => {
      const lastPurchaseDate = new Date(client.info.ultima_compra);
      const daysInactive = Math.floor(
        (currentDate.getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        id: client.info.id,
        nome: client.info.nome,
        ultima_compra: client.info.ultima_compra,
        dias_inativo: daysInactive,
      };
    });

    if (clientList.length > 0) {
      console.log(clientList);
      sessionStorage.setItem('inactiveClients', JSON.stringify(clientList));
      router.push('/customers/customer-inactive/overview');
    } else {
      router.refresh();
    }
  };

  return (
    <div>
      <h2 className='text-center text-2xl'>Tendência de Inatividade dos Clientes</h2>
      <Plot
        data={[
          {
            x: lineChartData.x,
            y: lineChartData.y,
            type: 'scatter',
            mode: 'lines+markers',
            text: lineChartData.y.map((y) => y.toString()),
            textposition: 'top center',
            line: { shape: 'linear', color: '#005f73' },
          },
        ]}
        layout={{
          title: 'Clique nos gráficos para mais detalhes',
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          autosize: true,
          margin: { t: 50, r: 30, l: 50, b: 80 },
          xaxis: { title: 'Mês da Última Compra', automargin: true },
          yaxis: { title: 'Número de Clientes', automargin: true },
        }}
        onClick={(event: Plotly.PlotMouseEvent) => {
          const index = event.points?.[0]?.pointIndex;
          if (index !== undefined && lineChartData.x[index]) {
            const monthKey = lineChartData.x[index];
            const clients = clientsByMonth[monthKey];
            navigateToClientList(clients);
          } else {
            console.log("Index ou monthKey está indefinido.");
          }
        }}
        useResizeHandler={true}
        style={{ width: '100%', height: '500px' }}
        className="containers"
        config={{ displayModeBar: false }}
      />
    </div>
  );
};

export default LastPurchaseLineChart;