import { MM_DD_YYYY, MM_YYYY } from "@/common/constants/general";
import { getMonth, getYear } from "date-fns";

import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import customStyles from "./customDatePicker.module.scss";

const CURRENT_YEAR = new Date().getFullYear();

interface DatePickerProps {
  showIcon?: boolean;
  toggleCalendarOnIconClick?: boolean;
  placeholderText?: any;
  className?: string;
  selected?: any;
  onChange?: any;
  disabled?: any;
  label?: string;
  labelStyles?: any;
  format?: string;
  maxDate?: Date;
  maxYear?: number;
  value?: any;
  minDate?: Date;
  showMonthYearPicker?: boolean;
  renderMonthYearPicker?: boolean;
  onBlur?: any;
  hasError?: boolean;
}

function CustomDatePicker({
  showIcon,
  toggleCalendarOnIconClick,
  placeholderText,
  className = "",
  disabled,
  label,
  value,
  onChange,
  labelStyles = "",
  format = MM_DD_YYYY,
  maxDate,
  minDate,
  maxYear = CURRENT_YEAR,
  showMonthYearPicker = false,
  renderMonthYearPicker = false,
  onBlur,
  hasError = false,
}: Readonly<DatePickerProps>) {
  function getYears(startYear = 1950) {
    const years = [];

    for (let year = startYear; year <= maxYear; year++) {
      years.push(year);
    }

    return years;
  }

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const renderMonthContent: any = (
    month: any,
    shortMonth: any,
    longMonth: any,
    day: any
  ) => {
    const fullYear = new Date(day).getFullYear();
    const tooltipText = `Tooltip for month: ${longMonth} ${fullYear}`;

    return <span title={tooltipText}>{shortMonth}</span>;
  };

  return (
    <div className="datePickerIcon">
      {label && (
        <div className={`${customStyles.label} ${labelStyles}`}>{label}</div>
      )}
      {renderMonthYearPicker ? (
        <ReactDatePicker
          selected={value}
          renderMonthContent={renderMonthContent}
          showMonthYearPicker
          dateFormat={MM_YYYY}
          showIcon={showIcon}
          placeholderText={placeholderText}
          disabled={disabled}
          maxDate={maxDate}
          minDate={minDate}
          onChange={onChange}
          className={
            hasError
              ? `${customStyles.errorField} ${customStyles.field} ${className} `
              : `${customStyles.field} ${className}`
          }
        />
      ) : (
        <ReactDatePicker
          renderCustomHeader={({
            date,
            changeYear,
            changeMonth,
            decreaseMonth,
            increaseMonth,
            prevMonthButtonDisabled,
            nextMonthButtonDisabled,
          }) => (
            <div className="datePickerPosition">
              <button
                onClick={decreaseMonth}
                disabled={prevMonthButtonDisabled}
                type="button"
              >
                {"<"}
              </button>
              <select
                value={getYear(date)}
                onChange={({ target: { value } }) => changeYear(+value)}
              >
                {getYears().map((option: any) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <select
                value={months[getMonth(date)]}
                onChange={({ target: { value } }) =>
                  changeMonth(months.indexOf(value))
                }
              >
                {months.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <button
                onClick={increaseMonth}
                disabled={nextMonthButtonDisabled}
                type="button"
              >
                {">"}
              </button>
            </div>
          )}
          showIcon={showIcon}
          selected={value}
          placeholderText={placeholderText}
          disabled={disabled}
          dateFormat={format || MM_DD_YYYY}
          maxDate={maxDate}
          minDate={minDate}
          onChange={onChange}
          className={
            hasError
              ? `${className} ${customStyles.errorField} ${customStyles.field} `
              : `${customStyles.field} ${className}`
          }
          onBlur={onBlur}
        />
      )}
    </div>
  );
}

export default CustomDatePicker;
