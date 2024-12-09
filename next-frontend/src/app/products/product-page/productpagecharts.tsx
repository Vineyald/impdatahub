'use client';

import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { Card, CardBody } from '@nextui-org/react';

interface Venda {
  id_venda: number;
  data_compra: string;
  quantidade_produto: number;
  id_cliente: number;
  nome_cliente: string;
  valor_total: number;
}

interface Produto {
  produto: Produto;
  sku: string;
  descricao: string;
  preco: string;
  preco_promocional: string | null;
  estoque_disponivel: string;
  unidade: string;
  custo: string;
  vendas: Venda[] | null;
}

interface SalesByMonth {
  [month: string]: {
    quantity: number;
    value: number;
  };
}

const ProductSalesChart: React.FC = () => {
  const [products, setProducts] = useState<Produto[]>([]);
  const [salesData, setSalesData] = useState<{
    months: string[];
    quantities: number[];
    values: number[];
  }>({
    months: [],
    quantities: [],
    values: [],
  });

  useEffect(() => {
    const productData = localStorage.getItem('productData');
    console.log('Product data:', productData);
    if (productData) {
      const parsedData = JSON.parse(productData);
      setProducts([parsedData.produto]); // Access `produto` directly
    }
  }, []);

  useEffect(() => {
    if (products.length > 0 && products[0].vendas) {
      const vendas = products[0].vendas;

      // Group sales by month
      const salesByMonth = vendas.reduce((acc: SalesByMonth, venda) => {
        const date = new Date(venda.data_compra);
        const month = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (!acc[month]) {
          acc[month] = { quantity: 0, value: 0 };
        }
        acc[month].quantity += venda.quantidade_produto;
        acc[month].value += venda.valor_total;
        return acc;
      }, {});

      // Prepare data for Plotly
      const months = Object.keys(salesByMonth).sort();
      const quantities = months.map((month) => salesByMonth[month].quantity);
      const values = months.map((month) => salesByMonth[month].value);

      setSalesData({ months, quantities, values });
    }
  }, [products]);

  return (
    <Card className='container mx-auto'>
      <CardBody>
        <Plot
          data={[
            {
              x: salesData.months,
              y: salesData.values,
              type: 'bar',
              name: 'Valor em vendas',
              text: salesData.values.map((value) => `R$ ${value.toFixed(2)}`),
              textposition: 'auto',
              marker: {
                color: '#005f73',
              },
            },
            {
              x: salesData.months,
              y: salesData.quantities,
              type: 'scatter',
              name: 'Quantidade vendida',
              line: { color: '#e9d8a6' },
              yaxis: 'y2',
            },
          ]}
          layout={{
            title: 'Vendas por mês',
            plot_bgcolor: '#FFFFFF',
            paper_bgcolor: '#FFFFFF',
            autosize: true,
            margin: { t: 40, r: 20, l: 60, b: 60 },
            xaxis: {
              title: { text: 'Data', standoff: 20 },
              automargin: true,
              tickfont: { size: 12 },
            },
            yaxis: {
              title: { text: 'Quantidade vendida', standoff: 20 },
              automargin: true,
              tickfont: { size: 12 },
              side: 'right',
              showgrid: false,
            },
            yaxis2: {
              title: { text: 'Valor vendido (R$)', standoff: 20 },
              automargin: true,
              tickfont: { size: 12 },
              overlaying: 'y',
              side: 'left',
              gridcolor: '#E5E5E5',
            },
            legend: { orientation: 'h', y: -0.2 },
          }}
          style={{ width: '100%', height: '400px' }}
          config={{ displayModeBar: false, responsive: true }}
          
        />
      </CardBody>
    </Card>
  );
};

export default ProductSalesChart;
