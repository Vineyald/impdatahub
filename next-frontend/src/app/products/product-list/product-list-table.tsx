'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import TableHandler from '@/components/table-components/table';
import { SortDescriptor, Link, Spacer } from '@nextui-org/react';
import { applyFilters } from '@/components/utility/process-filters';

// Define the Product interface
interface ProductInfo {
  sku: string;
  descricao: string;
  preco: number;
  preco_promocional: number;
  estoque_disponivel: number;
  unidade: string;
  custo: number;
  numero_vendas: number;
  total_vendido: number;
}

// Define the API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// ProductListTable Component
const ProductListTable: React.FC = () => {
  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductInfo[]>([]);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'descricao',
    direction: 'ascending',
  });

  // Fetch product data from the API
  const fetchProducts = useCallback(async () => {
    try {
      const response = await axios.get<ProductInfo[]>(`${API_URL}/products/`);
      if (Array.isArray(response.data)) {
        setProducts(response.data);
      } else {
        console.error('Unexpected response data:', response.data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Initial filter application when data is fetched
  useEffect(() => {
    setFilteredProducts(applyFilters(products, {}));
  }, [products]);

  // Handle filter changes
  const handleFilterChange = useCallback(
    (filterStates: Record<string, string | boolean | [(string | undefined)?, (string | undefined)?]>) => {
      const refinedStates = Object.fromEntries(
        Object.entries(filterStates).map(([key, value]) => [key, value])
      );
      const filteredData = applyFilters<ProductInfo>(products, refinedStates);
      setFilteredProducts(filteredData);
    },
    [products]
  );

  // Render table cell content
  const renderCell = useCallback((product: ProductInfo, columnKey: keyof ProductInfo) => {
    const cellValue = product[columnKey];
    switch (columnKey) {
      case 'descricao':
        return (
          <Link
            href={`/products/product-page/${product.sku}`}
            className="text-blue-600 decoration-2 hover:underline decoration-blue-500 text-inherit"
          >
            {cellValue.toString()}
          </Link>
        );
      case 'preco':
      case 'preco_promocional':
      case 'custo':
      case 'total_vendido':
        return <span>R$ {Number(cellValue).toFixed(2)}</span>;
      default:
        return <span>{cellValue?.toString() ?? 'N/A'}</span>;
    }
  }, []);

  // Define visible columns
  const visibleColumns = [
    { columnKey: 'sku', label: 'SKU', visible: true, sortable: true },
    { columnKey: 'descricao', label: 'Descrição', visible: true, sortable: true },
    { columnKey: 'preco', label: 'Preço', visible: true, sortable: true },
    { columnKey: 'estoque_disponivel', label: 'Estoque Disponível', visible: true, sortable: true },
    { columnKey: 'unidade', label: 'Unidade', visible: true, sortable: false },
    { columnKey: 'total_vendido', label: 'Total Vendido', visible: true, sortable: true },
    { columnKey: 'numero_vendas', label: 'Número de Vendas', visible: true, sortable: true },
  ];

  return (
    <div className="mx-auto">
      <Spacer y={10} />
      <TableHandler
        data={filteredProducts}
        idKey={['sku', 'descricao']}
        filters={[
          { field: 'input', controlfield: 'sku', placeholder: 'Filtre pelo SKU', className: 'col-span-9' },
          { field: 'input', controlfield: 'descricao', placeholder: 'Filtre pela descrição', className: 'col-span-9' },
          { field: 'input', controlfield: 'preco', placeholder: 'Preço', className: 'col-span-4' },
          { field: 'input', controlfield: 'estoque_disponivel', placeholder: 'Estoque Disponível', className: 'col-span-5' },
        ]}
        columns={visibleColumns}
        className="max-w-full"
        sortDescriptor={sortDescriptor}
        onSortChange={setSortDescriptor}
        onFilterStatesChange={handleFilterChange}
        renderCell={renderCell}
      />
    </div>
  );
};

export default ProductListTable;
