'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Plot from 'react-plotly.js';
import { useRouter } from 'next/navigation';

const GEOJSON_URL = 'https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-100-mun.json';
const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface ClientInfo {
  id: number;
  nome: string;
  fantasia: string;
  tipo_pessoa: string;
  cpf_cnpj: string;
  email: string;
  celular: string;
  fone: string;
  cep: string;
  rota: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  situacao: string;
  vendedor: string;
  contribuinte: string;
  codigo_regime_tributario: string;
  limite_credito: number;
  ultima_compra: string | null;
}

interface ClientData {
  info: ClientInfo;
}

interface CityData {
  cityName: string;
  clientCount: number;
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
      console.log("Fetching data process started...");
      const storedData = localStorage.getItem('inactiveClientsData');
      if (!storedData) {
        console.error("No client data found in localStorage.");
        return;
      }

      console.log("Parsing stored client data...");
      const clients: Record<string, ClientData> = JSON.parse(storedData);

      console.log("Extracting unique CEPs...");
      const ceps = Array.from(
        new Set(
          Object.values(clients)
            .map((client) => client?.info?.cep?.replace(/\./g, '').replace('-', '').replace(' ', ''))
            .filter((cep) => cep && cep.trim() !== '')
        )
      );

      try {
        console.log("Fetching GeoJSON data...");
        const geoJsonResponse = await fetch(GEOJSON_URL);
        const geoJson: GeoJsonData = await geoJsonResponse.json();
        setGeoJsonData(geoJson);

        console.log("Fetching city mapping data...");
        const response = await axios.post(`${API_URL}/ceps_to_latitude/`, { ceps });
        const cityMapping: Record<string, { cidade: string }> = response.data;

        console.log("Processing client data by city...");
        const cityCounts: Record<string, number> = {};
        const clientGroups: Record<string, ClientData[]> = {};

        Object.values(clients).forEach((client) => {
          const clientCep = client.info.cep?.replace(/\./g, '').replace('-', '');
          const cityInfo = clientCep ? cityMapping[clientCep] : null;

          if (cityInfo && cityInfo.cidade) {
            cityCounts[cityInfo.cidade] = (cityCounts[cityInfo.cidade] || 0) + 1;

            if (!clientGroups[cityInfo.cidade]) {
              clientGroups[cityInfo.cidade] = [];
            }
            clientGroups[cityInfo.cidade].push(client);
          }
        });

        console.log("Formatting city data...");
        const formattedCityData: CityData[] = Object.entries(cityCounts).map(([cityName, clientCount]) => ({
          cityName,
          clientCount,
        }));

        console.log("Updating state with formatted data...");
        setCityData(formattedCityData);
        setClientsByCity(clientGroups);
      } catch (error) {
        console.error("Error fetching data from API or GeoJSON:", error);
      }
    };

    fetchData();
  }, []);

  const navigateToClientListByCity = (cityName: string) => {
    const clients = clientsByCity[cityName];
  
    if (clients) {
      const clientList = clients.map((client) => {
        const currentDate = new Date();
        const lastPurchaseDate = client.info.ultima_compra ? new Date(client.info.ultima_compra) : null;
        const daysInactive = lastPurchaseDate ? Math.floor(
          (currentDate.getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24)
        ) : null;
  
        return {
          id: client.info.id,
          nome: client.info.nome,
          ultimaCompra: client.info.ultima_compra,
          diasInativo: daysInactive,
        };
      });

      sessionStorage.setItem('inactiveClients', JSON.stringify(clientList));
      router.push('/customers/customer-inactive/overview');
    } else {
      console.log("No clients found for the city:", cityName);
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
              locations: cityData.map((city) => city.cityName),
              z: cityData.map((city) => city.clientCount),
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
              const cityName = cityData[pointIndex].cityName;
              navigateToClientListByCity(cityName);
            } else {
              console.log("No city identified on click.");
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
        <div className="text-center">Loading data or no results.</div>
      )}
    </div>
  );
};

export default InactiveClientsChoroplethMap;
