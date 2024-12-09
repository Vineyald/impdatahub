/**
 * Filters data based on the provided filter states.
 * 
 * @param data - The array of data to filter.
 * @param filterStates - An object where keys are field names and values are the filter criteria.
 * @returns A filtered array of data.
 */
export function applyFilters<T extends Record<string, unknown>>(
    data: T[],
    filterStates: Record<string, string | number | boolean>
  ): T[] {
    return data.filter((item) => {
      return Object.entries(filterStates).every(([field, value]) => {
        if (typeof value === 'string' && value.length === 0) return true;
  
        const fieldValue = getNestedValue(item, field);
  
        if (Array.isArray(fieldValue)) {
          // Handle array fields (e.g., lists of cities)
          return fieldValue.some((element) =>
            String(element).toLowerCase().includes(String(value).toLowerCase())
          );
        }
  
        if (typeof fieldValue === "string") {
          // Handle string fields
          return fieldValue.toLowerCase().includes(String(value).toLowerCase());
        }
  
        if (typeof fieldValue === "number") {
          // Handle numeric fields
          return fieldValue === Number(value);
        }
  
        if (typeof fieldValue === "boolean") {
          // Handle boolean fields
          return fieldValue === Boolean(value);
        }
  
        return false; // Default case: no match
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
function getNestedValue<T extends Record<string, unknown>>(obj: T, path: string): unknown {
    return path.split('.').reduce((acc: unknown, key: string) => {
      if (acc && typeof acc === "object") {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined; // Stop traversing if the path is invalid
    }, obj);
  }
  