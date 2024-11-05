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
import { getKeyValue } from '@nextui-org/react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const RankingClientsTable = () => {
  const [data, setData] = useState({ Geral: [], Servi: [], Imp: [] });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortDescriptor, setSortDescriptor] = useState({ column: 'total_gasto', direction: 'descending' });

  const fetchRankingData = () => {
    axios.get(`${API_URL}/clientes_ranking/`, { params: { start_date: startDate, end_date: endDate } })
      .then(response => {
        setData({
          Geral: response.data.Geral || [],
          Servi: response.data.Servi || [],
          Imp: response.data.Imp || [],
        });
      })
      .catch(error => {
        console.error('Erro ao buscar os dados da API', error);
      });
  };

  useEffect(() => {
    fetchRankingData();
  }, [startDate, endDate]);

  const sortedGeral = useMemo(() => {
    const allClients = [...data.Geral];
    return allClients.sort((a, b) => {
      const first = a[sortDescriptor.column];
      const second = b[sortDescriptor.column];
      let cmp = first < second ? -1 : 1;

      if (sortDescriptor.direction === "descending") {
        cmp *= -1;
      }

      return cmp;
    });
  }, [data, sortDescriptor]);

  const sortedImp = useMemo(() => {
    const allClients = [...data.Imp];
    return allClients.sort((a, b) => {
      const first = a[sortDescriptor.column];
      const second = b[sortDescriptor.column];
      let cmp = first < second ? -1 : 1;

      if (sortDescriptor.direction === "descending") {
        cmp *= -1;
      }

      return cmp;
    });
  }, [data, sortDescriptor]);

  const sortedServi = useMemo(() => {
    const allClients = [...data.Servi];
    return allClients.sort((a, b) => {
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
    const cellValue = getKeyValue(client, columnKey);
  
    // Verifica se a coluna é 'total_gasto' para formatar em BRL
    if (columnKey === "total_gasto") {
      return (
        <span>
          {new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL"
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
          aria-label="Top 20 clientes geral (Servi e Império)"
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
            <TableColumn key="ultima_compra_imp" allowsSorting>
                Última Comp. Imp
            </TableColumn>
            <TableColumn key="ultima_compra_servi" allowsSorting>
                Última Comp. Servi
            </TableColumn>
            <TableColumn key="total_gasto" allowsSorting>
                Total Gasto
            </TableColumn>
          </TableHeader>
          <TableBody items={sortedGeral}>
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

      {/* Tabelas Imp e Servi */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div>
            <p className="fs-2 fw-bold text-capitalize">Ranking Império</p>
          </div>
          <Table aria-label="Ranking Império" className="custom_table">
            <TableHeader>
                <TableColumn key="nome" allowsSorting>
                    Nome
                </TableColumn>
                <TableColumn key="ultima_compra" allowsSorting>
                    Última Comp.
                </TableColumn>
                <TableColumn key="total_gasto" allowsSorting>
                    Total Gasto
                </TableColumn>
            </TableHeader>
            <TableBody items={sortedImp}>
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
        <div>
          <div>
            <p className="fs-2 fw-bold text-capitalize">Ranking Servi</p>
          </div>
          <Table aria-label="Ranking Servi" className="custom_table">
            <TableHeader>
                <TableColumn key="nome" allowsSorting>
                    Nome
                </TableColumn>
                <TableColumn key="ultima_compra" allowsSorting>
                    Última Comp.
                </TableColumn>
                <TableColumn key="total_gasto" allowsSorting>
                    Total Gasto
                </TableColumn>
            </TableHeader>
            <TableBody items={sortedServi}>
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
    </div>
  );
};

export default RankingClientsTable;
