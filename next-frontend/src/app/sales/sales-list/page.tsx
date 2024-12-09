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

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const SellListTable: React.FC = () => {
  const [sells, setSells] = useState<Venda[]>([]);
  const [, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const rowsPerPage = 50;

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'data_compra',
    direction: 'ascending',
  });

  const [filters, setFilters] = useState({
    numero: '',
    loja: '',
    situacao: '',
    canal: '',
  });

  const fetchSells = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get<Venda[]>(`${API_URL}/vendas/`);
      if (Array.isArray(response.data)) {
        setSells(response.data);
      } else {
        console.error('Unexpected response data:', response.data);
      }
    } catch (error) {
      console.error('Erro ao buscar dados das vendas:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSells();
  }, [fetchSells]);

  const handleSortChange = (descriptor: SortDescriptor) => {
    setSortDescriptor(descriptor);
    setPage(1);
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const filteredSells = useMemo(() => {
    return sells.filter((sell) => {
      const { numero, loja, situacao, canal } = filters;

      return (
        (!numero || sell.numero.toString().includes(numero)) &&
        (!loja || sell.loja.toLowerCase().includes(loja.toLowerCase())) &&
        (!situacao || sell.situacao.toLowerCase().includes(situacao.toLowerCase())) &&
        (!canal || sell.canal_venda.toLowerCase().includes(canal.toLowerCase()))
      );
    });
  }, [sells, filters]);

  const sortedSells = useMemo(() => {
    return [...filteredSells].sort((a, b) => {
      const first = a[sortDescriptor.column as keyof Venda] ?? '';
      const second = b[sortDescriptor.column as keyof Venda] ?? '';

      let cmp = first < second ? -1 : 1;
      if (sortDescriptor.direction === 'descending') {
        cmp *= -1;
      }
      return cmp;
    });
  }, [filteredSells, sortDescriptor]);

  const paginatedSells = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return sortedSells.slice(start, end);
  }, [page, sortedSells]);

  const renderCell = useCallback((sell: Venda, columnKey: keyof Venda) => {
    const cellValue = sell[columnKey];

    if (columnKey === 'numero' && (typeof cellValue === 'string' || typeof cellValue === 'number')) {
      return (
        <Link
          href={`/sells/sell-details/${sell.id}`}
          className="decoration-2 hover:underline decoration-blue-500 text-inherit"
        >
          Pedido #{cellValue}
        </Link>
      );
    }

    if (columnKey === ('preco_final' as keyof Venda)) {
      const firstItem = sell.itens_venda[0];
      if (firstItem) {
        return (
          <span>
            R$ {parseFloat(firstItem.preco_final?.toString() || '0').toFixed(2)}
          </span>
        );
      }
      return <span>N/A</span>;
    }

    if (columnKey === 'itens_venda' && Array.isArray(cellValue)) {
      return (
        <ul>
          {cellValue.map((item, index) => (
            <li key={index}>
              <Link
                className="decoration-2 hover:underline decoration-pink-500 text-inherit"
                href={`/products/product-page/${item.produto}`}
              >
                Produto: {item.produto}
              </Link>
              , Quantidade: {item.quantidade_produto}, Valor: R$ {parseFloat(item.valor_total.toString()).toFixed(2)}
            </li>
          ))}
        </ul>
      );
    }

    if (typeof cellValue === 'string' || typeof cellValue === 'number') {
      return (
        <span>
          {cellValue
            .toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/\b\w/g, (l) => l.toUpperCase())}
        </span>
      );
    }

    return <span>N/A</span>;
  }, []);

  return (
    <div>
      <div className="mt-4 filters md:grid md:grid-cols-4 md:gap-4">
        <Input
          label="Número do Pedido"
          type="text"
          placeholder="Digite o número do pedido"
          value={filters.numero}
          onChange={(e) => handleFilterChange('numero', e.target.value)}
          className="md:col-span-1"
        />
        <Input
          label="Loja"
          type="text"
          placeholder="Digite o nome da loja"
          value={filters.loja}
          onChange={(e) => handleFilterChange('loja', e.target.value)}
          className="md:col-span-1"
        />
        <Input
          label="Situação"
          type="text"
          placeholder="Digite a situação do pedido"
          value={filters.situacao}
          onChange={(e) => handleFilterChange('situacao', e.target.value)}
          className="md:col-span-1"
        />
        <Input
          label="Canal de Venda"
          type="text"
          placeholder="Digite o canal de venda"
          value={filters.canal}
          onChange={(e) => handleFilterChange('canal', e.target.value)}
          className="md:col-span-1"
        />
      </div>

      <Spacer y={10} />
      <Table
        aria-label="Tabela de Vendas"
        sortDescriptor={sortDescriptor}
        onSortChange={handleSortChange}
        selectionMode="single"
        bottomContent={
          <Pagination
            isCompact
            showControls
            showShadow
            color="secondary"
            page={page}
            total={Math.ceil(filteredSells.length / rowsPerPage)}
            onChange={(page) => setPage(page)}
          />
        }
      >
        <TableHeader>
          <TableColumn key="numero" allowsSorting>
            Número do Pedido
          </TableColumn>
          <TableColumn key="data_compra" allowsSorting>
            Data da Compra
          </TableColumn>
          <TableColumn key="preco_final" allowsSorting>
            Valor Total
          </TableColumn>
          <TableColumn key="situacao" allowsSorting>
            Situação
          </TableColumn>
          <TableColumn key="loja" allowsSorting>
            Loja
          </TableColumn>
          <TableColumn key="canal_venda" allowsSorting>
            Canal de Venda
          </TableColumn>
          <TableColumn key="itens_venda" allowsSorting>
            Itens
          </TableColumn>
        </TableHeader>
        <TableBody items={paginatedSells}>
        {(sell) => (
            <TableRow key={sell.id}>
            {(columnKey) => (
                <TableCell>{renderCell(sell, columnKey as keyof Venda)}</TableCell>
            )}
            </TableRow>
        )}
        </TableBody>
      </Table>
    </div>
  );
};

export default SellListTable;