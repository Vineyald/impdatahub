'use client'

// app/inactive_clients/page.js
import { Spacer } from '@nextui-org/react';
import dynamic from 'next/dynamic';

const RankingClientsTable = dynamic(() => import('./ranking-customers-table'), {
  ssr: false,
});

export default function InactiveClients() {
  return (
    <div>
      <Spacer y={10} />
      <div className="container mx-auto">
        <div className="items-center text-center">
          <p className="text-5xl font-bold">Top 20 clientes que mais compram</p>
        </div>
      </div>
      <Spacer y={5} />
      <RankingClientsTable />
    </div>
  );
}
