import React, { ChangeEvent, FC } from "react";
import {
  Printer,
  FileEarmarkExcel,
  ArrowClockwise,
} from "react-bootstrap-icons";
import TextField from "@/components/TextField/textField";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import styles from "./usersList.module.scss";

type Option = {
  value: string;
  label: string;
};

type CustomSubHeaderProps = {
  search: string;
  options: Option[];
  onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleSelectChange: (selectedValue: Option | null) => void;
  singleSelectedData: Option | null;
  userData: any[];
  handlePrintPDF: () => void;
  downloadExcel: () => void;
  resetFilters: () => void;
  isAnyFilterActive: boolean; // Determine if filters are active
};

const CustomSubHeader: FC<CustomSubHeaderProps> = ({
  search,
  options,
  onInputChange,
  handleSelectChange,
  singleSelectedData,
  userData,
  handlePrintPDF,
  downloadExcel,
  resetFilters,
  isAnyFilterActive, // Check if any filter is active
}) => {
  return (
    <div className={styles.customSubHeaderCon}>
      <div className={styles.textAndSelectCon}>
        <TextField
          placeholder="Search by Name, Email"
          value={search}
          onChange={onInputChange}
          type="text"
          className={styles.textFieldStyles}
        />
        <SearchableSelect
          options={options}
          onChange={handleSelectChange}
          disabled={false}
          placeholder="Status"
          singleSelectedData={singleSelectedData}
        />
        {/* Conditionally show Reset Button only when any filter is active */}
        {isAnyFilterActive && (
          <div>
            <button onClick={resetFilters} className={styles.resetButton}>
              <ArrowClockwise /> Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Show Print and Excel export buttons only if there is user data */}
      {userData.length > 0 && (
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
};

export default CustomSubHeader;
