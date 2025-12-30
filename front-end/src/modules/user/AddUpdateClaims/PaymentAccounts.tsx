import FormikControl from "@/components/FormikControl";
import { InputType } from "@/shared/constant/general";
import React from "react";
import { useAddUpdateClaimsContext } from "./AddUpdateClaimsContext";
import { tabTypes } from "../AddUpdatePayments/Payments.constants";

export default function PaymentAccounts() {
  const {
    formik,
    togglePaymentBillables,
    togglePaymentReceivables,
    paymentToOptions,
    isThirdPartyRetention,
    retentionBankAccounts,
    paymentsPatchData,
  }: any = useAddUpdateClaimsContext();

  function handlePaymentToDetails(selectedAccount: any) {
    formik.setFieldValue(
      "paymentToAccount",
      selectedAccount?.payment_to_account_id.toString()
    );
    formik.setFieldValue(
      "paymentToAccountName",
      selectedAccount?.payment_to_account_name
    );
    formik.setFieldValue(
      "paymentToBSB",
      selectedAccount?.payment_to_account_bsb_number
    );
    formik.setFieldValue(
      "paymentToAccountNumber",
      selectedAccount?.payment_to_account_number
    );
  }

  return (
    <div className="pt_expandtable">
      <details>
        <summary>Payment Accounts</summary>
        <div className="">
          {togglePaymentBillables() && (
            <div className="grid pt_infocol">
              <div>
                <h5>
                  <b>Payment from account</b>
                </h5>

                <FormikControl
                  control={InputType.TEXT_FIELD}
                  name={"paymentFromAccount"}
                  required
                  disabled
                  onChange={(e: any) => {}}
                  placeholder="Payment from account"
                  value={formik?.values?.paymentFromAccount}
                />
              </div>
              <div>
                <h5>Account name</h5>

                <FormikControl
                  control={InputType.TEXT_FIELD}
                  name={"paymentFromAccountName"}
                  required
                  disabled
                  onChange={(e: any) => {}}
                  placeholder="Account name"
                  value={formik?.values?.paymentFromAccountName}
                />
              </div>
              <div>
                <h5>BSB</h5>

                <FormikControl
                  control={InputType.TEXT_FIELD}
                  name={"paymentFromBSB"}
                  required
                  disabled
                  onChange={(e: any) => {}}
                  placeholder="Bsb number"
                  value={formik?.values?.paymentFromBSB}
                />
              </div>
              <div>
                <h5>Account number</h5>

                <FormikControl
                  control={InputType.TEXT_FIELD}
                  name={"paymentFromAccountName"}
                  required
                  disabled
                  onChange={(e: any) => {}}
                  placeholder="Account number"
                  value={formik?.values?.paymentFromAccountName}
                />
              </div>
            </div>
          )}

          <div className="grid pt_infocol">
            <div>
              <h5>
                <b>Payment to account</b>
                {isThirdPartyRetention && togglePaymentBillables() && (
                  <span className="required">*</span>
                )}
              </h5>

              {((isThirdPartyRetention && togglePaymentReceivables()) ||
                !isThirdPartyRetention) && (
                <FormikControl
                  control={InputType.TEXT_FIELD}
                  name={"paymentToAccount"}
                  required
                  disabled
                  onChange={(e: any) => {}}
                  placeholder="Payment to account"
                  value={formik?.values?.paymentToAccount}
                />
              )}
              {isThirdPartyRetention && togglePaymentBillables() && (
                <FormikControl
                  control={InputType.SELECT}
                  name={"paymentToAccount"}
                  renderKey="payment_to_account_type"
                  valueKey="payment_to_account_id"
                  placeholder="Select payment to account"
                  options={paymentToOptions}
                  required
                  disabled={!formik?.values?.thirdPartySupplier}
                  returnSelectedObject
                  onChange={(selectedValue: any) => {
                    handlePaymentToDetails(selectedValue);
                  }}
                  value={formik?.values?.paymentToAccount}
                  showError={
                    formik?.touched?.paymentToAccount &&
                    formik?.errors?.paymentToAccount
                  }
                  error={formik?.errors?.paymentToAccount}
                />
              )}
            </div>
            <div>
              <h5>Account name</h5>

              <FormikControl
                control={InputType.TEXT_FIELD}
                name={"paymentToAccountName"}
                required
                disabled
                onChange={(e: any) => {}}
                placeholder="Account name"
                value={formik?.values?.paymentToAccountName}
              />
            </div>
            <div>
              <h5>BSB</h5>

              <FormikControl
                control={InputType.TEXT_FIELD}
                name={"paymentToBSB"}
                required
                disabled
                onChange={(e: any) => {}}
                placeholder="Bsb number"
                value={formik?.values?.paymentToBSB}
              />
            </div>
            <div>
              <h5>Account number</h5>

              <FormikControl
                control={InputType.TEXT_FIELD}
                name={"paymentToAccountNumber"}
                required
                disabled
                onChange={(e: any) => {}}
                placeholder="Account number"
                value={formik?.values?.paymentToAccountNumber}
              />
            </div>
          </div>
          {paymentsPatchData?.cash_retention === tabTypes.RETENTION &&
            paymentsPatchData?.cash_retention_type !== "Retention claim" &&
            paymentsPatchData?.claim_type === "Billable" &&
            paymentsPatchData?.payment_type != "Pay - Zero" && (
              <div className="grid pt_infocol">
                <div>
                  <h5>
                    <b>Retention Paid into Account</b>
                  </h5>
                  <FormikControl
                    control={InputType.SELECT}
                    renderKey="account_name"
                    valueKey="bank_account_id"
                    placeholder="Select account"
                    options={retentionBankAccounts}
                    returnSelectedObject
                    value={formik?.values?.retention_account}
                    disabled
                    showError={
                      formik.touched.retention_account &&
                      formik.errors.retention_account
                    }
                    error={formik.errors.retention_account}
                  />
                </div>
              </div>
            )}
        </div>
      </details>
    </div>
  );
}
