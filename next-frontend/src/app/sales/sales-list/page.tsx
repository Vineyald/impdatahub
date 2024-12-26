'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import axios from 'axios';
import TableHandler from '@/components/table-components/table';
import { SortDescriptor, Link, Spacer } from '@nextui-org/react';
import { applyFilters } from '@/components/utility/process-filters';

interface ItemVenda {
  id_item_venda: number;
  produto: string;
  quantidade_produto: number;
  valor_unitario: number;
  valor_total: number;
  valor_desconto: number;
  preco_final: number;
  loja: string;
}

interface Venda {
  id: number;
  numero: number;
  canal_venda: string;
  data_compra: string;
  situacao: string;
  loja: string;
  itens_venda: ItemVenda[];
}

// Define the API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL;

const SellListTable: React.FC = () => {
  const [sells, setSells] = useState<Venda[]>([]);
  const [filteredSells, setFilteredSells] = useState<Venda[]>([]);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'data_compra',
    direction: 'ascending',
  });

  // Define visible columns
  const visibleColumns = useMemo(() => [
    { columnKey: 'numero', label: 'Número do Pedido', visible: true, sortable: true },
    { columnKey: 'data_compra', label: 'Data da Compra', visible: true, sortable: true },
    { columnKey: 'situacao', label: 'Situação', visible: true, sortable: true },
    { columnKey: 'loja', label: 'Loja', visible: true, sortable: true },
    { columnKey: 'canal_venda', label: 'Canal de Venda', visible: true, sortable: true },
    { columnKey: 'itens_venda', label: 'Itens', visible: true, sortable: false },
  ], []);

  // Fetch data from API
  const fetchSells = useCallback(async () => {
    try {
      const response = await axios.get<Venda[]>(`${API_URL}/vendas/`);
      setSells(response.data);
    } catch (error) {
      console.error('Erro ao buscar dados das vendas:', error);
    }
  }, []);

  useEffect(() => {
    fetchSells();
  }, [fetchSells]);

  // Apply filters whenever sells change
  useEffect(() => {
    const filteredData = applyFilters<Venda>(sells, {});
    setFilteredSells(filteredData);
  }, [sells]);

  // Handle filter changes
  const handleFilterChange = useCallback((filterStates: Record<string, string | boolean | [(string | undefined)?, (string | undefined)?]>) => {
    const refinedStates = Object.fromEntries(
      Object.entries(filterStates).map(([key, value]) => [key, value])
    );
    const filteredData = applyFilters<Venda>(sells, refinedStates);
    setFilteredSells(filteredData);
  }, [sells]);

  // Render cell content
  const renderCell = useCallback((row: Venda, columnKey: string) => {
    switch (columnKey) {
      case 'numero':
        return (
          <Link
            href={`/sells/sell-details/${row.id}`}
            className="text-blue-600 decoration-2 hover:underline decoration-blue-500 text-inherit"
          >
            Pedido #{row.numero}
          </Link>
        );
      case 'itens_venda':
        return (
          <ul className="list-disc pl-4">
            {row.itens_venda.map((item) => (
              <li key={item.id_item_venda}>
                <Link
                  href={`/products/product-details/${item.id_item_venda}`}
                  className="text-blue-600 decoration-2 hover:underline decoration-blue-500 text-inherit"
                >
                  {item.produto} - {item.quantidade_produto} x R${Number(item.valor_unitario).toFixed(2)} = R${Number(item.valor_total).toFixed(2)}
                </Link>
              </li>
            ))}
          </ul>
        );
      default:
        return <span>{row[columnKey as keyof Venda]?.toString() || 'N/A'}</span>;
    }
  }, []);

  return (
    <div className="container mx-auto">
      <Spacer y={10} />
      <TableHandler
        data={filteredSells}
        idKey={['numero', 'id']}
        filters={[
          { field: 'input', controlfield: 'numero', placeholder: 'Número do Pedido', className: 'col-span-8' },
          { field: 'input', controlfield: 'loja', placeholder: 'Loja', className: 'col-span-8' },
          { field: 'input', controlfield: 'situacao', placeholder: 'Situação', className: 'col-span-4' },
          { field: 'input', controlfield: 'canal_venda', placeholder: 'Canal de Venda', className: 'col-span-4' },
        ]}
        columns={visibleColumns}
        className="container mx-auto"
        sortDescriptor={sortDescriptor}
        onSortChange={setSortDescriptor}
        onFilterStatesChange={handleFilterChange}
        renderCell={renderCell}
      />
    </div>
  );
};

export default SellListTable;
