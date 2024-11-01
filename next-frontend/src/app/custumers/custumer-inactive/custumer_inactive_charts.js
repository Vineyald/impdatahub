'use client';

import { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import axios from 'axios';
import { 
  Input, 
  Card, 
  Spacer, 
  CardBody 
} from '@nextui-org/react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const InactiveClientsChart = () => {
  const [data, setData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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
    return <div>Carregando...</div>;
  }

  const filterBySearch = dataset => Object.keys(dataset).reduce((acc, key) => {
    acc[key] = dataset[key].filter(client => client.nome.toLowerCase().includes(searchTerm.toLowerCase()));
    return acc;
  }, {});

  const generalData = filterBySearch(data['geral']);
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

  const HeatmapChart = ({ data, title }) => (
    <Plot
      data={[
        {
          x: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
          y: ['de 30 a 60 dias', 'de 61 a 90 dias', 'de 91 a 120 dias', 'mais de 120 dias'],
          z: data,
          type: 'heatmap',
          colorscale: 'YlGnBu',
          texttemplate: "%{z}",
          showscale: true,
          hovertemplate: '<b>Clientes inativos: %{z}</b><extra></extra>'
        }
      ]}
      layout={{
        title,
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        autosize: true,
        margin: { t: 30, r: 20, l: 20, b: 40 },
        xaxis: {
          automargin: true,  // Ajusta automaticamente a margem para caber o texto
          tickfont: {
            size: 12  // Diminui o tamanho da fonte para caber em telas menores
          }
        },
        yaxis: {
          automargin: true  // Garante que o eixo Y tenha margem para não cortar textos
        }
      }}
      useResizeHandler={true}
      style={{ width: '100%', height: '300px' }}
      className="charts container mt-3"
    />
  );

  const BarChart = ({ data, title }) => (
    <Plot
      data={[{
        x: ['de 30 a 60 dias inativo', 'de 61 a 90 dias inativo', 'de 91 a 120 dias inativo', 'mais de 121 dias'],
        y: data,
        type: 'bar',
        marker: { color: ['#005f73', '#0a9396', '#94d2bd', '#e9d8a6'] },
        hovertemplate: '<b>Clientes inativos: %{y}</b><extra></extra>'  // Customização do texto do tooltip
      }]}
      layout={{
        title,
        template: 'plotly_dark',
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        autosize: true,
        margin: { t: 50, r: 30, l: 50, b: 80 },
        xaxis: {
          automargin: true,
          tickfont: {
            size: 12
          }
        },
        yaxis: {
          automargin: true
        }
      }}
      useResizeHandler={true}
      style={{ width: '100%', height: '300px' }}
      className="containers"
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

      <div className="grid gap-6 md:grid-cols-4 lg:grid-cols-4 2xl:grid-cols-9 md:max-w-5xl 2xl:max-w-screen-2xl mx-auto">
        {/* Card 1 */}
        <Card className="p-4 col-span-4 md:col-span-4 2xl:col-span-3">
          <BarChart data={[generalData['30_60'].length, generalData['60_90'].length, generalData['90_120'].length, generalData['mais_120'].length]} title="Total de clientes inativos - Geral" />
        </Card>

        {/* Card 2 */}
        <Card className="p-4 col-span-4 md:col-span-2 2xl:col-span-3">
          <BarChart data={[serviData['30_60'].length, serviData['60_90'].length, serviData['90_120'].length, serviData['mais_120'].length]} title="Total de clientes inativos - Servi" />
        </Card>

        {/* Card 3 */}
        <Card className="p-4 col-span-4 md:col-span-2 2xl:col-span-3">
          <BarChart data={[impData['30_60'].length, impData['60_90'].length, impData['90_120'].length, impData['mais_120'].length]} title="Total de clientes inativos - Império" />
        </Card>

        {/* Segunda linha: Heatmap */}
        <Card className="col-span-4 md:col-span-4 lg:col-span-4 p-4 2xl:col-span-3">
          <HeatmapChart data={[countInactiveClientsByMonth(generalData['30_60']), countInactiveClientsByMonth(generalData['60_90']), countInactiveClientsByMonth(generalData['90_120']), countInactiveClientsByMonth(generalData['mais_120'])]} title="Clientes inativos por mês - Geral" />
        </Card>

        <Card className="col-span-4 md:col-span-2 lg:col-span-2 p-4 2xl:col-span-3">
          <HeatmapChart data={[countInactiveClientsByMonth(serviData['30_60']), countInactiveClientsByMonth(serviData['60_90']), countInactiveClientsByMonth(serviData['90_120']), countInactiveClientsByMonth(serviData['mais_120'])]} title="Clientes inativos por mês - Servi" />
        </Card>

        <Card className="col-span-4 md:col-span-2 lg:col-span-2 p-4 2xl:col-span-3">
          <HeatmapChart data={[countInactiveClientsByMonth(impData['30_60']), countInactiveClientsByMonth(impData['60_90']), countInactiveClientsByMonth(impData['90_120']), countInactiveClientsByMonth(impData['mais_120'])]} title="Clientes inativos por mês - Império" />
        </Card>
      </div>
    </div>
  );
};

export default InactiveClientsChart;
