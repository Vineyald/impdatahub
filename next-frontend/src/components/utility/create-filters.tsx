// src/components/FilterComponent.tsx
import React, { useCallback, useEffect, useState } from "react";
import { Input, Select, SelectItem, Checkbox } from "@nextui-org/react";

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

interface FilterComponentProps {
  filters: Filter[];
  onFilterStatesChange: (states: Record<string, string | boolean | [string?, string?]>) => void;
}

export function FilterComponent({
  filters,
  onFilterStatesChange,
}: FilterComponentProps) {
  // Initialize filter states
  const [filterStates, setFilterStates] = useState<Record<string, string | boolean | [string?, string?]>>(
    () => Object.fromEntries(filters.map((filter) => [filter.controlfield, filter.type === "range" ? [undefined, undefined] : ""]))
  );

  // Update state when a filter changes
  const handleFilterChange = useCallback((field: string, value: string | boolean | [string?, string?]) => {
    setFilterStates((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Notify parent of state changes
  useEffect(() => {
    onFilterStatesChange(filterStates);
  }, [filterStates, onFilterStatesChange]);

  return (
    <div className="grid gap-4 grid-cols-9">
      {filters.map((filter) => (
        <div key={filter.controlfield} className={filter.className}>
          {filter.type === "input" && (
            <Input
              label={filter.controlfield}
              placeholder={filter.placeholder}
              value={(filterStates[filter.controlfield] as string) || ""}
              onChange={(e) => handleFilterChange(filter.controlfield, e.target.value)}
            />
          )}
          {filter.type === "select" && filter.options && (
            <Select
              label={filter.controlfield}
              placeholder={filter.placeholder}
              selectedKeys={new Set(filterStates[filter.controlfield] as string[] || [])}
              onSelectionChange={(keys) =>
                handleFilterChange(
                  filter.controlfield,
                  Array.isArray(keys) ? keys.join(", ") : String(keys) // Convert multi-select to string
                )
              }
              className={`${filter.className}`}
            >
              {filter.options.map((option) => (
                <SelectItem key={option.value}>{option.label}</SelectItem>
              ))}
            </Select>
          )}
          {filter.type === "checkbox" && (
            <Checkbox
            isSelected={filterStates[filter.controlfield] as boolean}
            onChange={(e) => handleFilterChange(filter.controlfield, e.target.checked)} // Use `e.target.checked`
            className={filter.className}
          >
            {filter.placeholder || filter.controlfield}
          </Checkbox>
          
          )}
          {filter.type === "range" && (
            <div className="flex space-x-2">
              <Input
                type="number"
                placeholder="Min"
                value={(filterStates[filter.controlfield] as [string?, string?])?.[0] || ""}
                onChange={(e) =>
                  handleFilterChange(filter.controlfield, [
                    e.target.value || undefined,
                    (filterStates[filter.controlfield] as [string?, string?])?.[1],
                  ])
                }
              />
              <Input
                type="number"
                placeholder="Max"
                value={(filterStates[filter.controlfield] as [string?, string?])?.[1] || ""}
                onChange={(e) =>
                  handleFilterChange(filter.controlfield, [
                    (filterStates[filter.controlfield] as [string?, string?])?.[0],
                    e.target.value || undefined,
                  ])
                }
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
