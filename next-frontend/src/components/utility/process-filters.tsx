/**
 * Filters data based on the provided filter states.
 * 
 * @param data - The array of data to filter.
 * @param filterStates - An object where keys are field names and values are the filter criteria.
 * @param tagControl - The key path (e.g., "produtos.descricao") specifying the column to be filtered by tags.
 * @returns A filtered array of data.
 */
export function applyFilters<T>(data: T[], filterStates: Record<string, unknown>, tagControl?: string): T[] {
  return data.filter((item) => {
    return Object.entries(filterStates).every(([field, value]) => {
      if (value === "" || (Array.isArray(value) && value.length === 0)) return true;

      const fieldValue = getNestedValue(item as Record<string, unknown>, field);

      // Handle date range filtering
      if (Array.isArray(value) && value.length === 2 && value.every((v) => v && !isNaN(Date.parse(String(v))))) {
        const [startDate, endDate] = value.map((v) => new Date(v as string));
        const itemDate = new Date(fieldValue as string);

        if (fieldValue && !isNaN(itemDate.getTime())) {
          return itemDate >= startDate && itemDate <= endDate;
        }
        return false; // Invalid date or out of range
      }

      if (field === "tags" && Array.isArray(value)) {
        const tagFieldValue = getNestedValue(item as Record<string, unknown>, tagControl?.toString() || "");
        
        // Log para verificar os dados retornados
        console.log("tagFieldValue (esperado array):", tagFieldValue);
      
        if (!Array.isArray(tagFieldValue)) {
          console.warn("Expected tagFieldValue to be an array, got:", tagFieldValue);
          return false; // Não é um array válido
        }
      
        return value.every((tag) => {
          const isAddTag = tag.startsWith("+");
          const isRemoveTag = tag.startsWith("-");
          const cleanTag = tag.slice(1).trim().toLowerCase();
      
          if (isAddTag) {
            console.log("Checking for presence of tag:", cleanTag);
            return tagFieldValue.some((fv) => String(fv).toLowerCase().includes(cleanTag));
          }
      
          if (isRemoveTag) {
            console.log("Checking for absence of tag:", cleanTag);
            return !tagFieldValue.some((fv) => String(fv).toLowerCase().includes(cleanTag));
          }
      
          return true; // Ignorar tags sem "+" ou "-"
        });
      }      

      // Generic filtering logic
      if (Array.isArray(fieldValue)) {
        return fieldValue.some((element) =>
          String(element).toLowerCase().includes(String(value).toLowerCase())
        );
      }

      if (typeof fieldValue === "string") {
        return fieldValue.toLowerCase().includes(String(value).toLowerCase());
      }

      return true;
    });
  });
}

/**
 * Safely retrieves a nested value from an object using a dot-separated key path.
 * 
 * @param obj - The object to retrieve the value from.
 * @param path - The dot-separated key path (e.g., "address.city").
 * @returns The value at the specified path, or undefined if the path is invalid.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  try {
    return path.split('.').reduce<unknown>((o, key) => {
      if (o && typeof o === 'object' && !Array.isArray(o)) {
        return (o as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  } catch (error) {
    console.error(`Error retrieving nested value for path: ${path}`, error);
    return undefined;
  }
}



