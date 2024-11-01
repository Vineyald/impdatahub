import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';

const ClientProfileCharts = ({ purchases, onMonthSelect }) => {
  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => {
    const monthlyExpenses = purchases.reduce((acc, purchase) => {
      const date = new Date(purchase.data_compra);
      const month = date.getMonth();
      const year = date.getFullYear();
      const key = `${year}-${month + 1}`;

      if (!acc[key]) {
        acc[key] = 0;
      }

      acc[key] += parseFloat(purchase.preco_final);
      return acc;
    }, {});

    const sortedData = Object.keys(monthlyExpenses).sort().map(key => {
      const [year, month] = key.split('-');
      return {
        month: `${year}-${month.padStart(2, '0')}`,
        value: monthlyExpenses[key],
      };
    });

    setMonthlyData(sortedData);
  }, [purchases]);

  const handleClick = (data) => {
    if (data.points && data.points[0]) {
      const selectedMonth = data.points[0].x;
      onMonthSelect(selectedMonth);
      console.log(selectedMonth)
    }
  };

  return (
    <Plot
      data={[
        {
          x: monthlyData.map(item => item.month),
          y: monthlyData.map(item => item.value),
          type: 'scatter',
          mode: 'lines+markers',
          marker: { color: 'blue' },
        },
      ]}
      layout={{
        xaxis: { title: 'Mês' },
        yaxis: { title: 'Gasto Total (R$)' },
      }}
      onClick={handleClick}
    />
  );
};

export default ClientProfileCharts;
