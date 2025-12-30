// CustomSubHeader.tsx
import React from "react";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  ArrowClockwise,
  FileEarmarkExcel,
  Printer,
} from "react-bootstrap-icons";
import TextField from "@/components/TextField/textField";
import styles from "./adminArticle.module.scss";

interface CustomSubHeaderProps {
  search: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  categoryOptions: any[];
  handleCategoryChange: (selectedValue: any) => void;
  categorySelectedData: any;
  statusOptions: any[];
  handleStatusChange: (selectedValue: any) => void;
  statusSelectedData: any;
  resetFilters: () => void;
  isAnyFilterActive: boolean; // Determine if filters are active
  authorOptions: any[];
  handleAuthorChange: (selectedValue: any) => void;
  authorSelectedData: any;
  printDocumentData: any[];
  handlePrintPDF: () => void;
  downloadExcel: () => void;
}

const CustomSubHeader: React.FC<CustomSubHeaderProps> = ({
  search,
  onInputChange,
  categoryOptions,
  handleCategoryChange,
  categorySelectedData,
  statusOptions,
  handleStatusChange,
  statusSelectedData,
  authorOptions,
  handleAuthorChange,
  authorSelectedData,
  resetFilters,
  isAnyFilterActive, // Check if any filter is active
  printDocumentData,
  handlePrintPDF,
  downloadExcel,
}) => {
  return (
    <div className={styles.customSubHeaderCon}>
      <div className={styles.textAndSelectCon}>
        <TextField
          placeholder="Title"
          value={search}
          onChange={onInputChange}
          type="text"
          className={styles.textFieldStyles2}
        />
        <SearchableSelect
          options={categoryOptions}
          onChange={handleCategoryChange}
          disabled={false}
          placeholder="Category"
          className={styles.textFieldStyles}
          singleSelectedData={categorySelectedData}
        />
        <SearchableSelect
          options={statusOptions}
          onChange={handleStatusChange}
          disabled={false}
          placeholder="Status"
          className={styles.textFieldStyles}
          singleSelectedData={statusSelectedData}
        />
        <SearchableSelect
          options={authorOptions}
          onChange={handleAuthorChange}
          disabled={false}
          placeholder="Author"
          className={styles.textFieldStyles}
          singleSelectedData={authorSelectedData}
        />
        {isAnyFilterActive && (
          <div>
            <button onClick={resetFilters} className={styles.resetButton}>
              <ArrowClockwise /> Reset Filters
            </button>
          </div>
        )}
      </div>

      {printDocumentData?.length > 0 && (
        <div className={styles.headerIconCon}>
          <span
            className={styles.iconStyles}
            onClick={() => {
              if (printDocumentData?.length) {
                handlePrintPDF();
              }
            }}
            title="Print PDF"
          >
            <Printer />
          </span>
          <span
            className={styles.iconStyles}
            onClick={() => {
              if (printDocumentData?.length) {
                downloadExcel();
              }
            }}
            title="Export to Excel"
          >
            <FileEarmarkExcel />
          </span>
        </div>
      )}
    </div>
  );
};

export default CustomSubHeader;
