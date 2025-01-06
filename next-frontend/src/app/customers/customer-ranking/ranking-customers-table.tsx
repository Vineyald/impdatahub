'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import TableHandler from '@/components/table-components/table';
import { SortDescriptor, Link, Spacer, Input } from '@nextui-org/react';
import { applyFilters } from '@/components/utility/process-filters';

// Define the ClientRankingInfo interface
interface ClientRankingInfo {
  id: number;
  nome: string;
  ultima_compra: string | null;
  total_gasto: number;
  numero_compras: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const RankingClientsTable: React.FC = () => {
  const [clients, setClients] = useState<ClientRankingInfo[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientRankingInfo[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'total_gasto',
    direction: 'descending',
  });

  // Fetch client ranking data
  const fetchRankingData = useCallback(async () => {
    try {
      const response = await axios.get<ClientRankingInfo[]>(`${API_URL}/clientes_ranking/`, {
        params: { start_date: startDate, end_date: endDate },
      });
      setClients(response.data || []);
    } catch (error) {
      console.error('Error fetching ranking data:', error);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchRankingData();
  }, [fetchRankingData]);

  useEffect(() => {
    setFilteredClients(clients);
  }, [clients]);

  // Handle filters
  const handleFilterChange = useCallback(
    (filterStates: Record<string, string | boolean | [(string | undefined)?, (string | undefined)?]>) => {
      const refinedStates = Object.entries(filterStates).reduce((acc, [key, value]) => {
        if (Array.isArray(value)) {
          const [start, end] = value.slice(0, 2) as [string | undefined, string | undefined];
          acc[key] = [start, end];
        } else {
          acc[key] = value !== undefined ? value : '';
        }
        return acc;
      }, {} as Record<string, string | boolean | [(string | undefined)?, (string | undefined)?]>);
  
      const filteredData = applyFilters<ClientRankingInfo>(clients, refinedStates);
      setFilteredClients(filteredData);
    },
    [clients]
  );

  // Render table cell content
  const renderCell = useCallback((client: ClientRankingInfo, columnKey: keyof ClientRankingInfo) => {
    switch (columnKey) {
      case 'nome':
        return (
          <Link
            href={`/customers/customer-profile/${client.id}`}
            className="text-blue-600 decoration-2 hover:underline decoration-blue-500 text-inherit"
          >
            {client.nome}
          </Link>
        );
      case 'total_gasto':
        return (
          <span>
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(client.total_gasto)}
          </span>
        );
      case 'ultima_compra':
        return (
          <span>
            {client.ultima_compra
              ? new Intl.DateTimeFormat('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                }).format(new Date(client.ultima_compra))
              : 'N/A'}
          </span>
        );
      default:
        return <span>{client[columnKey] ?? 'N/A'}</span>;
    }
  }, []);

  // Define visible columns
  const visibleColumns = useMemo(
    () => [
      { columnKey: 'nome', label: 'Nome', visible: true, sortable: true },
      { columnKey: 'ultima_compra', label: 'Última Compra', visible: true, sortable: true },
      { columnKey: 'total_gasto', label: 'Total Gasto', visible: true, sortable: true },
      { columnKey: 'numero_compras', label: 'Nº de Compras', visible: true, sortable: true },
    ],
    []
  );

  return (
    <div className="container mx-auto">
      <Spacer y={2} />
      <div className="filters mb-3">
        <div>
          <p className="text-white fs-2 fw-bold text-capitalize">Filtrar registros por período</p>
        </div>
        <div className="flex mb-2">
          <Input
            type="date"
            label="Data inicial"
            onChange={(e) => setStartDate(e.target.value)}
            classNames={{
              base: 'text-white',
              label: '!text-white',
              inputWrapper: 'card-style mr-2',
            }}
            variant="bordered"
          />
          <Input
            type="date"
            label="Data final"
            onChange={(e) => setEndDate(e.target.value)}
            classNames={{
              base: 'text-white',
              label: '!text-white',
              inputWrapper: 'card-style mr-2',
            }}
            variant="bordered"
          />
        </div>
      </div>

      <Spacer y={5} />

      <TableHandler
        data={filteredClients}
        idKey={["id", "nome"]}
        filters={[
          { field: 'input', controlfield: 'nome', placeholder: 'Filtrar pelo nome', className: 'col-span-9' },
          { field: 'input', controlfield: 'ultima_compra', placeholder: 'Filtrar pela última compra', className: 'col-span-9' },
        ]}
        columns={visibleColumns}
        className="mx-auto max-w-full"
        sortDescriptor={sortDescriptor}
        onSortChange={setSortDescriptor}
        onFilterStatesChange={handleFilterChange}
        renderCell={(item: ClientRankingInfo, columnKey: keyof ClientRankingInfo) => renderCell(item, columnKey)}
      />
    </div>
  );
};

export default RankingClientsTable;
