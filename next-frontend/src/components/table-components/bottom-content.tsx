// src/components/BottomContent.tsx
import React from "react";
import { Pagination } from "@nextui-org/react";


interface PaginationHandlerProps {
    dataCount: number;
    rowsPerPage: number;
    currentPage: number;
    pages: number;
    onPageChange: (page: number) => void;
}

const BottomContentComponent: React.FC<PaginationHandlerProps> = ({ 
  dataCount ,pages, currentPage,
  onPageChange 
}) => {
  return (
    <div className="py-2 px-2 flex justify-between items-center">
      <Pagination
        isCompact
        showControls
        variant="light"
        classNames={{
          cursor: "card-style-primary",
          item: "text-default-200 hover:text-default-900",
          next: "text-default-200",
          prev: "text-default-200",
          forwardIcon: "text-default-200",
        }}
        page={currentPage}
        total={pages}
        onChange={onPageChange}
      />
      <span className="text-md text-default-300">
        Total de registos: {dataCount}
      </span>
    </div>
  );
}

export default BottomContentComponent;