import React, { Fragment, useEffect } from "react";
import HeaderContent from "./HeaderContent";
import DropdownFields from "./DropdownFields";
import PaymentAccounts from "./PaymentAccounts";
import FormArrayGrid from "./FormArrayGrid";
import Attachments from "./Attachments";
import XeroIntegration from "./XeroIntegration";
import FooterSection from "./FooterSection";
import { useAddUpdateClaimsContext } from "./AddUpdateClaimsContext";
import { noticesHeader, noticesRenderData } from "./AddUpdateClaims.constant";
import {
  fetchDetailsOfAPaymentClaim,
  fetchDetailsOfAPaymentClaimForImport,
  getNoticesListServices,
  getProjectsListByClientSupplierId,
} from "./AddUpdateClaims.function";
import BaseModal from "@/components/BaseModal";
import { ReadFileAttachmentsOrDocuments } from "@/app/api/commonApi";
import DynamicTable from "@/components/Table";
import { getDatePickerFormat } from "@/utils";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { setPaymentClaims } from "@/redux/slices/subscribeRouteBackDetails";
import PaymentsFormSection from "./PaymentsFormSection";
import PaymentHistory from "./PaymentHistory";
import { tabTypes } from "../AddUpdatePayments/Payments.constants";
import { fetchViewPayments } from "../AddUpdatePayments/Payment.functions";

/**
 * Redistribute backend per-line GST so the line-item rows reconcile with the
 * claim totals card and with the source bill in Xero.
 *
 * The backend stores `payment_claim_invoices.gst` as the raw 10% × unit_price
 * (gross of retention), but `claim_amount` and `gst_summary` reflect the
 * **actual** taxable GST after BAS-Excluded retention is stripped out (see
 * payment-claims.service.ts ~L2078). For a claim like 100022 that means the
 * raw line GST is $1,572.50 while the real GST is $1,493.88 — and the totals
 * card shows the latter while the line shows the former, breaking
 * reconciliation.
 *
 * This helper scales every line's stored GST by the ratio
 * `gst_summary / Σ(raw line gst)` so the per-line GST values sum to
 * `gst_summary` exactly. Last line absorbs the rounding remainder. Lines with
 * zero raw GST stay at zero.
 */
function redistributeLineGst(
  items: Array<{
    description: any;
    rawGst: number;
    quantity: number;
    unit_price_num: number;
    unit_price: string;
  }>,
  targetTotalGst: number
): any[] {
  if (!items || items.length === 0) return items as any;

  const sumRawGst = items.reduce((s, it) => s + (Number(it.rawGst) || 0), 0);
  const canRedistribute = targetTotalGst > 0 && sumRawGst > 0;

  // Assign rounding remainder to the LAST line that actually has GST so we
  // never inflate a zero-GST line. Falls back to -1 (no remainder line) when
  // no line has GST or no redistribution is happening.
  let remainderIdx = -1;
  if (canRedistribute) {
    for (let i = items.length - 1; i >= 0; i--) {
      if ((Number(items[i].rawGst) || 0) > 0) {
        remainderIdx = i;
        break;
      }
    }
  }

  let allocated = 0;
  return items.map((it, i) => {
    const lineSubtotal = (it.unit_price_num || 0) * (it.quantity || 0);
    let lineGst: number;

    if (!canRedistribute) {
      lineGst = targetTotalGst <= 0 ? 0 : Number(it.rawGst) || 0;
    } else if ((Number(it.rawGst) || 0) === 0) {
      // Preserve zero-GST lines exactly.
      lineGst = 0;
    } else if (i === remainderIdx) {
      // Last taxable line absorbs the rounding remainder.
      lineGst = Number((targetTotalGst - allocated).toFixed(2));
    } else {
      lineGst = Number(((it.rawGst / sumRawGst) * targetTotalGst).toFixed(2));
    }
    allocated += lineGst;

    return {
      description: it.description,
      gst: lineGst.toFixed(2),
      quantity: it.quantity,
      total_amount_including_gst: (lineSubtotal + lineGst).toFixed(2),
      unit_price: it.unit_price,
    };
  });
}

