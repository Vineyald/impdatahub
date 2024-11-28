'use client';

import {
  Card,
  CardBody,
  CardHeader,
  DateRangePicker,
} from '@nextui-org/react';
import { parseDate } from '@internationalized/date';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';

interface ClientInfo {
  id: number;
  nome: string;
  fantasia: string | null;
  tipo_pessoa: string;
  cpf_cnpj: string;
  email: string | null;
  celular: string | null;
  fone: string | null;
  cep: string | null;
  rota: string | null;
  endereco: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  situacao: string;
  vendedor: string | null;
  contribuinte: boolean;
  codigo_regime_tributario: string;
  limite_credito: number;
  ultima_compra: string | null;
  dias_inativo?: number; // Calculated field
}

interface Purchase {
  numero_venda: string;
  data_compra: string;
  produto: string;
  quantidade_produto: number;
  preco_unitario: number;
  valor_total: number;
  valor_desconto: number;
  frete: number;
  preco_final: number;
  canal: string;
}

interface ClientData {
  info: ClientInfo;
  purchases: Purchase[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function Home() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [dateRange, setDateRange] = useState({
    start: parseDate('2024-04-01'),
    end: parseDate('2024-04-08'),
  });
  const [, setIsLoading] = useState(false);

  const fetchClients = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await axios.get<ClientData[]>(`${API_URL}/clientes_listagem/`);
      if (Array.isArray(response.data)) {
        setClients(response.data);
      }
    } catch (error) {
      console.error('Erro ao buscar dados dos clientes:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const calculateMetrics = (clients: ClientData[]) => {
    const filteredClients = clients.map(client => ({
      ...client,
      purchases: client.purchases.filter(purchase => {
        const purchaseDate = new Date(purchase.data_compra);
        return (
          purchaseDate >= new Date(dateRange.start.toString()) &&
          purchaseDate <= new Date(dateRange.end.toString())
        );
      }),
    }));

    const pdvSales = filteredClients
      .filter(client => client.info.situacao !== 'cancelado')
      .reduce((sum, client) =>
        sum + client.purchases.filter(purchase => purchase.canal === 'Pdv').reduce((acc, purchase) => acc + purchase.valor_total, 0),
        0
      );

    const ecommerceSales = filteredClients
      .filter(client => client.info.situacao !== 'cancelado')
      .reduce((sum, client) =>
        sum + client.purchases.filter(purchase => purchase.canal !== 'Pdv').reduce((acc, purchase) => acc + purchase.valor_total, 0),
        0
      );

    const canceledSales = filteredClients
      .filter(client => client.info.situacao === 'cancelado')
      .reduce((sum, client) =>
        sum + client.purchases.filter(purchase => purchase.canal === 'Pdv').reduce((acc, purchase) => acc + purchase.valor_total, 0),
        0
      );

    return { pdvSales, ecommerceSales, canceledSales };
  };

  const metrics = calculateMetrics(clients);

  return (
    <div className="p-4">
      {/* Filtro de Intervalo de Datas */}
      <div className="mb-4">
        <DateRangePicker
          label="Período de vendas"
          isRequired
          value={dateRange}
          onChange={setDateRange}
          className="max-w-xs"
        />
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1 - Ecommerce */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-bold">Ecommerce Sales</h2>
          </CardHeader>
          <CardBody>
            <p>Total:</p>
            <h3 className="text-xl font-semibold text-green-600">
              R$ {metrics.ecommerceSales.toFixed(2)}
            </h3>
          </CardBody>
        </Card>

        {/* Card 2 - PDV */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-bold">PDV Sales</h2>
          </CardHeader>
          <CardBody>
            <p>Total:</p>
            <h3 className="text-xl font-semibold text-blue-600">
              R$ {metrics.pdvSales.toFixed(2)}
            </h3>
          </CardBody>
        </Card>

        {/* Card 3 - Canceled Sales */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-bold">Canceled Sales</h2>
          </CardHeader>
          <CardBody>
            <p>Total:</p>
            <h3 className="text-xl font-semibold text-red-600">
              R$ {metrics.canceledSales.toFixed(2)}
            </h3>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
