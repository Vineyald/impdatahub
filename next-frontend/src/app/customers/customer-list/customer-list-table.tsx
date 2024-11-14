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
  getKeyValue,
  SortDescriptor,
} from '@nextui-org/react';
import Link from 'next/link';

interface Client {
  id: number;
  nome: string;
  ultima_compra: string;
  dias_inativo: number;
  tipo_pessoa: string | null;
}

const CustomerListTable: React.FC = () => {
  const [page, setPage] = useState(1);
  const [clients, setClients] = useState<Client[]>([]);
  const rowsPerPage = 20;
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'nome',
    direction: 'ascending',
  });
  const handleSortChange = (descriptor: SortDescriptor) => {
    setSortDescriptor(descriptor); // Now the type matches
    setPage(1); // Reset page to 1 on sort change
  };

  useEffect(() => {
    const storedClients = sessionStorage.getItem('inactiveClients');
    if (storedClients) {
      setClients(JSON.parse(storedClients));
    }
  }, []);

  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => {
      const first = a[sortDescriptor.column as keyof Client] ?? ''; // Default to empty string
      const second = b[sortDescriptor.column as keyof Client] ?? ''; // Default to empty string
  
      let cmp = first < second ? -1 : 1;
      if (sortDescriptor.direction === 'descending') {
        cmp *= -1;
      }
      return cmp;
    });
  }, [clients, sortDescriptor]);

  const paginatedClients = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return sortedClients.slice(start, end);
  }, [page, sortedClients]);

  const renderCell = useCallback((client: Client, columnKey: keyof Client) => {
    const cellValue = getKeyValue(client, columnKey);
    return <span>{cellValue}</span>;
  }, []);

  return (
    <div>
      <Table
        aria-label="Tabela de Clientes"
        sortDescriptor={sortDescriptor}
        onSortChange={handleSortChange}
        bottomContent={
          <Pagination
            isCompact
            showControls
            showShadow
            color="secondary"
            page={page}
            total={Math.ceil(clients.length / rowsPerPage)}
            onChange={(page) => setPage(page)}
          />
        }
      >
        <TableHeader>
          <TableColumn key="nome" allowsSorting>
            Nome
          </TableColumn>
          <TableColumn key="ultima_compra" allowsSorting>
            Última Compra
          </TableColumn>
          <TableColumn key="dias_inativo" allowsSorting>
            Dias Inativos
          </TableColumn>
          <TableColumn key="tipo_pessoa" allowsSorting>
            Tipo Pessoa
          </TableColumn>
        </TableHeader>
        <TableBody items={paginatedClients}>
          {(client) => (
            <TableRow key={client.id}>
              {(columnKey) => (
                <TableCell>
                  <Link href={`/customers/customer-profile/${client.id}`}>
                    {renderCell(client, columnKey as keyof Client)}
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

export default CustomerListTable;
