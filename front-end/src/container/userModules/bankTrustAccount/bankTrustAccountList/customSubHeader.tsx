import React from "react";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  Printer,
  FileEarmarkExcel,
  ArrowClockwise,
} from "react-bootstrap-icons";
import TextField from "@/components/TextField/textField";
import { bankAccountTypeOptions } from "../bankTrustAccount.constant";
import { IBankTrustAccountDetails } from "../bankTrustAccount.types";
import styles from "./bankTrustAccountList.module.scss";

interface CustomSubHeaderProps {
  search: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleTypeChange: (selectedValue: any) => void;
  bankAccountTypeData: any;
  // setBankAccountTypeData: (value: any) => void;
  printDocumentData: IBankTrustAccountDetails[];
  handlePrintPDF: () => void;
  downloadExcel: () => void;
  resetFilters: () => void;
  isAnyFilterActive: boolean;
}

const CustomSubHeader: React.FC<CustomSubHeaderProps> = ({
  search,
  onInputChange,
  handleTypeChange,
  bankAccountTypeData,
  // setBankAccountTypeData,
  printDocumentData,
  handlePrintPDF,
  downloadExcel,
  resetFilters,
  isAnyFilterActive,
}) => {
  return (
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
          options={bankAccountTypeOptions}
          onChange={handleTypeChange}
          disabled={false}
          placeholder="Select Account Type"
          selectedData={bankAccountTypeData}
          className={styles.textFieldStyles2}
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
};

export default CustomSubHeader;
