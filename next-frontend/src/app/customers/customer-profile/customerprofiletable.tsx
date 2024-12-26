'use client';

import React, { useState, useMemo, useCallback } from 'react';
import TableHandler from '@/components/table-components/table';
import { SortDescriptor, Chip, Link} from '@nextui-org/react';
import { applyFilters } from '@/components/utility/process-filters';

interface PurchasesData {
  id: string;
  data_compra: string;
  produto: string;
  sku: string;
  quantidade_produto: number;
  preco_unitario: number;
  valor_desconto: number;
  valor_total: number;
  frete: number;
  preco_final: number;
  situacao: string;
  preco_desconto?: number;
}

interface ClientProfileTableProps {
  purchases: PurchasesData[];
}

const ClientProfileTable: React.FC<ClientProfileTableProps> = ({ purchases }) => {
  const [filteredPurchases, setFilteredPurchases] = useState<PurchasesData[]>(purchases);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'data_compra',
    direction: 'descending',
  });

  const statusColorMap: { [key: string]: "success" | "danger" | "warning" | "primary" | "default" } = {
    Entregue: "success",
    Enviado: "warning",
    Faturado: "warning",
    Cancelado: "danger",
  };

  // Função de ordenação e cálculo de desconto
  const calculatedPurchases = useMemo(() => {
    return purchases.map((purchase) => {
      const precoDesconto = purchase.preco_unitario - (purchase.preco_unitario * (purchase.valor_desconto / 100));
      return { ...purchase, preco_desconto: precoDesconto };
    });
  }, [purchases]);

  // Aplicando filtros
    const handleFilterChange = useCallback(
      (filterStates: Record<string, string | boolean | [(string | undefined)?, (string | undefined)?]>) => {
        const refinedStates = Object.entries(filterStates).reduce((acc, [key, value]) => {
          acc[key] = Array.isArray(value) ? value.map(String) : [String(value)];
          return acc;
        }, {} as Record<string, string[]>);
  
        const filteredData = applyFilters<PurchasesData>(calculatedPurchases, refinedStates);
        setFilteredPurchases(filteredData);
      },
      [calculatedPurchases]
    );

  // Format Brazilian Date (DD/MM/YYYY)
  const formatDate = (date: string) => {
    const parsedDate = new Date(date);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(parsedDate);
  };

  // Função de renderização das células
  const renderCell = useCallback((purchase: PurchasesData, columnKey: keyof PurchasesData) => {
    switch (columnKey) {
      case 'data_compra':
        return <span>{formatDate(purchase.data_compra)}</span>;
      case 'produto':
        return (
          <Link
            href={`/products/product-page/${purchase.sku}`}
            className="text-pink-600 decoration-2 hover:underline decoration-pink-500 text-inherit"
          >
            {purchase.produto}
          </Link>
        );
      
      case 'preco_desconto':
        return (
          <span>
            R$ {purchase.preco_desconto ? purchase.preco_desconto.toFixed(2) : 'N/A'}
          </span>
        )
      case 'valor_total':
      case 'preco_unitario':
      case 'preco_final':
        return (
          <span>
            R$ {Number(purchase[columnKey as keyof PurchasesData]).toFixed(2)}
          </span>
        );
      case 'situacao':
        const statusColor = statusColorMap[purchase.situacao] || "default"; // Fallback seguro
        return <Chip color={statusColor} size="sm" variant="flat">{purchase.situacao}</Chip>;
      default:
        return <span>{purchase[columnKey as keyof PurchasesData] ?? 'N/A'}</span>;
    }
  }, [statusColorMap]);

  // Definindo colunas visíveis
  const visibleColumns = useMemo(
    () => [
      { columnKey: 'id', label: 'Número da Venda', visible: true, sortable: true },
      { columnKey: 'data_compra', label: 'Data da Compra', visible: true, sortable: true },
      { columnKey: 'produto', label: 'Produto', visible: true, sortable: true },
      { columnKey: 'quantidade_produto', label: 'Quantidade', visible: true, sortable: true },
      { columnKey: 'preco_unitario', label: 'Preço Unitário', visible: true, sortable: true },
      { columnKey: 'preco_desconto', label: 'Valor com Desconto', visible: true, sortable: true },
      { columnKey: 'valor_total', label: 'Preço Total', visible: true, sortable: true },
      { columnKey: 'frete', label: 'Frete', visible: true, sortable: true },
      { columnKey: 'preco_final', label: 'Preço Final', visible: true, sortable: true },
      { columnKey: 'situacao', label: 'Situação', visible: true, sortable: true },
    ],
    []
  );

  return (
    <div>
      <TableHandler
        data={filteredPurchases}
        idKey={['id', 'produto']} // Pass as an array
        filters={[
          { field: 'input', controlfield: 'produto', placeholder: 'Filtrar pelo produto', className: 'col-span-8' },
          { field: 'input', controlfield: 'situacao', placeholder: 'Filtrar pela situação', className: 'col-span-8' },
          { field: 'comparator', type: 'date', controlfield: 'data_compra', placeholder: 'Filtrar pela data', className: 'col-span-8' },
        ]}
        columns={visibleColumns}
        className="mx-auto md:w-[95%]"
        sortDescriptor={sortDescriptor}
        onSortChange={setSortDescriptor}
        onFilterStatesChange={handleFilterChange}
        renderCell={(item: PurchasesData, columnKey: keyof PurchasesData) => renderCell(item, columnKey)}
      />
    </div>
  );
};

export default ClientProfileTable;
