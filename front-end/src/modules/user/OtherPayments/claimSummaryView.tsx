"use client";
import FormikControl from "@/components/FormikControl";
import { InputType } from "@/shared/constant/general";
import { getDatePickerFormat } from "@/utils";
import React from "react";

export default function ClaimSummaryViewForOtherPayments(props: any) {
  const { patchData, formik } = props;

  return (
    <div
      className="pt_claimView_other_payments"
      style={{ marginTop: "1.8rem" }}
    >
      <div className="pt_expandtable">
        <details>
          <summary>Claim summary</summary>

          <div className="grid pt_infocol">
            <div>
              <h5>
                Project<span></span>
              </h5>
              <FormikControl
                control={InputType.TEXT_FIELD}
                name={"projectId"}
                placeholder="Select project"
                disabled={true}
                value={patchData?.project_name || ""}
              />
            </div>
            <div>
              <h5>Contract</h5>
              <FormikControl
                control={InputType.TEXT_FIELD}
                name={"contractId"}
                placeholder="Select contract"
                disabled={true}
                value={patchData?.contract_name || ""}
              />
            </div>
            <div>
              <div>
                <h5>
                  {patchData?.claim_type === "Billable" ? "Supplier" : "Client"}
                </h5>
                <FormikControl
                  control={InputType.TEXT_FIELD}
                  name={"Client/Supplier"}
                  placeholder={
                    patchData?.claim_type === "Billable" ? "Supplier" : "Client"
                  }
                  disabled
                  value={patchData?.client_supplier_name || ""}
                />
              </div>
            </div>
            <div>
              <h5>Address</h5>
              <FormikControl
                control={InputType.TEXT_FIELD}
                name={"address"}
                disabled
                placeholder="Address"
                onChange={(e: any) => {}}
                value={patchData?.client_supplier_address || ""}
              />
            </div>
          </div>
          <div className="grid pt_infocol">
            <div>
              <h5>Payment terms</h5>
              <FormikControl
                control={InputType.TEXT_FIELD}
                name={"paymentTerms"}
                placeholder="Payment Terms"
                onChange={(e: any) => {}}
                disabled
                value={patchData?.payment_terms || ""}
              />
            </div>
            <div>
              <h5>
                {patchData?.claim_type === "Billable"
                  ? "Received date"
                  : "Sent date"}
                <span></span>
              </h5>
              <FormikControl
                control={InputType.DATE_PICKER}
                name={"sentDate"}
                placeholder="Sent Date"
                required
                disabled
                value={
                  patchData?.claim_type === "Billable"
                    ? getDatePickerFormat(patchData?.received_date)
                    : getDatePickerFormat(patchData?.sent_date) || ""
                }
              />
            </div>
            <div>
              <h5>
                Due date<span></span>
              </h5>
              <FormikControl
                control={InputType.DATE_PICKER}
                name={"dueDate"}
                placeholder="Due Date"
                required
                disabled
                value={getDatePickerFormat(patchData?.due_date) || ""}
              />
            </div>
            <div>
              <h5>Claim reference</h5>
              <FormikControl
                control={InputType.TEXT_FIELD}
                name={"claimReference"}
                placeholder="Claim Reference"
                required
                value={patchData?.claim_reference || ""}
              />
            </div>
          </div>

          <div className="pt_expandtable">
            <details>
              <summary>Payment Accounts</summary>
              <div className="">
                {patchData?.claim_type === "Billable" && (
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
                        value={patchData?.payment_from_account_type || ""}
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
                        value={patchData?.payment_from_account_name || ""}
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
                        value={patchData?.payment_from_account_bsb_number || ""}
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
                        value={patchData?.payment_from_account_number || ""}
                      />
                    </div>
                  </div>
                )}
                <div className="grid pt_infocol">
                  <div>
                    <h5>
                      <b>Payment to account</b>
                    </h5>
                    <FormikControl
                      control={InputType.TEXT_FIELD}
                      name={"paymentToAccount"}
                      required
                      disabled
                      onChange={(e: any) => {}}
                      placeholder="Payment to account"
                      value={patchData?.payment_to_account_type || ""}
                    />
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
                      value={patchData?.payment_to_account_name || ""}
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
                      value={patchData?.payment_to_account_bsb_number || ""}
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
                      value={patchData?.payment_to_account_number || ""}
                    />
                  </div>
                </div>
              </div>
            </details>
          </div>

          <div className="grid">
            <div className="pt_table pt_formtable">
              <table className="dataTable compact stripe nowrap hover order-column">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Description</th>
                    <th>
                      Quantity<span className="required">*</span>
                    </th>
                    <th>
                      Unit price<span className="required">*</span>
                    </th>
                    <th
                      data-tooltip={
                        patchData?.is_gst_optional
                          ? "Disable this option if this business is not registered for GST "
                          : "Enable this option if this business is registered for GST"
                      }
                      data-placement="left"
                    >
                      <FormikControl
                        control={InputType.CHECKBOX}
                        name="gst"
                        checked={patchData?.is_gst_optional}
                        value={patchData?.is_gst_optional}
                        disabled={true}
                      />{" "}
                      GST <i className="fa-light fa-circle-info thicon"></i>
                    </th>
                    <th>
                      {patchData?.is_gst_optional
                        ? "Amount (excluding GST)"
                        : "Amount (including GST)"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {patchData?.invoices && patchData.invoices.length > 0 ? (
                    patchData.invoices.map((invoice: any, index: number) => (
                      <tr key={index}>
                        <td data-label="ID">{index + 1}</td>
                        <td data-label="Description">
                          {invoice.description || "-"}
                        </td>
                        <td data-label="Quantity">{invoice.quantity || "-"}</td>
                        <td data-label="Unit Price">
                          $
                          {invoice.formatted_unit_price
                            ? invoice.formatted_unit_price
                            : "0.00"}
                        </td>
                        <td data-label="GST">
                          $
                          {invoice.formatted_gst
                            ? invoice.formatted_gst
                            : "0.00"}
                        </td>
                        <td data-label="Amount">
                          $
                          {invoice.formatted_total_amount_including_gst
                            ? invoice.formatted_total_amount_including_gst
                            : "0.00"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center" }}>
                        There are no data to display
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
