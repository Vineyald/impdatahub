'use client';

import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';

interface ClientInfo {
  id: string;
  origem: string;
  nome: string;
  cep: string;
  cpf_cnpj: string;
  tipo_pessoa: string;
  ultima_compra: string;
}

interface Purchase {
  numero_venda: string;
  data_compra: string;
  produto: string;
  quantidade_produto: number;
  preco_unitario: number;
  valor_total: number;
  valor_desconto: number;
  frete: number;
  preco_final: number;
}

interface ClientData {
  info: ClientInfo;
  purchases: Purchase[];
}

const PurchasesBarChart: React.FC = () => {
  const [monthlyData, setMonthlyData] = useState<{ [month: string]: { totalValue: number; totalDiscount: number } }>({});

  useEffect(() => {
    const storedData = localStorage.getItem('inactiveClientsData');
    if (storedData) {
      try {
        const parsedData: Record<string, ClientData> = JSON.parse(storedData);

        // Inicializar objeto para agrupar dados por mês
        const groupedData: { [month: string]: { totalValue: number; totalDiscount: number } } = {};

        const sortedMonths = Object.keys(parsedData).sort((a, b) => new Date(parsedData[a].info.ultima_compra).getTime() - new Date(parsedData[b].info.ultima_compra).getTime());

        sortedMonths.forEach((month) => {
          const purchase = parsedData[month].purchases[0];
          const firstPurchaseMonth = new Date(purchase.data_compra).toLocaleString('default', { month: 'long' });

          // Inicializar mês, se não existir
          if (!groupedData[firstPurchaseMonth]) {
            groupedData[firstPurchaseMonth] = { totalValue: 0, totalDiscount: 0 };
          }

          // Somar valores e descontos ao mês correspondente
          groupedData[firstPurchaseMonth].totalValue += purchase.valor_total;
          groupedData[firstPurchaseMonth].totalDiscount += purchase.valor_desconto;
        });

        setMonthlyData(groupedData);
      } catch (error) {
        console.error('Erro ao analisar JSON:', error);
      }
    }
  }, []);

  // Preparar dados para o gráfico
  const months = Object.keys(monthlyData); // Rótulos (nomes dos meses)
  const totalValues = months.map((month) => monthlyData[month].totalValue); // Somatórios dos valores totais
  const totalDiscounts = months.map((month) => monthlyData[month].totalDiscount); // Somatórios dos descontos

  return (
    <div>
      <h2 className="text-center text-2xl">Comparação Mensal de Valor Total e Descontos</h2>
      <Plot
        data={[
          {
            x: months, // Meses como categorias no eixo x
            y: totalValues, // Valores totais no eixo y
            type: 'bar',
            name: 'Valor Total',
            marker: { color: '#005f73' },
          },
          {
            x: months, // Meses como categorias no eixo x
            y: totalDiscounts, // Descontos totais no eixo y
            type: 'bar',
            name: 'Desconto Total',
            marker: { color: '#94d2bd' },
          },
        ]}
        layout={{
          title: 'Valor Total vs Descontos por Mês',
          barmode: 'group',
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          autosize: true,
          margin: { t: 50, r: 30, l: 50, b: 80 },
          xaxis: { title: 'Meses', automargin: true, tickfont: { size: 12 } },
          yaxis: { title: 'Valor em R$', automargin: true },
        }}
        useResizeHandler={true}
        style={{ width: '100%', height: '500px' }}
        className="containers"
        config={{ displayModeBar: false }}
      />
    </div>
  );
};

export default PurchasesBarChart;
