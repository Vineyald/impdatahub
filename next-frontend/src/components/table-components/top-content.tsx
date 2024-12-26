import React, { useCallback, useState } from "react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  useDisclosure,
  SharedSelection,
} from "@nextui-org/react";
import { FilterComponent } from "../utility/create-filters";
import { ChevronDownIcon, FilterIcon, PlusIcon, ReloadIcon } from "../icons";

interface TopContentProps {
  filters?: Filter[];
  columns: Columns[];
  line: number;
  onFilterStatesChange: (states: Record<string, string | boolean | [(string | undefined)?, (string | undefined)?]>) => void;
  onColumnsChange: (columns: Columns[]) => void;
  onLineChange: (line: number) => void;
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

interface Columns {
  columnKey: string;
  label: string;
  visible: boolean;
  sortable: boolean;
  showLabel?: boolean;
}

const TopContentComponent: React.FC<TopContentProps> = ({
  filters,
  columns,
  line,
  onFilterStatesChange,
  onColumnsChange,
  onLineChange,
}) => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [localLine, setLine] = useState(line);
  const [localFilterStates, setLocalFilterStates] = useState<
    Record<string, string | boolean | [(string | undefined)?, (string | undefined)?]>
  >({});

  // Update the parent with the stored filter states
  const handleApplyFilters = useCallback(() => {
    onFilterStatesChange(localFilterStates);
  }, [localFilterStates, onFilterStatesChange]);

  const handleFilterStateChange = useCallback(
    (states: Record<string, string | boolean | [(string | undefined)?, (string | undefined)?]>) => {
      setLocalFilterStates(states);
    },
    []
  );

  const handleColumnsChange = (selectedKeys: Set<string>) => {
    const updatedColumns = columns.map((col) => ({
      ...col,
      visible: selectedKeys.has(col.columnKey),
    }));
    onColumnsChange(updatedColumns);
  };

  const handleLineChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLine = parseInt(event.target.value, 10);
    setLine(newLine);
    onLineChange(newLine);
  };

  // Function to reset filters
  const handleResetFilters = () => {
    setLocalFilterStates({});
    onFilterStatesChange({});
  };

  // Check if there are active filters
  const isFilterActive = Object.values(localFilterStates).some((value) => {
    if (Array.isArray(value)) return value.some((v) => v !== undefined && v !== "");
    return value !== "" && value !== undefined && value !== false;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between gap-3 items-end">
        {filters && (
          <>
            <div className="flex gap-3">
              <Button className="card-style-secondary text-white" endContent={<FilterIcon className="text-xl" />} onPress={onOpen}>
                Filtros da tabela
              </Button>

              {isFilterActive && (
                <Button
                  className="card-style-danger"
                  endContent={<ReloadIcon className="text-xl" color="white" />}
                  onPress={handleResetFilters}
                  variant="flat"
                >
                </Button>
              )}
            </div>
            <Drawer
              isOpen={isOpen}
              onOpenChange={onOpenChange}
              onClose={() => {
                handleApplyFilters(); // Apply filters on close
              }}
            >
              <DrawerContent>
                {(onClose) => (
                  <>
                    <DrawerHeader className="flex flex-col gap-1">Filtros da tabela</DrawerHeader>
                    <DrawerBody>
                      <FilterComponent
                        filters={filters}
                        onFilterStatesChange={handleFilterStateChange}
                      />
                    </DrawerBody>
                    <DrawerFooter>
                      <Button
                        color="primary"
                        onPress={() => {
                          handleApplyFilters();
                          onClose(); // Close the drawer manually
                        }}
                      >
                        Aplicar
                      </Button>
                    </DrawerFooter>
                  </>
                )}
              </DrawerContent>
            </Drawer>
          </>
        )}
        <div className="flex gap-4">
          <Dropdown>
            <DropdownTrigger className="hidden sm:flex">
              <Button endContent={<ChevronDownIcon className="text-small" />} variant="bordered" className="card-style text-white">
                Colunas
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              disallowEmptySelection
              aria-label="Toggle Columns"
              closeOnSelect={false}
              selectedKeys={new Set(
                columns.filter((col) => col.visible).map((col) => col.columnKey)
              )}
              selectionMode="multiple"
              onSelectionChange={(selectedKeys: SharedSelection) => {
                if ("keys" in selectedKeys) {
                  handleColumnsChange(new Set(selectedKeys.keys().map(String)));
                } else {
                  handleColumnsChange(new Set());
                }
              }}
            >
              {columns.map((col) => (
                <DropdownItem key={col.columnKey} className="capitalize">
                  {col.label}
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
          <Button className="card-style-primary text-white" endContent={<PlusIcon />}>
            Adicionar nova
          </Button>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <label className="flex items-center text-default-300 text-small">
          Linhas por página:
          <select
            className="bg-transparent outline-none text-default-300 text-small ml-2"
            value={localLine}
            onChange={handleLineChange}
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
        </label>
        <a className="text-default-300 text-small">
          Clique nos itens das coluna(s){" "}
          {columns.filter((col) => col.showLabel).map((col) => col.label).join(", ")} para ver mais informações
        </a>
      </div>
    </div>
  );
};

export default TopContentComponent;
