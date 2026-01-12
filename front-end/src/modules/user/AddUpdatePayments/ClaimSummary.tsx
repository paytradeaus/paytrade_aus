"use client";
import FormikControl from "@/components/FormikControl";
import { InputType, uploadFile } from "@/shared/constant/general";
import React, { useEffect, useState } from "react";
import { usePaymentsContext } from "./PaymentContextProvider";
import MultipleFileHandler from "@/components/MultipleFileHandler";
import { ReadFileAttachmentsOrDocuments } from "@/app/api/commonApi";
import { getCompanyIdFromStorage, getDatePickerFormat } from "@/utils";
import { tabTypes } from "./Payments.constants";
import {
  noticesHeader,
  noticesRenderData,
  retentionRadioOption,
} from "../AddUpdateClaims/AddUpdateClaims.constant";
import DynamicTable from "@/components/Table";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { getNoticesListServices } from "../AddUpdateClaims/AddUpdateClaims.function";

interface Attachment {
  attachment_type: string;
  file: string;
  file_path: string;
  file_type: string;
  id: string;
  name: string;
  uploaded_on: string;
  file_name: string;
}

export default function ClaimSummary() {
  const {
    patchData,
    retentionDisable,
    isViewMode,
    formik,
    retentionBankAccounts,
    router,
  }: any = usePaymentsContext();
  const selectedCompanyId = getCompanyIdFromStorage() || 0;

  const [otherOptionalAttachments, setOtherOptionalAttachments] = useState<
    Attachment[]
  >([]);
  const [noticesListData, setNoticesListData] = useState([]);

  const [supportingStatementAttachments, setSupportingStatementAttachments] =
    useState<Attachment[]>([]);

  const [
    optionalSupportingStatementAttachments,
    setOptionalSupportingStatementAttachments,
  ] = useState<Attachment[]>([]);

  useEffect(() => {
    const fetchFileAttachments = async () => {
      try {
        const attachmentTypes = [
          "Other optional payment claim attachment",
          "Supporting statement attachment",
          "Optional supporting statement attachment",
        ];

        // Loop through attachment types and fetch each one separately
        for (const type of attachmentTypes) {
          const payload = {
            data: {
              payment_claim_id: patchData?.payment_claim_id, // Ensure the ID is passed correctly
            },
            fileAttachmentOrDocumentType: type, // Use the type directly as a string
          };

          const response = await ReadFileAttachmentsOrDocuments(payload);

          // Handle response based on the type
          if (response?.length > 0) {
            switch (type) {
              case "Other optional payment claim attachment":
                setOtherOptionalAttachments((prev) => [...response]);
                break;
              case "Supporting statement attachment":
                setSupportingStatementAttachments((prev) => [...response]);
                break;
              case "Optional supporting statement attachment":
                setOptionalSupportingStatementAttachments((prev) => [
                  ...response,
                ]);
                break;
              default:
                break;
            }
          }
        }
      } catch {}
    };

    if (patchData?.payment_claim_id) {
      fetchFileAttachments();
    }
    if (patchData?.claim_type === "Receivable") {
      getNoticesList();
    }
  }, [patchData?.payment_claim_id]);

  function handleAccountSelection(value: any) {
    formik.setFieldValue("retention_account", value);
  }

  const noticesAction = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      style: "primary",
      onClick: (row: any) => {
        router.push(`${AppRoutes.USER_NOTICES_VIEW}/${row?.id}`);
      },
    },
  ];

  async function getNoticesList() {
    const postData = {
      company_id: selectedCompanyId,
      payment_claim_id: patchData?.payment_claim_id || null,
      page: 1,
      items_per_page: 10,
    };
    const response = await getNoticesListServices(postData);

    if (response?.notices_list?.length > 0) {
      setNoticesListData(response?.notices_list);
    } else {
      setNoticesListData([]);
    }
  }

  return (
    <div className="pt_expandtable">
      <details
        open={
          formik.touched.retention_account && formik.errors.retention_account
        }
      >
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
              received_date
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
        <div className="grid pt_infocol">
          <div>
            <h5>RETENTION</h5>
            <FormikControl
              control={InputType.RADIO_BUTTON}
              label=""
              name={"retentionRadioOptions"}
              options={retentionRadioOption}
              selectedValue={
                formik?.values?.has_claim_retention
                  ? "Retention"
                  : "No Retention"
              }
              disabled
            />
          </div>
          {formik?.values?.has_claim_retention && (
            <>
              <div>
                <h5>
                  RETENTION PERCENTAGE
                  <span className="required">*</span>
                </h5>
                <FormikControl
                  control={InputType.TEXT_FIELD}
                  name={"retentionPercentage"}
                  value={formik?.values?.retentionPercentage}
                  disabled
                />
              </div>
              <div>
                <h5>
                  RETENTION AMOUNT
                  <span className="required">*</span>
                </h5>
                <FormikControl
                  control={InputType.TEXT_FIELD}
                  name={"retentionAmount"}
                  value={formik?.values?.retentionAmount}
                  disabled
                />
              </div>
            </>
          )}
          <div></div>
        </div>
        <div className="pt_expandtable">
          <details
            open={
              formik.touched.retention_account &&
              formik.errors.retention_account
            }
          >
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
              {/* {formik?.values?.payment_type === "Pay - Zero" &&
                  formik?.values?.claim_type === "Billable" &&
                  !formik?.values?.view_mode && ( */}
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
              <div className="grid pt_infocol" style={{ width: "16.5rem" }}>
                {formik?.values?.cash_retention === tabTypes.RETENTION &&
                  formik?.values?.cash_retention_type !== "Retention claim" &&
                  formik?.values?.claim_type === "Billable" &&
                  formik?.values?.payment_type != "Pay - Zero" && (
                    <div>
                      <h5>
                        <b>Retention Paid into Account</b>
                        {!isViewMode && <span className="required">*</span>}
                      </h5>
                      <FormikControl
                        control={InputType.SELECT}
                        name={""}
                        renderKey="label"
                        valueKey="value"
                        placeholder="Select account"
                        disabled={isViewMode || retentionDisable}
                        options={retentionBankAccounts}
                        returnSelectedObject
                        onChange={handleAccountSelection}
                        value={formik?.values?.retention_account}
                        showError={
                          formik.touched.retention_account &&
                          formik.errors.retention_account
                        }
                        error={formik.errors.retention_account}
                      />
                    </div>
                  )}
              </div>
              {/* )} */}
            </div>
          </details>
        </div>

        <div className="grid">
          <div className="pt_table pt_formtable">
            <table className="dataTable compact stripe nowrap hover order-column TableFontSmall">
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
                      ? "Amount (including GST)"
                      : "Amount (excluding GST)"}
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
                        {invoice.formatted_gst ? invoice.formatted_gst : "0.00"}
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

        <div className="grid pt_memototal">
          <div className="pt_memowrap">
            <div className="pt_memo">
              <textarea
                name="memo"
                aria-label="Write a memo"
                placeholder="Memo"
                value={patchData?.claim_memo || ""}
              ></textarea>
            </div>
          </div>
        </div>

        <div className="pt_attachments">
          <div className="grid">
            {patchData?.claim_type === "Receivable" ? (
              <MultipleFileHandler
                titleName=" Supporting statement attachments"
                disableChooseFileBtn={true}
                existingFiles={supportingStatementAttachments}
                filesToAccept={`${uploadFile.pdf}, ${uploadFile.word}`}
                hideDeleteButton
              />
            ) : (
              <MultipleFileHandler
                titleName="Other optional attachments"
                disableChooseFileBtn={true}
                existingFiles={optionalSupportingStatementAttachments}
                filesToAccept={`${uploadFile.pdf}, ${uploadFile.word}`}
                hideDeleteButton
              />
            )}
            <MultipleFileHandler
              titleName="Other optional attachments"
              disableChooseFileBtn={true}
              existingFiles={otherOptionalAttachments}
              filesToAccept={`${uploadFile.pdf}, ${uploadFile.word}`}
              hideDeleteButton
            />
          </div>
        </div>
        <br />
        {isViewMode && noticesListData?.length > 0 && (
          <DynamicTable
            headers={noticesHeader}
            gridData={noticesListData}
            renderRowList={noticesRenderData}
            gridActions={noticesAction}
            loaderColSpan={4}
            displayAllStaticActions
          />
        )}
      </details>
    </div>
  );
}
