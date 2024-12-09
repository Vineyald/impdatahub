// src/components/BottomContent.tsx
import React from "react";
import { Pagination } from "@nextui-org/react";


interface PaginationHandlerProps<T> {
    data: T[];
    rowsPerPage: number;
    currentPage: number;
    onPageChange: (page: number) => void;
}

export function BottomContentComponent<T>({
  data,
  rowsPerPage,
  currentPage,
  onPageChange,
}: PaginationHandlerProps<T>) {
    const pages = Math.ceil(data.length / rowsPerPage);

    const paginatedData = React.useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        return data.slice(start, end);
    }, [data, rowsPerPage, currentPage]);
    
    return {
        paginatedData,
        bottomContent: (
            <div className="py-2 px-2 flex justify-between items-center">
                <Pagination
                    isCompact
                    showControls
                    classNames={{
                        cursor: "bg-foreground text-background",
                    }}
                    color="default"
                    page={currentPage}
                    total={pages}
                    onChange={onPageChange}
                />
                <span className="text-md text-default-500">
                    Total de registos: {data.length}
                </span>
            </div>
        ),
    };
}
