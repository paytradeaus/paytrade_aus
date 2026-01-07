import React from "react";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  ArrowClockwise,
  FileEarmarkExcel,
  Printer,
} from "react-bootstrap-icons";
import TextField from "@/components/TextField/textField";
import styles from "./companyProfilesList.module.scss";

type CustomSubHeaderProps = {
  search: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  options: { value: string; label: string }[];
  planOptions: { value: string; label: string }[];
  singleselectedStatus: any;
  singleselectedPlan: any;
  handleSelectChange: (status: any) => void;
  handlePlanChange: (plan: any) => void;
  companiesListdata: any[];
  handlePrintPDF: () => void;
  downloadExcel: () => void;
  resetFilters: () => void;
  isAnyFilterActive: boolean; // Receive isAnyFilterActive prop from parent
};

const CustomSubHeader: React.FC<CustomSubHeaderProps> = ({
  search,
  onInputChange,
  options,
  planOptions,
  singleselectedStatus,
  singleselectedPlan,
  handleSelectChange,
  handlePlanChange,
  companiesListdata,
  handlePrintPDF,
  downloadExcel,
  resetFilters,
  isAnyFilterActive, // Use this prop to determine if any filters are active
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
        options={options}
        onChange={handleSelectChange}
        disabled={false}
        placeholder="Status"
        selectedData={singleselectedStatus}
        className={styles.textFieldStyles2}
      />
      <SearchableSelect
        options={planOptions}
        onChange={handlePlanChange}
        disabled={false}
        placeholder="Subscription"
        selectedData={singleselectedPlan}
        className={styles.textFieldStyles2}
      />
      {isAnyFilterActive && (
        <div>
          <button onClick={resetFilters} className={styles.resetButton}>
            <ArrowClockwise /> Reset Filters
          </button>
        </div>
      )}
    </div>
    {companiesListdata.length > 0 && (
      <div className={styles.headerIconCon}>
        <span
          className={styles.iconStyles}
          onClick={() => {
            if (companiesListdata?.length) {
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
            if (companiesListdata?.length) {
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

export default CustomSubHeader;
