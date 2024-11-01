// app/inactive_clients/page.js
import InactiveClientsChart from './costumer_inactive_charts';

export default function InactiveClients() {
  return (
    <div>
      <div className="container-fluid">
        <div className="text-center">
          <p className="fs-1 fw-bold text-capitalize">Clientes Inativos</p>
        </div>
      </div>
      <InactiveClientsChart />
    </div>
  );
}
