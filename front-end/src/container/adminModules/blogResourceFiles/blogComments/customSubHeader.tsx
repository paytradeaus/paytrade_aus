import React from "react";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { filterByDuration } from "@/common/constants/data";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import styles from "./blogCommnets.module.scss";

interface CommentsListSubHeaderProps {
  status: { value: string; label: string }[];
  handleStatusChange: (selectedValue: any) => void;
  handleActivityChange: (selectedValue: any) => void;
  singleActivyDate: { value: string; label: string };
  isCustomDate: boolean;
  activityLogStartDate: Date;
  setActivityLogStartDate: React.Dispatch<React.SetStateAction<Date>>;
  activityLogEndDate: Date;
  setActivityLogEndDate: React.Dispatch<React.SetStateAction<Date>>;
}

const CommentsListSubHeader: React.FC<CommentsListSubHeaderProps> = ({
  status,
  handleStatusChange,
  handleActivityChange,
  singleActivyDate,
  isCustomDate,
  activityLogStartDate,
  setActivityLogStartDate,
  activityLogEndDate,
  setActivityLogEndDate,
}) => {
  return (
    <div className={styles.customSubHeaderCon}>
      <div className={styles.textAndSelectCon}>
        <SearchableSelect
          options={status}
          onChange={handleStatusChange}
          disabled={false}
          placeholder="Status"
          className={styles.textFieldStyles}
        />
        <SearchableSelect
          options={filterByDuration}
          onChange={handleActivityChange}
          disabled={false}
          placeholder="Activity Range"
          selectedData={singleActivyDate}
        />
        {isCustomDate && (
          <>
            <CustomDatePicker
              showIcon={true}
              toggleCalendarOnIconClick
              placeholderText="&nbsp;From date"
              selected={activityLogStartDate}
              value={activityLogStartDate}
              onChange={(selectedDate: Date) => {
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
              className={styles.DatePickerCustomStyles}
            />
            <CustomDatePicker
              showIcon={true}
              toggleCalendarOnIconClick
              placeholderText="&nbsp;To date"
              selected={activityLogEndDate}
              value={activityLogEndDate}
              onChange={(selectedDate: Date) => {
                let toDate = new Date(selectedDate);
                if (toDate < activityLogStartDate) {
                  return;
                } else {
                  setActivityLogEndDate(toDate);
                }
              }}
              disabled={false}
              className={styles.DatePickerCustomStyles}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default CommentsListSubHeader;
