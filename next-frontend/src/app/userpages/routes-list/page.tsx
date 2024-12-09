'use client';

import React, { useState, useCallback, useEffect } from "react";
import axios from "axios";
import { TableHandler } from "@/components/table-components/table";
import { SortDescriptor, Link } from "@nextui-org/react";
import { applyFilters } from "@/components/utility/process-filters";

interface RotaInfo {
  id: number;
  numero_rota: number;
  dia_semana: string;
  cidades: string[];
  [key: string]: unknown; // Add index signature
}
interface Rotas {
  [nome: string]: RotaInfo;
}

const visibleColumns = [
  { key: "nome", label: "Nome", visible: true },
  { key: "numero_rota", label: "Número da Rota", visible: true },
  { key: "dia_semana", label: "Dia da Semana", visible: true },
  { key: "cidades", label: "Cidades", visible: true },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const RotasListTable: React.FC = () => {
  const [rotas, setRotas] = useState<(RotaInfo & { nome: string })[]>([]);
  const [filtered, setFilteredRotas] = useState<(RotaInfo & { nome: string })[]>([]);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "nome",
    direction: "ascending",
  });

  const [columns, setColumns] = useState(
    visibleColumns.map((col) => ({
      ...col,
      sortable: col.key !== "cidades",
      key: col.key as keyof RotaInfo | "nome",
    }))
  );

  // Fetch data (stable reference with useCallback)
  const fetchRotas = useCallback(async () => {
    try {
      const response = await axios.get<Rotas>(`${API_URL}/rotas/`);
      const formattedRotas = Object.entries(response.data).map(([nome, rota]) => ({
        ...rota,
        nome,
      }));
      setRotas(formattedRotas);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, []);

  useEffect(() => {
    fetchRotas();
  }, [fetchRotas]);

  const renderCell = useCallback(
    (rota: RotaInfo & { nome: string }, columnKey: keyof RotaInfo | "nome") => {
      if (columnKey === "nome") {
        return (
          <Link href={`routes/${rota.id}`} className="hover:text-blue-500 underline cursor-pointer text-inherit">
            {rota.nome}
          </Link>
        );
      }
      if (columnKey === "cidades") {
        return <span>{rota.cidades.join(", ")}</span>;
      }
      return <span>{rota[columnKey]?.toString()}</span>;
    },
    []
  );

  const handleFilterChange = useCallback(
    (filterStates: Record<string, string | boolean | [(string | undefined)?, (string | undefined)?]>) => {
      // Map the broader type to the narrower type expected by `applyFilters`
      const refinedStates: Record<string, string | number | boolean> = Object.fromEntries(
        Object.entries(filterStates).map(([key, value]) => {
          if (Array.isArray(value)) {
            // Convert range values to strings or numbers for filtering
            return [key, value.filter((v) => v !== undefined).join("-")];
          }
          return [key, value];
        })
      );
      const filteredData = applyFilters<RotaInfo & { nome: string }>(rotas, refinedStates);
      setFilteredRotas(filteredData);
    },
    [rotas]
  );
  

  return (
    <div className="container mx-auto">
      <TableHandler
        data={filtered}
        filters={[
          { type: "input", controlfield: "nome", placeholder: "Filtre pelo nome da rota", className: "col-span-9" },
          {
            type: "select",
            controlfield: "dia_semana",
            placeholder: "Selecione o dia da semana",
            className: "col-span-5",
            options: [
              { label: "Segunda", value: "segunda" },
              { label: "Terça", value: "terça" },
              { label: "Quarta", value: "quarta" },
              { label: "Quinta", value: "quinta" },
              { label: "Sexta", value: "sexta" },
              { label: "Sábado", value: "sabado" },
              { label: "Domingo", value: "domingo" },
            ],
          },
          { type: "input", controlfield: "cidades", placeholder: "Filtrar por cidades", className: "col-span-4" },
        ]}
        visibleColumns={columns.map((col) => ({ ...col, key: col.key.toString() }))}
        columns={columns}
        sortDescriptor={sortDescriptor}
        onSortChange={setSortDescriptor}
        onColumnsChange={(updatedColumns) => {
          const updatedColumnsWithSortable = updatedColumns.map((col) => ({
            ...col,
            sortable: col.key !== "cidades",
            key: col.key as "nome" | keyof RotaInfo,
          }));
          setColumns(updatedColumnsWithSortable);
        }}
        onFilterStatesChange={handleFilterChange}
        renderCell={renderCell}
        classes="w-full"
      />
    </div>
  );
};

export default RotasListTable;
