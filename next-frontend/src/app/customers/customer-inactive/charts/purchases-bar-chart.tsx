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

interface Purchase {
  numero_venda: string;
  data_compra: string;
  produto: string;
  quantidade_produto: number;
  preco_unitario: number;
  valor_total: number;
  valor_desconto: number;
  frete: number;
  preco_final: number;
}

interface ClientData {
  info: ClientInfo;
  purchases: Purchase[];
}

interface ChartData {
  label: string;
  value: number;
}

// Tipagem de intervals para garantir que 'clients' é um array de ClientData
interface IntervalData {
  count: number;
  clients: ClientData[];
}

const PurchasesBarChart: React.FC = () => {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [clientsData, setClientsData] = useState<ClientData[][]>([]);
  const router = useRouter();

  useEffect(() => {
    const storedData = localStorage.getItem('inactiveClientsData');
    if (storedData) {
      try {
        const parsedData: Record<string, ClientData> = JSON.parse(storedData);

        // Definir intervals com tipagem explícita
        const intervals: Record<string, IntervalData> = {
          '30-60': { count: 0, clients: [] },
          '61-90': { count: 0, clients: [] },
          '91-120': { count: 0, clients: [] },
          '121+': { count: 0, clients: [] },
        };
        
        const currentDate = new Date();

        Object.values(parsedData).forEach((client) => {
          const lastPurchaseDate = new Date(client.info.ultima_compra);
          const daysInactive = Math.floor(
            (currentDate.getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysInactive >= 30 && daysInactive <= 60) {
            intervals['30-60'].count++;
            intervals['30-60'].clients.push(client);
          } else if (daysInactive >= 61 && daysInactive <= 90) {
            intervals['61-90'].count++;
            intervals['61-90'].clients.push(client);
          } else if (daysInactive >= 91 && daysInactive <= 120) {
            intervals['91-120'].count++;
            intervals['91-120'].clients.push(client);
          } else if (daysInactive > 120) {
            intervals['121+'].count++;
            intervals['121+'].clients.push(client);
          }
        });

        const formattedData: ChartData[] = [
          { label: '30 a 60 dias', value: intervals['30-60'].count },
          { label: '61 a 90 dias', value: intervals['61-90'].count },
          { label: '91 a 120 dias', value: intervals['91-120'].count },
          { label: '121+ dias', value: intervals['121+'].count },
        ];

        setChartData(formattedData);
        setClientsData([
          intervals['30-60'].clients,
          intervals['61-90'].clients,
          intervals['91-120'].clients,
          intervals['121+'].clients,
        ]);
      } catch (error) {
        console.error('Erro ao analisar JSON:', error);
      }
    }
  }, []);

  // Função para navegar e passar os dados
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
        origem: client.info.origem,
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
      <h2 className='text-center text-2xl'>Frequência por Data da Última Compra</h2>
      <Plot
        data={[
          {
            x: chartData.map((data) => data.label),
            y: chartData.map((data) => data.value),
            type: 'bar',
            marker: { color: ['#005f73', '#0a9396', '#94d2bd', '#e9d8a6'] },
            hovertemplate: '<b>%{y} clientes inativos</b><extra></extra>',
            text: chartData.map((data) => data.value.toString()),
          },
        ]}
        layout={{
          title: 'Clique nos gráficos para mais detalhes',
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          autosize: true,
          margin: { t: 50, r: 30, l: 50, b: 80 },
          xaxis: { title: 'Dias Inativo', automargin: true, tickfont: { size: 12 } },
          yaxis: { title: 'Número de Clientes', automargin: true },
        }}
        onClick={(event: Plotly.PlotMouseEvent) => {
          const index = event.points?.[0]?.pointIndex;
          if (index !== undefined && clientsData[index]) {
            const clients = clientsData[index]; // clientsData[index] é um array de ClientData
            navigateToClientList(clients);
          } else {
            console.log("Index ou clientsData está indefinido.");
          }
        }}
        useResizeHandler={true}
        style={{ width: '100%', height: '300px' }}
        className="containers"
        config={{ displayModeBar: false }}
      />
    </div>
  );
};

export default PurchasesBarChart;
