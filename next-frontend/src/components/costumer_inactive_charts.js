// app/inactive_clients/InactiveClientsChart.js
import { useEffect, useState, useRef } from 'react';
import Plot from 'react-plotly.js';
import axios from 'axios';
import ResizeObserver from 'resize-observer-polyfill';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../statics/css/InactiveClientsChart.scss';

// Hook para usar ResizeObserver com controle de resize
const useResizeObserver = (callback) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver(entries => {
        callback(entries[0].contentRect);
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [callback]);

  return containerRef;
};

const InactiveClientsChart = () => {
  const [data, setData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    axios.get('/api/clientes_inativos/')
      .then(response => {
        console.log(response.data);
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

  // Componente para renderizar Heatmap responsivo
  const HeatmapChart = ({ data, title }) => {
    const [dimensions, setDimensions] = useState({ width: 400, height: 300 });
    const containerRef = useResizeObserver((rect) => {
      if (Math.abs(rect.width - dimensions.width) > 20 || Math.abs(rect.height - dimensions.height) > 20) {
        setDimensions({ width: rect.width, height: rect.height });
      }
    });

    return (
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
        <Plot
          data={[
            {
              x: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
              y: ['30_60', '60_90', '90_120', 'mais_120'],
              z: data,
              type: 'heatmap',
              colorscale: [[0, '#f9f9f9'], [1, '#D4AF37']],
              text: data,
              texttemplate: "%{z}",
              showscale: true
            }
          ]}
          layout={{
            title,
            paper_bgcolor: 'rgb(0,0,0,0)',
            plot_bgcolor: 'rgb(0,0,0,0)',
            autosize: true,
            width: dimensions.width,
            height: dimensions.height,
          }}
          useResizeHandler={true}
          className="charts container mt-3"
        />
      </div>
    );
  };

  const BarChart = ({ data, title }) => {
    const [dimensions, setDimensions] = useState({ width: 400, height: 300 });
    const containerRef = useResizeObserver((rect) => {
      if (Math.abs(rect.width - dimensions.width) > 20 || Math.abs(rect.height - dimensions.height) > 20) {
        setDimensions({ width: rect.width, height: rect.height });
      }
    });

    return (
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
        <Plot
          data={[{ x: ['30_60', '60_90', '90_120', 'mais_120'], y: data, type: 'bar', marker: { color: ['#202020', '#404040', '#606060', '#808080'] }}]}
          layout={{
            title,
            template: "simple_white",
            paper_bgcolor: 'rgb(0,0,0,0)',
            plot_bgcolor: 'rgb(0,0,0,0)',
            autosize: true,
          }}
          className="charts container mt-3"
          useResizeHandler={true}
        />
      </div>
    );
  }

  return (
    <div className="container">
      <div className="row">
        <div className="col-12">
          <BarChart data={[generalData['30_60'].length, generalData['60_90'].length, generalData['90_120'].length, generalData['mais_120'].length]} title="Inativos - Geral" />
        </div>
      </div>
      <div className="row">
        <div className="col-6">
          <BarChart data={[serviData['30_60'].length, serviData['60_90'].length, serviData['90_120'].length, serviData['mais_120'].length]} title="Inativos - Servi"/>
        </div>
        <div className="col-6">
          <BarChart data={[impData['30_60'].length, impData['60_90'].length, impData['90_120'].length, impData['mais_120'].length]} title="Inativos - Imp" />
        </div>
      </div>
      <div className="row">
        <div className="col-12">
          <HeatmapChart data={[countInactiveClientsByMonth(generalData['30_60']), countInactiveClientsByMonth(generalData['60_90']), countInactiveClientsByMonth(generalData['90_120']), countInactiveClientsByMonth(generalData['mais_120'])]} title="Heatmap Inativos - Geral" />
        </div>
      </div>
    </div>
  );
};

export default InactiveClientsChart;
