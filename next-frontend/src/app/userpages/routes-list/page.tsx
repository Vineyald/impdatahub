'use client';

import React, { useState, useCallback, useEffect } from "react";
import axios from "axios";
import TableHandler from "@/components/table-components/table";
import { SortDescriptor, Link, Spacer } from "@nextui-org/react";
import { applyFilters } from "@/components/utility/process-filters";

// Define the Rotas interface
interface RotaInfo {
  id: number;
  rota_nome: string;
  numero_rota: number;
  dia_semana: string;
  cidades: string[];
}

// Define the visible columns
const visibleColumns = [
  { columnKey: "rota_nome", label: "Nome", visible: true, sortable: true },
  { columnKey: "numero_rota", label: "Número da Rota", visible: true, sortable: true },
  { columnKey: "dia_semana", label: "Dia da Semana", visible: true, sortable: true },
  { columnKey: "cidades", label: "Cidades", visible: true, sortable: false },
];

// Define the API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Define the RotasListTable component
const RotasListTable: React.FC = () => {
  const [rotas, setRotas] = useState<RotaInfo[]>([]);
  const [filteredRotas, setFilteredRotas] = useState<RotaInfo[]>([]);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "nome",
    direction: "ascending",
  });

  // Fetch data (stable reference with useCallback)
  const fetchRotas = useCallback(async () => {
    try {
      const response = await axios.get<RotaInfo[]>(`${API_URL}/rotas/`);
  
      // No need to use Object.entries; response.data is already an array
      setRotas(response.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, []);
  
  // Fetch data on component mount
  useEffect(() => {
    fetchRotas();
  }, [fetchRotas]);

  // Apply filters on component mount
  useEffect(() => {
    const initialFilteredData = applyFilters<RotaInfo>(rotas, {}); // Explicit type
    setFilteredRotas(initialFilteredData);
  }, [rotas]);  

  // Handle filter changes
  const handleFilterChange = useCallback(
    (filterStates: Record<string, string | boolean | [(string | undefined)?, (string | undefined)?]>) => {
      console.log("Filters aplyed:", filterStates);
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
      const filteredData = applyFilters<RotaInfo>(rotas, refinedStates);
      setFilteredRotas(filteredData);
    },
    [rotas]
  );

  // Render cell content
  const renderCell = useCallback(
    (item: RotaInfo, columnKey: string) => {
      switch (columnKey) {
        case "rota_nome":
          return (
            <Link 
              href={`routes/${item.id}`} 
              className="text-blue-600 decoration-2 hover:underline decoration-blue-500 text-inherit">
              {item.rota_nome}
            </Link>
          );
          case "cidades":
            return (
              <span>
                {Array.isArray(item.cidades)
                  ? item.cidades.join(", ")
                  : item.cidades || "N/A"}
              </span>
            );          
        default:
          return <span>{item[columnKey as keyof RotaInfo]?.toString()}</span>;
      }
    },
    []
  );  

  // Render the table
  return (
    <div className="container mx-auto">
      <Spacer y={10} />
      <TableHandler
        data={filteredRotas}
        idKey={["id", "rota_nome"]}
        filters={[
          { field: "input", controlfield: "rota_nome", placeholder: "Filtre pelo nome da rota", className: "col-span-8" },
          {
            field: "select",
            controlfield: "dia_semana",
            placeholder: "Selecione o dia da semana",
            className: "col-span-4",
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
          { field: "input", controlfield: "cidades", placeholder: "Filtrar por cidades", className: "col-span-4" },
        ]}
        columns={visibleColumns}
        className="conatiner mx-auto"
        sortDescriptor={sortDescriptor}
        onSortChange={setSortDescriptor}
        onFilterStatesChange={handleFilterChange}
        renderCell={renderCell}
      />
    </div>
  );
};
export default RotasListTable;
