import React from 'react';
import InactiveClientsChart from '../components/InactiveClientsChart';

function InactiveClients() {
  return (
    <div>
        <div class="container-fluid">
            <div class="text-center ">
                <p class="fs-1 fw-bold text-capitalize">Clientes Inativos</p>
            </div>
        </div>
        <InactiveClientsChart />
    </div>
  );
}

export default InactiveClients;
