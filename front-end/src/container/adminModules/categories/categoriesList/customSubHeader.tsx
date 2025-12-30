// CustomSubHeader.tsx
import React from "react";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import TextField from "@/components/TextField/textField";
import styles from "./categoriesList.module.scss";
import { ArrowClockwise } from "react-bootstrap-icons";
interface CategoryOption {
  value: string;
  label: string;
}
interface CustomSubHeaderProps {
  search: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  categoryOptions: CategoryOption[];
  handleCategoryChange: (selectedValue: CategoryOption | null) => void;
  resetFilters: () => void;
  isAnyFilterActive: boolean; // Determine if filters are active
  categorySelectedData: CategoryOption | null;
}
const CustomSubHeader: React.FC<CustomSubHeaderProps> = ({
  search,
  onInputChange,
  categoryOptions,
  handleCategoryChange,
  categorySelectedData,
  resetFilters,
  isAnyFilterActive, // Check if any filter is active
}) => (
  <div className={styles.customSubHeaderCon}>
    <div className={styles.textAndSelectCon}>
      <TextField
        placeholder="Search by Value"
        value={search}
        onChange={onInputChange}
        type="text"
        className={styles.textFieldStyles}
      />
      <SearchableSelect
        options={categoryOptions}
        onChange={(selectedOption) => handleCategoryChange(selectedOption)}
        disabled={false}
        placeholder="Master Type"
        className={styles.textFieldStyles}
        singleSelectedData={categorySelectedData}
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

export default CustomSubHeader;
