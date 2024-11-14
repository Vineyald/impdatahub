'use client';

import React, { useEffect, useState } from 'react';
import CustomerListTable from './customer-list-table';
import { 
  Input, 
  Select,
  SelectItem,
} from '@nextui-org/react';
import axios from 'axios';

interface Client {
  id: number;
  nome: string;
  ultima_compra: string;
  dias_inativo: number;
  tipo_pessoa: string;
}

interface Filters {
  name: string;
  lastPurchaseStart: string;
  lastPurchaseEnd: string;
  daysInactiveMin: string;
  daysInactiveMax: string;
  tipoPessoa: string[];
}

const Page: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [filters, setFilters] = useState<Filters>({
    name: '',
    lastPurchaseStart: '',
    lastPurchaseEnd: '',
    daysInactiveMin: '',
    daysInactiveMax: '',
    tipoPessoa: ['Pessoa Física', 'Pessoa Jurídica'], // Default to both types selected
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL as string;

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API_URL}/clientes_listagem/`);
      setClients(response.data);
      sessionStorage.setItem('inactiveClients', JSON.stringify(response.data));
    } catch (error) {
      console.error('Error fetching client data:', error);
    }
  };

  useEffect(() => {
    const storedClients = sessionStorage.getItem('inactiveClients');
    if (storedClients) {
      setClients(JSON.parse(storedClients));
    } else {
      fetchClients();
    }
  }, []);

  const handleFilterChange = (value: string[]) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      tipoPessoa: value,
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters((prevFilters) => ({
      ...prevFilters,
      [name]: value,
    }));
  };

  useEffect(() => {
    const filteredClients = clients.filter((client) => {
      const { name, lastPurchaseStart, lastPurchaseEnd, daysInactiveMin, daysInactiveMax, tipoPessoa } = filters;
      const lastPurchaseDate = new Date(client.ultima_compra);

      const matchesName = name ? client.nome.toLowerCase().includes(name.toLowerCase()) : true;
      const matchesLastPurchase =
        (!lastPurchaseStart || lastPurchaseDate >= new Date(lastPurchaseStart)) &&
        (!lastPurchaseEnd || lastPurchaseDate <= new Date(lastPurchaseEnd));
      const matchesDaysInactive =
        (!daysInactiveMin || client.dias_inativo >= parseInt(daysInactiveMin)) &&
        (!daysInactiveMax || client.dias_inativo <= parseInt(daysInactiveMax));
      const matchesTipoPessoa = tipoPessoa.length === 0 || tipoPessoa.includes(client.tipo_pessoa);

      return matchesName && matchesLastPurchase && matchesDaysInactive && matchesTipoPessoa;
    });

    setClients(filteredClients);
  }, [filters]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-center">Listagem de Clientes</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Input
          isClearable
          label="Nome"
          name="name"
          value={filters.name}
          onChange={handleInputChange}
          className="w-full"
        />
        <Input
          type="date"
          label="Data Inicial (Última Compra)"
          name="lastPurchaseStart"
          value={filters.lastPurchaseStart}
          onChange={handleInputChange}
          className="w-full"
        />
        <Input
          type="date"
          label="Data Final (Última Compra)"
          name="lastPurchaseEnd"
          value={filters.lastPurchaseEnd}
          onChange={handleInputChange}
          className="w-full"
        />
        <Input
          type="number"
          label="Dias Inativos Mín."
          name="daysInactiveMin"
          value={filters.daysInactiveMin}
          onChange={handleInputChange}
          className="w-full"
        />
        <Input
          type="number"
          label="Dias Inativos Máx."
          name="daysInactiveMax"
          value={filters.daysInactiveMax}
          onChange={handleInputChange}
          className="w-full"
        />
        <Select
          label="Tipo de Cliente"
          placeholder="Selecione os tipos"
          selectionMode="multiple"
          value={filters.tipoPessoa}
          defaultSelectedKeys='all'
          onChange={(e) => handleFilterChange(e.target.value as unknown as string[])} // Use e.target.value to get selected options
          className="w-full"
        >
          {['Pessoa Física', 'Pessoa Jurídica'].map((tipo) => (
            <SelectItem key={tipo} value={tipo}>
              {tipo}
            </SelectItem>
          ))}
        </Select>
      </div>
      <CustomerListTable />
    </div>
  );
};

export default Page;
