import { MM_DD_YYYY } from "@/common/constants/general";
import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const CURRENT_DATE = new Date();
interface DatePickerProps {
  showIcon?: boolean;
  toggleCalendarOnIconClick?: boolean;
  placeholderText?: any;
  className?: any;
  selected?: any;
  onChange?: any;
  disabled?: any;
  label?: string;
  labelStyles?: any;
  format?: string;
  maxDate?: string;
  value?: string;
}
const MyDatePicker: React.FC<DatePickerProps> = ({
  showIcon,
  toggleCalendarOnIconClick,
  placeholderText,
  className,
  selected = "",
  onChange,
  disabled,
  label,
  labelStyles = "",
  format = MM_DD_YYYY,
  maxDate = CURRENT_DATE,
  value = "",
}) => {
  return (
    <div className="datePickerIcon">
      {label && <div className={labelStyles}>{label}</div>}
      <DatePicker
        showIcon={showIcon}
        // toggleCalendarOnIconClick
        placeholderText={placeholderText}
        className={className}
        selected={selected}
        onChange={onChange}
        disabled={disabled}
        dateFormat={format || MM_DD_YYYY}
        maxDate={new Date()}
        value={value}
      />
    </div>
  );
};

export default MyDatePicker;
