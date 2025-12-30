import React from "react";

type PaginationProps = {
  currentPage: number;
  totalRecords: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

const BlogPagination: React.FC<PaginationProps> = ({
  currentPage,
  totalRecords,
  pageSize,
  onPageChange,
}) => {
  const totalPages = Math.ceil(totalRecords / pageSize);
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  const renderPageButtons = () => {
    const maxDisplay = 3;
    const pages = [];

    let startPage = Math.max(1, currentPage - Math.floor(maxDisplay / 2));
    let endPage = Math.min(totalPages, startPage + maxDisplay - 1);

    // Adjust startPage if endPage reaches totalPages
    startPage = Math.max(1, endPage - maxDisplay + 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages.map((page) => (
      <button
        key={page}
        className={`filterbutton ${page === currentPage ? "active" : ""}`}
        aria-current={page === currentPage ? "true" : undefined}
        onClick={() => handlePageChange(page)}
      >
        {page}
      </button>
    ));
  };

  return (
    <div className="pt_filters pt_pagination">
      <div role="group">
        <button
          className="filterbutton"
          disabled={isFirstPage}
          onClick={() => handlePageChange(1)}
        >
          <i className="fa-light fa-chevrons-left"></i>
        </button>
        <button
          className="filterbutton"
          disabled={isFirstPage}
          onClick={() => handlePageChange(currentPage - 1)}
        >
          <i className="fa-light fa-chevron-left"></i>
        </button>
        {renderPageButtons()}
        <button
          className="filterbutton"
          disabled={isLastPage}
          onClick={() => handlePageChange(currentPage + 1)}
        >
          <i className="fa-light fa-chevron-right"></i>
        </button>
        <button
          className="filterbutton"
          disabled={isLastPage}
          onClick={() => handlePageChange(totalPages)}
        >
          <i className="fa-light fa-chevrons-right"></i>
        </button>
      </div>
    </div>
  );
};

export default BlogPagination;
