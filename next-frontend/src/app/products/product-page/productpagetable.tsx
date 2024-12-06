'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
  SortDescriptor,
  Input,
  Spacer,
  Link,
} from '@nextui-org/react';

interface Venda {
  id_venda: number;
  data_compra: string;
  quantidade_produto: number;
  id_cliente: number;
  nome_cliente: string;
}

interface Produto {
  sku: string;
  descricao: string;
  preco: string;
  preco_promocional: string | null;
  estoque_disponivel: string;
  unidade: string;
  custo: string;
  vendas: Venda[] | null;
}

const ProductSalesTable: React.FC = () => {
  const [products, setProducts] = useState<Produto[]>([]);
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'descricao',
    direction: 'ascending',
  });

  const [filters, setFilters] = useState({
    nome_cliente: '',
    dataInicio: '',
    dataFim: '',
    quantidadeMin: '',
    quantidadeMax: '',
  });

  // Load data from localStorage
  useEffect(() => {
    const productData = localStorage.getItem('productData');
    console.log('Product data:', productData);
    if (productData) {
      const parsedData = JSON.parse(productData);
      setProducts([parsedData.produto]); // Access `produto` directly
    }
  }, []);

  const handleSortChange = (descriptor: SortDescriptor) => {
    setSortDescriptor(descriptor);
    setPage(1);
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const filteredSales = useMemo(() => {
    return products
      .flatMap((product) => product.vendas || []) // Access `vendas` correctly
      .filter((venda) => {
        const { nome_cliente, dataInicio, dataFim, quantidadeMin, quantidadeMax } = filters;

        const isNomeMatch =
          !nome_cliente ||
          venda.nome_cliente.toLowerCase().includes(nome_cliente.toLowerCase());

        const isDataMatch =
          (!dataInicio || new Date(venda.data_compra) >= new Date(dataInicio)) &&
          (!dataFim || new Date(venda.data_compra) <= new Date(dataFim));

        const isQuantidadeMatch =
          (!quantidadeMin || venda.quantidade_produto >= parseInt(quantidadeMin)) &&
          (!quantidadeMax || venda.quantidade_produto <= parseInt(quantidadeMax));

        return isNomeMatch && isDataMatch && isQuantidadeMatch;
      });
  }, [products, filters]);

  // Sort vendas
  const sortedSales = useMemo(() => {
    return [...filteredSales].sort((a, b) => {
      const first = a[sortDescriptor.column as keyof Venda] ?? '';
      const second = b[sortDescriptor.column as keyof Venda] ?? '';

      let cmp = first < second ? -1 : 1;
      if (sortDescriptor.direction === 'descending') {
        cmp *= -1;
      }
      return cmp;
    });
  }, [filteredSales, sortDescriptor]);

  console.log("sortedSales:",sortedSales);

  const paginatedSales = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return sortedSales.slice(start, end);
  }, [page, sortedSales]);

  const renderCell = useCallback((sale: Venda, columnKey: string) => {
    const cellValue = sale[columnKey as keyof Venda];
  
    if (columnKey === 'nome_cliente') {
      return (
        <Link
          href={`/customers/customer-profile/${sale.id_cliente}`}
          className="decoration-2 hover:underline decoration-pink-500 text-inherit"
        >
          {cellValue
            ?.toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\b\w/g, (l) => l.toUpperCase()) || 'N/A'}
        </Link>
      );
    }
    return (
      <span>
        {cellValue
          ?.toString()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\b\w/g, (l) => l.toUpperCase()) || 'N/A'}
      </span>
    );
  }, []);

  console.log("Paginated Sales:", paginatedSales);

  return (
    <div>
      {/* Filters */}
      <div className="container filters md:grid md:grid-cols-4 md:gap-4">
        <Input
          label="Nome do Cliente"
          type="text"
          placeholder="Digite o nome do cliente"
          value={filters.nome_cliente}
          onChange={(e) => handleFilterChange('nome_cliente', e.target.value)}
          className="md:col-span-4"
        />
        <Input
          label="Data Início"
          type="date"
          value={filters.dataInicio}
          onChange={(e) => handleFilterChange('dataInicio', e.target.value)}
          className="md:col-span-1"
        />
        <Input
          label="Data Fim"
          type="date"
          value={filters.dataFim}
          onChange={(e) => handleFilterChange('dataFim', e.target.value)}
          className="md:col-span-1"
        />
        <Input
          label="Quantidade Mínima"
          type="number"
          value={filters.quantidadeMin}
          onChange={(e) => handleFilterChange('quantidadeMin', e.target.value)}
          className="md:col-span-1"
        />
        <Input
          label="Quantidade Máxima"
          type="number"
          value={filters.quantidadeMax}
          onChange={(e) => handleFilterChange('quantidadeMax', e.target.value)}
          className="md:col-span-1"
        />
      </div>

      {/* Table */}
      <Spacer y={10} />
      <Table
        aria-label="Tabela de Produtos"
        sortDescriptor={sortDescriptor}
        onSortChange={handleSortChange}
        bottomContent={
          <Pagination
            isCompact
            showControls
            showShadow
            color="secondary"
            page={page}
            total={Math.ceil(filteredSales.length / rowsPerPage)}
            onChange={(page) => setPage(page)}
          />
        }
        className='container mx-auto'
      >
        <TableHeader>
          <TableColumn key="id" allowsSorting>
            Numero da venda
          </TableColumn>
          <TableColumn key="data_compra" allowsSorting>
            Data
          </TableColumn>
          <TableColumn key="nome_cliente" allowsSorting>
            Cliente
          </TableColumn>
          <TableColumn key="quantidade_produto" allowsSorting>
            Quantidade
          </TableColumn>
        </TableHeader>
        <TableBody items={paginatedSales.map((sale) => ({ ...sale, id: sale.id_venda }))}>
          {(sale) => (
            <TableRow key={sale.id}>
              {(columnKey) => (
                <TableCell>{renderCell(sale, columnKey.toString())}</TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
export default ProductSalesTable;