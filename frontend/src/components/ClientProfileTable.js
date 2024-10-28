import React from 'react';
import '../statics/css/ClientsProfile.scss';

const ClientProfileTable = ({ purchases }) => {
  const groupedPurchases = purchases.reduce((acc, purchase) => {
    const { numero_venda } = purchase;
    if (!acc[numero_venda]) {
      acc[numero_venda] = [];
    }
    acc[numero_venda].push(purchase);
    return acc;
  }, {});

  return (
    <div className="container">
      {purchases.length > 0 ? (
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Número da Venda</th>
              <th>Data da Compra</th>
              <th>Produto</th>
              <th>Quantidade</th>
              <th>Preço Unitário</th>
              <th>Preço Total</th>
              <th>Preço Final</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedPurchases).map(([saleNumber, items]) => (
              items.map((item, index) => (
                <tr key={`${saleNumber}-${index}`}>
                  {index === 0 && (
                    <>
                      <td rowSpan={items.length}>{saleNumber}</td>
                      <td rowSpan={items.length}>{item.data_compra}</td>
                    </>
                  )}
                  <td>{item.produto}</td>
                  <td>{item.quantidade_produto}</td>
                  <td>R$ {item.preco_unitario}</td>
                  <td>R$ {item.valor_total}</td>
                  {index === 0 && (
                    <td rowSpan={items.length}>R$ {item.preco_final}</td>
                  )}
                </tr>
              ))
            ))}
          </tbody>
        </table>
      ) : (
        <p>Nenhuma compra encontrada para este cliente.</p>
      )}
    </div>
  );
};

export default ClientProfileTable;
