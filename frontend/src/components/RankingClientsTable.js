import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTable } from 'react-table';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../statics/css/tables_layout.scss';

// Componente de Tabela Interativa
const Table = ({ columns, data }) => {
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable({ columns, data });

  return (
    <table className="table table-striped" {...getTableProps()}>
      <thead>
        {headerGroups.map(headerGroup => (
          <tr {...headerGroup.getHeaderGroupProps()}>
            {headerGroup.headers.map(column => (
              <th {...column.getHeaderProps()}>{column.render('Header')}</th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody {...getTableBodyProps()}>
        {rows.map(row => {
          prepareRow(row);
          return (
            <tr {...row.getRowProps()}>
              {row.cells.map(cell => (
                <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

const RankingClientsTable = () => {
  const [data, setData] = useState({ Geral: [], Servi: [], Imp: [] });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const navigate = useNavigate();

  const fetchRankingData = () => {
    axios.get('/api/clientes_ranking/', { params: { start_date: startDate, end_date: endDate } })
      .then(response => {
        setData({
          Geral: response.data.Geral,
          Servi: response.data.Servi,
          Imp: response.data.Imp,
        });
      })
      .catch(error => {
        console.error('Erro ao buscar os dados da API', error);
      });
  };

  useEffect(() => {
    fetchRankingData();
  }, [startDate, endDate]);

  const columnsGeral = React.useMemo(
    () => [
      {
        Header: 'Nome do Cliente',
        accessor: 'nome',
        Cell: ({ row }) => (
          <a href={`/clientes/${row.original.id}`} onClick={(e) => {
            e.preventDefault();
            navigate(`/clientes/${row.original.id}`);
          }}>
            {row.original.nome}
          </a>
        ),
      },
      {
        Header: 'Total Gasto',
        accessor: 'total_gasto',
        Cell: ({ value }) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      },
      {
        Header: 'Última Compra Servi',
        accessor: 'ultima_compra_servi',
        Cell: ({ value }) => (value ? new Date(value).toLocaleDateString() : '-'),
      },
      {
        Header: 'Última Compra Imp',
        accessor: 'ultima_compra_imp',
        Cell: ({ value }) => (value ? new Date(value).toLocaleDateString() : '-'),
      },
    ],
    [navigate]
  );

  const columnsIndividual = React.useMemo(
    () => [
      {
        Header: 'Nome do Cliente',
        accessor: 'nome',
        Cell: ({ row }) => (
          <a href={`/clientes/${row.original.id}`} onClick={(e) => {
            e.preventDefault();
            navigate(`/clientes/${row.original.id}`);
          }}>
            {row.original.nome}
          </a>
        ),
      },
      {
        Header: 'Total Gasto',
        accessor: 'total_gasto',
        Cell: ({ value }) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      },
      {
        Header: 'Última Compra',
        accessor: 'ultima_compra',
        Cell: ({ value }) => (value ? new Date(value).toLocaleDateString() : '-'),
      },
    ],
    [navigate]
  );

  return (
    <div className="container">
      {/* Filtros de Data */}
      <div className="filters row mb-3">
        <div className="text">
          <p className="fs-2 fw-bold text-capitalize">Filtrar registros por período</p>
        </div>
        <div className="col">
          <div className="text">
            <p className="fs-5 text-capitalize">Data inicial</p>
          </div>
          <input
            type="date"
            className="form-control"
            placeholder="Data de início"
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="col">
          <div className="text">
            <p className="fs-5 text-capitalize">Data final</p>
          </div>
          <input
            type="date"
            className="form-control"
            placeholder="Data de fim"
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* Tabela Geral */}
      <div className="filters row mb-3">
        <div className="col-12">
          <div className="text">
            <p className="fs-2 fw-bold text-capitalize">Ranking geral</p>
          </div>
          <Table className="custom_table" columns={columnsGeral} data={data.Geral} />
        </div>
      </div>

      {/* Tabelas Imp e Servi */}
      <div className="filters row">
        <div className="col-6">
          <div className="text">
            <p className="fs-2 fw-bold text-capitalize">Ranking império</p>
          </div>
          <Table className="custom_table" columns={columnsIndividual} data={data.Imp} />
        </div>
        <div className="col-6">
          <div className="text">
            <p className="fs-2 fw-bold text-capitalize">Ranking servi</p>
          </div>
          <Table className="custom_table" columns={columnsIndividual} data={data.Servi} />
        </div>
      </div>
    </div>
  );
};

export default RankingClientsTable;
