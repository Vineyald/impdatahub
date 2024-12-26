// src/components/FilterComponent.tsx
import React, { useEffect, useState } from "react";
import { Input, Select, SelectItem, Checkbox, Autocomplete, AutocompleteItem, Chip, Button, SharedSelection } from "@nextui-org/react";

interface FilterOptions {
  label: string;
  value: string;
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
}

interface FilterComponentProps {
  filters: Filter[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFilterStatesChange: (states: Record<string, any>) => void;
}

export function FilterComponent({ filters, onFilterStatesChange }: FilterComponentProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [filterStates, setFilterStates] = useState<Record<string, any>>(
    () =>
      Object.fromEntries(
        filters.map((filter) => {
          if (filter.field === "tags") {
            return ["tags", []];
          } else {
            return [
              filter.controlfield,
              filter.type === "range" ? [undefined, undefined] : "",
            ];
          }
        })
      )
  ); 

  const [inputValue, setInputValue] = useState("");

  // Handle tag-based filters
  const handleAddTag = () => {

    if (inputValue.trim()) {
      setFilterStates((prev) => {
        const currentTags = prev.tags || [];
        // Avoid adding duplicates
        if (!currentTags.includes(inputValue)) {
          return {
            ...prev,
            tags: [...currentTags, inputValue],
          };
        }
        return prev; // Return unchanged state if the tag already exists
      });
    }

    setInputValue(""); // Clear input value
  };

  const handleRemoveTag = (controlfield: string, tag: string) => {
    setFilterStates((prev) => ({
      ...prev,
      [controlfield]: prev[controlfield].filter((t: string) => t !== tag),
    }));
  };

  const handleChipClick = (controlfield: string, index: number) => {
    setFilterStates((prev) => {
      const newTags = [...prev[controlfield]];
      let tag = newTags[index].replace(/^[+-]/, "");
      if (!newTags[index].startsWith("+") && !newTags[index].startsWith("-")) {
        tag = `+${tag}`;
      } else if (newTags[index].startsWith("+")) {
        tag = `-${tag}`;
      }
      newTags[index] = tag;
      return { ...prev, [controlfield]: newTags };
    });
  };

  const handleMultiSelectChange = (keys: SharedSelection, controlfield: string) => {
    let updatedKeys: Set<string>;
  
    if (keys === "all") {
      // Select all options
      const allKeys = filters
        .find((f) => f.controlfield === controlfield)
        ?.options?.map((option) => option.value) || [];
      updatedKeys = new Set(allKeys);
    } else if (keys instanceof Set) {
      // Convert Set<Key> to Set<string>
      updatedKeys = new Set([...keys].map((key) => key.toString()));
    } else {
      updatedKeys = new Set();
    }
  
    setFilterStates((prev) => ({
      ...prev,
      [controlfield]: updatedKeys,
    }));
  };  

  // Update parent when state changes
  useEffect(() => {
    onFilterStatesChange(filterStates);
  }, [filterStates, onFilterStatesChange]); 

  return (
    <div className="grid gap-4 grid-cols-8">
      {filters.map((filter) => (
        <div key={filter.controlfield} className={filter.className}>
          {filter.field === "input" && (
            <Input
              label={filter.placeholder}
              value={(filterStates[filter.controlfield] as string) || ""}
              onChange={(e) => setFilterStates((prev) => ({ ...prev, [filter.controlfield]: e.target.value }))}
            />
          )}
          {filter.field === "comparator" && (
            <>
              <h1 className="text-black text-lg text-center">{filter.placeholder}</h1>
              <Input
                label={`${filter.placeholder} inicial`}
                type={filter.type === "date" ? "date" : "number"}
                value={(filterStates[filter.controlfield] as string[])[0] || ""}
                onChange={(e) => setFilterStates((prev) => ({ ...prev, [filter.controlfield]: [e.target.value, (prev[filter.controlfield] as string[])[1]] }))}
                className="mt-2 col-span-4"
              />
              <Input
                label={`${filter.placeholder} final`}
                type={filter.type === "date" ? "date" : "number"}
                value={(filterStates[filter.controlfield] as string[])[1] || ""}
                onChange={(e) => setFilterStates((prev) => ({ ...prev, [filter.controlfield]: [(prev[filter.controlfield] as string[])[0], e.target.value] }))}
                className="mt-2 col-span-4"
              />
            </>
          )}
          {filter.field === "select" && filter.options && (
            <Select
              label={filter.placeholder}
              selectedKeys={filterStates[filter.controlfield] ? new Set([filterStates[filter.controlfield]]) : new Set()}
              onSelectionChange={(keys) =>
                setFilterStates((prev) => ({ ...prev, [filter.controlfield]: Array.from(keys).join(", ") }))
              }
            >
              {filter.options.map((option) => (
                <SelectItem key={option.value}>{option.label}</SelectItem>
              ))}
            </Select>
          )}
          {filter.field === "checkbox" && (
            <Checkbox
              isSelected={filterStates[filter.controlfield] as boolean}
              onChange={(e) => setFilterStates((prev) => ({ ...prev, [filter.controlfield]: e.target.checked }))}
            >
              {filter.placeholder}
            </Checkbox>
          )}
          {filter.field === "tags" && filter.itemList && (
            <>
              <Autocomplete
                allowsCustomValue
                defaultItems={filter.itemList.map((item) => ({ key: item }))}
                label={filter.field}
                className="col-span-6"
                placeholder={filter.placeholder}
                inputValue={inputValue}
                onInputChange={(value) => setInputValue(value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                  }
                }}
              >
                {(item: { key: string }) => <AutocompleteItem key={item.key}>{item.key}</AutocompleteItem>}
              </Autocomplete>
              <Button onClick={() => handleAddTag()} className="col-span-2">
                Adicionar Tag
              </Button>
              <div className="flex flex-wrap gap-2 mt-2">
              {filterStates[filter.controlfield]?.map && filterStates[filter.controlfield].map((tag: string, index: number) => (
                <Chip
                  key={index}
                  onClose={() => handleRemoveTag(filter.controlfield, tag)}
                  onClick={() => handleChipClick(filter.controlfield, index)}
                  color={tag.startsWith("+") ? "success" : tag.startsWith("-") ? "danger" : "default"}
                  className="cursor-pointer"
                >
                  {tag}
                </Chip>
              ))}
              </div>
            </>
          )}
          {filter.field === "multi-select" && filter.options && (
            <Select
              label={filter.placeholder}
              selectionMode="multiple"
              placeholder={filter.placeholder || "Selecione opções"}
              selectedKeys={filterStates[filter.controlfield] || new Set()}
              onSelectionChange={(keys) => handleMultiSelectChange(keys, filter.controlfield)}
              className="max-w-xs"
            >
              {filter.options.map((option) => (
                <SelectItem key={option.value}>{option.label}</SelectItem>
              ))}
            </Select>
          )}
        </div>
      ))}
    </div>
  );
}
