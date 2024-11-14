'use client';

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
  SortDescriptor,
  Chip,
} from "@nextui-org/react";

interface PurchasesData {
  numero_venda: string;
  data_compra: string;
  produto: string;
  quantidade_produto: number;
  preco_unitario: number;
  valor_desconto: number;
  valor_total: number;
  valor_frete: number;
  preco_final: number;
  situacao: string;
}

interface ClientProfileTableProps {
  purchases: PurchasesData[];
}

const ClientProfileTable: React.FC<ClientProfileTableProps> = ({ purchases }) => {
  const [page, setPage] = useState(1);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'numero_venda',
    direction: 'ascending',
  });
  const rowsPerPage = 10;

  const statusColorMap: { [key: string]: "success" | "danger" | "warning" | "primary" | "default" } = {
    Entregue: "success",
    Envidado: "warning",
    Faturado: "warning",
    Cancelado: "danger",
  };

  // Função de ordenação
  const sortedPurchases = useMemo(() => {
    return [...purchases].sort((a, b) => {
      const first = a[sortDescriptor.column as keyof PurchasesData];
      const second = b[sortDescriptor.column as keyof PurchasesData];
      let cmp = first < second ? -1 : 1;

      if (sortDescriptor.direction === "descending") {
        cmp *= -1;
      }

      return cmp;
    });
  }, [purchases, sortDescriptor]);

  const pages = Math.ceil(sortedPurchases.length / rowsPerPage);

  const paginatedPurchases = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return sortedPurchases.slice(start, end);
  }, [page, sortedPurchases]);

  const handleSortChange = (descriptor: SortDescriptor) => {
    setSortDescriptor(descriptor);
    setPage(1); // Reset para a primeira página ao mudar a ordenação
  };

  return (
    <div>
      <Table
        aria-label="Tabela de compras com paginação e ordenação"
        sortDescriptor={sortDescriptor}
        onSortChange={handleSortChange}
        bottomContent={
          <div className="flex w-full justify-center">
            <Pagination
              isCompact
              showControls
              color="secondary"
              page={page}
              total={pages}
              onChange={(page) => setPage(page)}
            />
          </div>
        }
        className="md:w-full 2xl:max-w-screen-2xl mx-auto"
      >
        <TableHeader>
          <TableColumn key="numero_venda" allowsSorting className='max-w-32'>
            Número da Venda
          </TableColumn>
          <TableColumn key="data_compra" allowsSorting className='max-w-32'>
            Data da Compra
          </TableColumn>
          <TableColumn key="produto" className='max-w-32'>Produto</TableColumn>
          <TableColumn key="quantidade_produto" allowsSorting>
            Quantidade
          </TableColumn>
          <TableColumn key="preco_unitario">Preço Unitário</TableColumn>
          <TableColumn key="valor_desconto">Valor com Desconto</TableColumn>
          <TableColumn key="valor_total">Preço Total</TableColumn>
          <TableColumn key="valor_frete">Frete</TableColumn>
          <TableColumn key="preco_final" allowsSorting>
            Preço Final
          </TableColumn>
          <TableColumn key="situacao">Situação</TableColumn>
        </TableHeader>
        <TableBody items={paginatedPurchases}>
          {(purchase) => {
            const statusColor =
              statusColorMap[purchase.situacao] || "default"; // Fallback seguro
            return (
              <TableRow key={`${purchase.numero_venda}-${purchase.produto}`}>
                <TableCell>{purchase.numero_venda}</TableCell>
                <TableCell>{purchase.data_compra}</TableCell>
                <TableCell>{purchase.produto}</TableCell>
                <TableCell>{purchase.quantidade_produto}</TableCell>
                <TableCell>R$ {purchase.preco_unitario}</TableCell>
                <TableCell>R$ {purchase.valor_desconto}</TableCell>
                <TableCell>R$ {purchase.valor_total}</TableCell>
                <TableCell>R$ {purchase.valor_frete}</TableCell>
                <TableCell>R$ {purchase.preco_final}</TableCell>
                <TableCell>
                  <Chip
                    className="capitalize"
                    color={statusColor}
                    size="sm"
                    variant="flat"
                  >
                    {purchase.situacao}
                  </Chip>
                </TableCell>
              </TableRow>
            );
          }}
        </TableBody>
      </Table>
    </div>
  );
};

export default ClientProfileTable;
