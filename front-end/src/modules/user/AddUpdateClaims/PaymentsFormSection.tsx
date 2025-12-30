"use client";

import ToggleInputGroup from "@/components/Inputs/ToggleInputGroup";
import React, { Fragment, useEffect, useState } from "react";
import {
  checkBoxConfirmationMessage,
  checkBoxRTAConfirmationMessage,
  retentionSwitchConfirmation,
  retentionSwitchOptions,
  tabTypes,
} from "../AddUpdatePayments/Payments.constants";
import { formatDate, getDatePickerFormat } from "@/utils";
import { useTokenDetails } from "@/hooks";
import { DateFormat, InputType } from "@/shared/constant/general";
import FormikControl from "@/components/FormikControl";
import { DD_MM_YYYY } from "@/shared/constant/identificationNumbers";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import PaymentAttachmentsSection from "./PaymentAttachements";
import { useRouter, useSearchParams } from "next/navigation";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { getCookie, setCookie } from "cookies-next";
import { setCompanyId } from "@/redux/slices/companyDetails";
import { fetchAllPaymentClaims } from "../PayApps/payApps.functions";
import { useAddUpdateClaimsContext } from "./AddUpdateClaimsContext";

export default function PaymentsFormSection() {
  const { setLoader, paymentsPatchData, noticesAutomated }: any =
    useAddUpdateClaimsContext();

  const queryParams = useSearchParams();

  const ImportScreen: any = queryParams.get("screen");
  const ImportCompanyId: any = queryParams.get("company_id");
  const selectedCompanyId = Number(getCookie("companyId")) || 0;

  const [displayImportModal, setDisplayImportModal] = useState(false);
  const { decodeTokenData } = useTokenDetails();

  const router = useRouter();

  const [claimOptions, setClaimOptions] = useState<any[]>([]);

  const [displayRetentionConfirmation, setDisplayRetentionConfirmation] =
    useState(false);
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const dispatch = useAppDispatch();

  const [minDate, setMinDate] = useState<Date | undefined>(new Date());

  const [displayCheckboxConfirmation, setDisplayCheckboxConfirmation] =
    useState(false);
  const [displayRTACheckboxConfirmation, setDisplayRTACheckboxConfirmation] =
    useState(false);

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

  // import
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoader(true); // Show loader
        const { companySpecificRoles } = decodeTokenData || {};

        // Fetch company profiles if screen is 'import'
        if (ImportScreen === "import") {
          // Check if importCompanyId exists in the companySpecificRoles array from the token
          const companyExists = companySpecificRoles?.some(
            (role: any) => role.companyId === Number(ImportCompanyId)
          );

          // Redirect if the company is not found
          if (!companyExists) {
            router.push(AppRoutes.USER_LOGIN);
            return;
          }

          // Check if isSystemAdded is true and set the ProfileType accordingly
          const userPrivilage = companySpecificRoles?.find(
            (role: any) => role.companyId === Number(ImportCompanyId)
          );

          if (userPrivilage?.isSystemAdded === true) {
            // If isSystemAdded is true, set profile type to "User"
            localStorage.setItem("ProfileType", "User");
            setCookie("ProfileType", "User");
          } else {
            // Otherwise, set profile type to "Business"
            localStorage.setItem("ProfileType", "Business");
            setCookie("ProfileType", "Business");
          }

          // Set company data if found

          localStorage.setItem("companyId", ImportCompanyId);
          dispatch(setCompanyId(ImportCompanyId));
          setCookie("companyId", ImportCompanyId);

          // Only fetch data and show modal if company exists
          if (companyExists && ImportScreen === "import") {
            fetchData(page, perPage); // Fetch relevant data
            setDisplayImportModal(true); // Display the import modal
          }
        }
      } catch {
      } finally {
        setLoader(false); // Hide loader when done
      }
    };

    fetchDetails();
  }, [
    ImportCompanyId,
    ImportScreen,
    page, // Include page and perPage for pagination in fetchData
    perPage,
  ]);

  // Fetch data
  const fetchData = async (page: number, rowsPerPage: number) => {
    if (!selectedCompanyId) return; // Early return if selectedCompanyId is not present

    const response = await fetchAllPaymentClaims({
      cash_retention_type: null,
      claim_type: "Receivable",
      contract_id: null,
      company_id: selectedCompanyId || null,
      items_per_page: null,
      page: page,
      project_id: null,
      status: "",
    });

    // Assuming response contains a list of claims with claim_id and claim_name
    if (response) {
      const responseData = JSON.parse(JSON.stringify(response?.payment_claims));
      setClaimOptions(response.payment_claims || []);
      const options = responseData.map((claim: any) => ({
        label: claim?.payment_claim_id, // You can replace this with any appropriate label field
        value: claim?.payment_claim_id,
      }));
      setClaimOptions(options || []);
    }
  };

  return (
    <Fragment>
      <div className="pt_expandtable pt_payment">
        <details open>
          <summary>{"View Payment"}</summary>

          <div className="grid pt_data">
            <div className="pt_data_clear">
              <h3>
                {paymentsPatchData?.payment_type
                  ? paymentsPatchData?.payment_type
                  : paymentsPatchData?.payment_to}
              </h3>
              {paymentsPatchData?.payment_id && (
                <h5>
                  <b>PAYMENT ID:</b> {paymentsPatchData?.payment_id ?? ""}
                </h5>
              )}
            </div>
            {paymentsPatchData?.claim_type === tabTypes.BILLABLES && (
              <div>
                <h5>Payment to</h5>
                <h4>{paymentsPatchData?.payment_to}</h4>
              </div>
            )}
            {paymentsPatchData?.payment_to === tabTypes.SUPPLIER &&
              paymentsPatchData?.payment_type !== tabTypes.PAY_LESS_ZERO &&
              !paymentsPatchData?.retention_id &&
              (paymentsPatchData?.payment_type === tabTypes.FULL ||
                paymentsPatchData?.payment_type === tabTypes.PART ||
                paymentsPatchData?.payment_type === tabTypes.PAY_LESS_FULL ||
                paymentsPatchData?.payment_type === tabTypes.PAY_LESS_PART) && (
                <div>
                  <h5>Retention</h5>
                  <ToggleInputGroup
                    type="radio"
                    name="payments_claim_type"
                    options={retentionSwitchOptions}
                    selectedValue={paymentsPatchData?.cash_retention}
                    onChange={(e) => {}}
                    disabled
                  />
                </div>
              )}
            {(paymentsPatchData?.payment_type === tabTypes.PART ||
              paymentsPatchData?.payment_type === tabTypes.PAY_LESS_PART) && (
              <div>
                <h5>Part payment outstanding amount</h5>
                <h4>
                  $
                  {paymentsPatchData?.outstanding_amount
                    ? Number(paymentsPatchData?.outstanding_amount)
                        ?.toFixed(2)
                        .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    : "0.00"}
                </h4>
                &nbsp;
                <h6>{`${
                  paymentsPatchData?.gst_summary ? "inc" : "exc"
                } GST`}</h6>
                <h5>
                  <b>GST:</b> $
                  {paymentsPatchData?.gst_summary
                    ? Number(paymentsPatchData?.gst_summary)
                        ?.toFixed(2)
                        .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    : "0.00"}
                </h5>
              </div>
            )}
          </div>

          {paymentsPatchData?.payment_to === tabTypes.SUPPLIER &&
            (paymentsPatchData?.payment_type === tabTypes.FULL ||
              paymentsPatchData?.payment_type === tabTypes.PART ||
              paymentsPatchData?.payment_type === tabTypes.PAY_LESS_FULL ||
              paymentsPatchData?.payment_type === tabTypes.PAY_LESS_PART) && (
              <div className="table-wrapper">
                <div className="pt_table pt_formtable paymentClaims">
                  <table className="dataTable compact stripe nowrap hover order-column payment-table-style TableFontSmall">
                    <thead>
                      <tr>
                        <th>ID</th>
                        {paymentsPatchData?.cash_retention ===
                          tabTypes.RETENTION &&
                          paymentsPatchData?.cash_retention_type !==
                            "Retention claim" && (
                            <>
                              <th>
                                Retention Amount
                                <span className="required">*</span>
                              </th>

                              <th>
                                Retention Release Date
                                <span className="required">*</span>
                              </th>
                            </>
                          )}
                        {(paymentsPatchData?.payment_type ===
                          tabTypes.PAY_LESS_PART ||
                          paymentsPatchData?.payment_type ===
                            tabTypes.PAY_LESS_FULL) && (
                          <th>
                            Pay Less Amount<span className="required">*</span>
                          </th>
                        )}
                        <th>
                          Payment Amount<span className="required">*</span>
                        </th>
                        <th>
                          Payment Date<span className="required">*</span>
                        </th>
                        {/* Place both checkboxes at the end */}

                        <th>
                          {`Confirm ${
                            paymentsPatchData?.claim_type === tabTypes.BILLABLES
                              ? "Paid"
                              : "Received"
                          }`}
                        </th>
                        {paymentsPatchData?.cash_retention ===
                          tabTypes.RETENTION &&
                          paymentsPatchData?.cash_retention_type !==
                            "Retention claim" &&
                          paymentsPatchData?.claim_type ===
                            tabTypes.BILLABLES && <th>{"Confirm Paid RTA"}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="form_array_table_row">
                        <td>001</td>
                        {/* Retention Fields */}
                        {paymentsPatchData?.cash_retention ===
                          tabTypes.RETENTION &&
                          paymentsPatchData?.cash_retention_type !==
                            "Retention claim" && (
                            <>
                              <td data-label="Retention Amount">
                                <FormikControl
                                  control={InputType.TEXT_FIELD}
                                  label={""}
                                  name="formatted_retention_amount"
                                  id="formatted_retention_amount"
                                  value={
                                    paymentsPatchData?.formatted_retention_amount
                                      ? paymentsPatchData?.formatted_retention_amount?.replace(
                                          "-",
                                          ""
                                        )
                                      : ""
                                  }
                                  onChange={() => {}}
                                  placeholder="Enter retention amount"
                                  required
                                  disableAutoComplete={false}
                                  disabled
                                />
                              </td>

                              <td data-label="Retention Release Date">
                                <FormikControl
                                  control={InputType.DATE_PICKER}
                                  required
                                  selected={
                                    paymentsPatchData?.retention_release_date
                                  }
                                  onChange={(selectedDate: string) => {}}
                                  format={DD_MM_YYYY}
                                  value={
                                    paymentsPatchData?.retention_release_date
                                      ? getDatePickerFormat(
                                          paymentsPatchData?.retention_release_date
                                        )
                                      : ""
                                  }
                                  minDate={
                                    userMode === "Onboarding"
                                      ? minDate
                                      : formatDate(
                                          new Date(),
                                          DateFormat.YYYY_MM_DD
                                        )
                                  }
                                  maxYear={new Date().getFullYear() + 50}
                                  disabled
                                />
                              </td>
                            </>
                          )}
                        {/* Payment Fields */}
                        {(paymentsPatchData?.payment_type ===
                          tabTypes.PAY_LESS_PART ||
                          paymentsPatchData?.payment_type ===
                            tabTypes.PAY_LESS_FULL) && (
                          <td data-label="Pay Less Amount">
                            <FormikControl
                              control={InputType.TEXT_FIELD}
                              placeholder={"Enter pay less amount"}
                              name="formatted_payless_amount"
                              id="formatted_payless_amount"
                              value={
                                paymentsPatchData?.formatted_payless_amount
                              }
                              onChange={() => {}}
                              required
                              disableAutoComplete={false}
                              disabled
                            />
                          </td>
                        )}
                        <td data-label="Payment Amount">
                          <FormikControl
                            control={InputType.TEXT_FIELD}
                            label={""}
                            placeholder={"Enter payment amount"}
                            name="paymentamount"
                            id="formatted_payment_amount"
                            value={
                              paymentsPatchData?.formatted_payment_amount
                                ? paymentsPatchData?.formatted_payment_amount?.replace(
                                    "-",
                                    ""
                                  )
                                : ""
                            }
                            onChange={() => {}}
                            required
                            disableAutoComplete={false}
                            disabled
                          />
                        </td>
                        <td data-label="Payment Date">
                          <FormikControl
                            control={InputType.DATE_PICKER}
                            required
                            selected={paymentsPatchData.payment_date}
                            onChange={(selectedDate: string) => {}}
                            format={DD_MM_YYYY}
                            value={
                              paymentsPatchData?.payment_date
                                ? getDatePickerFormat(
                                    paymentsPatchData?.payment_date
                                  )
                                : ""
                            }
                            disabled
                          />
                        </td>
                        {/* Place both checkboxes at the end */}

                        <td data-label="Confirm - Paid">
                          <FormikControl
                            id={"confirmPaid"}
                            name={"confirmPaid"}
                            control={InputType.CHECKBOX}
                            options={[
                              {
                                value: Boolean(
                                  paymentsPatchData?.is_paid_confirmed
                                ),
                              },
                            ]}
                            onChange={(e: any) => {}}
                            selectedValue={
                              paymentsPatchData.is_paid_confirmed || "false"
                            }
                            disabled
                          />
                        </td>
                        {paymentsPatchData?.cash_retention ===
                          tabTypes.RETENTION &&
                          paymentsPatchData?.cash_retention_type !==
                            "Retention claim" &&
                          paymentsPatchData?.claim_type ===
                            tabTypes.BILLABLES && (
                            <td data-label="Confirm - Paid RTA">
                              <FormikControl
                                control={InputType.CHECKBOX}
                                id={"confirmRtaPaid"}
                                name={"confirmRtaPaid"}
                                // checked={formik?.values?.is_retention_confirmed}
                                onChange={(e: any) => {}}
                                options={[
                                  {
                                    value: Boolean(
                                      paymentsPatchData?.is_retention_confirmed
                                    ),
                                  },
                                ]}
                                selectedValue={
                                  paymentsPatchData.is_retention_confirmed ||
                                  "false"
                                }
                                disabled
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
                  value={paymentsPatchData?.memo}
                  onChange={() => {}}
                  disabled
                  control={InputType.TEXT_AREA}
                  renderKey="label"
                  valueKey="value"
                />
              </div>
            </div>
            {paymentsPatchData?.claim_type === tabTypes.BILLABLES &&
              paymentsPatchData?.payment_to === tabTypes.THIRD_PARTY && (
                <div className="pt_memowrap">
                  <div className="pt_memo">
                    <FormikControl
                      as="textArea"
                      placeholder="Reason for payment to 3rd party"
                      disabled
                      name="third_party_payment_reason"
                      id="third_party_payment_reason"
                      maxLength={200}
                      smallTextAreaError
                      value={paymentsPatchData?.third_party_payment_reason}
                      onChange={() => {}}
                      control={InputType.TEXT_AREA}
                      renderKey="label"
                      valueKey="value"
                    />
                  </div>
                </div>
              )}
            {paymentsPatchData?.claim_type === tabTypes.BILLABLES &&
              (paymentsPatchData?.payment_type !== tabTypes.FULL ||
                paymentsPatchData?.payment_to === tabTypes.THIRD_PARTY) &&
              noticesAutomated && (
                <div className="pt_memowrap">
                  <div className="pt_memo">
                    <FormikControl
                      as="textArea"
                      placeholder="Enter a reason for withholding payment"
                      name="withHoldReson"
                      id="withHoldReson"
                      maxLength={200}
                      value={paymentsPatchData?.withhold_payment_reason}
                      disabled={true}
                      control={InputType.TEXT_AREA}
                      renderKey="label"
                      valueKey="value"
                    />
                  </div>
                </div>
              )}
          </div>
          <RenderDynamicAttachments />
        </details>
      </div>
      {displayRetentionConfirmation && (
        <dialog id="retention-confirmation" open>
          <article>
            <header>
              <div className="mb_1">
                <button
                  rel="prev"
                  aria-label="Close"
                  onClick={() => {}}
                ></button>
              </div>
              {/* <strong>Confirmation</strong> */}
            </header>
            <h4 className="text_center">
              {paymentsPatchData?.cash_retention === tabTypes.RETENTION
                ? retentionSwitchConfirmation.noRetention
                : retentionSwitchConfirmation.retention}
            </h4>
            <footer>
              <button className="secondary" type="button" onClick={() => {}}>
                No
              </button>
              <button className="primary" type="button" onClick={() => {}}>
                Yes
              </button>
            </footer>
          </article>
        </dialog>
      )}
      {displayCheckboxConfirmation && (
        <dialog id="checkbox-confirmation" open>
          <article>
            <header>
              <div className="mb_1">
                <button
                  rel="prev"
                  aria-label="Close"
                  onClick={() => setDisplayCheckboxConfirmation(false)}
                ></button>
              </div>
            </header>
            <h4 className="text_center">
              {`${checkBoxConfirmationMessage} ${
                paymentsPatchData?.claim_type === tabTypes.BILLABLES
                  ? "Paid"
                  : "Received"
              }?`}
            </h4>
            <footer>
              <button
                className="secondary"
                type="button"
                onClick={() => setDisplayCheckboxConfirmation(false)}
              >
                No
              </button>
              <button className="primary" type="button" onClick={() => {}}>
                Yes
              </button>
            </footer>
          </article>
        </dialog>
      )}
      {displayRTACheckboxConfirmation && (
        <dialog id="checkbox-confirmation" open>
          <article>
            <header>
              <div className="mb_1">
                <button
                  rel="prev"
                  aria-label="Close"
                  onClick={() => setDisplayRTACheckboxConfirmation(false)}
                ></button>
              </div>
            </header>
            <h4 className="text_center">
              {`${checkBoxRTAConfirmationMessage} ${
                paymentsPatchData?.claim_type === tabTypes.BILLABLES
                  ? "Paid"
                  : "Received"
              }?`}
            </h4>
            <footer>
              <button
                className="secondary"
                type="button"
                onClick={() => setDisplayRTACheckboxConfirmation(false)}
              >
                No
              </button>
              <button className="primary" type="button" onClick={() => {}}>
                Yes
              </button>
            </footer>
          </article>
        </dialog>
      )}
    </Fragment>
  );
}
function RenderDynamicAttachments() {
  const { paymentsPatchData, noticesAutomated }: any =
    useAddUpdateClaimsContext();
  console.log(
    "🚀 ~ RenderDynamicAttachments ~ paymentsPatchData:",
    paymentsPatchData
  );

  // function checkIsAttachmentCompulsory() {
  //   if (
  //     paymentsPatchData?.claim_type === tabTypes.BILLABLES &&
  //     (paymentsPatchData?.payment_type !== tabTypes.FULL ||
  //       paymentsPatchData?.payment_to === tabTypes.THIRD_PARTY)
  //   ) {
  //     return true;
  //   } else {
  //     return false;
  //   }
  // }

  function checkIsAttachmentCompulsory() {
    const isPremiumUser = !!noticesAutomated;

    const isBillableCondition =
      paymentsPatchData?.claim_type === tabTypes.BILLABLES &&
      (paymentsPatchData?.payment_type !== tabTypes.FULL ||
        paymentsPatchData?.payment_to === tabTypes.THIRD_PARTY);

    const isReceivablePremiumWithoutDoc =
      isPremiumUser && paymentsPatchData?.claim_type === tabTypes.RECEIVABLES;

    const isBillablePremiumWithoutDoc =
      isPremiumUser &&
      paymentsPatchData?.claim_type === tabTypes.BILLABLES &&
      paymentsPatchData?.payment_type !== tabTypes.FULL;

    // Attachment is compulsory if any of the original billable condition is true
    // AND NOT premium exceptions
    if (isBillableCondition) return true;

    // For premium user, certain attachments are NOT needed
    if (isReceivablePremiumWithoutDoc) return false;
    if (isBillablePremiumWithoutDoc) return false;

    return false;
  }

  return (
    <PaymentAttachmentsSection
      displayCompulsoryOptionalAttachment={checkIsAttachmentCompulsory()}
    />
  );
}