export default function AddUpdateClaims({ editMode, viewMode }: any) {
  const {
    formik,
    ClientSupplierType,
    ClaimType,
    ClientSupplierId,
    setProjectOpt,
    displayRetentionWarning,
    isEditable,
    paymentDetails,
    displayContractValueExceedModal,
    setDisplayContractValueExceedModal,
    claimData,
    setDisplayRetentionWarning,
    displaySubscriptionModal,
    setDisplaySubscriptionModal,
    handleNoticesTrigger,
    setIsEditable,
    togglePaymentReceivables,
    selectedCompanyId,
    routeParams,
    setClaimData,
    setOptionalAttachments,
    setCompulsoryAttachments,
    setOtherOptionalAttachments,
    fetchContractsForProject,
    setLoader,
    setNoticesListData,
    noticesListData,
    setInitialPatchedValues,
    setProceedWithExceedingAmount,
    setIsViewMode,
    isViewMode,
    router,
    dispatch,
    importClaimIdFromMail,
    companyExists,
    otherOptionalAttachments,
    compulsoryAttachments,
    optionalAttachments,
    setSelectedProjectId,
    formatRupees,
    paymentsPatchData,
    paymentId,
    setPaymentsPatchData,
    setImportClaimAPIData,
    projectRole,
    clientRole,
    setClientRole,
    setProjectRole,
    claimStatus,
    setClaimStatus,
  }: any = useAddUpdateClaimsContext();

  //import claimsData from Email template
  useEffect(() => {
    if (importClaimIdFromMail && companyExists) {
      handleImportClaim();
    }
  }, [companyExists, importClaimIdFromMail]);

  useEffect(() => {
    const source = isEditable || isViewMode ? claimData : paymentDetails;

    const initialContractSum = source?.initial_contract_sum ?? 0;
    const variationAmount = source?.variation_amount ?? 0;
    const claimAmount =
      isEditable || isViewMode
        ? claimData?.previous_claim_amount
        : paymentDetails?.claim_amount ?? 0;

    const ContractTotal = initialContractSum + variationAmount - claimAmount;
    formik?.setFieldValue("contractTotal", ContractTotal);
    if (isViewMode && togglePaymentReceivables()) {
      getNoticesList();
    }
  }, [paymentDetails, claimData, isEditable, isViewMode]);

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

  useEffect(() => {
    initialInvoke();
  }, []);

  function initialInvoke() {
    if (viewMode) {
      getPayments();
    }

    if (editMode || viewMode) {
      getAddedClaims();
      if (editMode) {
        setIsEditable(true);
      }
      if (viewMode) {
        setIsViewMode(true);
      }
    }

    if (ClientSupplierType) {
      formik?.setFieldValue(
        "claim_type",
        ClientSupplierType === "Supplier" ? "Billable" : "Receivable"
      );
    } else {
      formik?.setFieldValue("claim_type", ClaimType || "Receivable");
    }

    if (ClientSupplierId) {
      fetchProjectsOfClient();
    }
  }

  async function handleImportClaim() {
    const apiResponse = await fetchDetailsOfAPaymentClaimForImport({
      fetchDetailsOfAPaymentClaimForImportId: importClaimIdFromMail,
    });
    if (apiResponse?.company_id) {
      formik.setFieldValue(
        "paidDeclaration",
        apiResponse?.all_subcontracts_paid
      );
      formik?.setFieldValue("subTotal", apiResponse?.sub_total_summary);
      formik?.setFieldValue("gstAmount", apiResponse?.gst_summary);
      formik?.setFieldValue("claim_amount", apiResponse?.claim_amount);
      formik?.setFieldValue("claim_type", apiResponse?.claim_type);
      formik?.setFieldValue(
        "cash_retention_type",
        apiResponse?.cash_retention_type
      );
      formik?.setFieldValue("isGstChecked", apiResponse?.isGstChecked);
      formik?.setFieldValue(
        "claimItems",
        apiResponse?.invoice_list?.length
          ? redistributeLineGst(
              apiResponse.invoice_list.map((item: any) => ({
                description: item.description,
                rawGst: Number(item?.gst) || 0,
                quantity: Number(item.quantity),
                unit_price_num: Number(item?.unit_price) || 0,
                unit_price: `${formatRupees(Number(item?.unit_price))}`,
              })),
              Number(apiResponse?.gst_summary) || 0
            )
          : apiResponse?.invoice_list
      );

      formik?.setFieldValue("totalAmount", apiResponse?.claim_amount);
      formik?.setFieldValue("projectId", apiResponse?.project_id);
      setSelectedProjectId(apiResponse?.project_id);
      
      formik.setFieldValue(
        "cashRetention",
        apiResponse?.cash_retention ? "Retention" : "No Retention"
      );
      setImportClaimAPIData(apiResponse);
    }
  }

  async function fetchProjectsOfClient() {
    const projects = await getProjectsListByClientSupplierId({
      client_supplier_id: Number(ClientSupplierId),
    });
    if (projects) {
      const formattedProjects = projects.map((project: any) => ({
        label: project.project_name,
        value: project?.project_id.toString(),
        project_id: project?.project_id,
      }));
      setProjectOpt(formattedProjects || []);
    }
  }

  async function getNoticesList() {
    const postData = {
      company_id: selectedCompanyId,
      payment_claim_id: routeParams?.id ? Number(routeParams?.id) : null,
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

  async function getAddedClaims() {
    if (routeParams?.id) {
      setLoader(true);
      try {
        const payload: any = {
          payment_claim_id: routeParams?.id ? Number(routeParams?.id) : null,
          company_id: selectedCompanyId,
        };
        const responseData = await fetchDetailsOfAPaymentClaim(payload);
        let formValues = {};
        if (responseData) {
          setClaimData(responseData);
          setClientRole(responseData?.client_supplier_role);
          setProjectRole(responseData?.project_role);
          setClaimStatus(responseData?.status);
          // Set the default toggle value if isEdit is true
          if (editMode || viewMode) {
            fetchContractsForProject(
              responseData?.project_id,
              responseData?.claim_type === "Receivable"
            );
            formValues = {
              projectId: responseData?.project_id || null,
              contractId: responseData?.contract_id,
              paymentTerms: responseData?.payment_terms || null,
              cashRetention: responseData?.cash_retention
                ? "Retention"
                : "No Retention",
              retentionAmount: responseData?.retention_amount || null,
              retentionPercentage: responseData?.retention_percentage || null,
              supplier: responseData?.client_supplier_name || null,
              address: responseData?.client_supplier_address || null,
              receivedDate: responseData?.received_date
                ? getDatePickerFormat(responseData?.received_date)
                : "",
              sentDate: responseData?.sent_date
                ? getDatePickerFormat(responseData?.sent_date)
                : "",
              dueDate: responseData?.due_date
                ? getDatePickerFormat(responseData?.due_date)
                : "",
              claimReference: responseData?.claim_reference || null,
              memo: responseData?.memo || null,
              paymentToAccount: responseData?.payment_to_account_type || null,
              paymentFromAccount:
                responseData?.payment_from_account_type || null,
              paymentToAccountName:
                responseData?.payment_to_account_name || null,
              paymentToBSB: responseData?.payment_to_account_bsb_number || null,
              paymentToAccountNumber:
                responseData?.payment_to_account_number || null,
              paymentFromAccountName:
                responseData?.payment_from_account_name || null,
              paymentFromBSB:
                responseData?.payment_from_account_bsb_number || null,
              paymentFromAccountNumber:
                responseData?.payment_from_account_number || null,
              client: responseData?.client_supplier_name || null,
              isGstChecked: responseData?.is_gst_optional,
              claim_type: responseData?.claim_type,
              cash_retention_type: responseData?.cash_retention_type,
              claimItems:
                responseData?.invoices?.length > 0
                  ? redistributeLineGst(
                      responseData.invoices.map((item: any) => ({
                        description: item.description,
                        rawGst: Number(item?.gst) || 0,
                        quantity: Number(item.quantity),
                        unit_price_num: Number(item?.unit_price) || 0,
                        unit_price: `${formatRupees(Number(item?.unit_price))}`,
                      })),
                      Number(responseData?.gst_summary) || 0
                    )
                  : formik?.initialValues?.claimItems,
              subTotal: responseData?.sub_total_summary,
              gstAmount: responseData?.gst_summary,
              totalAmount: responseData?.claim_amount,
              paidDeclaration: responseData?.all_subcontracts_paid,
            };
            formik?.setValues(formValues);

            // Array of fileAttachmentOrDocumentTypes
            const attachmentTypes = [
              "Other optional payment claim attachment",
              "Supporting statement attachment",
              "Optional supporting statement attachment", // Add your new attachment type here
            ];

            // Loop through each attachment type and fetch files
            for (const attachmentType of attachmentTypes) {
              let attachPayload = {
                data: {
                  payment_claim_id: responseData?.payment_claim_id,
                },
                fileAttachmentOrDocumentType: attachmentType,
              };
              let filesData = await ReadFileAttachmentsOrDocuments(
                attachPayload
              );

              if (filesData?.length > 0) {
                // Update state based on attachment type
                switch (attachmentType) {
                  case "Other optional payment claim attachment":
                    setOptionalAttachments(filesData);

                    break;
                  case "Supporting statement attachment":
                    setCompulsoryAttachments(filesData);

                    break;
                  case "Optional supporting statement attachment":
                    setOtherOptionalAttachments(filesData);

                    break;
                  default:
                    break;
                }
              }
            }
          }
        }
        setInitialPatchedValues(formValues);
        setLoader(false);
      } catch {
        setLoader(false);
      }
    }
  }

  /**
   * Handles navigation to the subscription upgrade page.
   * Saves the current route in session storage and dispatches subscription-related form data to the state.
   * Redirects the user to the subscription upgrade URL.
   */
  function handleRouteToSubscription() {
    dispatch(
      setPaymentClaims({
        formikValues: formik.values,
        compulsoryAttachments: compulsoryAttachments,
        optionalAttachments: optionalAttachments,
        otherOptionalAttachments: otherOptionalAttachments,
        paymentDetails: paymentDetails,
        projectrole: projectRole,
        clientrole: clientRole,
      })
    );
    router.push(AppRoutes.SUBSCRIPTION_PRICING);
  }

  async function getPayments() {
    try {
      setLoader(true);

      const viewPostData = {
        payload: {
          payment_id: paymentId ? Number(paymentId) : "",
        },
      };

      const response: any = await fetchViewPayments(viewPostData);
      if (response) {
        setPaymentsPatchData({
          ...response,
          payment_to:
            response?.payment_type === tabTypes.THIRD_PARTY
              ? tabTypes.THIRD_PARTY
              : tabTypes.SUPPLIER,
          cash_retention: response?.cash_retention
            ? tabTypes.RETENTION
            : tabTypes.NO_RETENTION,
          is_paid_confirmed:
            response?.is_paid_confirmed ||
            response?.is_received_confirmed ||
            false,
        });
      } else {
        setPaymentsPatchData(null);
      }
      setLoader(false);
      return true;
    } catch {
      setLoader(false);
      return false;
    }
  }

  return (
    <Fragment>
      <div className="pt_fullpage">
        <div>
          <HeaderContent />

          <div className="pt_expandtable">
            <details open>
              <summary>Claim summary</summary>

              <DropdownFields />

              <PaymentAccounts />

              <FormArrayGrid />

              <Attachments />

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
          <XeroIntegration paymentClaimId={claimData?.payment_claim_id} />
          {viewMode && paymentsPatchData?.payment_id && (
            <Fragment>
              <PaymentsFormSection />
              <PaymentHistory />
            </Fragment>
          )}
        </div>
        <div>
          <FooterSection />
        </div>
      </div>

      {displayContractValueExceedModal && (
        <BaseModal
          title="Claim amount exceeds contract value"
          modalId={"Claim Amount Exceeds Contract Value"}
          displayModal={displayContractValueExceedModal}
          onClose={() => setDisplayContractValueExceedModal(false)}
          onConfirm={() => {
            setProceedWithExceedingAmount(true);
            setDisplayContractValueExceedModal(false);
            return true;
          }}
          firstButtonName="Cancel"
          secondButtonName="Proceed"
        >
          <h4>
            The claim amount is more than the contract value do you want to
            proceed?
          </h4>
        </BaseModal>
      )}
      {displayRetentionWarning && (
        <BaseModal
          title="Retention Claim Exceeds Limit"
          modalId={"Retention Claim Exceeds Limit"}
          displayModal={displayRetentionWarning}
          onClose={() => setDisplayRetentionWarning(false)}
          onConfirm={() => {
            setDisplayRetentionWarning(false);
            return true;
          }}
          hideSecondButton
          firstButtonName="Back"
        >
          <h4 className="text_center">
            The claim amount is more than the retained amount for the
            beneficiary in the retention trust account. You will need to top up
            the account or transfer beneficial interest.
          </h4>
        </BaseModal>
      )}
      {displaySubscriptionModal && (
        <BaseModal
          title="Upgrade Subscription"
          modalId={"Upgrade Subscription"}
          displayModal={displaySubscriptionModal}
          onClose={(triggered: any) => {
            if (triggered) {
              setDisplaySubscriptionModal(false);
              handleNoticesTrigger(true);
            }
          }}
          onConfirm={() => {
            setDisplaySubscriptionModal(false);
            handleRouteToSubscription();
            return true;
          }}
          secondButtonName="Upgrade now"
          firstButtonName="Proceed with manual notices"
          restrictOncloseFunctionInHeader
          onHeaderIconClose={() => {
            setDisplaySubscriptionModal(false);
          }}
        >
          <h4 className="text_center">
            If you wish Pay Trade to submit your notices automatically to the
            QBCC, please upgrade your subscription.
          </h4>
        </BaseModal>
      )}
    </Fragment>
  );
}
