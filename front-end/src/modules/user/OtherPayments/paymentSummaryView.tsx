"use client";

import ToggleInputGroup from "@/components/Inputs/ToggleInputGroup";
import React from "react";

import { formatDate, formatDollars, getDatePickerFormat } from "@/utils";
import { DateFormat, InputType } from "@/shared/constant/general";
import FormikControl from "@/components/FormikControl";
import { DD_MM_YYYY } from "@/shared/constant/identificationNumbers";
import {
  retentionSwitchOptions,
  tabTypes,
} from "../AddUpdatePayments/Payments.constants";

export default function PaymentSummaryViews(props: any) {
  const { patchData } = props;

  // ✅ NEW: Dynamic checkbox value
  const confirmFieldValue =
    patchData?.claim_type === tabTypes.BILLABLES
      ? patchData?.is_paid_confirmed
      : patchData?.is_received_confirmed;

  function calculateSubtotal(claimAmount: any, formattedGSTSummary: any) {
    // Ensure claimAmount and GST values are numbers
    const claim = parseFloat(claimAmount) || 0;
    const gst = parseFloat(formattedGSTSummary) || 0;

    // Calculate subtotal (assuming claim amount already includes GST)
    const subtotal = claim - gst;

    // Format the subtotal with commas for thousands
    return subtotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  return (
    <div className="pt_claimView_other_payments">
      <div className="pt_expandtable pt_payment">
        <details>
          <summary>{"Payment summary"}</summary>
          <div className="grid pt_data">
            <div className="pt_data_clear">
              <h3>{patchData?.payment_type}</h3>
              {patchData?.payment_id && (
                <h5>
                  <b>PAYMENT ID:</b> {patchData?.payment_id ?? ""}
                </h5>
              )}
            </div>
            {patchData?.claim_type === tabTypes.BILLABLES && (
              <div>
                <h5>Payment to</h5>
                <h4>
                  {patchData?.payment_type === tabTypes.THIRD_PARTY
                    ? tabTypes.THIRD_PARTY
                    : tabTypes.SUPPLIER}
                </h4>
              </div>
            )}
            {(patchData?.payment_type === tabTypes.THIRD_PARTY
              ? tabTypes.THIRD_PARTY
              : tabTypes.SUPPLIER) === tabTypes.SUPPLIER &&
              (patchData?.payment_type === tabTypes.FULL ||
                patchData?.payment_type === tabTypes.PART ||
                patchData?.payment_type === tabTypes.PAY_LESS_FULL ||
                patchData?.payment_type === tabTypes.PAY_LESS_PART) && (
                <div>
                  <h5>Retention</h5>
                  <ToggleInputGroup
                    type="radio"
                    name="claim_type"
                    options={retentionSwitchOptions}
                    selectedValue={
                      patchData?.cash_retention &&
                      patchData?.cash_retention_type !== tabTypes.NO_RETENTION
                        ? tabTypes.RETENTION
                        : tabTypes.NO_RETENTION
                    }
                    onChange={() => {}}
                    disabled={true}
                  />
                </div>
              )}
            {patchData?.outstanding_amount > 0 && (
              <div>
                <h5>Outstanding amount</h5>
                <h4>
                  $
                  {patchData?.outstanding_amount
                    ? Number(patchData?.outstanding_amount)
                        ?.toFixed(2)
                        .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    : "0.00"}
                </h4>
                &nbsp;
                <h6>{`${patchData?.gst_summary ? "inc" : "exc"} GST`}</h6>
                <h5>
                  <b>GST:</b> $
                  {patchData?.gst_summary
                    ? Number(patchData?.gst_summary)
                        ?.toFixed(2)
                        .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    : "0.00"}
                </h5>
              </div>
            )}
          </div>
          {(patchData?.payment_type === tabTypes.THIRD_PARTY
            ? tabTypes.THIRD_PARTY
            : tabTypes.SUPPLIER) === tabTypes.SUPPLIER &&
            (patchData?.payment_type === tabTypes.FULL ||
              patchData?.payment_type === tabTypes.PART ||
              patchData?.payment_type === tabTypes.PAY_LESS_FULL ||
              patchData?.payment_type === tabTypes.PAY_LESS_PART) && (
              <div className="grid">
                <div className="pt_table pt_formtable paymentClaims">
                  <table className="dataTable compact stripe nowrap hover order-column payment-table-style">
                    <thead>
                      <tr>
                        <th>ID</th>
                        {(patchData?.cash_retention &&
                        patchData?.cash_retention_type !== tabTypes.NO_RETENTION
                          ? tabTypes.RETENTION
                          : tabTypes.NO_RETENTION) === tabTypes.RETENTION &&
                          patchData?.cash_retention_type !==
                            "Retention claim" && (
                            <>
                              <th>
                                Reten Amt<span className="required">*</span>
                              </th>

                              <th>
                                Reten Release Date
                                <span className="required">*</span>
                              </th>
                            </>
                          )}
                        <th>
                          Payment Amt<span className="required">*</span>
                        </th>
                        <th>
                          Payment Date<span className="required">*</span>
                        </th>
                        {/* Place both checkboxes at the end */}

                        <th>
                          {`Confirm-${
                            patchData?.claim_type === tabTypes.BILLABLES
                              ? "Paid"
                              : "Received"
                          }`}
                        </th>
                        {(patchData?.cash_retention &&
                        patchData?.cash_retention_type !== tabTypes.NO_RETENTION
                          ? tabTypes.RETENTION
                          : tabTypes.NO_RETENTION) === tabTypes.RETENTION &&
                          patchData?.cash_retention_type !==
                            "Retention claim" &&
                          patchData?.claim_type === tabTypes.BILLABLES && (
                            <th>{"Confirm-Paid RTA"}</th>
                          )}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="form_array_table_row">
                        <td data-label="ID">1</td>
                        {/* Retention Fields */}
                        {(patchData?.cash_retention &&
                        patchData?.cash_retention_type !== tabTypes.NO_RETENTION
                          ? tabTypes.RETENTION
                          : tabTypes.NO_RETENTION) === tabTypes.RETENTION &&
                          patchData?.cash_retention_type !==
                            "Retention claim" && (
                            <>
                              <td data-label="Retention Amount">
                                <FormikControl
                                  control={InputType.TEXT_FIELD}
                                  label={""}
                                  name="formatted_retention_amount"
                                  id="formatted_retention_amount"
                                  value={
                                    patchData?.retention_amount
                                      ? formatDollars(
                                          patchData?.retention_amount
                                            .toFixed(2)
                                            .toString()
                                        )
                                      : ""
                                  }
                                  //   onChange={handleRetentionAmount}

                                  placeholder="Enter retention amount"
                                  required
                                  disableAutoComplete={false}
                                  disabled={true}
                                ></FormikControl>
                              </td>

                              <td data-label="Retention Release Date">
                                <FormikControl
                                  control={InputType.DATE_PICKER}
                                  required
                                  selected={patchData?.retention_release_date}
                                  format={DD_MM_YYYY}
                                  value={getDatePickerFormat(
                                    patchData?.retention_release_date
                                  )}
                                  minDate={formatDate(
                                    new Date(),
                                    DateFormat.YYYY_MM_DD
                                  )}
                                  disabled={true}
                                />
                              </td>
                            </>
                          )}
                        {/* Payment Fields */}
                        <td data-label="Payment Amount">
                          <FormikControl
                            control={InputType.TEXT_FIELD}
                            placeholder={"Enter payment amount"}
                            name="paymentamount"
                            id="formatted_payment_amount"
                            value={
                              patchData?.payment_amount
                                ? formatDollars(
                                    patchData?.payment_amount
                                      .toFixed(2)
                                      .toString()
                                  )
                                : ""
                            }
                            required
                            disableAutoComplete={false}
                            disabled={true}
                          />
                        </td>
                        <td data-label="Payment Date">
                          <FormikControl
                            control={InputType.DATE_PICKER}
                            required
                            selected={patchData?.payment_date}
                            format={DD_MM_YYYY}
                            value={getDatePickerFormat(patchData?.payment_date)}
                            // maxDate={new Date()}
                            // minDate={paymentMinimumDate()}
                            disabled={true}
                          />
                        </td>
                        {/* Place both checkboxes at the end */}

                        <td data-label="Confirm - Paid">
                          <FormikControl
                            id={"confirmPaid"}
                            name={"confirmPaid"}
                            control={InputType.CHECKBOX}
                            // options={[
                            //   {
                            //     value: Boolean(patchData?.is_paid_confirmed),
                            //   },
                            // ]}
                            // selectedValue={
                            //   patchData?.is_paid_confirmed || "false"
                            // }
                            // disabled={true}
                            options={[{ value: Boolean(confirmFieldValue) }]}
                            selectedValue={Boolean(confirmFieldValue) || false}
                            disabled={true}
                          />
                        </td>
                        {(patchData?.cash_retention &&
                        patchData?.cash_retention_type !== tabTypes.NO_RETENTION
                          ? tabTypes.RETENTION
                          : tabTypes.NO_RETENTION) === tabTypes.RETENTION &&
                          patchData?.cash_retention_type !==
                            "Retention claim" &&
                          patchData?.claim_type === tabTypes.BILLABLES && (
                            <td data-label="Confirm - Paid RTA">
                              <FormikControl
                                control={InputType.CHECKBOX}
                                type={"checkbox"}
                                id={`default-checkbox`}
                                checked={patchData?.is_retention_confirmed}
                                disabled={true}
                              />
                            </td>
                          )}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          <div className="grid pt_memototal">
            <div className="pt_memowrap">
              <div className="pt_memo">
                <FormikControl
                  as="textArea"
                  placeholder="Memo"
                  name="memo"
                  id="memo"
                  maxLength={200}
                  value={patchData?.memo}
                  disabled={true}
                  control={InputType.TEXT_AREA}
                  renderKey="label"
                  valueKey="value"
                />
              </div>
            </div>
            {patchData?.claim_type === tabTypes.BILLABLES &&
              patchData?.payment_type === tabTypes.THIRD_PARTY && (
                <div className="pt_memowrap">
                  <div className="pt_memo">
                    <FormikControl
                      as="textArea"
                      placeholder="Reason for payment to 3rd party"
                      disabled={true}
                      name="third_party_payment_reason"
                      id="third_party_payment_reason"
                      maxLength={200}
                      smallTextAreaError
                      value={patchData?.third_party_payment_reason}
                      control={InputType.TEXT_AREA}
                      renderKey="label"
                      valueKey="value"
                    />
                  </div>
                </div>
              )}
          </div>
          <div style={{ display: "flex", justifyContent: "end" }}>
            <div className="pt_totalwrap">
              <div className="1pt_infocol">
                <div>
                  <h5>Sub Total</h5>
                  <h4>
                    $
                    {calculateSubtotal(
                      patchData?.claim_amount,
                      patchData?.formatted_gst_summary
                    )}
                  </h4>
                </div>
                <div>
                  <h5>GST</h5>
                  <h4>
                    $
                    {patchData?.gst_summary
                      ? Number(patchData?.gst_summary)
                          ?.toFixed(2)
                          .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                      : "0.00"}
                  </h4>
                </div>
                <div>
                  <h5>Total</h5>
                  <h3>
                    $
                    {patchData?.claim_amount
                      ? Number(patchData?.claim_amount)
                          ?.toFixed(2)
                          .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                      : "0.00"}
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
