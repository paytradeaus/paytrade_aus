import React from "react";

interface PaginationProps {
  totalEntries: number;
  entriesPerPageOptions: number[];
  onEntriesPerPageChange: (entries: number) => void;
  onPageChange: (page: number) => void;
  currentPage: number;
  entriesPerPage: number;
}

const PaginationComponent: React.FC<PaginationProps> = ({
  totalEntries = 0,
  entriesPerPageOptions,
  onEntriesPerPageChange,
  onPageChange,
  currentPage = 1,
  entriesPerPage = 0,
}) => {
  const totalPages = Math.ceil(totalEntries / entriesPerPage);

  const startEntry = (currentPage - 1) * entriesPerPage + 1;
  const endEntry = Math.min(currentPage * entriesPerPage, totalEntries);

  return (
    <div className="pagination_container">
      <div className="entries-per-page">
        <select
          value={entriesPerPage}
          onChange={(e) => onEntriesPerPageChange(parseInt(e.target.value))}
          disabled={totalEntries === 0}
        >
          {entriesPerPageOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span className="entries_per_page">ENTRIES PER PAGE</span>
      </div>

      <div className="page-controls">
        <button onClick={() => onPageChange(1)} disabled={currentPage === 1}>
          &laquo;
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          &lsaquo;
        </button>
        <span className="current-page">{currentPage}</span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || !totalPages}
        >
          &rsaquo;
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages || !totalPages}
        >
          &raquo;
        </button>
      </div>

      <div className="entry-info">
        <span>
          SHOWING {startEntry} TO {endEntry} OF {totalEntries} ENTRIES
        </span>
      </div>
    </div>
  );
};

export default PaginationComponent;
