'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Spacer, Card, Skeleton } from '@nextui-org/react';
import dynamic from 'next/dynamic';

interface Venda {
  id_venda: number;
  data_compra: number;
  quantidade_produto: number;
  id_cliente: number;
  nome_cliente: string;
  valor_vendido: number;
}

interface ProductInfo {
  sku: string;
  descricao: string;
  preco: number;
  preco_promocional?: number;
  estoque_disponivel: number;
  unidade?: string;
  custo: number;
  numero_vendas: number;
  total_vendido: number;
  valor_total_vendido: number;
  vendas: Venda[];
}

interface ProductsData {
  produtos: ProductInfo[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const VerticalBarChart = dynamic(() => import('./components/vertical-bar-chart'), { ssr: false });
const StackedBarChart = dynamic(() => import('./components/stacked-bar-chart'), { ssr: false });
const PieChart = dynamic(() => import('./components/pie-chart'), { ssr: false });
const LineChart = dynamic(() => import('./components/line-chart'), { ssr: false });

export default function MostSoldProducts() {
  const [data, setData] = useState<ProductInfo[] | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cachedData = localStorage.getItem('productsData');
        const cachedTimestamp = localStorage.getItem('productsDataTimestamp');
        const now = Date.now();

        if (cachedData && cachedTimestamp && now - parseInt(cachedTimestamp, 10) < 15 * 60 * 1000) {
          setData(JSON.parse(cachedData));
        } else {
          const response = await axios.get<ProductsData>(`${API_URL}/products-list/`);
          setData(response.data.produtos);
          localStorage.setItem('productsData', JSON.stringify(response.data.produtos));
          localStorage.setItem('productsDataTimestamp', now.toString());
        }
      } catch (error) {
        console.error('Error fetching API data:', error);
      }
    };

    fetchData();
  }, []);

  if (!data) {
    return (
      <div className="px-4">
        <Spacer y={4} />
        <div className="grid gap-6 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-9 md:max-w-5xl xl:max-w-screen-2xl mx-auto">
          {[...Array(7)].map((_, index) => (
            <Card key={index} className="p-4 col-span-4 md:col-span-2 xl:col-span-3">
              <Skeleton className="h-[300px] rounded-lg" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Spacer y={10} />
      <div className="container mx-auto text-center">
        <h1 className="text-4xl font-bold">Produtos Mais Vendidos</h1>
      </div>
      <Spacer y={5} />
      <div className="grid gap-6 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-9 md:max-w-5xl xl:max-w-screen-2xl mx-auto">
        <Card className="p-4 col-span-4 md:col-span-6 xl:col-span-9">
          <h2 className="text-xl font-semibold mb-6">Separados por valor e quantidade</h2>
          <LineChart />
        </Card>
        <Card className="p-4 col-span-4 md:col-span-6 xl:col-span-3">
          <h2 className="text-xl font-semibold">Stacked Bar Chart</h2>
          <StackedBarChart />
        </Card>
        <Card className="p-4 col-span-4 md:col-span-3 xl:col-span-3">
          <h2 className="text-xl font-semibold">Pie/Donut Chart</h2>
          <PieChart />
        </Card>
        <Card className="p-4 col-span-4 md:col-span-3 xl:col-span-3">
          <h2 className="text-xl font-semibold">Line Chart</h2>
          <VerticalBarChart />
        </Card>
      </div>
    </div>
  );
}
