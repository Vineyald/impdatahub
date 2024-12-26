// src/components/TableHandler.tsx
import React, { useState } from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  SortDescriptor,
} from "@nextui-org/react";

import TopContentComponent from "./top-content";
import BottomContentComponent from "./bottom-content";

interface TableHandlerProps<T>{
	data: T[];
  idKey: string | string[];
	filters?: Filter[];
	columns: Columns[];
	sortDescriptor: SortDescriptor;
	className?: string;
	onSortChange: (descriptor: SortDescriptor) => void;
	renderCell: (item: T, columnKey: keyof T) => React.ReactNode;
	onFilterStatesChange: (states: Record<string, string | boolean | [(string | undefined)?, (string | undefined)?]>) => void
}

interface Columns {
	columnKey: string;
	label: string;
	visible: boolean;
	sortable: boolean;
	showLabel?: boolean;
}

interface Filter {
  field: string;
  type?: string;
  itemList?: string[];
  controlfield: string;
  placeholder?: string;
  mapping?: string;
  options?: FilterOptions[];
  className?: string
  comparator?: "includes" | "equals" | "lessThan" | "greaterThan";
}

interface FilterOptions {
	label: string;
	value: string;
}

const TableHandler = <T,>(props: TableHandlerProps<T>): React.ReactElement => {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [visibleColumns, setLocalVisibleColumns] = useState(props.columns);

  // Sort the data based on sortDescriptor
  const sortedData = React.useMemo(() => {
    return [...props.data].sort((a, b) => {
      const first = a[props.sortDescriptor.column as keyof T] ?? "";
      const second = b[props.sortDescriptor.column as keyof T] ?? "";
      const cmp = first < second ? -1 : first > second ? 1 : 0;

      return props.sortDescriptor.direction === "descending" ? -cmp : cmp;
    });
  }, [props.data, props.sortDescriptor]);

  const pages = Math.ceil(props.data.length / rowsPerPage);

  const paginatedData = React.useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return sortedData.slice(start, end);
  }, [sortedData, rowsPerPage, page]);

  const handleColumnsChange = (updatedColumns: Columns[]) => {
    // handle column visibility changes here
    // e.g., update the visibleColumns state
    setLocalVisibleColumns(updatedColumns);
  };

  const classNames = React.useMemo(
    () => ({
      thead: ["bg-transparent"],
      th: [
        "text-black",
      ],
      td: [
        "bg-transparent",
        "text-white",
        "rounded-lg",
        "border-gray-600",
        "border-b-1",
      ],
      tr: [
        "data-[selected=true]:bg-gray-600",
        "data-[selected=true]:text-white",
        "data-[hover=true]:bg-gray-600",
        "data-[hover=true]:text-white",
      ],
    }),
    [],
  );
  
  return (
    <Table
      removeWrapper
      aria-label="Dynamic Table"
      isCompact
      sortDescriptor={props.sortDescriptor}
      onSortChange={props.onSortChange}
      className={props.className}
      isHeaderSticky
      classNames={classNames}
      topContent={
        <div>
          <TopContentComponent
            filters={props.filters}
            columns={visibleColumns}
            line={rowsPerPage}
            onFilterStatesChange={props.onFilterStatesChange}
            onColumnsChange={handleColumnsChange}
            onLineChange={setRowsPerPage}
          />
        </div>
      }
      bottomContentPlacement="outside"
      bottomContent={
        <div>
          <BottomContentComponent
            dataCount={props.data.length}
            rowsPerPage={rowsPerPage}
            currentPage={page}
            pages={pages}
            onPageChange={setPage}
          />
        </div>
      }
    >
      {/* Render only visible columns in the header */}
      <TableHeader>
        {visibleColumns.filter(col => col.visible).map((col) => (
          <TableColumn key={col.columnKey} allowsSorting={col.sortable}>
            {col.label}
          </TableColumn>
        ))}
      </TableHeader>
      {/* Render rows with cells corresponding to visible columns */}
      <TableBody items={paginatedData}>
        {(item) => {
          const keyParts = Array.isArray(props.idKey)
            ? props.idKey.map((key) => item[key as keyof T] ?? 'undefined')
            : ['undefined'];

          const uniqueKey = keyParts.join('_');

          return (
            <TableRow key={uniqueKey}>
              {visibleColumns.filter((col) => col.visible).map((col) => (
                <TableCell key={col.columnKey}>
                  {props.renderCell(item, col.columnKey as keyof T)}
                </TableCell>
              ))}
            </TableRow>
          );
        }}
      </TableBody>
    </Table>
  );
}

export default TableHandler