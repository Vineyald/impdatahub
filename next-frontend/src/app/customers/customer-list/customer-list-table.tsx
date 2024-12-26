'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import TableHandler from '@/components/table-components/table';
import { SortDescriptor, Link, Spacer } from '@nextui-org/react';
import { applyFilters } from '@/components/utility/process-filters';

// Define the ClientInfo interface
interface ClientInfo {
  id: number;
  nome: string;
  tipo_pessoa: string;
  cidade: string;
  estado: string;
  situacao: string;
  ultima_compra: string | null;
  canal: string;
  limite_credito: number;
  vendedor: string;
  purchases: Purchase[];
  rota: string;
}

interface Purchase {
  id: string;
  descricao: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const CustomerListTable: React.FC = () => {
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientInfo[]>([]);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'nome',
    direction: 'ascending',
  });

  // Fetch client data
  const fetchClients = useCallback(async () => {
    try {
      const response = await axios.get<ClientInfo[]>(`${API_URL}/clientes_listagem/`);
      if (Array.isArray(response.data)) setClients(response.data);
    } catch (error) {
      console.error('Error fetching client data:', error);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    setFilteredClients(clients);
  }, [clients]);

  const handleFilterChange = useCallback(
    (
      filterStates: Record<
        string,
        string | boolean | [(string | undefined)?, (string | undefined)?] | string[]
      >
    ) => {
      console.log("filterStates", filterStates);
  
      const refinedStates = Object.entries(filterStates).reduce((acc, [key, value]) => {
        console.log("filters", key, value);
  
        if (key === "tags" && Array.isArray(value)) {
          const tagValues = value
            .filter((v) => v !== undefined && v.trim() !== "") // Remove invalid values
            .map((v) => v?.trim().toLowerCase()); // Normalize tags
          if (tagValues.length > 0) {
            acc["purchases.descricao"] = tagValues; // Map tags to purchases.descricao
          }
        } else if (value && value !== "") {
          // Process other filters
          acc[key] = Array.isArray(value)
            ? value.map((v) => String(v).toLowerCase())
            : [String(value).toLowerCase()];
        }
  
        return acc;
      }, {} as Record<string, unknown>);
  
      console.log("refinedStates", refinedStates);
  
      // Apply the refined filter states
      const filteredData = applyFilters<ClientInfo>(
        clients,
        refinedStates,
        "purchases.descricao" // Pass tagControl
      );
  
      console.log("filteredData", filteredData);
      setFilteredClients(filteredData);
    },
    [clients]
  );
  

  const formatDate = (date: string) => {
    const parsedDate = new Date(date);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(parsedDate);
  };

  // Generate a list of unique product names
  const uniqueProducts = useMemo(() => {
    const products = clients.flatMap((client) =>
      client.purchases.map((purchase) => purchase.descricao)
    );
    return [...new Set(products)];
  }, [clients]);

  // Render table cell content
  const renderCell = useCallback((client: ClientInfo, columnKey: keyof ClientInfo) => {
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
  
      case 'purchases':
        const uniquePurchases = Array.from(
          new Map(client.purchases.map((purchase) => [purchase.id, purchase])).values()
        );
      
        return (
          <span>
            {uniquePurchases.map((purchase, index) => (
              <React.Fragment key={purchase.id}>
                <Link
                  href={`/products/product-details/${purchase.id}`}
                  className="decoration-2 hover:underline decoration-blue-500 text-default-600"
                >
                  {purchase.id}
                </Link>
                {index < uniquePurchases.length - 1 && ', '}
              </React.Fragment>
            ))}
          </span>
        );

      case 'ultima_compra':
        return (
          <span>
            {client.ultima_compra !== null && client.ultima_compra !== undefined
              ? formatDate(client.ultima_compra)
              : 'N/A'}
          </span>
        )
      default:
        return (
          <span>
            {client[columnKey] !== null && client[columnKey] !== undefined
              ? client[columnKey].toString()
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/\b\w/g, (l) => l.toUpperCase())
              : 'N/A'}
          </span>
        );
    }
  }, []);
  
  // Define visible columns
  const visibleColumns = useMemo(
    () => [
      { columnKey: 'nome', label: 'Nome', visible: true, sortable: true },
      { columnKey: 'tipo_pessoa', label: 'Tipo Pessoa', visible: true, sortable: true },
      { columnKey: 'cidade', label: 'Cidade', visible: true, sortable: true },
      { columnKey: 'estado', label: 'Estado', visible: true, sortable: true },
      { columnKey: 'situacao', label: 'Situação', visible: true, sortable: true },
      { columnKey: 'canal', label: 'Canal de Venda', visible: true, sortable: true },
      { columnKey: 'ultima_compra', label: 'Última Compra', visible: true, sortable: true },
      { columnKey: 'purchases', label: 'Compras', visible: false, sortable: false },
      { columnKey: 'rota', label: 'Rota', visible: true, sortable: true },
    ],
    []
  );

  return (
    <div className="mx-auto">
      <Spacer y={10} />
      <TableHandler
        data={filteredClients}
        idKey={['id', 'nome']}
        filters={[
          { field: 'input', controlfield: 'nome', placeholder: 'Filtrar pelo nome', className: 'col-span-8' },
          {
            field: 'select',
            controlfield: 'tipo_pessoa',
            placeholder: 'Tipo Pessoa',
            options: [
              { label: 'Pessoa Física', value: 'F' },
              { label: 'Pessoa Jurídica', value: 'J' },
            ],
            className: 'col-span-8',
          },
          {
            field: 'tags',
            controlfield: 'tags',
            placeholder: 'Filtrar por produtos comprados',
            itemList: uniqueProducts,
            className: 'col-span-8',
          },
          { field: 'input', controlfield: 'cidade', placeholder: 'Filtrar pela cidade', className: 'col-span-4' },
          { field: 'input', controlfield: 'estado', placeholder: 'Filtrar pelo estado', className: 'col-span-4' },
          { field: 'input', controlfield: 'situacao', placeholder: 'Filtrar pela situação', className: 'col-span-8' },
          { field: 'comparator', type: 'date', controlfield: 'ultima_compra', placeholder: 'Filtrar pela data da ultima compra', className: 'col-span-8' }
        ]}
        columns={visibleColumns}
        className="mx-auto max-w-full"
        sortDescriptor={sortDescriptor}
        onSortChange={setSortDescriptor}
        onFilterStatesChange={handleFilterChange}
        renderCell={(item: ClientInfo, columnKey: keyof ClientInfo) => renderCell(item, columnKey)}
      />
    </div>
  );
};

export default CustomerListTable;