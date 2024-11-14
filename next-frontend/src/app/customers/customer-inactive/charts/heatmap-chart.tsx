'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Plot from 'react-plotly.js';
import { useRouter } from 'next/navigation';

const GEOJSON_URL = 'https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-100-mun.json';
const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface ClientInfo {
  id: string;
  nome: string;
  ultima_compra: string;
  cep?: string;
}

interface ClientData {
  info: ClientInfo;
}

interface CityData {
  cidade: string;
  count: number;
}

interface GeoJsonFeature {
  properties: {
    id: string;
    name: string;
  };
}

interface GeoJsonData {
  features: GeoJsonFeature[];
}

const InactiveClientsChoroplethMap: React.FC = () => {
  const [cityData, setCityData] = useState<CityData[]>([]);
  const [geoJsonData, setGeoJsonData] = useState<GeoJsonData | null>(null);
  const [clientsByCity, setClientsByCity] = useState<Record<string, ClientData[]>>({});
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const storedData = localStorage.getItem('inactiveClientsData');
      if (!storedData) {
        console.error("Nenhum dado de cliente encontrado no localStorage.");
        return;
      }

      const clients: Record<string, ClientData> = JSON.parse(storedData);

      // Extrair CEPs e remover duplicados
      const ceps = Array.from(
        new Set(
          Object.values(clients)
            .map((client) => client?.info?.cep?.replace(/\./g, '').replace('-', ''))
            .filter((cep) => cep && cep.trim() !== '')
        )
      );

      try {
        // Buscar GeoJSON
        const geoJsonResponse = await fetch(GEOJSON_URL);
        const geoJson: GeoJsonData = await geoJsonResponse.json();
        setGeoJsonData(geoJson);

        // Converter CEPs para nomes de cidades via API
        const response = await axios.post(`${API_URL}/ceps_to_latitude/`, { ceps });
        const data: Record<string, { cidade: string }> = response.data;

        const cityCount: Record<string, number> = {};
        const cityClients: Record<string, ClientData[]> = {};

        // Processar os dados retornados pela API
        Object.values(clients).forEach((client) => {
          const clientCep = client.info.cep?.replace(/\./g, '').replace('-', '');
          const cityInfo = clientCep ? data[clientCep] : null; // Buscar a cidade pelo CEP

          if (cityInfo && cityInfo.cidade) {
            cityCount[cityInfo.cidade] = (cityCount[cityInfo.cidade] || 0) + 1;

            if (!cityClients[cityInfo.cidade]) {
              cityClients[cityInfo.cidade] = [];
            }
            cityClients[cityInfo.cidade].push(client);
          }
        });

        // Criar dados para plotagem
        const cityDataArray: CityData[] = Object.entries(cityCount).map(([cidade, count]) => ({
          cidade,
          count,
        }));

        setCityData(cityDataArray);
        setClientsByCity(cityClients);
      } catch (error) {
        console.error("Erro ao buscar dados da API ou GeoJSON:", error);
      }
    };

    fetchData();
  }, []);

  const navigateToClientListByCity = (cidade: string) => {
    const clients = clientsByCity[cidade];

    if (clients) {
      const clientList = clients.map((client) => {
        const currentDate = new Date();
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

      sessionStorage.setItem('inactiveClients', JSON.stringify(clientList));
      router.push('/customers/customer-inactive/overview');
    } else {
      console.log("Nenhum cliente encontrado para a cidade:", cidade);
    }
  };

  return (
    <div>
      <h2 className="text-center text-2xl">Mapa de Concentração de Clientes Inativos</h2>
      {geoJsonData && cityData.length > 0 ? (
        <Plot
          data={[
            {
              type: 'choropleth',
              locations: cityData.map((city) => city.cidade),
              z: cityData.map((city) => city.count),
              colorscale: 'Viridis',
              colorbar: { title: 'Clientes Inativos', thickness: 10 },
              geojson: geoJsonData,
              featureidkey: "properties.name",
              hovertemplate: '<b>%{location}</b><br>Clientes inativos: %{z}<extra></extra>',
            } as Partial<Plotly.PlotData> & { geojson: GeoJsonData; featureidkey: string },
          ]}
          layout={{
            geo: {
              projection: { type: 'equirectangular' },
              showcountries: true,
              showocean: true,
              showsubunits: true,
              showframe: false,
            },
            autosize: true,
            margin: { t: 50, r: 30, l: 50, b: 80 },
            xaxis: { title: 'Dias Inativo', automargin: true, tickfont: { size: 12 } },
            yaxis: { title: 'Número de Clientes', automargin: true },
            dragmode: 'zoom',
          }}
          onClick={(event: Plotly.PlotMouseEvent) => {
            const pointIndex = event.points?.[0]?.pointIndex;
            if (pointIndex !== undefined && cityData[pointIndex]) {
              const cidade = cityData[pointIndex].cidade;
              navigateToClientListByCity(cidade);
            } else {
              console.log("Nenhuma cidade identificada no clique.");
            }
          }}
          style={{ width: '100%', height: '500px' }}
          useResizeHandler={true}
          className="container mx-auto"
          config={{
            displayModeBar: true,
            scrollZoom: true,
          }}
        />
      ) : (
        <div className="text-center">Carregando dados ou sem resultados.</div>
      )}
    </div>
  );
};

export default InactiveClientsChoroplethMap;
