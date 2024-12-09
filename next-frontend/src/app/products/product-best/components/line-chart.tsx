'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Plot from 'react-plotly.js';
import axios from 'axios';

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
  estoque_disponivel: number;
  custo: number;
  numero_vendas: number;
  total_vendido: number;
  valor_total_vendido: number;
  vendas: Venda[];
}

interface ProductsData {
  produtos: ProductInfo[];
}

export default function MostSoldProductsPlotly() {
  const [produtos, setProdutos] = useState<ProductInfo[] | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get<ProductsData>(`${process.env.NEXT_PUBLIC_API_URL}/products-list/`);
        setProdutos(response.data.produtos);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      }
    };

    fetchData();
  }, []);

  if (!produtos) {
    return <div>Loading...</div>;
  }

  const topProducts = produtos
    .sort((a, b) => b.total_vendido - a.total_vendido)
    .slice(0, 10);

  const labels = topProducts.map(product => product.descricao);
  const quantities = topProducts.map(product => product.total_vendido);
  const totalSales = topProducts.map(product => product.valor_total_vendido);
  const skus = topProducts.map(product => product.sku);

  const handleBarClick = (event: any) => {
    const pointIndex = event.points[0].pointIndex;
    const sku = skus[pointIndex];
    if (sku) {
      router.push(`/products/product-page/${sku}`);
    }
  };

  return (
    <div>
      <Plot
        data={[
          {
            x: labels,
            y: quantities,
            type: 'bar',
            name: 'Quantidade Vendida',
            marker: { color: 'rgb(66, 134, 244)' },
          },
          {
            x: labels,
            y: totalSales,
            type: 'bar',
            name: 'Valor Vendido',
            marker: { color: 'rgb(245, 127, 23)' },
          },
        ]}
        layout={{
          barmode: 'group',
          title: 'Clique nas barras para detalhes do produto',
          xaxis: { title: 'Produto', tickangle: -45 },
          yaxis: { title: 'Valor' },
        }}
        style={{ width: '100%', height: '400px' }}
        onClick={handleBarClick}
      />
    </div>
  );
}
