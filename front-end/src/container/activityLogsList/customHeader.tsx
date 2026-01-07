// CustomSubHeader.tsx
import React from "react";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import styles from "./activityLogsList.module.scss";
import { DD_MM_YYYY } from "@/common/constants/general";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import {
  ArrowClockwise,
  FileEarmarkExcel,
  Printer,
} from "react-bootstrap-icons";

const CustomSubHeader: React.FC<{
  eventOptions: { value: string; label: string }[];
  filterByDuration: { value: any; label: string }[];
  singleEventType: any;
  handleEventChange: (selectedValue: any) => void;
  singleActivyDate: any;
  handleActivityChange: (selectedValue: any) => void;
  resetFilters: () => void;
  isAnyFilterActive: boolean; // Determine if filters are active
  isCustomDate: boolean;
  activityLogStartDate: Date;
  setActivityLogStartDate: React.Dispatch<React.SetStateAction<Date>>;
  activityLogEndDate: Date;
  setActivityLogEndDate: React.Dispatch<React.SetStateAction<Date>>;
  printDocumentData: any[];
  handlePrintPDF: () => void;
  downloadExcel: () => void;
}> = ({
  eventOptions,
  filterByDuration,
  singleEventType,
  handleEventChange,
  singleActivyDate,
  handleActivityChange,
  isCustomDate,
  activityLogStartDate,
  setActivityLogStartDate,
  activityLogEndDate,
  setActivityLogEndDate,
  printDocumentData,
  resetFilters,
  isAnyFilterActive,
  handlePrintPDF,
  downloadExcel,
}) => (
  <div className={styles.customSubHeaderCon}>
    <div className={styles.textAndSelectCon}>
      <div className={styles.fieldsWraper}>
        {/* <SearchableSelect
          options={[]}
          onChange={() => {}}
          disabled={false}
          placeholder="User"
          className={styles.textFieldStyles}
        /> */}
        <SearchableSelect
          options={eventOptions}
          onChange={handleEventChange}
          disabled={false}
          placeholder="Event categories"
          selectedData={singleEventType}
          className={styles.textFieldStyles2}
        />
        <SearchableSelect
          options={filterByDuration}
          onChange={handleActivityChange}
          disabled={false}
          placeholder="Activity Range"
          selectedData={singleActivyDate}
          className={styles.textFieldStyles}
        />
      </div>
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

export default CustomSubHeader;
