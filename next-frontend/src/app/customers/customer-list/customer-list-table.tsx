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
  Select,
  SelectItem,
  Spacer,
  Link,
} from '@nextui-org/react';
import axios from 'axios';

interface ClientInfo {
  id: number;
  nome: string;
  fantasia: string | null;
  tipo_pessoa: string;
  cpf_cnpj: string;
  email: string | null;
  celular: string | null;
  fone: string | null;
  cep: string | null;
  rota: string | null;
  endereco: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  situacao: string;
  vendedor: string | null;
  contribuinte: boolean;
  codigo_regime_tributario: string;
  limite_credito: number;
  ultima_compra: string | null;
  dias_inativo?: number; // Calculated field
}

interface Purchase {
  numero_venda: string;
  data_compra: string;
  produto: string;
  quantidade_produto: number;
  preco_unitario: number;
  valor_total: number;
  valor_desconto: number;
  frete: number;
  preco_final: number;
}

interface ClientData {
  info: ClientInfo;
  purchases: Purchase[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const CustomerListTable: React.FC = () => {
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [selectedKeys, setSelectedKeys] = useState(new Set<string>());
  const [, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const rowsPerPage = 50;

  const tipoPessoaOptions = [
    { key: 'F', label: 'Pessoa Física' },
    { key: 'J', label: 'Pessoa Jurídica' },
  ];

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'nome',
    direction: 'ascending',
  });

  const [filters, setFilters] = useState({
    nome: '',
    cidade: '',
    estado: '',
    situacao: '',
    vendedor: '',
    tipopessoa: '',
    limiteCreditoMin: '',
    limiteCreditoMax: '',
    lastPurchaseStart: '',
    lastPurchaseEnd: '',
  });

  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    try {
        const response = await axios.get<ClientData[]>(`${API_URL}/clientes_listagem/`);
        if (Array.isArray(response.data)) {
            const clientInfos = response.data.map((clientData: ClientData) => {
                return clientData.info as ClientInfo;
            });
            setClients(clientInfos);
        } else if (response.data && typeof response.data === 'object') {
            const dataArray = Object.values(response.data) as ClientData[]; // Access the property that contains the array
            const clientInfos = dataArray.map((value: ClientData) => {
              return value.info as ClientInfo;
            });
            setClients(clientInfos);
        } else {
            console.error('Unexpected response data:', response.data);
        }
    } catch (error) {
        console.error('Erro ao buscar dados dos clientes:', error);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleSortChange = (descriptor: SortDescriptor) => {
    setSortDescriptor(descriptor);
    setPage(1);
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const {
        nome,
        cidade,
        estado,
        situacao,
        vendedor,
        tipopessoa,
        limiteCreditoMin,
        limiteCreditoMax,
        lastPurchaseStart,
        lastPurchaseEnd,
      } = filters;
  
      const limiteCredito = parseFloat((client.limite_credito ?? 0).toString());
      const minCredito = limiteCreditoMin ? parseFloat(limiteCreditoMin) : null;
      const maxCredito = limiteCreditoMax ? parseFloat(limiteCreditoMax) : null;
  
      const lastPurchaseDate = client.ultima_compra ? new Date(client.ultima_compra) : null;
  
      // Filters
      return (
        (!nome || (client.nome && client.nome.toLowerCase().includes(nome.toLowerCase()))) &&
        (!cidade || (client.cidade && client.cidade.toLowerCase().includes(cidade.toLowerCase()))) &&
        (!estado || (client.estado && client.estado.toLowerCase().includes(estado.toLowerCase()))) &&
        (!situacao || (client.situacao && client.situacao.toLowerCase() === situacao.toLowerCase())) &&
        (!tipopessoa || tipopessoa.split(',').includes(client.tipo_pessoa)) &&
        (!vendedor || (client.vendedor && client.vendedor.toLowerCase().includes(vendedor.toLowerCase()))) &&
        (!minCredito || limiteCredito >= minCredito) &&
        (!maxCredito || limiteCredito <= maxCredito) &&
        (!lastPurchaseStart || (lastPurchaseDate && lastPurchaseDate >= new Date(lastPurchaseStart))) &&
        (!lastPurchaseEnd || (lastPurchaseDate && lastPurchaseDate <= new Date(lastPurchaseEnd)))
      );
    });
  }, [clients, filters]);  

  const sortedClients = useMemo(() => {
    return [...filteredClients].sort((a, b) => {
      const first = a[sortDescriptor.column as keyof ClientInfo] ?? '';
      const second = b[sortDescriptor.column as keyof ClientInfo] ?? '';

      let cmp = first < second ? -1 : 1;
      if (sortDescriptor.direction === 'descending') {
        cmp *= -1;
      }
      return cmp;
    });
  }, [filteredClients, sortDescriptor]);

  const paginatedClients = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return sortedClients.slice(start, end);
  }, [page, sortedClients]);

  const renderCell = useCallback((client: ClientInfo, columnKey: keyof ClientInfo) => {
    const cellValue = client[columnKey];
    if (columnKey === 'nome') {
      return (
        <Link
          href={`/customers/customer-profile/${client.id}`}
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
          label="Nome"
          type="text"
          placeholder="Digite o nome do cliente"
          value={filters.nome}
          onChange={(e) => handleFilterChange('nome', e.target.value)}
          className="md:col-span-4"
        />
        <Input
          label="Cidade"
          type="text"
          placeholder="Digite a cidade do cliente"
          value={filters.cidade}
          onChange={(e) => handleFilterChange('cidade', e.target.value)}
          className="md:col-span-1"
        />
        <Select
          label="Tipo Pessoa"
          selectionMode="multiple"
          placeholder="Selecione um ou mais tipos de pessoa"
          selectedKeys={selectedKeys}
          className="max-w-xs"
          onSelectionChange={(keys) => {
            const selectedKeysArray = Array.from(keys).map(String); // Convert keys to strings
            setSelectedKeys(new Set(selectedKeysArray)); // Update the selected keys state
            handleFilterChange('tipopessoa', selectedKeysArray.length > 0 ? selectedKeysArray.join(',') : ''); // Update the filter
          }}
        >
          {tipoPessoaOptions.map((option) => (
            <SelectItem key={option.key}>{option.label}</SelectItem>
          ))}
        </Select>
        <Input
          type="text"
          label="Estado"
          placeholder="Digite o estado do cliente (UF)"
          value={filters.estado}
          onChange={(e) => handleFilterChange('estado', e.target.value)}
          className='md:col-span-1'
        />
        <Input
          label="Situacao"
          type="text"
          placeholder="Digite se o cliente está ativo ou inativo"
          value={filters.situacao}
          onChange={(e) => handleFilterChange('situacao', e.target.value)}
          className='md:col-span-1'
        />
        <Input
          type="text"
          label="Vendedor"
          placeholder="Digite o vendedor do cliente"
          value={filters.vendedor}
          onChange={(e) => handleFilterChange('vendedor', e.target.value)}
          className='md:col-span-4'
        />
        <Input
          type="number"
          label="Limite de Crédito mín."
          placeholder="Digite o limite de crédito mínimo do cliente"
          value={filters.limiteCreditoMin}
          className='md:col-span-2'
          onChange={(e) => handleFilterChange('limiteCreditoMin', e.target.value)}
        />
        <Input
          type="number"
          label="Limite de Crédito Máx."
          placeholder="Digite o limite de crédito máximo do cliente"
          value={filters.limiteCreditoMax}
          className='md:col-span-2'
          onChange={(e) => handleFilterChange('limiteCreditoMax', e.target.value)}
        />
        <Input
          type="date"
          label="Data Inicial (Ultima Compra)"
          placeholder="Digite a data inicial (Última Compra)"
          className='md:col-span-2'
          value={filters.lastPurchaseStart}
          onChange={(e) => handleFilterChange('lastPurchaseStart', e.target.value)}
        />
        <Input
          type="date"
          label="Data Final (Ultima Compra)"
          placeholder="Digite a data final (Última Compra)"
          className='md:col-span-2'
          value={filters.lastPurchaseEnd}
          onChange={(e) => handleFilterChange('lastPurchaseEnd', e.target.value)}
        />
      </div>

      {/* Table */}
      <Spacer y={10} />
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
            total={Math.ceil(filteredClients.length / rowsPerPage)}
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
            Dias sem comprar
          </TableColumn>
          <TableColumn key="tipo_pessoa" allowsSorting>
            Tipo Pessoa
          </TableColumn>
          <TableColumn key="cidade">Cidade</TableColumn>
          <TableColumn key="estado">Estado</TableColumn>
          <TableColumn key="situacao">Situação</TableColumn>
          <TableColumn key="vendedor">Vendedor</TableColumn>
          <TableColumn key="rota">Rota</TableColumn>
        </TableHeader>
        <TableBody items={paginatedClients}>
          {(client) => (
            <TableRow key={client.id}>
              {(columnKey) => (
                <TableCell>{renderCell(client, columnKey as keyof ClientInfo)}</TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default CustomerListTable;
