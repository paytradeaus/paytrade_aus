// CustomSubHeader.tsx
import React from "react";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import styles from "./communication.module.scss";
import { DD_MM_YYYY } from "@/common/constants/general";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import { ArrowClockwise } from "react-bootstrap-icons";

const CustomSubHeader: React.FC<{
  activityDateOptions: { value: string; label: string }[];
  singleActivyDate: any;
  handleActivityChange: (selectedValue: any) => void;
  isCustomDate: boolean;
  activityLogStartDate: Date;
  setActivityLogStartDate: React.Dispatch<React.SetStateAction<Date>>;
  activityLogEndDate: Date;
  resetFilters: () => void;
  isAnyFilterActive: boolean; // Determine if filters are active
  setActivityLogEndDate: React.Dispatch<React.SetStateAction<Date>>;
}> = ({
  activityDateOptions,
  singleActivyDate,
  handleActivityChange,
  isCustomDate,
  activityLogStartDate,
  setActivityLogStartDate,
  activityLogEndDate,
  setActivityLogEndDate,
  resetFilters,
  isAnyFilterActive, // Check if any filter is active
}) => (
  <div className={styles.customSubHeaderCon}>
    <div className={styles.textAndSelectCon}>
      <SearchableSelect
        options={activityDateOptions}
        onChange={handleActivityChange}
        disabled={false}
        placeholder="select option"
        singleSelectedData={singleActivyDate}
      />
      {isCustomDate && (
        <>
          <CustomDatePicker
            showIcon={true}
            toggleCalendarOnIconClick
            placeholderText="&nbsp;From date"
            selected={activityLogStartDate}
            value={activityLogStartDate}
            onChange={(selectedDate: string) => {
              let fromDate = new Date(
                new Date(selectedDate).setHours(0, 0, 0, 0)
              );
              if (fromDate > activityLogEndDate) {
                setActivityLogStartDate(fromDate);
                setActivityLogEndDate(new Date(selectedDate));
              } else {
                setActivityLogStartDate(fromDate);
              }
            }}
            disabled={false}
            format={DD_MM_YYYY}
            className={styles.DatePickerCustomStyles}
          />
          <CustomDatePicker
            showIcon={true}
            toggleCalendarOnIconClick
            placeholderText="&nbsp;To date"
            selected={activityLogEndDate}
            value={activityLogEndDate}
            onChange={(selectedDate: string) => {
              let toDate = new Date(selectedDate);
              if (toDate < activityLogStartDate) {
                return;
              } else {
                setActivityLogEndDate(toDate);
              }
            }}
            disabled={false}
            format={DD_MM_YYYY}
            className={styles.DatePickerCustomStyles}
          />
        </>
      )}
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
