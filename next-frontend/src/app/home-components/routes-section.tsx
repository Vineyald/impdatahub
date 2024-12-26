import { Card, CardBody, CardHeader, Divider } from '@nextui-org/react';
import RotasListTable from '@/app/userpages/routes-list/page';

const RoutesSection = () => {
  return (
    <div className="col-span-3">
      <div className="text-white text-center">
        <h1 className="text-3xl font-bold">Resumo das rotas</h1>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-6">
        <div className="col-span-2 text-white">
          <RotasListTable />
        </div>
        <div className="flex h-full">
          <Divider orientation="vertical" className="self-stretch bg-gray-500 w-px mr-3" />
          <div className="flex flex-col gap-4 flex-grow h-full">
            <Card className="bg-gray-800 text-white p-4 rounded-lg shadow-md flex-grow">
              <CardHeader>
                <h2 className="text-lg font-semibold">Card 1</h2>
              </CardHeader>
              <CardBody>
                <p>Detalhes do Card 1.</p>
              </CardBody>
            </Card>
            <Card className="bg-gray-800 text-white p-4 rounded-lg shadow-md flex-grow">
              <CardHeader>
                <h2 className="text-lg font-semibold">Card 2</h2>
              </CardHeader>
              <CardBody>
                <p>Detalhes do Card 2.</p>
              </CardBody>
            </Card>
            <Card className="bg-gray-800 text-white p-4 rounded-lg shadow-md flex-grow">
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

export default RoutesSection;
