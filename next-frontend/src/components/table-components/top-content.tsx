// src/components/BottomContent.tsx
import React, { ChangeEvent } from "react";
import { 
  Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, 
  Button, Drawer, DrawerContent, DrawerHeader, DrawerBody,
  DrawerFooter, useDisclosure, 
} from "@nextui-org/react";
import { FilterComponent } from "../utility/create-filters";
import { ChevronDownIcon, FilterIcon, PlusIcon } from "../icons";

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

interface FilterComponentProps<T> {
  data: T[];
  filters?: Filter[];
  visibleColumns: ColumnVisibility[];
  onFilterStatesChange: (states: Record<string, string | boolean | [(string | undefined)?, (string | undefined)?]>) => void
  onColumnsChange: (updatedColumns: ColumnVisibility[]) => void;
  onLineChange: (number: number) => void;
}

export function TopContentComponent<T>({
  filters,
  visibleColumns,
  onFilterStatesChange,
  onColumnsChange,
  onLineChange,
}: FilterComponentProps<T>) {
  const {isOpen, onOpen, onOpenChange} = useDisclosure();

  // Handles column visibility updates
  const handleColumnVisibilityChange = (selectedKeys: Set<string>) => {
    const updatedColumns = visibleColumns.map((col) => ({
      ...col,
      visible: selectedKeys.has(col.key),
    }));
    onColumnsChange(updatedColumns);
  };

  const handleLineChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = parseInt(event.target.value, 10);
    onLineChange(selectedValue);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between gap-3 items-end">
        <div className="flex gap-3">
          {filters && (
            <React.Fragment>
              <Button endContent={<FilterIcon className="text-small" />} onPress={onOpen}>Filtros da tabela</Button>
              <Drawer isOpen={isOpen} onOpenChange={onOpenChange}>
                <DrawerContent>
                  {(onClose) => (
                    <>
                      <DrawerHeader className="flex flex-col gap-1">Filtros da tabela</DrawerHeader>
                      <DrawerBody>
                        <FilterComponent
                          filters={filters}
                          onFilterStatesChange={onFilterStatesChange}
                        />
                      </DrawerBody>
                      <DrawerFooter>
                        <Button color="danger" variant="light" onPress={onClose}>
                          Close
                        </Button>
                        <Button color="primary" onPress={onClose}>
                          Action
                        </Button>
                      </DrawerFooter>
                    </>
                  )}
                </DrawerContent>
              </Drawer>
            </React.Fragment>
          )}
        </div>
        <div className="flex gap-3">
          <Dropdown>
            <DropdownTrigger className="hidden sm:flex">
              <Button endContent={<ChevronDownIcon className="text-small" />} variant="flat">
                Colunas
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              disallowEmptySelection
              aria-label="Toggle Columns"
              closeOnSelect={false}
              selectedKeys={new Set(
                visibleColumns.filter((col) => col.visible).map((col) => col.key)
              )}
              selectionMode="multiple"
              onSelectionChange={(keys) =>
                handleColumnVisibilityChange(new Set(keys as unknown as string[]))
              }
            >
              {visibleColumns.map((col) => (
                <DropdownItem key={col.key} className="capitalize">
                  {col.label}
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
          <Button color="primary" endContent={<PlusIcon />}>
            Adicionar nova
          </Button>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <label className="flex items-center text-default-400 text-small">
          Linhas por página:
          <select
            className="bg-transparent outline-none text-default-400 text-small ml-2"
            onChange={handleLineChange} >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
        </label>
      </div>
    </div>
  );
}
