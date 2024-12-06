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
import axios from 'axios';

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

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const ProductListTable: React.FC = () => {
  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const rowsPerPage = 50;

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'descricao',
    direction: 'ascending',
  });

  const [filters, setFilters] = useState({
    sku: '',
    descricao: '',
    precoMin: '',
    precoMax: '',
    estoqueMin: '',
    estoqueMax: '',
  });

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get<ProductInfo[]>(`${API_URL}/products/`);
      if (Array.isArray(response.data)) {
        setProducts(response.data);
      } else {
        console.error('Unexpected response data:', response.data);
      }
    } catch (error) {
      console.error('Erro ao buscar dados dos produtos:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSortChange = (descriptor: SortDescriptor) => {
    setSortDescriptor(descriptor);
    setPage(1);
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const { sku, descricao, precoMin, precoMax, estoqueMin, estoqueMax } = filters;
      const preco = product.preco;
      const estoque = product.estoque_disponivel;

      const minPreco = precoMin ? parseFloat(precoMin) : null;
      const maxPreco = precoMax ? parseFloat(precoMax) : null;
      const minEstoque = estoqueMin ? parseFloat(estoqueMin) : null;
      const maxEstoque = estoqueMax ? parseFloat(estoqueMax) : null;

      // Filters
      return (
        (!sku || product.sku.toLowerCase().includes(sku.toLowerCase())) &&
        (!descricao || product.descricao.toLowerCase().includes(descricao.toLowerCase())) &&
        (!minPreco || preco >= minPreco) &&
        (!maxPreco || preco <= maxPreco) &&
        (!minEstoque || estoque >= minEstoque) &&
        (!maxEstoque || estoque <= maxEstoque)
      );
    });
  }, [products, filters]);

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      const first = a[sortDescriptor.column as keyof ProductInfo] ?? '';
      const second = b[sortDescriptor.column as keyof ProductInfo] ?? '';

      let cmp = first < second ? -1 : 1;
      if (sortDescriptor.direction === 'descending') {
        cmp *= -1;
      }
      return cmp;
    });
  }, [filteredProducts, sortDescriptor]);

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return sortedProducts.slice(start, end);
  }, [page, sortedProducts]);

  const renderCell = useCallback((product: ProductInfo, columnKey: keyof ProductInfo) => {
    const cellValue = product[columnKey];
    if (columnKey === 'descricao') {
      return (
        <Link
          href={`/products/product-page/${product.sku}`}
          className="decoration-2 hover:underline decoration-pink-500 text-inherit"
        >
          {(cellValue ?? '')
            .toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\b\w/g, (l) => l.toUpperCase())}
        </Link>
      );
    }
    return (
      <span>
        {(cellValue ?? '')
          .toString()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\b\w/g, (l) => l.toUpperCase())}
      </span>
    );
  }, []);   

  return (
    <div>
      {/* Filters */}
      <div className="filters md:grid md:grid-cols-4 md:gap-4">
        <Input
          label="SKU"
          type="text"
          placeholder="Digite o SKU do produto"
          value={filters.sku}
          onChange={(e) => handleFilterChange('sku', e.target.value)}
          className="md:col-span-1"
        />
        <Input
          label="Descrição"
          type="text"
          placeholder="Digite a descrição do produto"
          value={filters.descricao}
          onChange={(e) => handleFilterChange('descricao', e.target.value)}
          className="md:col-span-3"
        />
        <Input
          type="number"
          label="Preço Mín."
          placeholder="Digite o preço mínimo"
          value={filters.precoMin}
          className="md:col-span-2"
          onChange={(e) => handleFilterChange('precoMin', e.target.value)}
        />
        <Input
          type="number"
          label="Preço Máx."
          placeholder="Digite o preço máximo"
          value={filters.precoMax}
          className="md:col-span-2"
          onChange={(e) => handleFilterChange('precoMax', e.target.value)}
        />
        <Input
          type="number"
          label="Estoque Mín."
          placeholder="Digite o estoque mínimo"
          value={filters.estoqueMin}
          className="md:col-span-2"
          onChange={(e) => handleFilterChange('estoqueMin', e.target.value)}
        />
        <Input
          type="number"
          label="Estoque Máx."
          placeholder="Digite o estoque máximo"
          value={filters.estoqueMax}
          className="md:col-span-2"
          onChange={(e) => handleFilterChange('estoqueMax', e.target.value)}
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
            total={Math.ceil(filteredProducts.length / rowsPerPage)}
            onChange={(page) => setPage(page)}
          />
        }
      >
        <TableHeader>
          <TableColumn key="sku" allowsSorting>
            SKU
          </TableColumn>
          <TableColumn key="descricao" allowsSorting>
            Descrição
          </TableColumn>
          <TableColumn key="preco" allowsSorting>
            Preço
          </TableColumn>
          <TableColumn key="estoque_disponivel" allowsSorting>
            Estoque Disponível
          </TableColumn>
          <TableColumn key="unidade">
            Unidade
          </TableColumn>
          <TableColumn key="total_vendido" allowsSorting>
            Total Vendido
          </TableColumn>
          <TableColumn key="numero_vendas" allowsSorting>
            Número de Vendas
          </TableColumn>
        </TableHeader>
        <TableBody items={paginatedProducts}>
          {(product) => (
            <TableRow key={product.sku}>
              {(columnKey) => (
                <TableCell>{renderCell(product, columnKey as keyof ProductInfo)}</TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default ProductListTable;
