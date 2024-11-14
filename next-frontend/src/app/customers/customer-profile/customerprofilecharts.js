'use client'

import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { Card, CardBody } from '@nextui-org/react';

const ClientProfileCharts = ({ purchases, onMonthSelect }) => {
  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => {
    // Agrupa os valores únicos por mês e número da venda
    const monthlyExpenses = purchases.reduce((acc, purchase) => {
      const date = new Date(purchase.data_compra);
      const month = date.getMonth();
      const year = date.getFullYear();
      const key = `${year}-${(month + 1).toString().padStart(2, '0')}`;
      
      // Inicializa o mês no acumulador, se não existir
      if (!acc[key]) {
        acc[key] = new Set(); // Usamos um Set para evitar duplicados
      }
  
      // Adiciona o número da venda ao Set se ainda não foi adicionado
      if (!acc[key].has(purchase.numero_venda)) {
        if (purchase.situacao != "Cancelado"){
          acc[key].add(purchase.numero_venda);
          acc[key].total = (acc[key].total || 0) + parseFloat(purchase.preco_final);
        }
      }
  
      return acc;
    }, {});
  
    // Transforma o acumulador em um array de dados ordenados
    const sortedData = Object.keys(monthlyExpenses).sort().map(key => ({
      month: key,
      value: monthlyExpenses[key].total || 0,
    }));
  
    setMonthlyData(sortedData);
  }, [purchases]);

  const handleClick = (data) => {
    if (data.points && data.points[0]) {
      const selectedMonth = data.points[0].x;
      onMonthSelect(selectedMonth);
    }
  };

  return (
    <Card className='md:max-w-5xl 2xl:max-w-screen-2xl mx-auto'>
      <CardBody className='container'>
        <Plot
            data={[
              {
                x: monthlyData.map(item => item.month),
                y: monthlyData.map(item => item.value),
                type: 'bar',
                marker: { color: '#e9d8a6' },
                text: monthlyData.map(item => item.value),
                name: 'Colunas'
              },
              {
                x: monthlyData.map(item => item.month),
                y: monthlyData.map(item => item.value),
                type: 'scatter',
                mode: 'lines',
                line: {
                  shape: 'spline', 
                  color: '#005f73', 
                  width: 4,
                  dash: 'dashdot',
                }, // Linha de tendência
                name: 'Traçado'
              }
            ]}
            layout={{
              title: 'clique nas barras para filtrar a tabela',
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
                  title: { text: 'Valor gasto (R$)', standoff: 20 },
                  automargin: true,
                  tickfont: { size: 12 },
                  gridcolor: '#E5E5E5',
              },
            }}
            onClick={handleClick}
            style={{ width: '100%', height: '400px' }}
            config={{ displayModeBar: false, responsive: true }}
        />
      </CardBody>
    </Card>
  );
};

export default ClientProfileCharts;
