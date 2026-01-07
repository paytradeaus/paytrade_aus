import React from "react";
import { Col } from "react-bootstrap";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import RadioSwitchToggle from "@/components/RadioSwitch/RadioSwitch";
import TextField from "@/components/TextField/textField";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import { transactionsDateOptions } from "../../bankTrustAccount.constant";
import { DD_MM_YYYY } from "@/common/constants/general";
import { FileEarmarkExcel, Printer } from "react-bootstrap-icons";
import styles from "./transactionList.module.scss";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import { useDispatch } from "react-redux";

interface CustomSubHeaderProps {
  search: string;
  onInputChange: (e: { target: { value: string } }) => void;
  selectedToggle: string;
  setSelectedToggle: (toggle: string) => void;
  singleActivyDate: any;
  handleActivityChange: (selectedValue: any) => void;
  isCustomDate: boolean;
  activityLogStartDate: Date;
  setActivityLogStartDate: (date: Date) => void;
  activityLogEndDate: Date;
  setActivityLogEndDate: (date: Date) => void;
  printDocumentData: any[];
  handlePrintPDF: () => void;
  downloadExcel: () => void;
  setSelectedRowsInGrid: any;
  setTimeKey: any;
}

const CustomSubHeader: React.FC<CustomSubHeaderProps> = ({
  search,
  onInputChange,
  selectedToggle,
  setSelectedToggle,
  singleActivyDate,
  handleActivityChange,
  isCustomDate,
  activityLogStartDate,
  setActivityLogStartDate,
  activityLogEndDate,
  setActivityLogEndDate,
  printDocumentData,
  handlePrintPDF,
  downloadExcel,
  setSelectedRowsInGrid,
  setTimeKey,
}) => {
  const dispatch = useDispatch();
  return (
    <div className={styles.customSubHeaderCon}>
      <div className={styles.textAndSelectCon}>
        <Col xl={6} lg={6} md={7} xs={12} className="mb-2">
          <div style={{ minWidth: "240px" }}>
            <RadioSwitchToggle
              radioOptions={[
                {
                  value: "To Review",
                  label: "For Review",
                  hasError: false,
                },
                {
                  value: "Matched",
                  label: "Matched",
                  hasError: true,
                },
                {
                  value: "Excluded",
                  label: "Excluded",
                  hasError: true,
                },
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
          options={transactionsDateOptions}
          onChange={handleActivityChange}
          disabled={false}
          placeholder="Dates"
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
