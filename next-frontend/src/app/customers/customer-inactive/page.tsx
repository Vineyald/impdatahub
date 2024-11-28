'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Spacer, 
  Card,
  CardBody,
  Skeleton 
} from '@nextui-org/react';
import dynamic from 'next/dynamic';

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

const PurchasesBarChart = dynamic(() => import('./charts/purchases-bar-chart'), { ssr: false });
const LastPurchaseLineChart = dynamic(() => import('./charts/last-purchase-line-chart'), { ssr: false });
const InactiveClientsChoroplethMap = dynamic(() => import('./charts/heatmap-chart'), { ssr: false });
const ValueDiscountBarChart = dynamic(() => import('./charts/value-discount-bar-chart'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function InactiveClients() {
  const [data, setData] = useState<ClientInfo[] | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cachedData = localStorage.getItem('inactiveClientsData');
        const cachedTimestamp = localStorage.getItem('inactiveClientsDataTimestamp');
        const now = Date.now();
  
        // Verifique se os dados têm menos de 15 minutos
        if (cachedData && cachedTimestamp && now - parseInt(cachedTimestamp, 10) < 15 * 60 * 1000) {
          setData(JSON.parse(cachedData));
        } else {
          // Caso contrário, faça a requisição e atualize o cache
          const response = await axios.get(`${API_URL}/clientes_inativos/`);
          setData(response.data);
          localStorage.setItem('inactiveClientsData', JSON.stringify(response.data));
          localStorage.setItem('inactiveClientsDataTimestamp', now.toString());
        }
      } catch (error) {
        console.error('Erro ao buscar os dados da API', error);
      }
    };
  
    fetchData();
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

  return (
    <div>
      <Spacer y={10} />
      <div className="container mx-auto">
        <div className="items-center text-center">
          <p className="text-5xl font-bold">Clientes Inativos</p>
        </div>
      </div>
      <Spacer y={5} />
      {data && (
        <>
          <div className="grid gap-6 md:grid-cols-4 lg:grid-cols-4 2xl:grid-cols-9 md:max-w-5xl 2xl:max-w-full mx-auto">
            <Card className="p-4 col-span-4 md:col-span-4 2xl:col-span-9">
              <PurchasesBarChart />
            </Card>

            <Card className="col-span-4 md:col-span-2 lg:col-span-2 p-4 2xl:col-span-7">
              <ValueDiscountBarChart />
            </Card>

            <Card className="p-4 col-span-4 md:col-span-2 2xl:col-span-2">
              <LastPurchaseLineChart />
            </Card>

            {/*<Card className="p-4 col-span-4 md:col-span-2 2xl:col-span-3">
              <PurchasesBarChart />  
            </Card>*/}

            {/*<Card className="col-span-4 md:col-span-4 lg:col-span-4 p-4 2xl:col-span-3">
              <OriginPieChart />
            </Card>

            <Card className="col-span-4 md:col-span-2 lg:col-span-2 p-4 2xl:col-span-3">
              <HistogramChart />
            </Card>

            <Card className="col-span-4 md:col-span-2 lg:col-span-2 p-4 2xl:col-span-3">
              <PriceScatterChart />
            </Card> */}

            <Card className="col-span-4 md:col-span-4 lg:col-span-4 p-4 2xl:col-span-8">
              <InactiveClientsChoroplethMap />
            </Card> 
          </div>
        </>
      )}
    </div>
  );
}
