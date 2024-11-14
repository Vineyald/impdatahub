'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import {
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
    Pagination,
    getKeyValue,
    Spacer,
} from "@nextui-org/react";
import Link from 'next/link';

const InactiveClientsOverview = () => {
  const [page, setPage] = useState(1);
  const [sortDescriptor, setSortDescriptor] = useState({ column: 'nome', direction: 'ascending' });
  const [inactiveClients, setInactiveClients] = useState([]);
  const rowsPerPage = 20;

  // Carrega os dados do sessionStorage no lado do cliente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const clients = JSON.parse(sessionStorage.getItem('inactiveClients') || '[]');
      setInactiveClients(clients);
    }
  }, []);

  const sortedClients = useMemo(() => {
    return [...inactiveClients].sort((a, b) => {
      const first = a[sortDescriptor.column];
      const second = b[sortDescriptor.column];
      let cmp = first < second ? -1 : 1;

      if (sortDescriptor.direction === "descending") {
        cmp *= -1;
      }

      return cmp;
    });
  }, [inactiveClients, sortDescriptor]);

  const pages = Math.ceil(sortedClients.length / rowsPerPage);

  const paginatedClients = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return sortedClients.slice(start, end);
  }, [page, sortedClients]);

  const handleSortChange = (descriptor) => {
    setSortDescriptor(descriptor);
    setPage(1); // Reset page to 1 on sort change
  };

  const capitalizeText = (text) => {
    if (typeof text !== 'string') return text;
    return text
      .toLowerCase()
      .replace(/(?:^|\s)\S/g, (char) => char.toUpperCase())
      .trim();
  };

  const renderCell = useCallback((client, columnKey) => {
    const cellValue = getKeyValue(client, columnKey);
    return <span>{capitalizeText(cellValue)}</span>;
  }, []);

  return (
    <div>
      <Spacer y={10} />
      <div className="container mx-auto">
        <div className="items-center text-center">
          <p className="text-5xl font-bold">Clientes Inativos Selecionados</p>
        </div>
      </div>
      <Spacer y={5} />
      <Table
        aria-label="Tabela de clientes inativos com paginação e ordenação"
        sortDescriptor={sortDescriptor}
        onSortChange={handleSortChange}
        bottomContent={
          <div className="flex w-full justify-center">
            <Pagination
              isCompact
              showControls
              showShadow
              color="secondary"
              page={page}
              total={pages}
              onChange={(page) => setPage(page)}
            />
          </div>
        }
        classNames={{
          wrapper: "min-h-[222px]",
        }}
        className="md:max-w-5xl 2xl:max-w-screen-2xl mx-auto"
      >
        <TableHeader>
          <TableColumn key="nome" allowsSorting>
            Nome
          </TableColumn>
          <TableColumn key="ultima_compra" allowsSorting>
            Data da Última Comp
          </TableColumn>
          <TableColumn key="dias_inativo" allowsSorting>
            Dias Inativos
          </TableColumn>
        </TableHeader>
        <TableBody items={paginatedClients}>
          {(client) => (
            <TableRow key={`${client.nome}-${client.origem}`}>
              {(columnKey) => (
                <TableCell>
                  <Link href={`/customers/customer-profile/${client.id}`}>
                    {renderCell(client, columnKey)}
                  </Link>
                </TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

const Page = () => (
  <Suspense fallback={<div>Carregando...</div>}>
    <InactiveClientsOverview />
  </Suspense>
);

export default Page;