//default imports
import React, { Fragment, useEffect, useState } from "react";
//import from reactstrap components and icons
//import customized styles
import styles from "./RadioSwitch.module.scss";
//import from external libraries
//import from constants, interfaces ,functions and services
//module level constants and interfaces

interface RadioToggleProps {
  radioOptions: Array<any>;
  selected?: string | number;
  handleToggleChange: (value: string | number) => void;
  disabled?: boolean;
}

/**
 * Renders a component for a radio button toggle switch.
 *
 * @param radioOptions {RadioOption[]} - An array of radio option objects.
 *   - Each option object should have properties like `value` and `label`.
 * @param selected - The value of the radio button.
 * @param handleToggleChange {(value: string) => void} - A callback function to handle changes in the selected radio button.
 * @returns The TSX element representing the radio button toggle switch.
 */
function RadioSwitchToggle({
  radioOptions,
  selected,
  handleToggleChange,
  disabled = false,
}: Readonly<RadioToggleProps>) {
  //useState and useEffect Management
  const [selectedToggle, setSelectedToggle] = useState(
    selected //Manages the selected toggle value for the radio button group.
  );

  useEffect(() => {
    setSelectedToggle(selected);
  }, [selected]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { value } = e.target;

    setSelectedToggle(value);
    handleToggleChange(value);
  }

  //Render Template
  return (
    <a className="navbar-brand">
      {/* Radio toggle for filtering */}
      <div className="row">
        <div className="col">
          <div
            className={
              disabled
                ? styles.switchField
                : `${styles.switchField} ${styles.toggleCursor}`
            }
          >
            {radioOptions?.length > 0 &&
              radioOptions.map((data: any, index: number) => (
                <Fragment key={index}>
                  {/* Radio button for each option */}
                  <input
                    type="radio"
                    id={data?.value}
                    name={data?.label}
                    value={data?.value}
                    onChange={handleChange}
                    checked={selectedToggle === data?.value}
                    disabled={disabled}
                  />
                  {/* Label for the radio button */}
                  <label htmlFor={data?.value}>{data?.label}</label>
                </Fragment>
              ))}
          </div>
        </div>
      </div>
    </a>
  );
}

export default RadioSwitchToggle;
