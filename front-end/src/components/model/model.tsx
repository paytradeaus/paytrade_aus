import React, { useEffect, useState } from "react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import styles from "./model.module.scss";
import SearchableSelect from "../SearchableSelect/SearchableSelect";
import TextField from "../TextField/textField";
import { ExclamationTriangleFill, Eye, EyeSlash } from "react-bootstrap-icons";
import Radio from "../radio/radio";
import { formatDollars } from "@/common/commonFunctions";
import CustomDatePicker from "../customDatePicker/customDatePicker";
import { DD_MM_YYYY } from "@/common/constants/general";

interface AppModalProps {
  show: boolean;
  onHide?: () => void;
  onCancel?: () => void;
  firstButtonLabel?: any;
  firstButtonStyle?: any;
  secondButtonLabel?: any;
  secondButtonStyle?: any;
  cancelfnButtonLabel?: any;
  ThirdButtonLabel?: any;
  thirdButtonStyle?: any;
  FourthButtonLabel?: any;
  fourthButtonStyle?: any;
  modalHeading?: any;
  handleCloseModal?: any;
  modalBodyTitle?: any;
  modalBodyContent?: any;
  onConfirm?: () => void;
  modalTitleStyle?: any;
  displaySelect?: boolean;
  select?: AllSelectProps;
  disabled?: any;
  closeButton?: boolean;
  isInputFieldEnabled?: boolean;
  disableInputField?: boolean;
  handlePasswordChange?: any;
  transactionsUploadModal?: boolean;
  setCurrentBalanceOption?: any;
  setManualCurrentBalance?: any;
  onCloseIconClick?: () => void;
  showDatePickerInput?: boolean; // New prop for DatePicker
  datePickerLabel?: string; // Label for DatePicker
  datePickerValue?: Date | null; // Value for DatePicker
  onDatePickerChange?: (date: Date | null) => void; // DatePicker change handler
  hasError?: boolean;
  errorMessage?: string;
  minimumDate?: any;
}

interface AllSelectProps {
  options?: Array<Object>;
  label?: string;
  onChange: (selectedValue: SelectedValueProps) => void;
  disabled?: boolean;
  placeholder?: string;
  value?: number;
}

interface SelectedValueProps {
  value: number;
  label: string;
}

const customStyles = {
  control: (provided: any) => ({
    height: "1rem",
    width: "16.25rem",
    borderRadius: "0.75rem",
  }),
};

