// CustomHeader.tsx
import React from "react";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  Printer,
  FileEarmarkExcel,
  ArrowClockwise,
} from "react-bootstrap-icons";
import TextField from "@/components/TextField/textField";
import styles from "./subscriptionList.module.scss";

interface CustomHeaderProps {
  search: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  planTypes: { value: string; label: string }[];
  handlePlanChange: (selectedValue: any) => void;
  selectedPlanData: any;
  options: { value: string; label: string }[];
  handleSelectChange: (selectedValue: any) => void;
  singleSelectedData: any;
  printDocumentData: any[];
  handlePrintPDF: () => void;
  downloadExcel: () => void;
  resetFilters: () => void;
  isAnyFilterActive: boolean; // Determine if filters are active
}

const CustomHeader: React.FC<CustomHeaderProps> = ({
  search,
  onInputChange,
  planTypes,
  handlePlanChange,
  selectedPlanData,
  options,
  handleSelectChange,
  singleSelectedData,
  printDocumentData,
  handlePrintPDF,
  downloadExcel,
  resetFilters,
  isAnyFilterActive, // Check if any filter is active
}) => (
  <div className={styles.customSubHeaderCon}>
    <div className={styles.textAndSelectCon}>
      <TextField
        placeholder="Search by Name"
        value={search}
        onChange={onInputChange}
        type="text"
        className={styles.textFieldStyles}
      />
      <SearchableSelect
        options={planTypes}
        onChange={handlePlanChange}
        disabled={false}
        placeholder="Plan"
        singleSelectedData={selectedPlanData}
      />
      {/* <SearchableSelect
        options={options}
        onChange={handleSelectChange}
        disabled={false}
        placeholder="Status"
        singleSelectedData={singleSelectedData}
      /> */}
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
          onClick={handlePrintPDF}
          title="Print PDF"
        >
          <Printer />
        </span>
        <span
          className={styles.iconStyles}
          onClick={downloadExcel}
          title="Export to Excel"
        >
          <FileEarmarkExcel />
        </span>
      </div>
    )}
  </div>
);

export default CustomHeader;
