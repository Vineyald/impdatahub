'use client';

import { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import axios from 'axios';
import {
  Input, 
  Card, 
  Spacer, 
  CardBody,
  Skeleton 
} from '@nextui-org/react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const InactiveClientsChart = () => {
  const [data, setData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    axios.get(`${API_URL}/clientes_inativos/`)
      .then(response => {
        setData(response.data);
      })
      .catch(error => {
        console.error('Erro ao buscar os dados da API', error);
      });
  }, []);

  if (!data) {
    return (
      <div className='px-4'>
        <Spacer y={8} />
        <Card className="max-w-[750px] mx-auto mb-6">
          <CardBody className='flex flex-col items-center'>
            <span>Pesquise um cliente pelo nome: </span>
            <Spacer y={2} />
            <Skeleton className='rounded-lg'></Skeleton>
          </CardBody>
        </Card>

        <div className="grid gap-6 md:grid-cols-4 lg:grid-cols-4 2xl:grid-cols-9 md:max-w-5xl 2xl:max-w-screen-2xl mx-auto">
          <Card className="p-4 col-span-4 md:col-span-4 2xl:col-span-3">
            <Skeleton className='h-[300px] rounded-lg'></Skeleton>
          </Card>

          <Card className="p-4 col-span-4 md:col-span-2 2xl:col-span-3">
            <Skeleton className='h-[300px] rounded-lg'></Skeleton>  
          </Card>

          <Card className="p-4 col-span-4 md:col-span-2 2xl:col-span-3">
            <Skeleton className='h-[300px] rounded-lg'></Skeleton>
          </Card>

          <Card className="col-span-4 md:col-span-4 lg:col-span-4 p-4 2xl:col-span-3">
            <Skeleton className='h-[300px] rounded-lg'></Skeleton>
          </Card>

          <Card className="col-span-4 md:col-span-2 lg:col-span-2 p-4 2xl:col-span-3">
            <Skeleton className='h-[300px] rounded-lg'></Skeleton>
          </Card>

          <Card className="col-span-4 md:col-span-2 lg:col-span-2 p-4 2xl:col-span-3">
            <Skeleton className='h-[300px] rounded-lg'></Skeleton>
          </Card>
        </div>
      </div>
    );
  }

  const filterGeneralData = (generalData) => {
    const filteredData = {};
  
    // Iterando sobre as categorias de dias inativos
    Object.keys(generalData).forEach((key) => {
      const clients = generalData[key];
      
      // Agrupar clientes pelo nome
      const groupedClients = clients.reduce((acc, client) => {
        if (!acc[client.nome]) {
          acc[client.nome] = [];
        }
        acc[client.nome].push(client);
        return acc;
      }, {});
  
      // Filtrando os clientes
      filteredData[key] = Object.keys(groupedClients).reduce((acc, clientName) => {
        const clientList = groupedClients[clientName];
  
        if (clientList.length > 1) {
          // Se há mais de uma origem, compara as datas de compra
          const sortedClients = clientList.sort((a, b) => new Date(b.ultima_compra) - new Date(a.ultima_compra));
  
          // Mantém apenas o cliente com a data mais recente
          acc.push(sortedClients[0]);
        } else {
          // Se não houver duplicados de origem, exclui o cliente
          acc.push(clientList[0]);
        }
  
        return acc;
      }, []);
    });
  
    return filteredData;
  };

  const filterBySearch = (dataset) => Object.keys(dataset).reduce((acc, key) => {
    acc[key] = dataset[key].filter(client => client.nome.toLowerCase().includes(searchTerm.toLowerCase()));
    return acc;
  }, {});

  const filteredGeneralData = filterGeneralData(data['geral'])
  const generalData = filterBySearch(filteredGeneralData);
  const serviData = filterBySearch(data['servi']);
  const impData = filterBySearch(data['imp']);

  const countInactiveClientsByMonth = (clients) => {
    const monthCount = new Array(12).fill(0);
    clients.forEach(client => {
      const month = new Date(client.ultima_compra).getMonth();
      monthCount[month] += 1;
    });
    return monthCount;
  };

  const navigateToClientList = (clients) => {
    const clientList = clients.map(client => ({
      id: client.id,
      nome: client.nome,
      ultima_compra: client.ultima_compra,
      dias_inativo: Math.floor((new Date() - new Date(client.ultima_compra)) / (1000 * 60 * 60 * 24)),
      origem: client.origem,
    }));

    if (clientList.length > 0) {
      sessionStorage.setItem('inactiveClients', JSON.stringify(clientList));
      router.push('/customers/customer-inactive/overview'); 
    } else {
      router.refresh();
    }
  };

  const HeatmapChart = ({ data, title, clients }) => (
    <Plot
      data={[
        {
          x: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
          y: ['de 30 a 60', 'de 61 a 90', 'de 91 a 120', 'mais de 120'],
          z: data,
          type: 'heatmap',
          colorscale: 'YlGnBu',
          texttemplate: "%{z}",
          showscale: true,
          hovertemplate: '<b>%{z} clientes inativos</b><extra></extra>'
        }
      ]}

      layout={{
        title,
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        autosize: true,
        margin: { t: 30, r: 20, l: 20, b: 40 },
        xaxis: {
          title: 'Mês',
          automargin: true,
          tickfont: {
            size: 12
          }
        },
        yaxis: {
          automargin: true,
          title: 'Dias inativo',
        }
      }}

      onClick={(event) => {
        const monthIndex = event.points[0].pointIndex[1]+1; // Mês do eixo X ajustado para 1 a 12
        const periodIndex = event.points[0].pointIndex[0];
        const clientList = [];
        const searchList = clients[periodIndex];

        searchList.forEach(client => {
          const month = new Date(client.ultima_compra).getMonth() + 1; // Ajustando para 1 a 12
          if (monthIndex === month) {
            clientList.push(client);
          }
        });

        console.log('Lista de clientes filtrados:', clientList);
        navigateToClientList(clientList);

      }}
      useResizeHandler={true}
      style={{ width: '100%', height: '300px' }}
      className="charts container mt-3"
      config={{
        displayModeBar: false
      }}
    />
  );

  const BarChart = ({ data, title, clientsData }) => (
    <Plot
      data={[{
        x: ['de 30 a 60', 'de 61 a 90', 'de 91 a 120', 'mais de 121'],
        y: data,
        type: 'bar',
        marker: { color: ['#005f73', '#0a9396', '#94d2bd', '#e9d8a6'] },
        hovertemplate: '<b>%{y} clientes inativos</b><extra></extra>'
      }]}

      layout={{

        title,
        template: 'plotly_dark',
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        autosize: true,

        margin: {
          t: 50, 
          r: 30, 
          l: 50, 
          b: 80 
        },

        displayModeBar: false,

        xaxis: {
          title: 'Dias inativo',
          automargin: true,
          tickfont: {
            size: 12
          }
        },

        yaxis: {
          automargin: true,
          title: 'Numero de clientes',
        },

      }}

      onClick={(event) => {
        const index = event.points[0].pointIndex;

        navigateToClientList(clientsData[index]);
      }}

      useResizeHandler={true}
      style={{ width: '100%', height: '300px' }}
      className="containers"
      config={{
        displayModeBar: false
      }}
    />
  );

  return (
    <div className='px-4'>
      <Spacer y={8} />
      <Card className="max-w-[750px] mx-auto mb-6">
        <CardBody className='flex flex-col items-center'>
          <span>Pesquise um cliente pelo nome: </span>
          <Spacer y={2} />
          <Input
            clearable
            underlined
            placeholder="Buscar Cliente"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
          />
        </CardBody>
      </Card>

      <div className="grid gap-6 md:grid-cols-4 lg:grid-cols-4 md:max-w-5xl 2xl:max-w-screen-2xl mx-auto">
        <Card className="p-4 col-span-4 md:col-span-4 2xl:col-span-4">
          <BarChart 
            data={[generalData['30_60'].length, 
              generalData['60_90'].length, 
              generalData['90_120'].length, 
              generalData['mais_120'].length
            ]} 
            title="Total de clientes inativos - Geral" 
            clientsData={[generalData['30_60'], generalData['60_90'], generalData['90_120'], generalData['mais_120']]} 
          />
        </Card>
        <Card className="p-4 col-span-4 md:col-span-2 2xl:col-span-2">
          <BarChart 
            data={[
              serviData['30_60'].length, 
              serviData['60_90'].length, 
              serviData['90_120'].length, 
              serviData['mais_120'].length
            ]} 
            title="Total de clientes inativos - Servi" 
            clientsData={[serviData['30_60'], serviData['60_90'], serviData['90_120'], serviData['mais_120']]} 
          />
        </Card>
        <Card className="p-4 col-span-4 md:col-span-2 2xl:col-span-2">
          <BarChart 
            data={[
              impData['30_60'].length, 
              impData['60_90'].length, 
              impData['90_120'].length, 
              impData['mais_120'].length
            ]} 
            title="Total de clientes inativos - Império" 
            clientsData={[impData['30_60'], impData['60_90'], impData['90_120'], impData['mais_120']]} 
          />
        </Card>
        <Card className="col-span-4 md:col-span-4 lg:col-span-4 p-4">
          <HeatmapChart 
            data={[
              countInactiveClientsByMonth(generalData['30_60']), 
              countInactiveClientsByMonth(generalData['60_90']), 
              countInactiveClientsByMonth(generalData['90_120']), 
              countInactiveClientsByMonth(generalData['mais_120'])
            ]} 
            title="Clientes inativos por mês - Geral"
            clients={[
              generalData['30_60'], 
              generalData['60_90'], 
              generalData['90_120'], 
              generalData['mais_120']]} 
          />
        </Card>
        <Card className="col-span-4 md:col-span-2 lg:col-span-2 p-4">
          <HeatmapChart 
            data={[
              countInactiveClientsByMonth(serviData['30_60']), 
              countInactiveClientsByMonth(serviData['60_90']), 
              countInactiveClientsByMonth(serviData['90_120']), 
              countInactiveClientsByMonth(serviData['mais_120'])
            ]} 
            title="Clientes inativos por mês - Servi" 
            clients={[
              serviData['30_60'], 
              serviData['60_90'], 
              serviData['90_120'], 
              serviData['mais_120']
            ]} 
          />
        </Card>
        <Card className="col-span-4 md:col-span-2 lg:col-span-2 p-4">
          <HeatmapChart 
            data={[
              countInactiveClientsByMonth(impData['30_60']), 
              countInactiveClientsByMonth(impData['60_90']), 
              countInactiveClientsByMonth(impData['90_120']), 
              countInactiveClientsByMonth(impData['mais_120'])
            ]} 
            title="Clientes inativos por mês - Império" 
            clients={[
              impData['30_60'], 
              impData['60_90'], 
              impData['90_120'], 
              impData['mais_120']
            ]} 
          />
        </Card>
      </div>
    </div>
  );
};
export default InactiveClientsChart;
