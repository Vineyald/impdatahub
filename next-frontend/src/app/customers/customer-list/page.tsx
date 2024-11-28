'use client';

import React from 'react';
import CustomerListTable from './customer-list-table';

const Page: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-center">Listagem de Clientes</h1>
      <CustomerListTable />
    </div>
  );
};

export default Page;
