import React from "react";
import styles from "./interestChargesList.module.scss";
import TextField from "@/components/TextField/textField";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import { Printer, FileEarmarkExcel } from "react-bootstrap-icons";
import { DD_MM_YYYY } from "@/common/constants/general";
import {
  interestDateOptions,
  interestStatusOptions,
} from "../../bankTrustAccount.constant";

// types.ts
export interface SelectOption {
  value: string;
  label: string;
}

export interface CustomSubHeaderProps {
  searchValue: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  activeInterestTab: string;
  handleInterestStatusChange: (selectedValue: SelectOption) => void;
  selectedData: SelectOption;
  handleActivityChange: (selectedValue: SelectOption) => void;
  singleActivyDate: SelectOption;
  isCustomDate: boolean;
  activityLogStartDate: Date;
  setActivityLogStartDate: (date: Date) => void;
  activityLogEndDate: Date;
  setActivityLogEndDate: (date: Date) => void;
  handlePrintPDF: () => void;
  downloadExcel: () => void;
  printDocumentData: any[];
}

const CustomSubHeader: React.FC<CustomSubHeaderProps> = ({
  searchValue,
  onInputChange,
  activeInterestTab,
  handleInterestStatusChange,
  selectedData,
  handleActivityChange,
  singleActivyDate,
  isCustomDate,
  activityLogStartDate,
  setActivityLogStartDate,
  activityLogEndDate,
  setActivityLogEndDate,
  handlePrintPDF,
  downloadExcel,
  printDocumentData,
}) => (
  <div className={styles.customSubHeaderCon}>
    <div className={styles.textAndSelectCon}>
      <TextField
        placeholder="Search"
        value={searchValue}
        onChange={onInputChange}
        type="text"
        autoFocus
        className={styles.textFieldStyles2}
      />

      {activeInterestTab === "currentAccounts" && (
        <SearchableSelect
          options={interestStatusOptions}
          onChange={handleInterestStatusChange}
          disabled={false}
          placeholder="All Status"
          selectedData={selectedData}
          className={styles.textFieldStyles3}
        />
      )}
      <SearchableSelect
        options={interestDateOptions}
        onChange={handleActivityChange}
        disabled={false}
        placeholder="select option"
        selectedData={singleActivyDate}
        className={styles.textFieldStyles}
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
