import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import TextField from "@/components/TextField/textField";
import React, { Fragment, useEffect, useState } from "react";
import { Row, Col, Form } from "react-bootstrap";
import {
  checkBoxConfirmationMessage,
  payRetentionWarningMessage,
  tabTypes,
} from "./payments.constant";
import customStyles from "./payments.module.scss";
import { usePaymentsContext } from "./paymentsContext";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import {
  CURRENCY_SYMBOL,
  DD_MM_YYYY,
  DECIMAL_WITH_DOLLAR,
} from "@/common/constants/general";
import { ExclamationTriangleFill } from "react-bootstrap-icons";
import { formatDollars, replaceDollarSymbol } from "@/common/commonFunctions";
import { AppModal } from "@/components/model/model";
import _ from "lodash";
import { RootState, useAppSelector } from "@/redux/store";

interface RetentionProps {
  displayRetentionForms: boolean;
}

export default function RetentionForms({
  displayRetentionForms,
}: Readonly<RetentionProps>) {
  const {
    formik,
    isViewMode,
    isImportMode,
    retentionBankAccounts,
    isEditable,
    setDisableSaveButton,
    disablePayLessAmount,
    patchData,
  }: any = usePaymentsContext();

  const [displayPayRetentionWarning, setDisplayPayRetentionWarning] =
    useState(false);
  const [retentionDisable, setRetentionAccountDisable] = useState(false);
  const [displayCheckboxConfirmation, setDisplayCheckboxConfirmation] =
    useState(false);

  const [minDate, setMinDate] = useState<Date | undefined>(new Date());

  // Get userMode from Redux
  const reduxUserMode = useAppSelector(
    (state: RootState) => state.userMode.mode
  );

  // Fallback to localStorage if Redux state is empty (e.g., after a page refresh)
  const localStorageUserMode =
    typeof window !== "undefined" ? localStorage.getItem("userMode") : null;

  const userMode = reduxUserMode || localStorageUserMode;

  useEffect(() => {
    if (userMode === "Onboarding") {
      setMinDate(undefined); // Allow past dates
    } else {
      setMinDate(new Date()); // Restrict to today and future dates
    }
  }, [userMode]);

  useEffect(() => {
    if (
      !isViewMode &&
      !formik?.values?.retention_account &&
      retentionBankAccounts?.length > 0 &&
      patchData?.retention_from_account
    ) {
      const paymentsRetentionAccount = retentionBankAccounts.find(
        (x: any) => x?.value === patchData?.retention_from_account
      );

      if (paymentsRetentionAccount) {
        formik?.setFieldValue("retention_account", paymentsRetentionAccount);
        if (!_.isEmpty(paymentsRetentionAccount)) {
          setRetentionAccountDisable(true);
        } else {
          setRetentionAccountDisable(false);
        }
      }
    }
  }, [patchData, retentionBankAccounts]);

  useEffect(() => {
    populateTotalAmount();
  }, [
    formik?.values?.payment_amount,
    formik?.values?.retention_amount,
    formik?.values?.claim_amount,
    formik?.values?.payless_amount,
    formik?.values?.payment_type,
  ]);

  function handleAccountSelection(value: any) {
    formik.setFieldValue("retention_account", value);
  }

  async function handleAmountChange(value: any, fieldName: string) {
    const charIndex = value.indexOf(CURRENCY_SYMBOL);

    if (value.trim() === CURRENCY_SYMBOL) {
      formik.setFieldValue(fieldName, "");
    } else if (DECIMAL_WITH_DOLLAR.test(value) || value === CURRENCY_SYMBOL) {
      await formik.setFieldValue(
        fieldName,
        charIndex == -1 ? `$ ${value}` : value
      );
    }

    return true;
  }

  async function handleRetentionChange(value: any) {
    await handleAmountChange(value, "retention_amount");
    autoCalculatePaymentAmount(value, formik?.values?.payless_amount);
  }

  function populateTotalAmount() {
    const {
      payment_amount,
      retention_amount,
      claim_amount,
      payless_amount,
      payment_type,
      outstanding_amount,
    } = formik.values;
    const concatValue =
      +replaceDollarSymbol(payment_amount) +
      +replaceDollarSymbol(retention_amount);

    let claimAmount = 0;
    if (payment_type === tabTypes.FULL || payment_type === tabTypes.PART) {
      claimAmount = claim_amount;
    } else if (
      payment_type === tabTypes.PAY_LESS_FULL ||
      payment_type === tabTypes.PAY_LESS_PART
    ) {
      claimAmount = +replaceDollarSymbol(payless_amount);
    }

    if (
      payment_type === tabTypes.FULL ||
      payment_type === tabTypes.PAY_LESS_FULL
    ) {
      setDisableSaveButton(
        Number(concatValue?.toFixed(2)) !== Number(claimAmount?.toFixed(2))
      );
    } else if (payment_type === tabTypes.PART) {
      setDisableSaveButton(
        Number(concatValue?.toFixed(2)) >= Number(claimAmount?.toFixed(2))
      );
    } else if (payment_type === tabTypes.PAY_LESS_PART && !isViewMode) {
      setDisableSaveButton(
        Number(concatValue?.toFixed(2)) >= Number(claimAmount?.toFixed(2)) ||
          Number(concatValue?.toFixed(2)) >
            Number(outstanding_amount?.toFixed(2))
      );
    }
    formik?.setFieldValue("total_amount", concatValue?.toFixed(2));
  }
  function validateTotalClaimAmount(e: any) {
    formik.handleBlur(e);
    const {
      retention_amount,
      payment_amount,
      payment_type,
      claim_amount,
      payless_amount,
      outstanding_amount,
    } = formik.values;
    if (
      payment_type !== tabTypes.PART &&
      payment_type !== tabTypes.PAY_LESS_PART
    ) {
      return;
    } else if (
      payment_type === tabTypes.PART &&
      (!payment_amount || !claim_amount)
    ) {
      return;
    } else if (
      payment_type === tabTypes.PAY_LESS_PART &&
      (!payless_amount || !payment_amount)
    ) {
      return;
    }

    let totalGreaterThanClaim = false;

    if (payment_type === tabTypes.PART) {
      totalGreaterThanClaim =
        +replaceDollarSymbol(retention_amount) +
          +replaceDollarSymbol(payment_amount) >=
        claim_amount;
    } else if (payment_type === tabTypes.PAY_LESS_PART) {
      // totalGreaterThanClaim =
      if (
        +replaceDollarSymbol(retention_amount) +
          +replaceDollarSymbol(payment_amount) >=
        +replaceDollarSymbol(payless_amount)
      ) {
        totalGreaterThanClaim = true;
      } else if (
        +replaceDollarSymbol(retention_amount) +
          +replaceDollarSymbol(payment_amount) >
        outstanding_amount
      ) {
        totalGreaterThanClaim = true;
      }
    }

    setDisplayPayRetentionWarning(totalGreaterThanClaim);
  }

  async function handlePayLessChange(value: any) {
    await handleAmountChange(value, "payless_amount");
    const { payment_type, cash_retention, retention_amount } = formik.values;
    if (
      payment_type === tabTypes.PAY_LESS_FULL &&
      cash_retention === tabTypes.NO_RETENTION
    ) {
      await handleAmountChange(value, "payment_amount");
    }
    autoCalculatePaymentAmount(retention_amount, value);
  }

  function autoCalculatePaymentAmount(
    retentionAmount: any,
    paylessAmount: any
  ) {
    const { claim_amount, cash_retention, payment_type } = formik.values;

    let paymentAmount: any = "";

    if (
      payment_type === tabTypes.FULL ||
      (payment_type === tabTypes.PAY_LESS_FULL &&
        cash_retention === tabTypes.RETENTION)
    ) {
      let claimAmount = 0;

      if (payment_type === tabTypes.FULL) {
        claimAmount = claim_amount;
      } else {
        claimAmount = replaceDollarSymbol(paylessAmount);
      }

      paymentAmount =
        +replaceDollarSymbol(retentionAmount) <= claimAmount
          ? claimAmount - +replaceDollarSymbol(retentionAmount)
          : "";

      formik.setFieldValue(
        "formatted_payment_amount",
        paymentAmount ? formatDollars(paymentAmount.toFixed(2)) : paymentAmount
      ); // Clear formatted value
      formik.setFieldValue(
        "payment_amount",
        paymentAmount ? `$ ${paymentAmount.toFixed(2)}` : paymentAmount
      ); // Clear raw value
    }
  }

  function paymentMinimumDate() {
    const dateString = formik?.values?.payments_minimum_date;

    // Parse the date string to create a Date object
    return new Date(dateString);

    // // Add one day to the date
    // return new Date(date.setDate(date.getDate() - 1));
  }

  function onConfirmPaidChange(value: boolean) {
    if (value) {
      setDisplayCheckboxConfirmation(true);
    } else {
      formik.setFieldValue("is_paid_confirmed", value);
    }
  }

  function handleConfirmCheck() {
    formik.setFieldValue("is_paid_confirmed", displayCheckboxConfirmation);
    setDisplayCheckboxConfirmation(false);
  }

  function whetherToDisplayRetentionWarningMessage() {
    if (formik?.values?.payment_type === tabTypes.PART) {
      return payRetentionWarningMessage.partPayment;
    } else if (formik?.values?.payment_type === tabTypes.PAY_LESS_PART) {
      return payRetentionWarningMessage.paylessPart;
    } else {
      return payRetentionWarningMessage.payLessOrFullPayment;
    }
  }

  const handleRetentionAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { value } = e.target;
    let rawValue = value.replace(/[^0-9.]/g, ""); // Remove non-numeric characters

    if (rawValue === "") {
      formik.setFieldValue("formatted_retention_amount", ""); // Clear formatted value
      formik.setFieldValue("retention_amount", ""); // Clear raw value
      autoCalculatePaymentAmount("", formik?.values?.payless_amount);
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

    formik.setFieldValue("formatted_retention_amount", formattedValue); // Formatted value with dollar sign
    formik.setFieldValue("retention_amount", `$ ${finalValue}`);
    autoCalculatePaymentAmount(finalValue, formik?.values?.payless_amount); // Raw numeric value
  };
  const handlePaymentAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { value } = e.target;
    let rawValue = value.replace(/[^0-9.]/g, ""); // Remove non-numeric characters

    if (rawValue === "") {
      formik.setFieldValue("formatted_payment_amount", ""); // Clear formatted value
      formik.setFieldValue("payment_amount", ""); // Clear raw value
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

    formik.setFieldValue("formatted_payment_amount", formattedValue); // Formatted value with dollar sign
    formik.setFieldValue("payment_amount", `$ ${finalValue}`);
  };

  const handlePaylessAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { value } = e.target;
    const { payment_type, cash_retention, retention_amount } = formik.values;
    let rawValue = value.replace(/[^0-9.]/g, ""); // Remove non-numeric characters

    if (rawValue === "") {
      formik.setFieldValue("formatted_payless_amount", ""); // Clear formatted value
      formik.setFieldValue("payless_amount", ""); // Clear raw value
      if (
        payment_type === tabTypes.PAY_LESS_FULL &&
        cash_retention === tabTypes.NO_RETENTION
      ) {
        formik.setFieldValue("formatted_payment_amount", "");
        formik.setFieldValue("payment_amount", "");
      }
      autoCalculatePaymentAmount(retention_amount, "");
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

    formik.setFieldValue("formatted_payless_amount", formattedValue); // Formatted value with dollar sign
    formik.setFieldValue("payless_amount", `$ ${finalValue}`);
    if (
      payment_type === tabTypes.PAY_LESS_FULL &&
      cash_retention === tabTypes.NO_RETENTION
    ) {
      formik.setFieldValue("formatted_payment_amount", formattedValue);
      formik.setFieldValue("payment_amount", `$ ${finalValue}`);
    }

    autoCalculatePaymentAmount(retention_amount, finalValue); // Raw numeric value
  };

  return (
    <Fragment>
      {formik?.values?.claim_type === tabTypes.BILLABLES && (
        <Row className="mt-4 w-100">
          <Col lg={4}>
            <TextField
              labelText="Payment From Account"
              name="payment_from_account_name"
              id="payment_from_account_name"
              value={formik?.values?.payment_from_account_name}
              className={customStyles.text}
              disabled
            />
          </Col>
          <Col lg={4}></Col>
          <Col lg={4}></Col>
        </Row>
      )}
      <Row className="w-100 mt-4">
        <Col lg={4}>
          <TextField
            labelText="Payment To Account - Name"
            name="payment_to_account_name"
            id="payment_to_account_name"
            className={customStyles.text}
            value={formik?.values?.payment_to_account_name}
            disabled
          />
        </Col>
        <Col lg={4}>
          <TextField
            type="text"
            labelText="BSB"
            name="payment_to_account_bsb_number"
            id="payment_to_account_bsb_number"
            className={customStyles.text}
            value={formik?.values?.payment_to_account_bsb_number}
            disabled
          />
        </Col>
        <Col lg={4}>
          <TextField
            type="text"
            labelText="Account Number"
            name="payment_to_account_name"
            id="payment_to_account_name"
            className={customStyles.text}
            value={formik?.values?.payment_to_account_number}
            disabled
          />
        </Col>
      </Row>

      {displayRetentionForms && (
        <Fragment>
          <Row className="w-100 mt-4">
            <Col lg={4}>
              <TextField
                labelText="Retention Amount *"
                name="formatted_retention_amount"
                id="formatted_retention_amount"
                value={formik?.values?.formatted_retention_amount}
                // onChange={(e: any) => handleRetentionChange(e?.target?.value)}
                onChange={handleRetentionAmount}
                onBlur={(e: any) => validateTotalClaimAmount(e)}
                placeholder="Enter retention amount"
                className={
                  (formik.touched.formatted_retention_amount &&
                    formik.errors.formatted_retention_amount) ||
                  ((formik.touched.formatted_retention_amount ||
                    formik.touched.retention_amount) &&
                    formik.errors.retention_amount)
                    ? `${customStyles.inputFieldControl} ${customStyles.inputError}`
                    : customStyles.inputFieldControl
                }
                disabled={isViewMode || isImportMode}
              />

              <div className={customStyles.errorText}>
                {(formik.touched.formatted_retention_amount &&
                  formik.errors.formatted_retention_amount) ||
                ((formik.touched.formatted_retention_amount ||
                  formik.touched.retention_amount) &&
                  formik.errors.retention_amount) ? (
                  <>
                    <ExclamationTriangleFill className={customStyles.icon} />
                    {formik.errors.formatted_retention_amount ||
                      formik.errors.retention_amount}
                  </>
                ) : null}
              </div>
            </Col>
            {formik?.values?.claim_type === tabTypes.BILLABLES && (
              <Col lg={4}>
                <SearchableSelect
                  label="Retention Paid into Account *"
                  options={retentionBankAccounts}
                  onChange={handleAccountSelection}
                  disabled={isViewMode || retentionDisable}
                  placeholder={"Select account"}
                  singleSelectedData={formik?.values?.retention_account}
                />
                <div className={customStyles.errorText}>
                  {formik.touched.retention_account &&
                  formik.errors.retention_account ? (
                    <>
                      <ExclamationTriangleFill className={customStyles.icon} />
                      {formik.errors.retention_account}
                    </>
                  ) : null}
                </div>
              </Col>
            )}
            <Col lg={4}>
              <CustomDatePicker
                showIcon={true}
                label="Retention Release Date *"
                toggleCalendarOnIconClick
                placeholderText="&nbsp;Select date"
                selected={formik.values.retention_release_date}
                onChange={(selectedDate: string) =>
                  formik.setFieldValue("retention_release_date", selectedDate)
                }
                disabled={isViewMode}
                format={DD_MM_YYYY}
                value={formik?.values?.retention_release_date}
                minDate={minDate}
                maxYear={new Date().getFullYear() + 50}
                hasError={Boolean(
                  formik.touched.retention_release_date &&
                    formik.errors.retention_release_date
                )}
              />

              <div className={customStyles.errorContainer}>
                {formik.touched.retention_release_date &&
                  formik.errors.retention_release_date && (
                    <>
                      <ExclamationTriangleFill className={customStyles.error} />
                      <span className={customStyles.errorTextStyles}>
                        {formik.errors.retention_release_date}
                      </span>
                    </>
                  )}
              </div>
            </Col>
          </Row>
          {formik?.values?.claim_type === tabTypes.BILLABLES && (
            <div className={customStyles.confirmation}>
              <Form.Check
                type={"checkbox"}
                id={`default-checkbox`}
                checked={formik?.values?.is_retention_confirmed}
                label={"Confirm - Retention Paid to Retention Trust"}
                onChange={(e: any) =>
                  formik.setFieldValue(
                    "is_retention_confirmed",
                    e?.target?.checked
                  )
                }
                disabled={!isEditable && isViewMode}
                className={"payments-checkbox"}
              />
            </div>
          )}
        </Fragment>
      )}

      <Row className="w-100 mt-4 align-items-center">
        {(formik?.values?.payment_type === tabTypes.PAY_LESS_PART ||
          formik?.values?.payment_type === tabTypes.PAY_LESS_FULL) && (
          <Col>
            <TextField
              labelText="Pay Less Amount"
              placeholder="Enter pay less amount"
              name="formatted_payless_amount"
              id="formatted_payless_amount"
              value={formik?.values?.formatted_payless_amount}
              // onChange={(e: any) => handlePayLessChange(e?.target?.value)}
              onChange={handlePaylessAmount}
              onBlur={(e: any) => validateTotalClaimAmount(e)}
              className={
                (formik.touched.formatted_payless_amount &&
                  formik.errors.formatted_payless_amount) ||
                ((formik.touched.formatted_payless_amount ||
                  formik.touched.payless_amount) &&
                  formik.errors.payless_amount)
                  ? `${customStyles.inputFieldControl} ${customStyles.inputError}`
                  : customStyles.inputFieldControl
              }
              disabled={isViewMode || disablePayLessAmount || isImportMode}
            />

            <div className={customStyles.errorText}>
              {(formik.touched.formatted_payless_amount &&
                formik.errors.formatted_payless_amount) ||
              ((formik.touched.formatted_payless_amount ||
                formik.touched.payless_amount) &&
                formik.errors.payless_amount) ? (
                <>
                  <ExclamationTriangleFill className={customStyles.icon} />
                  {formik.errors.payless_amount ||
                    formik.errors.formatted_payless_amount}
                </>
              ) : null}
            </div>
          </Col>
        )}
        <Col xl={4} lg={4} sm={12} xs={12}>
          <TextField
            labelText={"Payment Amount *"}
            placeholder={"Enter payment amount"}
            name="formatted_payment_amount"
            id="formatted_payment_amount"
            value={formik?.values?.formatted_payment_amount}
            // onChange={(e: any) =>
            //   handleAmountChange(e?.target?.value, "payment_amount")
            // }
            onChange={handlePaymentAmount}
            onBlur={(e: any) => validateTotalClaimAmount(e)}
            className={
              (formik.touched.formatted_payment_amount &&
                formik.errors.formatted_payment_amount) ||
              ((formik.touched.formatted_payment_amount ||
                formik.touched.payment_amount) &&
                formik.errors.payment_amount)
                ? `${customStyles.inputFieldControl} ${customStyles.inputError}`
                : customStyles.inputFieldControl
            }
            disabled={
              isViewMode ||
              formik?.values?.payment_type === tabTypes.FULL ||
              formik?.values?.payment_type === tabTypes.PAY_LESS_FULL ||
              isImportMode
            }
          />

          <div className={customStyles.errorText}>
            {(formik.touched.formatted_payment_amount &&
              formik.errors.formatted_payment_amount) ||
            ((formik.touched.formatted_payment_amount ||
              formik.touched.payment_amount) &&
              formik.errors.payment_amount) ? (
              <>
                <ExclamationTriangleFill className={customStyles.icon} />
                {formik.errors.payment_amount ||
                  formik.errors.formatted_payment_amount}
              </>
            ) : null}
          </div>
        </Col>
        <Col xl={4} lg={4} sm={12} xs={12}>
          <CustomDatePicker
            showIcon={true}
            label="Payment Date *"
            toggleCalendarOnIconClick
            placeholderText="&nbsp;Select payment date"
            selected={formik.values.payment_date}
            onChange={(selectedDate: string) =>
              formik.setFieldValue("payment_date", selectedDate)
            }
            format={DD_MM_YYYY}
            value={formik?.values?.payment_date}
            maxDate={new Date()}
            minDate={paymentMinimumDate()}
            disabled={isViewMode}
            hasError={Boolean(
              formik.touched.payment_date && formik.errors.payment_date
            )}
          />

          <div className={customStyles.errorContainer}>
            {formik.touched.payment_date && formik.errors.payment_date ? (
              <>
                <ExclamationTriangleFill className={customStyles.error} />
                <span className={customStyles.errorTextStyles}>
                  {formik.errors.payment_date}
                </span>
              </>
            ) : null}
          </div>
        </Col>
        <Col xl={4} lg={4} sm={12} xs={12}>
          <div className={customStyles.confirmation}>
            <Form.Check
              type={"checkbox"}
              checked={formik?.values?.is_paid_confirmed}
              label={`Confirm - ${
                formik?.values?.claim_type === tabTypes.BILLABLES
                  ? "Paid"
                  : "Received"
              }`}
              onChange={(e: any) => onConfirmPaidChange(e?.target?.checked)}
              disabled={!isEditable && isViewMode}
              className={"payments-checkbox"}
            />
          </div>
        </Col>
      </Row>
      <div className={customStyles.total}>
        <div className={customStyles.totalAmt}>Total</div>
        <div className="d-flex align-items-center">
          <h3 className={customStyles.totalValue}>
            {`$ ${
              formik?.values?.total_amount
                ? Number(formik?.values?.total_amount)
                    ?.toFixed(2)
                    .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                : "0.00"
            }
            `}
          </h3>
        </div>
      </div>
      {displayPayRetentionWarning && (
        <AppModal
          show={displayPayRetentionWarning}
          onHide={() => {}}
          firstButtonLabel={"Ok"}
          modalBodyContent={
            formik?.values?.payment_type === tabTypes.PART
              ? payRetentionWarningMessage.partPayment
              : payRetentionWarningMessage.payLessOrFullPayment
          }
          modalBodyTitle=""
          onConfirm={() => setDisplayPayRetentionWarning(false)}
        />
      )}
      {displayPayRetentionWarning && (
        <AppModal
          show={displayPayRetentionWarning}
          onHide={() => {}}
          firstButtonLabel={"Ok"}
          modalBodyContent={whetherToDisplayRetentionWarningMessage()}
          modalBodyTitle=""
          onConfirm={() => setDisplayPayRetentionWarning(false)}
        />
      )}

      {displayCheckboxConfirmation && (
        <AppModal
          show={displayCheckboxConfirmation}
          onHide={() => setDisplayCheckboxConfirmation(false)}
          firstButtonLabel={"Yes"}
          secondButtonLabel={"No"}
          modalBodyContent={`${checkBoxConfirmationMessage} ${
            formik?.values?.claim_type === tabTypes.BILLABLES
              ? "Paid"
              : "Received"
          }? `}
          modalBodyTitle=""
          onConfirm={() => handleConfirmCheck()}
        />
      )}
    </Fragment>
  );
}
