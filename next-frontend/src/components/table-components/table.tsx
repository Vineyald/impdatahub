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
import { BottomContentComponent } from "./bottom-content";
import { TopContentComponent } from "./top-content";

interface TableHandlerProps<T> {
  data: T[];
  filters?: Filter[];
  columns: { key: keyof T; label: string; sortable?: boolean }[];
  sortDescriptor: SortDescriptor;
  visibleColumns: ColumnVisibility[];
  onSortChange: (descriptor: SortDescriptor) => void;
  renderCell: (item: T, columnKey: keyof T) => React.ReactNode;
  onFilterStatesChange: (states: Record<string, string | boolean | [(string | undefined)?, (string | undefined)?]>) => void
  onColumnsChange: (updatedColumns: ColumnVisibility[]) => void;
  classes?: string;
}

interface FilterOption {
  label: string;
  value: string;
}

interface Filter {
  type: string; // Supported filter types
  controlfield: string; // Field name in the state
  placeholder?: string; // Placeholder text
  mapping?: string; // Optional mapping key
  options?: FilterOption[]; // For `select` filter type
  className?: string; // Custom class name for styling
  comparator?: "includes" | "equals" | "greaterThan" | "lessThan"; // Comparison operators
}

interface ColumnVisibility {
  key: string; // Unique column identifier
  label: string; // Display name
  visible: boolean; // Visibility state
}

export function TableHandler<T extends { id: React.Key }>({
  data,
  columns,
  sortDescriptor,
  onSortChange,
  renderCell,
  classes,
  filters,
  visibleColumns,
  onFilterStatesChange,
  onColumnsChange,
}: TableHandlerProps<T>) {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const sortedData = React.useMemo(() => {
    return [...data].sort((a, b) => {
      const first = a[sortDescriptor.column as keyof T] ?? "";
      const second = b[sortDescriptor.column as keyof T] ?? "";
      const cmp = first < second ? -1 : first > second ? 1 : 0;

      return sortDescriptor.direction === "descending" ? -cmp : cmp;
    });
  }, [data, sortDescriptor]);

  const { bottomContent } = BottomContentComponent({
    data: data,
    rowsPerPage,
    currentPage: page,
    onPageChange: setPage,
  });

  return (
    <Table
      aria-label="Generic Table"
      isCompact
      sortDescriptor={sortDescriptor}
      onSortChange={onSortChange}
      className={classes}
      topContent={
        <div className="flex justify-between">
          <TopContentComponent
            data={data}
            filters={filters}
            visibleColumns={visibleColumns}
            onFilterStatesChange={onFilterStatesChange}
            onColumnsChange={onColumnsChange}
            onLineChange={setRowsPerPage}
          />
        </div>
      }
      topContentPlacement="outside"
      bottomContent={bottomContent}
      bottomContentPlacement="outside"
      selectionMode="single"
    >
      <TableHeader>
        {columns.map((col) => (
          <TableColumn key={col.key.toString()} allowsSorting={col.sortable}>
            {col.label}
          </TableColumn>
        ))}
      </TableHeader>
      <TableBody items={sortedData}>
        {(item) => (
          <TableRow key={item.id as React.Key}>
            {(columnKey) => <TableCell>{renderCell(item, columnKey as keyof T)}</TableCell>}
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
