// pages/InactiveClients.js
import React from 'react';
import RankingClientsTable from '../components/RankingClientsTable';

const InactiveClients = () => {
    return (
        <div>
            <div class="container-fluid">
                <div class="text-center ">
                    <p class="fs-1 fw-bold text-capitalize">Top 20 Clientes</p>
                </div>
            </div>
            <RankingClientsTable />
        </div>
    );
};

export default InactiveClients;
