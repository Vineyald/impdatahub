'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Plot from 'react-plotly.js';
import axios from 'axios';
import { Select, SelectItem } from '@nextui-org/react';
import { PlotMouseEvent } from 'plotly.js';

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
  const [sortBy, setSortBy] = React.useState<"total_vendido" | "valor_total_vendido">("total_vendido");
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

  // Sort and get top products based on the selected criterion
  const topProducts = produtos
    .slice() // Create a copy to avoid mutating the state
    .sort((a, b) => b[sortBy] - a[sortBy])
    .slice(0, 20);

  const labels = topProducts.map(product => product.descricao);
  const quantities = topProducts.map(product => product.total_vendido);
  const totalSales = topProducts.map(product => product.valor_total_vendido);
  const skus = topProducts.map(product => product.sku);

  const handleBarClick = (event: PlotMouseEvent) => {
    const pointIndex = event.points[0].pointIndex;
    const sku = skus[pointIndex];
    if (sku) {
      router.push(`/products/product-page/${sku}`);
    }
  };

  return (
    <div>
      {/* Sorting Select */}
      <div style={{ marginBottom: '10px' }}>
      <Select
        label="Ordenar por"
        selectedKeys={new Set([sortBy])}
        onSelectionChange={(keys) => {
          const selected = Array.from(keys)[0] as "total_vendido" | "valor_total_vendido";
          setSortBy(selected);
        }}
      >
        <SelectItem key="total_vendido" value="total_vendido">
          Quantidade Vendida
        </SelectItem>
        <SelectItem key="valor_total_vendido" value="valor_total_vendido">
          Valor Total Vendido
        </SelectItem>
      </Select>
      </div>

      {/* Plotly Chart */}
      <Plot
        data={[
          {
            x: labels,
            y: quantities,
            type: 'bar',
            name: 'Quantidade Vendida',
            marker: { color: '#005f73' },
            xaxis: 'x1',
            yaxis: 'y1',
            text: quantities.map(String),
            textposition: 'auto',
            textangle: -45,
            hovertemplate: '%{label}<br>Quantidade Vendida: %{y:.2f}<extra></extra>',
          },
          {
            x: labels,
            y: totalSales,
            type: 'bar',
            name: 'Valor Vendido',
            marker: { color: 'darkred' },
            xaxis: 'x2',
            yaxis: 'y2',
            text: totalSales.map(String),
            textposition: 'auto',
            textangle: -45,
            hovertemplate: '%{label}<br>Valor Vendido: R$ %{y:.2f}<extra></extra>',
          },
        ]}
        layout={{
          grid: { rows: 2, columns: 1, pattern: 'independent' },
          title: 'Clique nas barras para detalhes do produto (passe o mouse sobre as barras para ver o produto)',
          xaxis: { title: '', tickangle: 0, showticklabels: false },
          yaxis: { title: 'Quantidade Vendida', domain: [0, 0.45] },
          xaxis2: { title: '', tickangle: 0, showticklabels: false, anchor: 'y2' },
          yaxis2: { title: 'Valor Vendido', domain: [0.55, 1] },
          autosize: true,
        }}
        useResizeHandler={true}
        style={{ width: '100%', height: '600px' }}
        onClick={handleBarClick}
      />
    </div>
  );
}
