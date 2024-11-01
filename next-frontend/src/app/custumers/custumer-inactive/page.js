'use client'

// app/inactive_clients/page.js
import InactiveClientsChart from './custumer_inactive_charts';
import { Spacer } from '@nextui-org/react';

export default function InactiveClients() {
  return (
    <div>
      <Spacer y={10} />
      <div className="container mx-auto">
        <div className="items-center text-center">
          <p className="text-5xl font-bold">Clientes Inativos</p>
        </div>
      </div>
      <Spacer y={5} />
      <InactiveClientsChart />
    </div>
  );
}
