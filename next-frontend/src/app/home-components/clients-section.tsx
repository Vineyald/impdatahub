import { Card, CardBody, CardHeader, Divider } from '@nextui-org/react';
import RankingClientsTable from '@/app/customers/customer-ranking/ranking-customers-table';

const ClientsSection = () => {
  return (
    <div className="col-span-3">
      <div className="text-white text-center">
        <h1 className="text-3xl font-bold">Resumo dos clientes</h1>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-3 xl:grid-cols-3 gap-6">
        {/* Tabela */}
        <div className="text-white col-span-2 xl:col-span-2">
          <h2 className="text-2xl font-bold text-center">Top 20 clientes que mais compram</h2>
          <RankingClientsTable />
        </div>

        {/* Divisor e seção dos cartões */}
        <div className="flex h-full">
          <Divider orientation="vertical" className="self-stretch bg-gray-500 w-px mr-3" />
          <div className="flex flex-col gap-4 flex-grow h-full">
            <Card className="card-style text-white p-4 rounded-lg shadow-md flex-grow">
              <CardHeader>
                <h2 className="text-lg font-semibold">Card 1</h2>
              </CardHeader>
              <CardBody>
                <p>Detalhes do Card 1.</p>
              </CardBody>
            </Card>
            <Card className="card-style text-white p-4 rounded-lg shadow-md flex-grow">
              <CardHeader>
                <h2 className="text-lg font-semibold">Card 2</h2>
              </CardHeader>
              <CardBody>
                <p>Detalhes do Card 2.</p>
              </CardBody>
            </Card>
            <Card className="card-style text-white p-4 rounded-lg shadow-md flex-grow">
              <CardHeader>
                <h2 className="text-lg font-semibold">Card 3</h2>
              </CardHeader>
              <CardBody>
                <p>Detalhes do Card 3.</p>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientsSection;
