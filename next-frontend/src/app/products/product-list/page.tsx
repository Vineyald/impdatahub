'use client';

import React from 'react';
import ProductListTable from './product-list-table';

const Page: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-center">Listagem de Produtos</h1>
      <ProductListTable />
    </div>
  );
};

export default Page;
