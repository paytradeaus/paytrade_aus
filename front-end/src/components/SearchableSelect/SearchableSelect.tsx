import React, { FC, useEffect, useMemo, useState } from "react";
import Select from "react-select";

import styles from "./SearchableSelect.module.css";

import { RootState, useAppSelector } from "@/redux/store";

interface SearchableSelectProps {
  options: any;
  label?: string;
  onChange: (value: any) => any;
  disabled?: boolean;
  placeholder?: string;
  isRequired?: boolean;
  isInPopup?: boolean;
  errorMessage?: string;
  controlStyles?: any;
  isMulti?: boolean;
  selectedData?: any;
  multiSelectedData?: any;
  className?: any;
  renderKey: string;
  valueKey: string;
  required?: boolean;
  name?: string;
  miniSelect?: boolean;
  secondLabel?: string;
  onSecondLabelClick?: () => void;
}

const SearchableSelect: FC<SearchableSelectProps> = ({
  options,
  label,
  onChange,
  disabled = false,
  placeholder,
  isRequired = false,
  isInPopup = false,
  errorMessage = "This field is required.",
  controlStyles,
  isMulti,
  selectedData,
  multiSelectedData,
  className,
  required,
  name,
  renderKey,
  valueKey,
  miniSelect,
  secondLabel,
  onSecondLabelClick = () => {},
  ...rest
}) => {
  const [value, setValue] = useState(selectedData || multiSelectedData); // For single select

  const getTheme: any = useAppSelector(
    (state: RootState) => state?.appTheme?.currentTheme
  );

  function isLightTheme() {
    return getTheme === "light";
  }

  const customStyles = useMemo(
    () => ({
      option: (provided: any, state: any) => ({
        ...provided,
        padding: "2px 10px",
        // Match the native <select> highlight used by FormikControl SELECT
        // elsewhere in the app: charcoal/dark band with white text on
        // focus/hover/selected. Full text wrap so long account names
        // highlight cleanly across every wrapped line.
        backgroundColor:
          state?.isFocused || state?.isSelected ? "#3a3f4b" : "transparent",
        color: state?.isFocused || state?.isSelected ? "#ffffff" : "",
        whiteSpace: "normal",
        wordBreak: "break-word",
        cursor: "pointer",
        "&:hover": {
          backgroundColor: "#3a3f4b",
          color: "#ffffff",
        },
        "&:active": {
          backgroundColor: "#2a3140",
        },
        ...(controlStyles?.option && controlStyles?.option(provided)),
      }),
      control: (provided: any) => ({
        ...provided,
        boxShadow: "none", // Preserving inline style
        minHeight: "30px", // Set the height of the input
        height: miniSelect ? "30px" : "48px",
        color: "#000", // Text color inside the control
        borderWidth: "2px",
        margin: 0,
        background: isLightTheme() ? "#fbfcfc" : "#1c212c",

        ...(miniSelect ? { fontSize: "12px" } : {}),
        "&:hover": {
          color: "#000", // Hover text color
        },

        border: isLightTheme()
          ? "0.12rem solid #cfd5e2"
          : "0.12rem solid #2a3140",
        ...(errorMessage &&
          isRequired && {
            border: "1px solid #f08e8b ",
            backgroundColor: "#fde5e3",
          }),
        ...(controlStyles?.control && controlStyles?.control(provided)),
      }),
      menu: (provided: any) => ({
        ...provided,
        margin: "0px",
        borderRadius: "0px",
        zIndex: "2",
        backgroundColor: isLightTheme() ? "#fbfcfc" : "#1c212c", // Dropdown menu background color
        padding: 0,
        ...(controlStyles?.menu && controlStyles?.menu(provided)),
      }),
      menuList: (provided: any) => ({
        ...provided,
        paddingTop: "0px",
        paddingBottom: "0px",
        ...(controlStyles?.menuList && controlStyles?.menuList(provided)),
      }),
      valueContainer: (provided: any) => ({
        ...provided,
        ...(controlStyles?.valueContainer &&
          controlStyles?.valueContainer(provided)),
      }),
      indicatorsContainer: (provided: any) => ({
        ...provided,
        height: miniSelect ? "30px" : "48px",
      }),
      input: (provided: any) => ({
        ...provided,
        color: isLightTheme() ? "#1c212c" : "#fbfcfc", // Placeholder text color
        height: miniSelect ? "30px" : "48px",
        marginTop: "-4px", // Removes extra margins
        paddingBottom: "4px", // Reduce the bottom space
        paddingLeft: "4px", // Reduce the left space
      }),
      placeholder: (provided: any) => ({
        ...provided,
        paddingLeft: "4px",
        color: isLightTheme() ? "#676e7c" : "#7d8496", // Placeholder text color
      }),
      singleValue: (provided: any) => ({
        ...provided,
        color: isLightTheme()
          ? disabled
            ? "#23262cc2"
            : "#1c212c"
          : disabled
          ? "#e0e3e7d6"
          : "#fbfcfc", // Set the text color of the selected value to red
        paddingBottom: "4px", // Reduce the bottom space
        paddingLeft: "4px", // Reduce the left space
      }),
    }),

    [getTheme, disabled]
  );

  useEffect(() => {
    setValue(
      isMulti
        ? multiSelectedData.length
          ? multiSelectedData
          : []
        : selectedData || null
    );
  }, [selectedData, multiSelectedData]);

  const handleChange = (newValue: any) => {
    setValue(newValue);

    onChange(newValue);
  };

  function modifiedAvailableOptions() {
    return options?.map((x: any, index: number) => {
      return { ...x, label: x?.[renderKey], value: x?.[valueKey] };
    });
  }

  const showError = isRequired && (isMulti ? !value?.length : !value);

  return (
    <div className={styles.mainContainer}>
      {label && (
        <label htmlFor={name} className="d_flex_justify_sb">
          <div>
            <small>{label}</small>
            {/* Display label with asterisk if required */}
            {required && <span className="required">*</span>}
          </div>
          {secondLabel && (
            <span
              onClick={() => onSecondLabelClick()}
              className="cu-pointer linkStyles"
            >
              {secondLabel}
            </span>
          )}
        </label>
      )}
      <Select
        options={modifiedAvailableOptions()}
        isMulti={isMulti}
        value={value}
        onChange={handleChange}
        isDisabled={disabled}
        placeholder={placeholder}
        formatOptionLabel={(data: any) => (
          <div dangerouslySetInnerHTML={{ __html: data.label }} />
        )}
        styles={
          isInPopup
            ? {
                ...customStyles,
                menu: (provided) => ({
                  ...provided,
                  margin: "0px",
                  borderRadius: "0px",
                  zIndex: "2",
                  backgroundColor: isLightTheme() ? "#fbfcfc" : "#1c212c",
                  padding: 0,
                  ...(controlStyles?.menu && controlStyles.menu(provided)),
                }),
                menuList: (provided) => ({
                  ...provided,
                  maxHeight: "7rem", // limits the height of the list
                  overflowY: "auto", // enables vertical scrolling via mouse wheel
                  // Optionally, enable smooth scrolling on touch devices
                  WebkitOverflowScrolling: "touch",
                }),
              }
            : customStyles
        }
        className={className}
        isSearchable
        {...rest}
      />
      {showError && (
        <small className="invalid mt_0_5 cur-default">
          <i className="fa-light fa-circle-xmark cur-default"></i>
          {/* Icon for the error message */}
          {errorMessage}
        </small>
      )}
    </div>
  );
};

export default SearchableSelect;
