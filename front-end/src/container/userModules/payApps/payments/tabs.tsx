import RadioSwitchToggle from "@/components/RadioSwitch/RadioSwitch";
import React, { Fragment, useState } from "react";
import { usePaymentsContext } from "./paymentsContext";
import {
  retentionSwitchConfirmation,
  contractRetentionType,
  paymentToSwitchOptions,
  paymentTypeSwitchOptions,
  retentionSwitchOptions,
  tabTypes,
  routedFrom,
  beneficiarySwitchOptions,
} from "./payments.constant";
import customStyles from "./payments.module.scss";
import { Col, Row } from "react-bootstrap";
import { AppModal } from "@/components/model/model";
import { formatDollars, replaceDollarSymbol } from "@/common/commonFunctions";

export default function Tabs() {
  const {
    formik,
    setOptionalFiles,
    setCompulsoryFiles,
    isViewMode,
    patchData,
    tabType,
    beneficiaryType,
  }: // disablePaymentTo,
  any = usePaymentsContext();

  const [displayRetentionConfirmation, setDisplayRetentionConfirmation] =
    useState(false);

  function handlePaymentToChange(value: any) {
    formik.setFieldValue("payment_to", value);
    //emptying file states, to ensure old tab selected files cleared
    setOptionalFiles([]), setCompulsoryFiles([]);
    if (value === tabTypes.THIRD_PARTY) {
      formik.setFieldValue("payment_amount", "");
      formik.setFieldValue("formatted_payment_amount", "");
      formik.setFieldValue("payment_date", "");
    }
  }

  function handlePaymentTypeChange(value: any) {
    formik.setFieldValue("payment_type", value);

    if (value === tabTypes.FULL) {
      formik.setFieldValue("payment_amount", `$ ${patchData?.claim_amount}`);
      formik.setFieldValue(
        "formatted_claim_amount",
        `$ ${patchData?.formatted_claim_amount.replace("-", "")}`
      );
    }
    if (value !== tabTypes.PAY_LESS_PART) {
      formik.setFieldValue("payless_amount", "");
      formik.setFieldValue("formatted_payless_amount", "");
    }
  }

  async function handleRetentionTypeChange(
    reverseFieldValue: boolean,
    value?: any
  ) {
    const { cash_retention, retention_type } = formik.values;
    const dynamicValue =
      value ??
      (reverseFieldValue && cash_retention === tabTypes.RETENTION
        ? tabTypes.NO_RETENTION
        : tabTypes.RETENTION);
    await formik?.setFieldValue("cash_retention", dynamicValue);

    if (
      (patchData?.retention_type === contractRetentionType.none &&
        value === tabTypes.NO_RETENTION) ||
      ((patchData?.retention_type === contractRetentionType.bankGuaranteed ||
        patchData?.retention_type === contractRetentionType.cash) &&
        value === tabTypes.RETENTION)
    ) {
      setDisplayRetentionConfirmation(false);
      onRetentionConfirmation();
    } else {
      setDisplayRetentionConfirmation(!reverseFieldValue);
    }
  }

  function onRetentionConfirmation() {
    const { payment_type, claim_amount, payless_amount } = formik.values;

    formik?.setFieldValue("retention_amount", "");
    formik.setFieldValue("formatted_retention_amount", "");
    formik?.setFieldValue("retention_release_date", "");
    formik?.setFieldValue(
      "payment_amount",
      payment_type === tabTypes.FULL
        ? claim_amount && `$ ${claim_amount?.toFixed(2)}`
        : payment_type === tabTypes.PAY_LESS_FULL
        ? payless_amount &&
          `$ ${Number(replaceDollarSymbol(payless_amount)).toFixed(2)}`
        : ""
    );

    formik?.setFieldValue(
      "formatted_payment_amount",
      payment_type === tabTypes.FULL
        ? claim_amount && formatDollars(claim_amount?.toFixed(2))
        : payment_type === tabTypes.PAY_LESS_FULL
        ? payless_amount &&
          formatDollars((+replaceDollarSymbol(payless_amount)).toFixed(2))
        : ""
    );

    setDisplayRetentionConfirmation(false);
  }

  return (
    <Fragment>
      {formik?.values?.claim_type === tabTypes.BILLABLES && (
        <Row>
          <Col xs={3}>
            <div className="mt-4">
              <div className="mb-2">Payment To</div>
              <RadioSwitchToggle
                radioOptions={paymentToSwitchOptions}
                selected={formik?.values?.payment_to}
                handleToggleChange={handlePaymentToChange}
                disabled={true}
              />
            </div>
          </Col>
          {/* {formik?.values?.payment_to === tabTypes.THIRD_PARTY && (
          <Col xs={3} className="d-flex align-items-end">
            <TextField
              type="number"
              labelText="3rd Party Supplier"
              name="pay"
              id="pay"
              className={customStyles.text}
              disabled={isViewMode}
            />
          </Col>
        )} */}
        </Row>
      )}

      {formik?.values?.payment_to !== tabTypes.THIRD_PARTY && (
        <Fragment>
          <div
            className={
              beneficiaryType === "Self"
                ? `${customStyles.paymentTypeStyles} ${"w-25"}`
                : customStyles.paymentTypeStyles
            }
          >
            <div className="mb-2">Payment Type</div>
            <RadioSwitchToggle
              radioOptions={
                beneficiaryType === "Self"
                  ? beneficiarySwitchOptions
                  : paymentTypeSwitchOptions
              }
              selected={formik?.values?.payment_type}
              handleToggleChange={handlePaymentTypeChange}
              disabled
            />
          </div>
          {formik?.values?.payment_type !== tabTypes.PAY_LESS_ZERO &&
            tabType !== routedFrom.RETENTION_CLAIM_ONE &&
            tabType !== routedFrom.RETENTION_CLAIM_TWO &&
            !patchData?.retention_id && (
              <div>
                <div className="mt-4 mb-2">Cash Retention</div>
                <div className={customStyles.cashStyles}>
                  <RadioSwitchToggle
                    radioOptions={retentionSwitchOptions}
                    selected={formik?.values?.cash_retention}
                    handleToggleChange={(e) =>
                      handleRetentionTypeChange(false, e)
                    }
                    disabled={isViewMode}
                  />
                </div>
              </div>
            )}{" "}
        </Fragment>
      )}
      {displayRetentionConfirmation && (
        <AppModal
          show={displayRetentionConfirmation}
          onHide={() => handleRetentionTypeChange(true)}
          firstButtonLabel={"Yes"}
          secondButtonLabel={"No"}
          modalBodyContent={
            formik?.values?.cash_retention === tabTypes.RETENTION
              ? retentionSwitchConfirmation.noRetention
              : retentionSwitchConfirmation.retention
          }
          modalBodyTitle=""
          onConfirm={() => onRetentionConfirmation()}
        />
      )}
    </Fragment>
  );
}