export const AppModal: React.FC<AppModalProps> = ({
  show,
  onHide = () => {},
  onConfirm,
  onCancel,
  firstButtonLabel = "",
  firstButtonStyle,
  secondButtonLabel = "",
  secondButtonStyle,
  cancelfnButtonLabel = "",
  ThirdButtonLabel = "",
  thirdButtonStyle,
  FourthButtonLabel = "",
  fourthButtonStyle,
  modalHeading = "",
  modalBodyTitle = "",
  modalBodyContent = "",
  modalTitleStyle = "",
  handleCloseModal = "",
  displaySelect = false,
  select = {
    options: [],
    label: "",
    onChange: () => {},
    disabled: false,
    placeholder: "",
    value: 0,
  },
  onCloseIconClick = () => {},
  disabled = false,
  closeButton = false,
  isInputFieldEnabled = false,
  disableInputField = false,
  handlePasswordChange,
  transactionsUploadModal = false,
  setCurrentBalanceOption,
  setManualCurrentBalance,
  showDatePickerInput = false, // Default value
  datePickerLabel = "Select Date", // Default label
  datePickerValue = null,
  onDatePickerChange,
  hasError = false,
  errorMessage = "",
  minimumDate = null,
}) => {
  const [isPWDShow, setIsPWDShow] = useState(false);
  const [selectedOption, setSelectedOption] = useState("useLatest");
  const [balance, setBalance] = useState("");

  useEffect(() => {
    if (transactionsUploadModal) {
      setCurrentBalanceOption("useLatest");
    }
  }, []);

  const togglePasswordVisibility = () => {
    setIsPWDShow(!isPWDShow);
  };

  const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedOption(e.target.value);
    setCurrentBalanceOption(e.target.value);
  };

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { value } = e.target;
    let rawValue = value.replace(/[^0-9.]/g, ""); // Remove non-numeric characters

    if (rawValue === "") {
      setBalance("");
      setCurrentBalanceOption("updateAmount");
      setManualCurrentBalance("");
      return;
    }

    // Handle leading zeros (ignore for decimal values like "0.1")
    if (
      rawValue.startsWith("0") &&
      rawValue.length > 1 &&
      rawValue[1] !== "."
    ) {
      rawValue = rawValue.slice(1); // Prevent leading zeros
    }

    const decimalParts = rawValue.split(".");

    if (decimalParts.length > 2) {
      return; // Prevent multiple decimal points
    }

    let [integerPart, decimalPart] = decimalParts;

    // Only limit the integer part to 11 digits
    if (integerPart.length > 11) {
      return;
      integerPart = integerPart.slice(0, 11);
    }

    if (decimalPart) {
      decimalPart = decimalPart.slice(0, 2); // Limit decimal places to two digits
    }

    let finalValue =
      decimalPart !== undefined ? `${integerPart}.${decimalPart}` : integerPart;

    if (finalValue.replace(".", "").length > 13) {
      return; // Prevent more than 13 characters total (ignoring the decimal)
    }

    const formattedValue = formatDollars(finalValue); // Assuming formatDollars is a function you have

    setBalance(formattedValue); // Formatted value with dollar sign
    setCurrentBalanceOption("updateAmount");
    setManualCurrentBalance(finalValue);
    // formik.setFieldValue("retention_amount", `$ ${finalValue}`);
  };
  return (
    <Modal
      show={show}
      onHide={onHide}
      onClick={onCloseIconClick}
      aria-labelledby="contained-modal-title-vcenter"
      centered
      backdrop="static"
      keyboard={false}
    >
      <div className={styles.modal}>
        {(modalHeading || closeButton) && (
          <Modal.Header
            closeButton={closeButton}
            className={styles.ModelHeader}
          >
            <Modal.Title
              className={`${modalTitleStyle}  ${styles.ModelTitle}`}
              id="contained-modal-title-vcenter"
            >
              {modalHeading}
            </Modal.Title>
          </Modal.Header>
        )}
        <Modal.Body>
          {modalBodyTitle && <h4>{modalBodyTitle}</h4>}
          {modalBodyContent && (
            <p className={styles.ModelParaStyles}>{modalBodyContent}</p>
          )}

          {isInputFieldEnabled && (
            <TextField
              placeholder=""
              autoComplete="new-password" // Add this line
              role="presentation"
              type={isPWDShow ? "text" : "password"}
              disabled={disableInputField}
              onChange={handlePasswordChange}
              endingData={
                isPWDShow ? (
                  <Eye className={styles.eyeIconStyle} />
                ) : (
                  <EyeSlash className={styles.eyeIconStyle} />
                )
              }
              endingDataStyles={styles.endIconStyle}
              onEndIconClick={togglePasswordVisibility}
              classNames={styles.inputFieldControl}
            />
          )}
          {/* Conditionally render DatePicker */}
          {showDatePickerInput && (
            <>
              <CustomDatePicker
                label={datePickerLabel}
                value={datePickerValue}
                format={DD_MM_YYYY}
                showIcon={true}
                onChange={onDatePickerChange}
                placeholderText="Select a date"
                maxDate={new Date()} // Example restriction
                minDate={minimumDate}
              />
              {hasError ? (
                <div className={styles.errorText}>
                  <ExclamationTriangleFill className={styles.icon} />
                  {errorMessage}
                </div>
              ) : null}
            </>
          )}
          {displaySelect && (
            <div className="d-flex justify-content-center">
              <SearchableSelect
                options={select.options}
                label={select.label}
                singleSelectedData={select.value}
                onChange={(value: SelectedValueProps) => select.onChange(value)}
                disabled={select.disabled}
                placeholder={select.placeholder}
                controlStyles={customStyles}
              />
            </div>
          )}

          {transactionsUploadModal && (
            <div className={styles.radioGroup}>
              <Radio
                type="radio"
                label="Use Latest"
                checked={selectedOption === "useLatest"}
                onChange={handleOptionChange}
                value="useLatest"
              />
              <Radio
                type="radio"
                label="Update Amount"
                checked={selectedOption === "updateAmount"}
                onChange={handleOptionChange}
                value="updateAmount"
              />

              <TextField
                type="text"
                value={balance}
                onChange={handleBalanceChange}
                placeholder="Enter new amount"
                classNames={styles.inputFieldControl2}
                disabled={selectedOption === "useLatest"}
              />
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className={styles.ModelFooter}>
          {firstButtonLabel && (
            <Button
              className={`${styles.BackgroundButtonStyles} ${firstButtonStyle}`}
              onClick={disabled ? () => {} : onConfirm}
              disabled={disabled}
            >
              {firstButtonLabel}
            </Button>
          )}
          {secondButtonLabel && (
            <Button
              className={`${styles.SecondaryButton} ${secondButtonStyle}`}
              onClick={onHide}
            >
              {secondButtonLabel}
            </Button>
          )}
          {cancelfnButtonLabel && (
            <Button className={`${styles.SecondaryButton}`} onClick={onCancel}>
              {cancelfnButtonLabel}
            </Button>
          )}
          {ThirdButtonLabel && (
            <Button
              className={`${styles.TertiaryButton} ${thirdButtonStyle}`}
              onClick={onHide}
            >
              {ThirdButtonLabel}
            </Button>
          )}
          {FourthButtonLabel && ( // Render the fourth button if label exists
            <div className={styles.modalPopup}>
              <div>
                <Button onClick={onConfirm} className={styles.sendPopup}>
                  Send
                </Button>
              </div>
              <div>
                <Button onClick={onHide} className={styles.cancelPopup}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Modal.Footer>
      </div>
    </Modal>
  );
};

export const App: React.FC = () => {
  const [modalShow, setModalShow] = useState<boolean>(false);

  return (
    <>
      <Button variant="primary" onClick={() => setModalShow(true)}>
        Launch vertically centered modal
      </Button>

      <AppModal
        show={modalShow}
        onHide={() => setModalShow(false)}
        secondButtonLabel=""
        firstButtonLabel=""
        modalHeading=""
        modalBodyTitle=""
        modalBodyContent=""
      />
    </>
  );
};
