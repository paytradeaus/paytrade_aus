"use client";
import React from "react";
import { Col } from "react-bootstrap";
import {
  ArrowClockwise,
  FileEarmarkExcel,
  Printer,
} from "react-bootstrap-icons";

import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import RadioSwitchToggle from "@/components/RadioSwitch/RadioSwitch";
import TextField from "@/components/TextField/textField";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";

import styles from "./bookKeepingList.module.scss";
import {
  convertJsonToExcel,
  generateAndPrintPDF,
} from "@/common/commonFunctions";
import { DD_MM_YYYY } from "@/common/constants/general";
import { transactionsDateOptions } from "../bankTrustAccount/bankTrustAccount.constant";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import { useDispatch } from "react-redux";

interface CustomSubHeaderProps {
  search: string;
  onInputChange: (e: { target: { value: string } }) => void;
  selectedToggle: string;
  setSelectedToggle: (toggle: string) => void;
  bankNameOptions: { label: string; value: string }[];
  selectedBank: { label: string; value: string };
  isCustomDate: boolean;
  activityLogStartDate: Date;
  setActivityLogStartDate: (date: Date) => void;
  activityLogEndDate: Date;
  setActivityLogEndDate: (date: Date) => void;
  singleActivyDate: { value: string; label: string };
  printDocumentData: any[];
  handleActivityChange: (selectedValue: any) => void;
  handleContractChange: (selectedValue: any) => void;
  setSelectedRowsInGrid: any;
  setTimeKey: any;
  resetFilters: () => void; // Added resetFilters prop
  isAnyFilterActive: boolean;
}

const CustomSubHeader: React.FC<CustomSubHeaderProps> = ({
  search,
  onInputChange,
  selectedToggle,
  setSelectedToggle,
  bankNameOptions,
  selectedBank,
  isCustomDate,
  activityLogStartDate,
  setActivityLogStartDate,
  activityLogEndDate,
  setActivityLogEndDate,
  singleActivyDate,
  printDocumentData,
  handleActivityChange,
  handleContractChange,
  setSelectedRowsInGrid,
  setTimeKey,
  resetFilters,
  isAnyFilterActive,
}) => {
  const dispatch = useDispatch();
  function downloadExcel() {
    const columnNames = [
      { value: "unique_txn_id", label: "Txn ID" },
      { value: "description", label: "Description" },
      { value: "status", label: "Status" },
      { value: "matched_to", label: "Matched to" },
      { value: "spent_amount", label: "Spent Amount" },
      { value: "received_amount", label: "Received Amount" },
      { value: "txn_date", label: "Txn Date" },
    ];
    convertJsonToExcel(printDocumentData, "Transactions list", columnNames);
  }

  const handlePrintPDF = () => {
    let formattedTableData = printDocumentData?.map((txn) => [
      txn?.unique_txn_id,
      txn?.description,
      txn?.status,
      txn?.matched_to,
      txn?.spent_amount,
      txn?.received_amount,
      txn?.txn_date,
    ]);
    let headerNames = [
      "Txn ID",
      "Description",
      "Status",
      "Matched to",
      "Spent Amount",
      "Received Amount",
      "Txn Date",
    ];
    generateAndPrintPDF(
      formattedTableData,
      headerNames,
      "Transactions list",
      true
    );
  };

  return (
    <div className={styles.customSubHeaderCon}>
      <div className={styles.textAndSelectCon}>
        <Col xl={5} lg={6} md={7} xs={12} className="mb-2">
          <div style={{ minWidth: "240px" }}>
            <RadioSwitchToggle
              radioOptions={[
                { value: "To Review", label: "For Review", hasError: false },
                { value: "Matched", label: "Matched", hasError: true },
                { value: "Excluded", label: "Excluded", hasError: true },
                { value: "All", label: "All", hasError: true },
              ]}
              selected={selectedToggle}
              handleToggleChange={(e: any) => {
                dispatch(setScreenDetails({}));
                setSelectedToggle(e);
                setSelectedRowsInGrid([]);
                setTimeKey(new Date().getTime());
              }}
            />
          </div>
        </Col>

        <TextField
          placeholder="Search"
          value={search}
          onChange={onInputChange}
          type="text"
          autoFocus
          className={styles.textFieldStyles2}
        />
        <SearchableSelect
          options={bankNameOptions}
          onChange={handleContractChange}
          disabled={false}
          placeholder="Account Name"
          singleSelectedData={selectedBank}
          className={styles.textFieldStyles3}
        />

        <SearchableSelect
          options={transactionsDateOptions}
          onChange={handleActivityChange}
          disabled={false}
          placeholder="Dates"
          singleSelectedData={singleActivyDate}
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
                  setSelectedRowsInGrid([]);
                  setTimeKey(new Date().getTime());
                  setActivityLogStartDate(fromDate);
                  setActivityLogEndDate(new Date(selectedDate));
                } else {
                  setSelectedRowsInGrid([]);
                  setTimeKey(new Date().getTime());
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
                  setSelectedRowsInGrid([]);
                  setTimeKey(new Date().getTime());
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
};

export default CustomSubHeader;
