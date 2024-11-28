'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Spacer,
  Input,
} from "@nextui-org/react";
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const RankingClientsTable = () => {
  const [data, setData] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortDescriptor, setSortDescriptor] = useState({ column: 'total_gasto', direction: 'descending' });

  // Fetch data from API
  const fetchRankingData = () => {
    axios
      .get(`${API_URL}/clientes_ranking/`, {
        params: { start_date: startDate, end_date: endDate },
      })
      .then(response => {
        console.log('Resposta da API:', response.data);
        setData(response.data || []); // Set the full array response
      })
      .catch(error => {
        console.error('Erro ao buscar os dados da API', error);
      });
  };

  useEffect(() => {
    fetchRankingData();
  }, [startDate, endDate]);

  // Sort the data based on the selected descriptor
  const sortedData = useMemo(() => {
    const sorted = [...data];
    return sorted.sort((a, b) => {
      const first = a[sortDescriptor.column];
      const second = b[sortDescriptor.column];
      let cmp = first < second ? -1 : 1;

      if (sortDescriptor.direction === "descending") {
        cmp *= -1;
      }

      return cmp;
    });
  }, [data, sortDescriptor]);

  const handleSortChange = (descriptor) => {
    setSortDescriptor(descriptor);
  };

  const capitalizeText = (text) => {
    if (typeof text !== 'string') return text;
    return text
      .toLowerCase()
      .replace(/(?:^|\s)\S/g, (char) => char.toUpperCase())
      .trim();
  };

  const renderCell = useCallback((client, columnKey) => {
    const cellValue = client[columnKey];

    // Format "total_gasto" column
    if (columnKey === "total_gasto") {
      return (
        <span>
          {new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(cellValue || 0)}
        </span>
      );
    }

    return <span>{capitalizeText(cellValue)}</span>;
  }, []);

  return (
    <div className="container mx-auto">
      <Spacer y={2} />
      <div className="filters mb-3">
        <div>
          <p className="fs-2 fw-bold text-capitalize">Filtrar registros por período</p>
        </div>
        <div className="flex mb-2">
          <Input
            type="date"
            label="Data inicial"
            onChange={(e) => setStartDate(e.target.value)}
            className="mr-2"
          />
          <Input
            type="date"
            label="Data final"
            onChange={(e) => setEndDate(e.target.value)}
            className="mr-2"
          />
        </div>
      </div>

      {/* Tabela Geral */}
      <div className="filters mb-3">
        <div>
          <p className="fs-2 fw-bold text-capitalize">Ranking geral</p>
        </div>
        <Table
          aria-label="Top 20 clientes geral"
          sortDescriptor={sortDescriptor}
          onSortChange={handleSortChange}
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
              Última Compra
            </TableColumn>
            <TableColumn key="total_gasto" allowsSorting>
              Total Gasto
            </TableColumn>
            <TableColumn key="numero_compras" allowsSorting>
              Nº de Compras
            </TableColumn>
          </TableHeader>
          <TableBody items={sortedData}>
            {(client) => (
              <TableRow key={client.id}>
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
    </div>
  );
};

export default RankingClientsTable;
