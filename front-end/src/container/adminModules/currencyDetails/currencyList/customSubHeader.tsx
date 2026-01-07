import React from "react";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import TextField from "@/components/TextField/textField";
import styles from "./currencyList.module.scss";
import { ArrowClockwise } from "react-bootstrap-icons";

interface CategoryOption {
  value: string;
  label: string;
}

interface CustomSubHeaderProps {
  search: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  options: CategoryOption[];
  handleSelectChange: (selectedValue: CategoryOption | null) => void;
  resetFilters: () => void;
  isAnyFilterActive: boolean; // Determine if filters are active
  selectedData: CategoryOption | null;
}
const CustomSubHeader: React.FC<CustomSubHeaderProps> = ({
  search,
  onInputChange,
  options,
  handleSelectChange,
  selectedData,
  resetFilters,
  isAnyFilterActive, // Check if any filter is active
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
          options={options}
          onChange={handleSelectChange}
          disabled={false}
          placeholder="Status"
          selectedData={selectedData}
        />
        {isAnyFilterActive && (
          <div>
            <button onClick={resetFilters} className={styles.resetButton}>
              <ArrowClockwise /> Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomSubHeader;
