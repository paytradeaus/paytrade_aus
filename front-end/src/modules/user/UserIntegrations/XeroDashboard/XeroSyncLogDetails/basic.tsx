"use client";
import React, { useEffect, useState } from "react";
import BreadCrumbs from "@/components/BreadCrumbs";
import { AppRoutes } from "@/shared/constant/appRoutes";
import CustomButton from "@/components/CustomButton/CustomButton";
import { buttonType, uploadFile } from "@/shared/constant/general";
import { syncLogDetailsVariables } from "../../integration.constant";
import { useParams, useRouter } from "next/navigation";
import { viewXeroSyncLog } from "../../integration.functions";
import { format, formatDistanceToNow } from "date-fns";
import { formatDate, formatDollars, stripHtml } from "@/utils";
import { resolveList } from "./resolve";
import BaseModal from "@/components/BaseModal";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  bankDraftGapFill,
  commentsTableResolve,
  handleManualMappingLogic,
  handleResolveByErrorCodeMap,
  overpayment,
  textareaErrorCode,
  uploadAttachment,
} from "./resolveByMap";
import { completeBankAccountDraft } from "../../integration.functions";
import DynamicTable from "@/components/Table";
import { GridListHeaders } from "@/modules/user/AddUpdateClaims/AddUpdateClaims.constant";
import {
  checkAndCreateOverPaymentAndRefunds,
  CreateClaimInPaytrade,
  CreateClaimInPaytradeForTable,
  CreateClaimInPaytradeReason,
  createInvoiceOrBillInPaytradeTable,
  RetryRetentionTransferFromSyncLog,
} from "./syncLog.functions";
import MultipleFileHandler from "@/components/MultipleFileHandler";
import { useTokenDetails } from "@/hooks";
import { multipleFileUploadApi } from "@/app/api/commonApi";
import { fetchAllPaymentClaims } from "@/modules/user/PayApps/payApps.functions";
import { DD_MM_YYYY } from "@/shared/constant/identificationNumbers";
import { ListAllPaymentsInput } from "@/modules/user/PaymnetsToDo/paymentToDoList.functions";
import { getProjectsListByClientSupplierId } from "@/modules/user/AddUpdateClaims/AddUpdateClaims.function";
import { fetchClientSuppliersList } from "@/modules/user/ClientsAndSuppliers/ClientsAndSuppliersList/clientsAndSuppliers.functions";

export default function SyncLogDetailsBasic() {
  const router = useRouter();
  const params = useParams();

  const [syncLogDetailsData, setSyncLogDetailsData] = useState<any>([]);
  const [loading, setLoading] = useState(false);
  const [claimType, setClaimType] = useState<any>("");
  const [viewLogData, setViewLogData] = useState<any>();
  const [resolveInprogress, setResolveInprogress] = useState(false);
  const [retryInprogress, setRetryInprogress] = useState(false);
  const [retentionRetryInprogress, setRetentionRetryInprogress] = useState(false);
  const statusColors = {
    Ok: "#22bb33",
    Failed: "#FF2C2C",
    Synced: "#22bb33",
    Unsynced: "#FF2C2C",
    WARNING: "orange",
    Draft: "orange",
    PENDING: "blue",
    DEFAULT: "black",
  };
  const sync_status_style: any = {
    Succeeded: <span style={{ color: "green" }}>Succeeded</span>,
    Failed: <span style={{ color: "red" }}>Failed</span>,
  };

  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [sortValues, setSortValues] = useState<any>("");
  const [modelConfig, setModelConfig] = useState<any>({
    show: false,
    title: "",
    secondButtonName: "",
    firstButtonName: "",
    description: "",
    id: "",
    placeHolder: "",
  });
  const [showManualMapping, setShowManualMapping] = useState(false);
  const [manualMapOptions, setManualMapOptions] = useState([]);
  const [manualMapData, setManualMapData] = useState<any>("");
  const [modelConfigSelect, setModelConfigSelect] = useState<any>({
    title: "",
    placeHolder: "",
    renderKey: "",
    valueKey: "",
    description: "",
    options: [],
  });

  const [openGeneratedClaimModel, setOpenGeneratedClaimModel] =
    useState<any>(false);

  const [openAttachmentModel, setOpenAttachmentModel] = useState<any>(false);
  const [openTextareaModel, setOpenTextareaModel] = useState<any>(false);

  const [openOverpayment, setOpenOverpayment] = useState<any>(false);
  const [textareaReason, setTextareaReason] = useState<string>("");

  const [openBankDraftGapFill, setOpenBankDraftGapFill] = useState(false);
  const [bankDraftForm, setBankDraftForm] = useState<any>({
    account_type: "",
    financial_institution: "",
    opening_date: "",
    delegate_powers: "",
    account_number: "",
    bsb_number: "",
    associated_cash_account_id: "",
    trustee_id: "",
  });

  const [compulsoryAttachments, setCompulsoryAttachments] = useState<any>();
  const [attachmentError, setAttachmentError] = useState<string>("");

  const parseErrorMessage = (raw: string): { summary: string; details: string } => {
    if (!raw) return { summary: '', details: '' };
    try {
      const parsed = JSON.parse(raw);
      const body = parsed?.response?.body || parsed?.body || parsed;
      const statusCode = parsed?.response?.statusCode || parsed?.statusCode;
      const validationErrors =
        body?.Elements?.flatMap((el: any) =>
          (el?.ValidationErrors || []).map((ve: any) => ve?.Message)
        ).filter(Boolean) || [];
      if (validationErrors.length > 0) {
        const summary = validationErrors.join('; ');
        return {
          summary: `${body?.Type || 'Error'} (${statusCode || 'N/A'}): ${summary}`,
          details: raw,
        };
      }
      if (body?.Message) {
        return {
          summary: `${body?.Type || 'Error'} (${statusCode || 'N/A'}): ${body.Message}`,
          details: raw,
        };
      }
    } catch {
    }
    return { summary: raw, details: '' };
  };

  const parseHistoryEntry = (entry: string): string => {
    if (!entry) return '';
    try {
      const parsed = JSON.parse(entry);
      const body = parsed?.response?.body || parsed?.body || parsed;
      const validationErrors =
        body?.Elements?.flatMap((el: any) =>
          (el?.ValidationErrors || []).map((ve: any) => ve?.Message)
        ).filter(Boolean) || [];
      if (validationErrors.length > 0) {
        return `${body?.Type || 'Error'}: ${validationErrors.join('; ')}`;
      }
      if (body?.Message) return `${body?.Type || 'Error'}: ${body.Message}`;
    } catch {
    }
    return entry;
  };

  const [generateClaimData, setGenerateClaimData] = useState<any[]>([]);
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [generateClaimCount, setGenerateClaimCount] = useState();
  const { accessTokenId, decodeTokenData } = useTokenDetails();

  const [projectId, setProjectId] = useState<any>();
  const [projectSelectedValue, setProjectSelectedValue] = useState<any>();
  const [projectListData, setProjectListData] = useState<any>();
  const [supplierSelectedValue, setSupplierSelectedValue] = useState<any>();
  const [supplierListData, setSupplierListData] = useState<any>();
  const [paymentClaimSelectedData, setPaymentClaimSelectedData] =
    useState<any>();
  const [paymentClaimsOptions, setPaymentClaimsOptions] = useState([]);
  const [paymentSelectedData, setPaymentSelectedData] = useState<any>();
  const [aLLPaymentOptions, setALLPaymentOptions] = useState([]);
  const [overPaymentList, setOverPaymentList] = useState<any>([]);
  const [overPaymentsSelectedValue, setOverPaymentsSelectedValue] =
    useState<any>();

  useEffect(() => {
    getViewSyncLogDetails();
  }, []);

  function getViewSyncLogDetails() {
    setLoading(true);

    viewXeroSyncLog({
      viewXeroSyncLogId: params?.id,
    }).then((data) => {
      setLoading(false);
      setViewLogData(data);
      if (data?.xero_records?.length > 0) {
        const xeroType = data?.xero_records?.[0]?.type || "";
        const isReceivable = xeroType.toUpperCase().includes("RECEIVE");

        const claimType = isReceivable ? "Receivable" : "Billable";
        // store in state
        setClaimType(claimType);
      }

      if (data.sync_type == "Contacts") {
        data.paytrade_details["contact_name"] =
          data.paytrade_details["client_supplier_name"];
      }
      if (data.sync_type == "Invoices" || data.sync_type == "Bills") {
        data["PaytradeClientName"] =
          data[
            "paytrade_records"
          ]?.[0]?.clientSupplierDetails?.client_supplier_name;
        data["XeroClientName"] =
          data["xero_records"]?.[0]?.contact?.name ||
          data["xero_records"]?.[0]?.Contact?.Name;

        data["PaytradeDueDate"] = data["paytrade_records"]?.[0]?.due_date;
        data["XeroDueDate"] =
          data["xero_records"]?.[0]?.dueDate ||
          data["xero_records"]?.[0]?.DueDateString;

        if (data["paytrade_records"]?.[0]?.claim_type == "Receivable") {
          data["PaytradeDate"] = data["paytrade_records"]?.[0]?.sent_date;
        } else {
          data["PaytradeDate"] = data["paytrade_records"]?.[0]?.received_date;
        }
        data["XeroDate"] =
          data["xero_records"]?.[0]?.date ||
          data["xero_records"]?.[0]?.DateString;
        if (data["PaytradeClientName"] && data["XeroClientName"]) {
          data["ClaimDetails"] = [
            {
              tracking: "Client/Supplier",
              paytrade: data["PaytradeClientName"],
              xero: data["XeroClientName"],
              status:
                data["PaytradeClientName"] == data["XeroClientName"]
                  ? "Ok"
                  : "Failed",
            },
            {
              tracking: "Date",
              paytrade: formatDate(data["PaytradeDate"]?.split("T")[0]) || "NA",
              xero: formatDate(data["XeroDate"]?.split("T")[0]) || "NA",
              status:
                formatDate(data["PaytradeDate"]?.split("T")[0]) ==
                formatDate(data["XeroDate"]?.split("T")[0])
                  ? "Ok"
                  : "Failed",
            },
            {
              tracking: "Due Date",
              paytrade:
                formatDate(data["PaytradeDueDate"]?.split("T")[0]) || "NA",
              xero: formatDate(data["XeroDueDate"]?.split("T")[0]) || "NA",
              status:
                formatDate(data["PaytradeDueDate"]?.split("T")[0]) ==
                formatDate(data["XeroDueDate"]?.split("T")[0])
                  ? "Ok"
                  : "Failed",
            },
          ];
        } else {
          data["ClaimDetails"] = [];
        }
      } else if (data.sync_type == "Payments") {
        const paytrade = data?.paytrade_records?.[0];
        const xero = data?.xero_records?.[0];
        // Detect which leg this sync log represents. The Payment leg
        // (templates 168/332) stores a Xero Payment object — has
        // paymentID + invoice. The BankTransfer leg (templates
        // 500/496/497/498) stores a Xero BankTransfer object — has
        // bankTransferID, fromBankAccount, toBankAccount, no contact,
        // no due date. Suppressed logs (502) have no xero record at
        // all. Render only the rows that make sense for each shape so
        // the user doesn't see spurious "Failed" badges on fields the
        // leg never carried.
        const isBankTransferLeg = !!(
          xero?.bankTransferID ||
          xero?.BankTransferID ||
          xero?.fromBankAccount ||
          xero?.FromBankAccount
        );
        const isPaymentLeg = !!(
          xero?.paymentID ||
          xero?.PaymentID ||
          xero?.invoice ||
          xero?.Invoice
        );

        const cmp = (a: any, b: any) => (a == b ? "Ok" : "Failed");
        const ptTotal = Number(paytrade?.total_amount || 0);
        const ptRetention = Number(paytrade?.retention_amount || 0);
        const ptPaymentLegAmount = Math.max(ptTotal - ptRetention, 0);

        if (isBankTransferLeg) {
          const xeroAmount = xero?.amount ?? xero?.Amount;
          const xeroDate =
            xero?.date || xero?.DateString || xero?.Date || null;
          const xeroRef = xero?.reference || xero?.Reference || "-";
          data["ClaimDetails"] = [
            {
              tracking: "Invoice Id",
              paytrade: paytrade?.payment_claim_id || "-",
              xero: "-",
            },
            {
              tracking: "Leg",
              paytrade: "Retention BankTransfer",
              xero: "BankTransfer",
            },
            {
              tracking: "Reference",
              paytrade: `PT-RET-${paytrade?.payment_id || ""}`,
              xero: xeroRef,
            },
            {
              tracking: "Date",
              paytrade:
                formatDate(paytrade?.payment_date?.split("T")[0]) || "-",
              xero: formatDate(xeroDate?.split?.("T")?.[0] || xeroDate) || "-",
              status: cmp(
                formatDate(paytrade?.payment_date?.split("T")[0]),
                formatDate(xeroDate?.split?.("T")?.[0] || xeroDate)
              ),
            },
            {
              tracking: "Transfer Amount",
              paytrade:
                formatDollars(formatDisplayAmount(ptRetention)) || "-",
              xero: formatDollars(formatDisplayAmount(xeroAmount)) || "-",
              status: cmp(
                formatDollars(formatDisplayAmount(ptRetention)),
                formatDollars(formatDisplayAmount(xeroAmount))
              ),
            },
          ];
        } else if (isPaymentLeg) {
          const xeroAmount = xero?.amount ?? xero?.Amount;
          const xeroDate =
            xero?.date || xero?.DateString || xero?.Date || null;
          const xeroInvoiceId =
            xero?.invoice?.invoiceID ||
            xero?.Invoice?.InvoiceID ||
            xero?.invoice?.invoiceNumber ||
            xero?.Invoice?.InvoiceNumber ||
            "-";
          const xeroStatus = xero?.status || xero?.Status || "-";
          data["ClaimDetails"] = [
            {
              tracking: "Invoice Id",
              paytrade: paytrade?.payment_claim_id || "-",
              xero: xeroInvoiceId,
            },
            {
              tracking: "Payment Type",
              paytrade: paytrade?.payment_type || "-",
              xero: "Payment",
            },
            {
              tracking: "Status",
              paytrade: paytrade?.current_status || "-",
              xero: xeroStatus,
            },
            {
              tracking: "Client/Supplier",
              paytrade:
                paytrade?.clientSupplierDetails?.client_supplier_name || "-",
              xero: "—",
            },
            {
              tracking: "Date",
              paytrade:
                formatDate(paytrade?.payment_date?.split("T")[0]) || "-",
              xero: formatDate(xeroDate?.split?.("T")?.[0] || xeroDate) || "-",
              status: cmp(
                formatDate(paytrade?.payment_date?.split("T")[0]),
                formatDate(xeroDate?.split?.("T")?.[0] || xeroDate)
              ),
            },
            {
              tracking: "Payment Amount",
              paytrade:
                formatDollars(formatDisplayAmount(ptPaymentLegAmount)) || "-",
              xero: formatDollars(formatDisplayAmount(xeroAmount)) || "-",
              status: cmp(
                formatDollars(formatDisplayAmount(ptPaymentLegAmount)),
                formatDollars(formatDisplayAmount(xeroAmount))
              ),
            },
          ];
        } else {
          // No xero_records — template 502 (transfer suppressed) or
          // any other no-record case. For template 502 the relevant
          // PT amount is the retention leg, not the full claim. Show
          // only the PT side so the comparison table doesn't render a
          // wall of "Failed" badges against nothing.
          const isTransferSuppressed = data?.log_template_id === 502;
          const ptAmountForRow = isTransferSuppressed
            ? ptRetention
            : ptTotal;
          const amountLabel = isTransferSuppressed
            ? "Transfer Amount"
            : "Payment Amount";
          data["ClaimDetails"] = [
            {
              tracking: "Invoice Id",
              paytrade: paytrade?.payment_claim_id || "-",
              xero: "-",
            },
            {
              tracking: "Leg",
              paytrade: isTransferSuppressed
                ? "Retention BankTransfer (suppressed)"
                : paytrade?.payment_type || "-",
              xero: "-",
            },
            {
              tracking: "Status",
              paytrade: paytrade?.current_status || "-",
              xero: "-",
            },
            {
              tracking: "Client/Supplier",
              paytrade:
                paytrade?.clientSupplierDetails?.client_supplier_name || "-",
              xero: "-",
            },
            {
              tracking: "Date",
              paytrade:
                formatDate(paytrade?.payment_date?.split("T")[0]) || "-",
              xero: "-",
            },
            {
              tracking: amountLabel,
              paytrade:
                formatDollars(formatDisplayAmount(ptAmountForRow)) || "-",
              xero: "-",
            },
          ];
        }
      }
      setSyncLogDetailsData({
        ...data,
        trackingDetails: generateTrackingDetails(data, syncLogDetailsVariables),
      });
      console.log(generateTrackingDetails(data, syncLogDetailsVariables));
    });
  }

  const formatDisplayAmount = (value: any) => {
    const num = parseFloat(value);
    return Number.isInteger(num) ? num.toString() : num.toFixed(2);
  };

  const generateTrackingDetails = (
    apiData: any,
    syncLogDetailsVariables: any
  ) => {
    const syncType = apiData.sync_type;
    const fields = syncLogDetailsVariables[syncType];

    let trackingDetails = [];

    if (apiData?.sync_type == "Invoices" || apiData?.sync_type == "Bills") {
      let modifiedData;
      if (apiData?.paytrade_records?.[0]?.retention_amount) {
        modifiedData = {
          ...apiData?.paytrade_records,
          paymentClaimInvoices:
            apiData?.paytrade_records?.[0]?.paymentClaimInvoices?.map(
              (invoice: any) => {
                const retentionWithGst = parseFloat(
                  apiData?.paytrade_records?.[0]?.retention_amount_with_gst
                );
                const retentionExclGst = retentionWithGst / 1.1;
                const gstRate = 0.1;

                const originalUnitPrice = parseFloat(invoice.unit_price);
                const newUnitPrice = originalUnitPrice - retentionExclGst;
                const newGst = newUnitPrice * gstRate;
                const newTotal = newUnitPrice + newGst;

                return {
                  ...invoice,
                  unit_price_status: newUnitPrice.toFixed(2),
                  gst_status: newGst.toFixed(2),
                  total_amount_including_gst_status: newTotal.toFixed(2),
                };
              }
            ),
        };
      } else {
        modifiedData = apiData?.paytrade_records?.[0];
      }
      const paytradeInvoices = modifiedData?.paymentClaimInvoices;
      const xeroLineItems =
        apiData?.xero_records?.[0]?.lineItems ||
        apiData?.xero_records?.[0]?.LineItems;
      return (trackingDetails = xeroLineItems?.map(
        (xeroItem: any, index: number) => {
          const invoice = paytradeInvoices?.[index];
          const description = xeroItem?.description || xeroItem?.Description;
          const quantity =
            xeroItem?.quantity?.toString() || xeroItem?.Quantity?.toString();
          const taxAmount = xeroItem?.taxAmount || xeroItem?.TaxAmount;
          const unitAmount = xeroItem?.unitAmount || xeroItem?.UnitAmount;
          const lineAmount = xeroItem?.lineAmount || xeroItem?.LineAmount;
          return [
            {
              source: "Description",
              paytrade: invoice?.description || "-",
              xero: description || "-",
              status: (() => {
                if (
                  !invoice?.total_amount_including_gst &&
                  !invoice?.description &&
                  !invoice?.unit_price &&
                  !invoice?.gst &&
                  !invoice?.quantity
                ) {
                  return "Ok";
                }
                if (invoice?.description === description) {
                  return "Ok";
                } else {
                  return "Failed";
                }
              })(),
            },
            {
              source: "Quantity",
              paytrade: invoice?.quantity || "-",
              xero: quantity || "-",
              status: (() => {
                if (
                  !invoice?.total_amount_including_gst &&
                  !invoice?.description &&
                  !invoice?.unit_price &&
                  !invoice?.gst &&
                  !invoice?.quantity
                ) {
                  return "Ok";
                }
                if (
                  formatDisplayAmount(invoice?.quantity) ==
                  formatDisplayAmount(quantity)?.toString()
                ) {
                  return "Ok";
                } else {
                  return "Failed";
                }
              })(),
            },
            {
              source: "Tax Amount",
              paytrade:
                formatDollars(formatDisplayAmount(invoice?.gst || 0)) || "-",
              xero:
                formatDollars(formatDisplayAmount(taxAmount)?.toString()) ||
                "-",
              status: (() => {
                if (
                  !invoice?.total_amount_including_gst &&
                  !invoice?.description &&
                  !invoice?.unit_price &&
                  !invoice?.gst &&
                  !invoice?.quantity
                ) {
                  return "Ok";
                }
                if (
                  !invoice?.gst_status &&
                  formatDisplayAmount(invoice?.gst) ===
                    formatDisplayAmount(taxAmount)?.toString()
                ) {
                  return "Ok";
                } else {
                  if (
                    formatDisplayAmount(invoice?.gst_status) ==
                    formatDisplayAmount(taxAmount)?.toString()
                  ) {
                    return "Ok";
                  } else {
                    return "Failed";
                  }
                }
              })(),
            },
            {
              source: "Unit Amount",
              paytrade:
                formatDollars(formatDisplayAmount(invoice?.unit_price || 0)) ||
                "-",
              xero:
                formatDollars(formatDisplayAmount(unitAmount)?.toString()) ||
                "-",
              status: (() => {
                if (
                  !invoice?.total_amount_including_gst &&
                  !invoice?.description &&
                  !invoice?.unit_price &&
                  !invoice?.gst &&
                  !invoice?.quantity
                ) {
                  return "Ok";
                }
                if (
                  !invoice?.unit_price_status &&
                  formatDisplayAmount(invoice?.unit_price) ===
                    formatDisplayAmount(unitAmount)?.toString()
                ) {
                  return "Ok";
                } else {
                  if (
                    formatDisplayAmount(invoice?.unit_price_status) ==
                    formatDisplayAmount(unitAmount)?.toString()
                  ) {
                    return "Ok";
                  } else {
                    return "Failed";
                  }
                }
              })(),
            },
            {
              source: "Total Amount (Incl. GST)",
              paytrade:
                formatDollars(
                  formatDisplayAmount(invoice?.total_amount_including_gst || 0)
                ) || "-",
              xero: formatDollars(
                formatDisplayAmount(+lineAmount + +taxAmount)
              ),
              status: (() => {
                if (
                  !invoice?.total_amount_including_gst &&
                  !invoice?.description &&
                  !invoice?.unit_price &&
                  !invoice?.gst &&
                  !invoice?.quantity
                ) {
                  return "Ok";
                }
                if (
                  !invoice?.total_amount_including_gst_status &&
                  formatDisplayAmount(invoice?.total_amount_including_gst) ==
                    formatDisplayAmount(+lineAmount + +taxAmount)
                ) {
                  return "Ok";
                } else {
                  if (
                    formatDisplayAmount(
                      invoice?.total_amount_including_gst_status
                    ) == formatDisplayAmount(+lineAmount + +taxAmount)
                  ) {
                    return "Ok";
                  } else {
                    return "Failed";
                  }
                }
              })(),
            },
          ];
        }
      ));
    }

    if (!fields) return [];

    if (
      Object.keys(apiData?.paytrade_details)?.length !== 0 &&
      Object.keys(apiData?.xero_details)?.length !== 0
    ) {
      const row = [];
      for (const key in fields?.["combined"]) {
        const label = fields?.["combined"][key];
        row.push({
          source: label,
          paytrade: apiData.paytrade_details?.[key] || "-",
          xero: apiData.xero_details?.[key] || "-",
          status:
            syncType == "Bank accounts"
              ? "Ok"
              : apiData.paytrade_details?.[key] === apiData.xero_details?.[key]
              ? "Ok"
              : "Failed",
        });
      }
      trackingDetails.push(row);
    } else if (apiData?.synced_records?.length > 0) {
      for (let index = 0; index < apiData?.synced_records?.length; index++) {
        const row = [];
        for (const key of fields["separate"]["label"]) {
          row.push({
            source: key,
            paytrade:
              apiData.synced_records?.[index][
                fields["separate"]["paytrade"][key]
              ] || "-",
            xero:
              apiData.synced_records?.[index][
                fields["separate"]["xero"][key]
              ] || "-",
            status: apiData.synced_records?.[index]["sync_status"],
          });
        }
        trackingDetails.push([...row]);
      }
    }

    return trackingDetails;
  };

  const retryableApiNames = [
    "createInvoiceOrBillInPaytrade",
    "smartCreateContract",
    "createClaimInPaytrade",
  ];

  const isRetryable =
    viewLogData?.sync_status === "Failed" &&
    viewLogData?.api_payload?.invoice_id &&
    viewLogData?.api_payload?.tenant_id &&
    retryableApiNames.includes(viewLogData?.api_name);

  // Task #61 — Retry retention transfer button. Shown for the three Failed
  // BankTransfer-leg sync logs surfaced by Task #54 (templates 496/497/498).
  const retentionTransferRetryableErrorCodes = [
    "RETENTION_TRANSFER_DUPLICATE_REFERENCE",
    "RETENTION_TRANSFER_ACCOUNT_INVALID",
    "RETENTION_TRANSFER_REJECTED",
  ];
  const isRetentionTransferRetryable =
    viewLogData?.sync_status === "Failed" &&
    viewLogData?.api_name === "createPaymentInXero" &&
    retentionTransferRetryableErrorCodes.includes(viewLogData?.error_code) &&
    !!viewLogData?.api_payload?.payment_id;

  async function retryRetentionTransferHandle() {
    if (!viewLogData?.id) return;
    setRetentionRetryInprogress(true);
    setLoading(true);
    try {
      await RetryRetentionTransferFromSyncLog(viewLogData.id);
    } finally {
      setLoading(false);
      setRetentionRetryInprogress(false);
      getViewSyncLogDetails();
    }
  }

  async function retryHandle() {
    setRetryInprogress(true);
    setLoading(true);
    await CreateClaimInPaytrade({
      associatedRetentionSubPaymentId: null,
      retentionId: null,
      invoiceId: viewLogData?.api_payload?.invoice_id || null,
      tenantId: viewLogData?.api_payload?.tenant_id || null,
      syncId: viewLogData?.id,
      syncRunType: viewLogData?.api_payload?.sync_run_type || null,
    });
    setLoading(false);
    setRetryInprogress(false);
    getViewSyncLogDetails();
  }

  async function resolveHandle() {
    setResolveInprogress(true);
    setLoading(true);
    const response = await resolveList(viewLogData);
    if (!response) {
      await handleResolveByErrorCodeMap(
        viewLogData,
        setModelConfigSelect,
        setShowManualMapping
      );
    }
    if (!response) {
      await commentsTableResolve(
        viewLogData,
        setGenerateClaimData,
        setGenerateClaimCount,
        setOpenGeneratedClaimModel
      );
    }
    if (!response) {
      await uploadAttachment(viewLogData, setOpenAttachmentModel);
    }
    if (
      !response &&
      (viewLogData?.error_code == "WH_OVERPAYMENT_MISSING_FIELDS" ||
        viewLogData?.error_code == "WH_OVERPAYMENT_REFUND_MISSING_FIELDS" ||
        viewLogData?.error_code == "SCHEDULER_OVERPAYMENT_MISSING_FIELDS" ||
        viewLogData?.error_code ==
          "SCHEDULER_OVERPAYMENT_REFUND_MISSING_FIELDS")
    ) {
      try {
        await handleGetSupplierList();
        const projects = await getProjectsListByClientSupplierId({
          client_supplier_id: Number(
            viewLogData?.api_payload?.client_supplier_id
          ),
        });
        if (projects) {
          const formattedProjects = projects.map((project: any) => ({
            label: project.project_name,
            value: project?.project_id.toString(),
            project_id: project?.project_id,
          }));
          setProjectListData(formattedProjects || []);
        }
        await overpayment(viewLogData, setOpenOverpayment);
      } catch (error: any) {
        console.log(error);
      }
    }
    if (!response) {
      textareaErrorCode(viewLogData, setOpenTextareaModel);
    }
    if (!response) {
      bankDraftGapFill(viewLogData, setOpenBankDraftGapFill);
    }
    if (response?.redirectTo) {
      router.push(response.redirectTo);
    }
    setLoading(false);
    setResolveInprogress(false);

    getViewSyncLogDetails();
  }

  const modelClose = () => {};

  const handleManualMapping = async () => {
    setLoading(true);
    await handleManualMappingLogic(viewLogData, manualMapData);
    setManualMapData("");
    setLoading(false);
    setResolveInprogress(false);
    getViewSyncLogDetails();
  };

  const handleOverpayment = async () => {
    setLoading(true);
    await checkAndCreateOverPaymentAndRefunds({
      contactId: viewLogData?.api_payload?.contact_id ?? null,
      tenantId: viewLogData?.api_payload?.tenant_id ?? null,
      overpaymentId: viewLogData?.api_payload?.overpayment_id ?? null,
      associatedOverpaymentId: overPaymentsSelectedValue?.value
        ? +overPaymentsSelectedValue?.value
        : null,
      associatedPaymentId: paymentSelectedData?.value
        ? +paymentSelectedData?.value
        : null,
      paymentClaimId: paymentClaimSelectedData?.value
        ? +paymentClaimSelectedData?.value
        : null,
      projectId: projectId ? +projectId : null,
      syncId: viewLogData?.id ?? null,
      syncRunType: viewLogData?.api_payload?.sync_run_type || null,
    });
    setLoading(false);
    resetOverpaymentValue();
    getViewSyncLogDetails();
  };

  function resetOverpaymentValue() {
    setPaymentSelectedData("");
    setPaymentClaimSelectedData("");
    setProjectSelectedValue("");
    setOverPaymentsSelectedValue("");
  }

  const handleSaveReasons = async () => {
    let isValid = true;
    const updatedData = generateClaimData.map((item: any) => {
      if (!item.user_input.trim()) {
        isValid = false;
        return {
          ...item,
          user_input_error: "Reason is required",
        };
      }
      return {
        ...item,
        user_input_error: "",
      };
    });
    setGenerateClaimData(updatedData);
    if (!isValid) {
      return;
    }

    const claimsWithReason = updatedData.map((item: any) => ({
      payment_claim_id: item.payment_claim_id,
      reason: item.user_input,
    }));

    try {
      const { invoice_id, tenant_id } = viewLogData?.api_payload;
      if (
        viewLogData.error_code == "WH_MISSING_NON_PAID_REASONS" ||
        viewLogData.error_code == "SCHEDULER_MISSING_NON_PAID_REASONS"
      ) {
        await CreateClaimInPaytradeForTable({
          associatedRetentionSubPaymentId: null,
          claimsWithReason,
          compulsoryAttachmentIds: null,
          invoiceId: invoice_id,
          retentionId: null,
          syncId: viewLogData?.id,
          tenantId: tenant_id,
          syncRunType: viewLogData?.api_payload?.sync_run_type || null,
        });
      } else if (
        viewLogData.error_code == "XP_ADD_INVOICE_MISSING_NON_PAID_REASONS"
      ) {
        await createInvoiceOrBillInPaytradeTable({
          syncId: viewLogData?.id,
          retentionId: null,
          invoiceId: invoice_id,
          compulsoryAttachmentIds: null,
          claimsWithReason,
          associatedRetentionSubPaymentId: null,
        });
      }
      setOpenGeneratedClaimModel(false);
      getViewSyncLogDetails();
      return true;
    } catch (error) {
      return false;
    }
  };

  const isTrustAccount =
    bankDraftForm.account_type === "Project Trust Account" ||
    bankDraftForm.account_type === "Retention Trust Account";

  const isBankDraftFormValid = () => {
    if (
      !bankDraftForm.account_type ||
      !bankDraftForm.financial_institution ||
      !bankDraftForm.opening_date ||
      !bankDraftForm.delegate_powers
    )
      return false;
    if (isTrustAccount) {
      if (!bankDraftForm.associated_cash_account_id || !bankDraftForm.trustee_id)
        return false;
    }
    return true;
  };

  const handleBankDraftGapFill = async () => {
    if (!isBankDraftFormValid()) return false;

    setLoading(true);
    const localCompanyId = +(localStorage.getItem("companyId") || 0);
    const payload: any = {
      bank_account_id: viewLogData?.reference?.paytradeId || viewLogData?.api_payload?.bank_account_id,
      company_id: localCompanyId,
      account_type: bankDraftForm.account_type,
      financial_institution: bankDraftForm.financial_institution,
      opening_date: bankDraftForm.opening_date,
      delegate_powers: bankDraftForm.delegate_powers,
      sync_id: viewLogData?.id || null,
    };
    if (bankDraftForm.account_number)
      payload.account_number = bankDraftForm.account_number;
    if (bankDraftForm.bsb_number)
      payload.bsb_number = +bankDraftForm.bsb_number;
    if (isTrustAccount) {
      payload.associated_cash_account_id = +bankDraftForm.associated_cash_account_id;
      payload.trustee_id = +bankDraftForm.trustee_id;
    }

    const result = await completeBankAccountDraft(payload, setLoading);
    if (result) {
      setOpenBankDraftGapFill(false);
      setBankDraftForm({
        account_type: "",
        financial_institution: "",
        opening_date: "",
        delegate_powers: "",
        account_number: "",
        bsb_number: "",
        associated_cash_account_id: "",
        trustee_id: "",
      });
      getViewSyncLogDetails();
    }
    setLoading(false);
    return !!result;
  };

  const handleSaveAttachment = async () => {
    if (attachmentError) {
      return false;
    }
    if (!compulsoryAttachments || compulsoryAttachments.length === 0) {
      setAttachmentError("Please select at least one file.");
      return false;
    }
    setLoading(true);
    let compulsoryAttachmentIds: Array<string> = [];
    if (compulsoryAttachments.length > 0) {
      const userData = {
        uploaded_by: decodeTokenData?.emailId || "",
        attachment_type: "Compulsory_attachments",
      };
      const multiUserData: any[] = compulsoryAttachments.map(() => userData);
      const fileResponse: any[] = await multipleFileUploadApi(
        compulsoryAttachments,
        multiUserData,
        accessTokenId
      );
      if (fileResponse?.length > 0) {
        fileResponse.forEach((each: any) =>
          compulsoryAttachmentIds.push(each?.id)
        );
      }
      try {
        const { invoice_id, tenant_id } = viewLogData?.api_payload;
        if (
          [
            "WH_MISSING_SUPPORTING_ATTACHMENTS",
            "WH_MISSING_SUPPORTING_ATTACHMENTS_PAYMENTS",
            "SCHEDULER_MISSING_SUPPORTING_ATTACHMENTS,",
            "SCHEDULER_MISSING_SUPPORTING_ATTACHMENTS_PAYMENTS",
          ].includes(viewLogData.error_code)
        ) {
          await CreateClaimInPaytradeForTable({
            associatedRetentionSubPaymentId: null,
            claimsWithReason: null,
            compulsoryAttachmentIds,
            invoiceId: invoice_id,
            retentionId: null,
            syncId: viewLogData?.id,
            tenantId: tenant_id,
            syncRunType: viewLogData?.api_payload?.sync_run_type || null,
          });
        } else if (
          viewLogData.error_code ==
          "XP_ADD_INVOICE_MISSING_SUPPORTING_ATTACHMENTS"
        ) {
          await createInvoiceOrBillInPaytradeTable({
            syncId: viewLogData?.id,
            retentionId: null,
            invoiceId: invoice_id,
            compulsoryAttachmentIds,
            claimsWithReason: null,
            associatedRetentionSubPaymentId: null,
            companyId: +(localStorage.getItem("companyId") || 0),
          });
        }
        setOpenAttachmentModel(false);
        getViewSyncLogDetails();
        return true;
      } catch (error) {
        return false;
      }
    }
  };

  const handleTextAreaSave = async () => {
    if (!textareaReason.trim()) {
      return false;
    }
    try {
      await CreateClaimInPaytradeReason({
        withholdPaymentReason: textareaReason.trim(),
        tenantId: viewLogData?.api_payload?.tenant_id,
        syncId: viewLogData?.id,
        invoiceId: viewLogData?.api_payload?.invoice_id,
        associatedRetentionSubPaymentId: null,
        retentionId: null,
        syncRunType: viewLogData?.api_payload?.sync_run_type || null,
      });
      setOpenTextareaModel(false);
      getViewSyncLogDetails();
      setTextareaReason("");
      return true;
    } catch (error) {
      return false;
    }
  };

  const GenereateRenderData = [
    { key: "payment_claim_id" },
    { key: "client_supplier_name" },
    { key: "unpaid_amount" },
    {
      key: "user_input",
      showInput: true,
      valueAccessor: (row: any) => row.user_input || "", // 👈 add this
      onChange: (value: string, rowIndex: number) => {
        handleUserInputChange(value, rowIndex);
      },
    },
  ];

  const handleUserInputChange = (value: string, rowIndex: number) => {
    const updatedData = [...generateClaimData];
    updatedData[rowIndex] = {
      ...updatedData[rowIndex],
      user_input: value,
      user_input_error: value.trim() ? "" : "Reason is required",
    };
    setGenerateClaimData(updatedData);
  };

  const handleAttachmentChange = (modifiedFiles: any) => {
    if (modifiedFiles && modifiedFiles.length > 5) {
      setAttachmentError("You can only select up to five files.");
      return;
    }
    setAttachmentError("");
    setCompulsoryAttachments(modifiedFiles);
  };

  const handleAttachmentError = (errorMessage: string) => {
    setAttachmentError(errorMessage);
  };

  const handleGetPaymentClaimList = async (project_id: any) => {
    try {
      const companyId = Number(localStorage.getItem("companyId"));

      const response: any = await fetchAllPaymentClaims({
        cash_retention_type: null,
        claim_type: claimType || null,
        contract_id: null,
        company_id: companyId || null,
        items_per_page: null,
        page: 1,
        project_id: project_id || null,
        status: null,
        client_supplier_id: Number(supplierSelectedValue?.value) || null,
      });

      if (response?.payment_claims?.length > 0) {
        const customPaymentClaimOptions = response?.payment_claims.map(
          (data: any) => ({
            label: `${data.payment_claim_id} - ${formatDate(
              data.due_date,
              DD_MM_YYYY
            )} - $ ${data.claim_amount
              .toFixed(2)
              .replace(/\B(?=(\d{3})+(?!\d))/g, ",")} (${data.contract_name})`,
            value: data.payment_claim_id.toString(),
            data: data,
          })
        );
        setPaymentClaimsOptions(customPaymentClaimOptions);
      } else {
        setPaymentClaimsOptions([]);
      }
    } catch (error: any) {
      console.log(error);
    }
  };

  const handleGetSupplierList = async () => {
    try {
      const companyId = Number(localStorage.getItem("companyId"));
      const payload = {
        getClientSupplierListsInput: {
          company_id: companyId,
        },
      };

      const response = await fetchClientSuppliersList(payload);
      if (response?.client_suppliers_list.length > 0) {
        const customSupplierOption = response?.client_suppliers_list
          // .filter((each: any) => each?.client_supplier_type === "Supplier")
          .map((data: any) => ({
            label: data.client_supplier_name,
            value: data.client_supplier_id.toString(),
            data: data,
          }));
        setSupplierListData(customSupplierOption);
        setSupplierSelectedValue(
          customSupplierOption.find((each: any) =>
            each?.value == viewLogData?.api_payload?.client_supplier_id
              ? each
              : null
          )
        );
      } else {
        setSupplierListData([]);
      }
    } catch (error: any) {
      console.log(error);
    }
  };

  const handleGetAllPaymentList = async (selectedValue: any) => {
    try {
      const companyId = Number(localStorage.getItem("companyId"));
      const allPaymentsListData = await ListAllPaymentsInput({
        payment_type: "All",
        company_id: companyId,
        page_number: 1,
        page_size: null,
        status: null,
        project_id: projectId || null,
        contract_id: null,
        cash_retention_type: null,
        claim_type: null,
        client_supplier_id: Number(supplierSelectedValue?.value) || null,
        bank_account_id: viewLogData?.api_payload?.account_id
          ? +viewLogData?.api_payload?.account_id
          : null,
        claim_id: Number(paymentClaimSelectedData?.value) || null,
      });

      if (allPaymentsListData?.payments?.length > 0) {
        const customPaymentOptions = allPaymentsListData?.payments.map(
          (data: any) => ({
            label: `${data.payment_id} - $ ${data.total_amount
              .toFixed(2)
              .replace(/\B(?=(\d{3})+(?!\d))/g, ",")} (${data.payment_type})`,
            value: data.payment_id.toString(),
            data: data,
          })
        );
        setALLPaymentOptions(customPaymentOptions);
      } else {
        setALLPaymentOptions([]);
      }
    } catch (error: any) {
      console.log(error);
    }
  };

  const handleGetOverpaymentList = async (payment_id: any) => {
    try {
      const response = await ListAllPaymentsInput({
        company_id: Number(localStorage.getItem("companyId")),
        page_number: 1,
        page_size: null,
        status: null,
        project_id: projectId || null,
        contract_id: null,
        cash_retention_type: null,
        claim_type: null,
        client_supplier_id: Number(supplierSelectedValue?.value) || null,
        bank_account_id: viewLogData?.api_payload?.account_id
          ? +viewLogData?.api_payload?.account_id
          : null,
        claim_id: Number(paymentClaimSelectedData?.value) || null,
        payment_type: "Overpayment",
        payment_id: +payment_id || null,
      });
      console.log(response);
      if (response?.payments?.length > 0) {
        const customPaymentClaimOptions = response?.payments.map(
          (data: any) => ({
            label: `${data.payment_id}-$ ${data.total_amount
              .toFixed(2)
              .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}(${data.payment_type})`,
            value: data.payment_id.toString(),
            data: data,
          })
        );
        setOverPaymentList(customPaymentClaimOptions);
      } else {
        setOverPaymentList([]);
      }
    } catch (error: any) {
      console.log(error);
    }
  };

  function isOverpaymentSecondButtonDisabled() {
    if (
      viewLogData?.error_code === "WH_OVERPAYMENT_REFUND_MISSING_FIELDS" ||
      viewLogData?.error_code == "SCHEDULER_OVERPAYMENT_REFUND_MISSING_FIELDS"
    ) {
      return !(
        projectSelectedValue &&
        paymentClaimSelectedData &&
        paymentSelectedData &&
        overPaymentsSelectedValue
      );
    }
    return !(
      projectSelectedValue &&
      paymentClaimSelectedData &&
      paymentSelectedData
    );
  }

  /**
   * Derive contextual chips for the sync-log header so the user can
   * see at-a-glance which entity this log relates to (supplier,
   * amount, Xero / PayTrade reference, account, etc.) instead of just
   * a UUID. All values are pulled from data already loaded by
   * `viewXeroSyncLog` (paytrade_records / xero_records /
   * paytrade_details / xero_details / dynamic_values) so this works
   * retroactively on every historical log row — no DB change.
   * Returns an array of { label, value } that the JSX maps into the
   * existing overview tile grid; tiles with no value are skipped.
   */
  const buildContextTiles = (
    data: any,
  ): Array<{ label: string; value: string }> => {
    if (!data) return [];
    const pt = data?.paytrade_records?.[0] || data?.paytrade_details || {};
    const xr = data?.xero_records?.[0] || data?.xero_details || {};
    const dyn = data?.dynamic_values || {};
    const tiles: Array<{ label: string; value: string }> = [];
    const fmt$ = (v: any): string => {
      const n = Number(v);
      if (!Number.isFinite(n) || n === 0) return "";
      return formatDollars(n.toFixed(2));
    };

    // Normalise sync_type so webhook / scheduler variants ("Invoice
     // webhook", "Bill schedulers", "Account schedulers", …) land in
     // the same branch as their first-class counterpart. Mirrors the
     // backend `normaliseSyncType` in sync-log-deep-links.ts.
    const rawType = String(data?.sync_type || "");
    const lower = rawType.toLowerCase();
    let syncType = rawType;
    if (lower.startsWith("invoice")) syncType = "Invoices";
    else if (lower.startsWith("bill")) syncType = "Bills";
    else if (lower.startsWith("contact")) syncType = "Contacts";
    else if (lower.startsWith("payment")) syncType = "Payments";
    else if (
      lower.startsWith("bank") ||
      lower.startsWith("account schedulers")
    )
      syncType = "Bank accounts";

    // xero_details holds the typed-projection shape (snake_case
     // PayTrade-side keys) while xero_records[0] holds the raw Xero
     // API payload (camelCase). Some fields only exist in one or the
     // other, so for bank-account / payment look-ups we want both.
    const xd = data?.xero_details || {};

    // Contact / supplier — applies to most sync types.
    const contactName =
      pt?.clientSupplierDetails?.client_supplier_name ||
      pt?.client_supplier_name ||
      pt?.contact_name ||
      xr?.contact?.name ||
      xr?.Contact?.Name ||
      xd?.contact_name ||
      dyn?.supplier_name ||
      dyn?.client_supplier_name ||
      dyn?.contact_name ||
      "";
    if (contactName) tiles.push({ label: "Contact", value: contactName });

    if (syncType === "Invoices" || syncType === "Bills") {
      const xeroInv =
        xr?.invoiceNumber ||
        xr?.InvoiceNumber ||
        xr?.invoice?.invoiceNumber ||
        xr?.Invoice?.InvoiceNumber ||
        xd?.invoice_number ||
        "";
      if (xeroInv) tiles.push({ label: "Xero invoice", value: xeroInv });
      const ptInv =
        pt?.invoice_number ||
        pt?.payment_claim_id ||
        pt?.claim_reference ||
        dyn?.invoice_number ||
        "";
      if (ptInv) tiles.push({ label: "PayTrade ref", value: String(ptInv) });
      const amount =
        pt?.total_amount ??
        pt?.amount ??
        xr?.total ??
        xr?.Total ??
        xd?.total ??
        null;
      const $amt = fmt$(amount);
      if ($amt) tiles.push({ label: "Amount", value: $amt });
      // Webhook failures often have NO paytrade/xero records at all —
      // only the inbound resourceId from the webhook envelope. Surface
      // it so the user can identify which Xero invoice misbehaved.
      if (!xeroInv && !ptInv) {
        const resourceId =
          dyn?.resourceId ||
          dyn?.resource_id ||
          dyn?.xero_id ||
          data?.xero_id ||
          "";
        if (resourceId)
          tiles.push({ label: "Xero ID", value: String(resourceId) });
      }
    } else if (syncType === "Payments") {
      // Detect the retention bank-transfer leg vs the regular payment
      // leg so the chips match the comparison-table semantics. Cover
      // both lower- and upper-camel shapes (older logs persist mixed
      // casings).
      const isBankTransferLeg = !!(
        xr?.bankTransferID ||
        xr?.BankTransferID ||
        xr?.fromBankAccount ||
        xr?.FromBankAccount
      );
      const ptRef = pt?.payment_id
        ? `${isBankTransferLeg ? "PT-RET" : "PT-PAY"}-${pt.payment_id}`
        : pt?.payment_claim_id || "";
      if (ptRef) tiles.push({ label: "PayTrade ref", value: String(ptRef) });
      const xeroRef =
        xr?.reference ||
        xr?.Reference ||
        xr?.invoice?.invoiceNumber ||
        xr?.Invoice?.InvoiceNumber ||
        "";
      if (xeroRef) tiles.push({ label: "Xero ref", value: String(xeroRef) });
      const ptTotal = Number(pt?.total_amount || 0);
      const ptRetention = Number(pt?.retention_amount || 0);
      const amount = isBankTransferLeg
        ? ptRetention
        : Math.max(ptTotal - ptRetention, 0) || ptTotal;
      const $amt = fmt$(amount);
      if ($amt) tiles.push({ label: "Amount", value: $amt });
      const payDate = pt?.payment_date
        ? String(pt.payment_date).split("T")[0]
        : "";
      if (payDate) {
        const f = formatDate(payDate);
        if (f) tiles.push({ label: "Payment date", value: f });
      }
    } else if (syncType === "Contacts") {
      // Contact tile already pushed above; nothing extra.
    } else if (syncType === "Bank accounts") {
      const acctName =
        pt?.account_name ||
        pt?.bank_account_name ||
        xd?.account_name ||
        xr?.name ||
        xr?.Name ||
        "";
      if (acctName) tiles.push({ label: "Account", value: acctName });
      const bsb =
        pt?.bsb_number || xd?.bsb_number || xr?.bsb_number || "";
      const acctNo =
        pt?.account_number ||
        pt?.bank_account_number ||
        xd?.account_number ||
        xr?.bank_account_number ||
        xr?.bankAccountNumber ||
        xr?.BankAccountNumber ||
        "";
      if (bsb || acctNo) {
        const last4 = acctNo ? `••••${String(acctNo).slice(-4)}` : "";
        tiles.push({
          label: "BSB / Acct",
          value: [bsb, last4].filter(Boolean).join(" / "),
        });
      }
    }

    return tiles;
  };

  const contextTiles = buildContextTiles(syncLogDetailsData);

  return (
    <>
      <div className="container-fluid">
        <div className="pt_title">
          <BreadCrumbs
            routePaths={[
              {
                name: "Dashboard",
                path: AppRoutes.USER_DASHBOARD,
              },
              {
                name: "Integrations",
                path: AppRoutes.USER_INTEGRATION,
              },
              {
                name: "Xero",
                path: AppRoutes.USER_XERO,
              },
            ]}
            activeRoute={"Sync log details"}
          />
          <div className="grid pt_topfilters">
            <div className="pt_pagetitle">
              <h1>Sync log details</h1>
              <h4>
                {loading ? (
                  <div className="skeleton"></div>
                ) : (
                  syncLogDetailsData?.sync_id
                )}
              </h4>
              {/* Task #274 — surface the linked contact name in the header
                  so contact-mirror logs can be triaged without opening the
                  payload tab. Falls back gracefully when no contact is in
                  scope (non-contact sync types). */}
              {!loading &&
                (syncLogDetailsData?.api_payload?.client_supplier_name ||
                  syncLogDetailsData?.api_payload?.contact_name) && (
                  <h5 style={{ color: "#666", marginTop: "0.25rem" }}>
                    Contact:{" "}
                    <strong>
                      {syncLogDetailsData?.api_payload?.client_supplier_name ||
                        syncLogDetailsData?.api_payload?.contact_name}
                    </strong>
                  </h5>
                )}
            </div>
            <div className="pt_pageactions">
              {syncLogDetailsData?.paytrade_deep_link && (
                <div className="pt_addnewbutton">
                  <CustomButton
                    buttonName={"Open in PayTrade"}
                    buttonType={buttonType.SECONDARY_SMALL}
                    iconClassName="fa-light fa-arrow-up-right-from-square"
                    actionType={"button"}
                    onClick={() => {
                      router.push(syncLogDetailsData.paytrade_deep_link);
                    }}
                  />
                </div>
              )}
              {syncLogDetailsData?.xero_deep_link && (
                <div className="pt_addnewbutton">
                  <CustomButton
                    buttonName={"Open in Xero"}
                    buttonType={buttonType.SECONDARY_SMALL}
                    iconClassName="fa-light fa-arrow-up-right-from-square"
                    actionType={"button"}
                    onClick={() => {
                      window.open(
                        syncLogDetailsData.xero_deep_link,
                        "_blank",
                        "noopener,noreferrer"
                      );
                    }}
                  />
                </div>
              )}
              <div className="pt_addnewbutton">
                <CustomButton
                  buttonName={"Back"}
                  buttonType={buttonType.CONTRAST_SMALL}
                  iconClassName="fa-light fa-arrow-left"
                  actionType={"button"}
                  onClick={() => {
                    router.push(AppRoutes.USER_XERO);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="pt_overviewinfo">
          <div>
            <div className="pt_infodata">
              <div
                className="pt_infolistdata"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  fontSize: "x-large",
                }}
              >
                {loading ? (
                  <div className="skeleton"></div>
                ) : syncLogDetailsData?.from_xero ? (
                  "Xero" + " \u27A4 " + "Pay Trade"
                ) : (
                  "Pay Trade" + " \u27A4 " + "Xero"
                )}
              </div>
            </div>
            <div className="pt_infodata">
              <div className="pt_infolistdata">
                <h6>Status</h6>
                {loading ? (
                  <div className="skeleton"></div>
                ) : (
                  sync_status_style[syncLogDetailsData?.sync_status] ||
                  syncLogDetailsData.sync_status
                )}
              </div>
              <div className="pt_infolistdata">
                <h6>Type</h6>
                {loading ? (
                  <div className="skeleton"></div>
                ) : (
                  syncLogDetailsData?.sync_type
                )}
              </div>

              {/* Task #274 — Surface the structured "what's missing" hint
                  the backend already attaches to contact-mirror logs so
                  the user doesn't have to open Notification / Information
                  required tabs to see why the contact didn't import. */}
              {!loading &&
                (syncLogDetailsData?.information_required ||
                  syncLogDetailsData?.dynamic_values?.missing_fields ||
                  syncLogDetailsData?.notification) && (
                  <div className="pt_infolistdata">
                    <h6>Missing fields</h6>
                    <span style={{ wordBreak: "break-word" }}>
                      {syncLogDetailsData?.information_required ||
                        syncLogDetailsData?.dynamic_values?.missing_fields ||
                        syncLogDetailsData?.notification}
                    </span>
                  </div>
                )}

              {syncLogDetailsData?.reference_id && (
                <div className="pt_infolistdata">
                  <h6>Reference</h6>
                  {loading ? (
                    <div className="skeleton"></div>
                  ) : (
                    syncLogDetailsData?.reference_id
                  )}
                </div>
              )}
              {syncLogDetailsData?.project_name && (
                <div className="pt_infolistdata">
                  <h6>Project</h6>
                  {loading ? (
                    <div className="skeleton"></div>
                  ) : (
                    syncLogDetailsData?.project_name
                  )}
                </div>
              )}
              {/* Per-sync-type contextual tiles (supplier, invoice ref,
                  amount, bank account, etc.) derived from the records
                  already loaded so the user can identify the log
                  without opening Xero / PayTrade. */}
              {!loading &&
                contextTiles.map((tile) => (
                  <div className="pt_infolistdata" key={tile.label}>
                    <h6>{tile.label}</h6>
                    <span style={{ wordBreak: "break-word" }}>
                      {tile.value}
                    </span>
                  </div>
                ))}
              <div className="pt_infolistdata">
                <h6>Started</h6>
                <span>
                  {loading ? (
                    <div className="skeleton"></div>
                  ) : syncLogDetailsData?.created_on ? (
                    format(
                      new Date(syncLogDetailsData?.created_on),
                      "EEE dd MMM yyyy hh:mm a"
                    )
                  ) : (
                    ""
                  )}
                </span>
                <span
                  style={{
                    color: "gray",
                    display: "block",
                    fontSize: "small",
                  }}
                >
                  {loading ? (
                    <div className="skeleton"></div>
                  ) : syncLogDetailsData?.created_on ? (
                    formatDistanceToNow(
                      new Date(syncLogDetailsData?.created_on),
                      {
                        addSuffix: true,
                      }
                    )
                  ) : (
                    ""
                  )}
                </span>
              </div>
            </div>
            <div className="pt_infodata">
              <div className="pt_infolistdata">
                <h6>Message</h6>
                {loading ? (
                  <div className="skeleton"></div>
                ) : (
                  stripHtml(syncLogDetailsData?.description)
                )}
              </div>
            </div>
            {loading ? (
              <div className="skeleton"></div>
            ) : (
              syncLogDetailsData?.error_message && (
                <div>
                  <div className="pt_infodata">
                    <div
                      className="pt_infolistdata"
                      style={{
                        color: statusColors["Failed"],
                      }}
                    >
                      <h6>Error Message</h6>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center", // ✅ vertically aligns text & button
                          justifyContent: "flex-start", // ✅ keeps them side by side
                          gap: "8px", // ✅ small space between
                          flexWrap: "wrap", // ✅ allows wrapping for long text
                        }}
                      >
                        <span
                          style={{
                            flex: 1,
                            whiteSpace: "normal",
                            wordWrap: "break-word",
                            overflowWrap: "break-word",
                            lineHeight: "1.5",
                            margin: 0,
                          }}
                        >
                          {(() => {
                            const { summary, details } = parseErrorMessage(
                              syncLogDetailsData?.error_message
                            );
                            return (
                              <>
                                <span>{summary}</span>
                                {details && (
                                  <details
                                    style={{
                                      marginTop: "6px",
                                      fontSize: "0.85em",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <summary
                                      style={{
                                        color: "#666",
                                        fontWeight: 500,
                                      }}
                                    >
                                      Full API response
                                    </summary>
                                    <pre
                                      style={{
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-all",
                                        background: "#fff5f5",
                                        padding: "8px",
                                        borderRadius: "4px",
                                        marginTop: "4px",
                                        fontSize: "0.85em",
                                        maxHeight: "200px",
                                        overflow: "auto",
                                      }}
                                    >
                                      {JSON.stringify(
                                        JSON.parse(details),
                                        null,
                                        2
                                      )}
                                    </pre>
                                  </details>
                                )}
                              </>
                            );
                          })()}
                        </span>
                        <button
                          style={{
                            whiteSpace: "nowrap",
                            padding: "6px 14px",
                            backgroundColor: "#FF4B4B",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "fit-content", // ✅ aligns well with text height
                            margin: 0,
                          }}
                          onClick={() => resolveHandle()}
                          title="Re-runs Pay Trade's resolution flow for this error code (e.g. re-imports the record from Xero now that the missing fields are filled in). Use this after fixing the underlying data in Xero."
                        >
                          <i
                            className="fa-light fa-refresh"
                            style={{
                              marginRight: "10px",
                              marginLeft: "10px",
                            }}
                          ></i>
                          {resolveInprogress
                            ? "Resolving..."
                            : "Resolve & retry import"}
                        </button>
                        {isRetryable && (
                          <button
                            style={{
                              whiteSpace: "nowrap",
                              padding: "6px 14px",
                              backgroundColor: "#2563EB",
                              color: "#fff",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              height: "fit-content",
                              margin: 0,
                            }}
                            onClick={() => retryHandle()}
                            disabled={retryInprogress}
                          >
                            <i
                              className="fa-light fa-rotate-right"
                              style={{
                                marginRight: "10px",
                                marginLeft: "10px",
                              }}
                            ></i>
                            {retryInprogress ? "Retrying..." : "Retry"}
                          </button>
                        )}
                        {isRetentionTransferRetryable && (
                          <button
                            style={{
                              whiteSpace: "nowrap",
                              padding: "6px 14px",
                              backgroundColor: "#2563EB",
                              color: "#fff",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              height: "fit-content",
                              margin: 0,
                            }}
                            onClick={() => retryRetentionTransferHandle()}
                            disabled={retentionRetryInprogress}
                            title="Re-fires the retention BankTransfer leg in Xero. Use this after fixing the underlying Xero issue (e.g. funding the bank account)."
                          >
                            <i
                              className="fa-light fa-rotate-right"
                              style={{
                                marginRight: "10px",
                                marginLeft: "10px",
                              }}
                            ></i>
                            {retentionRetryInprogress
                              ? "Retrying..."
                              : "Retry retention transfer"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}
            {(() => {
              const ap = syncLogDetailsData?.api_payload || {};
              const hasXeroCtx =
                ap?.xero_request_url ||
                ap?.xero_response_body ||
                (Array.isArray(ap?.xero_validation_errors) &&
                  ap.xero_validation_errors.length > 0) ||
                ap?.xero_error_number != null ||
                ap?.xero_error_type ||
                ap?.xero_problem_title ||
                ap?.xero_deep_link;
              if (!hasXeroCtx) return null;
              return (
                <div className="pt_infodata">
                  <div className="pt_infolistdata" style={{ width: "100%" }}>
                    <h6>Xero API context</h6>
                    <table style={{ width: "100%", fontSize: "0.92em" }}>
                      <tbody>
                        {ap?.status_code != null && (
                          <tr>
                            <td style={{ width: "180px", color: "#666" }}>HTTP status</td>
                            <td>
                              <strong
                                style={{
                                  color:
                                    Number(ap.status_code) >= 400
                                      ? statusColors["Failed"]
                                      : "inherit",
                                }}
                              >
                                {ap.status_code}
                              </strong>
                            </td>
                          </tr>
                        )}
                        {(ap?.xero_request_method || ap?.xero_request_url) && (
                          <tr>
                            <td style={{ color: "#666" }}>Request</td>
                            <td style={{ wordBreak: "break-all" }}>
                              <code>
                                {ap.xero_request_method || ""}{" "}
                                {ap.xero_request_url || ""}
                              </code>
                            </td>
                          </tr>
                        )}
                        {ap?.tenant_id && (
                          <tr>
                            <td style={{ color: "#666" }}>Tenant</td>
                            <td>
                              <code>{ap.tenant_id}</code>
                            </td>
                          </tr>
                        )}
                        {(ap?.invoice_number || ap?.invoice_id) && (
                          <tr>
                            <td style={{ color: "#666" }}>Failing record</td>
                            <td>
                              {ap.type ? `${ap.type} ` : ""}
                              {ap.invoice_number || ap.invoice_id}
                              {ap.invoice_reference
                                ? ` (ref ${ap.invoice_reference})`
                                : ""}
                              {(() => {
                                const link = ap.xero_deep_link;
                                if (typeof link !== "string") return null;
                                let safe = false;
                                try {
                                  const u = new URL(link);
                                  safe =
                                    u.protocol === "https:" &&
                                    (u.hostname === "go.xero.com" ||
                                      u.hostname.endsWith(".xero.com"));
                                } catch {
                                  safe = false;
                                }
                                if (!safe) return null;
                                return (
                                  <>
                                    {" — "}
                                    <a
                                      href={link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      Open in Xero
                                    </a>
                                  </>
                                );
                              })()}
                            </td>
                          </tr>
                        )}
                        {(ap?.xero_error_number != null ||
                          ap?.xero_error_type) && (
                          <tr>
                            <td style={{ color: "#666" }}>Xero ErrorNumber</td>
                            <td>
                              {ap.xero_error_number != null
                                ? `${ap.xero_error_number}`
                                : ""}
                              {ap.xero_error_type
                                ? ` (${ap.xero_error_type})`
                                : ""}
                              {ap.xero_error_number_description && (
                                <div style={{ color: "#666", marginTop: "2px" }}>
                                  {ap.xero_error_number_description}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                        {ap?.xero_problem_title && (
                          <tr>
                            <td style={{ color: "#666" }}>Xero said</td>
                            <td>
                              <strong>{ap.xero_problem_title}</strong>
                              {ap.xero_problem_detail
                                ? `: ${ap.xero_problem_detail}`
                                : ""}
                            </td>
                          </tr>
                        )}
                        {Array.isArray(ap?.xero_validation_errors) &&
                          ap.xero_validation_errors.length > 0 && (
                            <tr>
                              <td style={{ color: "#666", verticalAlign: "top" }}>
                                Validation errors
                              </td>
                              <td>
                                <ul style={{ margin: 0, paddingLeft: "18px" }}>
                                  {ap.xero_validation_errors.map(
                                    (msg: string, i: number) => (
                                      <li key={i}>{msg}</li>
                                    )
                                  )}
                                </ul>
                              </td>
                            </tr>
                          )}
                        {ap?.xero_response_body && (
                          <tr>
                            <td style={{ color: "#666", verticalAlign: "top" }}>
                              Raw response
                            </td>
                            <td>
                              <details>
                                <summary
                                  style={{
                                    cursor: "pointer",
                                    color: "#666",
                                    fontWeight: 500,
                                  }}
                                >
                                  Show body snippet
                                </summary>
                                <pre
                                  style={{
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-all",
                                    background: "#fff5f5",
                                    padding: "8px",
                                    borderRadius: "4px",
                                    marginTop: "4px",
                                    fontSize: "0.85em",
                                    maxHeight: "200px",
                                    overflow: "auto",
                                  }}
                                >
                                  {(() => {
                                    try {
                                      return JSON.stringify(
                                        JSON.parse(ap.xero_response_body),
                                        null,
                                        2
                                      );
                                    } catch {
                                      return ap.xero_response_body;
                                    }
                                  })()}
                                </pre>
                              </details>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
            <div className="pt_infodata">
              {syncLogDetailsData?.notification && (
                <div className="pt_infolistdata">
                  <h6>Notification</h6>
                  {syncLogDetailsData?.notification || "NA"}
                </div>
              )}

              {syncLogDetailsData?.information_required && (
                <div className="pt_infolistdata">
                  <h6>Information Required</h6>
                  {syncLogDetailsData?.information_required || "NA"}
                </div>
              )}
            </div>
            {loading ? (
              <div className="skeleton"></div>
            ) : (
              <>
                {syncLogDetailsData?.important_checks &&
                  Object.keys(syncLogDetailsData?.important_checks).length >
                    0 && (
                    <>
                      <div className="pt_infolistdata">
                        <h6>Important checks</h6>
                      </div>
                      <div className="pt_infodata">
                        <table>
                          {Object.keys(
                            syncLogDetailsData?.important_checks
                          ).map((val) => (
                            <tr>
                              <td>
                                <div className="pt_infolistdata">{val}</div>
                              </td>
                              <td>
                                <div
                                  className="pt_infolistdata"
                                  style={{
                                    color:
                                      statusColors[
                                        syncLogDetailsData?.important_checks[
                                          val
                                        ] as keyof typeof statusColors
                                      ] || statusColors.DEFAULT,
                                  }}
                                >
                                  {syncLogDetailsData?.important_checks[val]}{" "}
                                  {syncLogDetailsData?.important_checks[val] ==
                                    "Failed" && (
                                    <button
                                      style={{
                                        width: "auto",
                                        marginLeft: "10px",
                                        paddingRight: "10px",
                                      }}
                                      onClick={() => resolveHandle()}
                                      title="Re-runs this validation check after you've fixed the underlying data."
                                    >
                                      <i
                                        className="fa-light fa-refresh"
                                        style={{
                                          marginRight: "10px",
                                          marginLeft: "10px",
                                        }}
                                      ></i>
                                      {resolveInprogress
                                        ? "Re-running..."
                                        : "Re-run check"}
                                    </button>
                                  )}
                                  {syncLogDetailsData?.important_checks[val] ==
                                    "Failed" &&
                                    isRetryable && (
                                    <button
                                      style={{
                                        width: "auto",
                                        marginLeft: "10px",
                                        paddingRight: "10px",
                                        backgroundColor: "#2563EB",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                      }}
                                      onClick={() => retryHandle()}
                                      disabled={retryInprogress}
                                    >
                                      <i
                                        className="fa-light fa-rotate-right"
                                        style={{
                                          marginRight: "10px",
                                          marginLeft: "10px",
                                        }}
                                      ></i>
                                      {retryInprogress
                                        ? "Retrying..."
                                        : "Retry"}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </table>
                      </div>
                    </>
                  )}
                <div className="pt_infodata">
                  <table>
                    {syncLogDetailsData?.ClaimDetails?.map((val: any) => (
                      <tr>
                        <td>
                          <div className="pt_infolistdata">
                            <h6>Tracking</h6>
                            {val.tracking}
                          </div>
                        </td>
                        <td>
                          <div
                            className="pt_infolistdata break-word"
                            style={{ color: "#e94439" }}
                          >
                            <h6>Paytrade</h6> {val.paytrade}
                          </div>
                        </td>
                        <td>
                          <div
                            className="pt_infolistdata break-word"
                            style={{ color: "#13b5ea" }}
                          >
                            <h6>Xero</h6> {val.xero}
                          </div>
                        </td>
                        {val?.status && (
                          <td>
                            <div
                              className="pt_infolistdata"
                              style={{
                                color:
                                  statusColors[
                                    val.status as keyof typeof statusColors
                                  ] || statusColors.DEFAULT,
                              }}
                            >
                              <h6>Status</h6>
                              {val.status}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </table>
                </div>
                {syncLogDetailsData?.trackingDetails?.map(
                  (item: any[], index: number) => (
                    <div className="pt_expandtable" key={index + 1}>
                      <details open>
                        <summary>
                          {syncLogDetailsData?.sync_type == "Invoices" ||
                          syncLogDetailsData?.sync_type == "Bills"
                            ? "Item "
                            : syncLogDetailsData?.sync_type}{" "}
                          {index + 1}
                        </summary>
                        <div className="pt_infodata">
                          <table>
                            {item.map((innerItem: any, innerIndex: any) => (
                              <tr key={innerIndex}>
                                <td>
                                  <div className="pt_infolistdata">
                                    <h6>Tracking</h6>
                                    {innerItem.source}
                                  </div>
                                </td>
                                <td>
                                  <div
                                    className="pt_infolistdata break-word"
                                    style={{ color: "#e94439" }}
                                  >
                                    <h6>Paytrade</h6>
                                    {innerItem.paytrade}
                                  </div>
                                </td>
                                <td>
                                  <div
                                    className="pt_infolistdata break-word"
                                    style={{ color: "#13b5ea" }}
                                  >
                                    <h6>Xero</h6>
                                    {innerItem.xero}
                                  </div>
                                </td>
                                <td>
                                  <div
                                    className="pt_infolistdata"
                                    style={{
                                      color:
                                        statusColors[
                                          innerItem.status as keyof typeof statusColors
                                        ] || statusColors.DEFAULT,
                                    }}
                                  >
                                    <h6>Status</h6>
                                    {innerItem.status}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </table>
                        </div>
                      </details>
                    </div>
                  )
                )}
                {syncLogDetailsData?.history?.length > 0 && (
                  <div className="pt_infodata">
                    <div className="pt_infolistdata">
                      <h6>History</h6>
                      {syncLogDetailsData?.history?.map(
                        (val: any, idx: number) => (
                          <div key={idx} style={{ marginBottom: "4px" }}>
                            {parseHistoryEntry(val)}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {modelConfig.show && (
        <BaseModal
          modalId="confirmation"
          displayModal={modelConfig.show}
          onClose={() => setModelConfig({ ...modelConfig, show: false })}
          title={modelConfig.title}
          secondButtonName={modelConfig.secondButtonName}
          firstButtonName={modelConfig.firstButtonName}
          onConfirm={() => {
            modelClose();
            return true;
          }}
        >
          <p className="text_center">{modelConfig.description}</p>
        </BaseModal>
      )}
      {showManualMapping && (
        <BaseModal
          modalId="confirmation"
          displayModal={showManualMapping}
          onClose={() => setShowManualMapping(false)}
          secondButtonName="Map"
          firstButtonName="Cancel"
          onConfirm={() => {
            handleManualMapping();
            return true;
          }}
          title={modelConfigSelect.title}
        >
          <br />
          <p
            className="text_center"
            dangerouslySetInnerHTML={{ __html: modelConfigSelect.description }}
          ></p>
          <br />
          <SearchableSelect
            placeholder={modelConfigSelect.placeHolder}
            label=""
            name={"contact"}
            renderKey={modelConfigSelect.renderKey}
            options={modelConfigSelect.options}
            valueKey={modelConfigSelect.valueKey}
            isInPopup={true}
            onChange={(selectedOption: any) => {
              setManualMapData(selectedOption);
            }}
          />
        </BaseModal>
      )}
      {openOverpayment && (
        <BaseModal
          modalId="confirmation"
          displayModal={openOverpayment}
          onClose={() => setOpenOverpayment(false)}
          secondButtonName="Save"
          firstButtonName="Cancel"
          onConfirm={() => {
            handleOverpayment();
            return true;
          }}
          title={"Overpayment Details"}
          disableSecondButton={isOverpaymentSecondButtonDisabled()}
        >
          <p className="text_center">
            Xero Details: <br />
            Date:{" "}
            {formatDate(viewLogData?.xero_records?.[0]?.updatedDateUTC) ?? "-"}
            <br />
            Sub total: ${viewLogData?.xero_records?.[0]?.subTotal ?? "-"}
            <br />
            Total tax: ${viewLogData?.xero_records?.[0]?.totalTax ?? "-"} <br />
            Total: ${viewLogData?.xero_records?.[0]?.total ?? "-"} <br />
            <br />
          </p>
          <div style={{ marginBottom: "0.8rem" }}>
            <SearchableSelect
              placeholder={
                claimType === "Receivable"
                  ? "Select Client"
                  : "Select Supplier "
              }
              name="other payments"
              label={claimType === "Receivable" ? "Client" : "Supplier"}
              onChange={(selectedOption: any) => {}}
              selectedData={supplierSelectedValue}
              disabled={true}
              options={supplierListData}
              renderKey="label"
              valueKey="value"
              required
              isInPopup={true}
            />
          </div>
          <div style={{ marginBottom: "0.8rem" }}>
            <SearchableSelect
              placeholder="Select Project"
              name="other payments"
              label="Project"
              onChange={(selectedOption: any) => {
                console.log(selectedOption);
                setPaymentClaimSelectedData(null);
                setPaymentSelectedData(null);
                setProjectId(selectedOption?.project_id);
                setProjectSelectedValue(selectedOption);
                handleGetPaymentClaimList(selectedOption?.project_id);
              }}
              selectedData={projectSelectedValue}
              options={projectListData}
              renderKey="label"
              valueKey="value"
              required
              isInPopup={true}
            />
          </div>
          <div style={{ marginBottom: "0.8rem" }}>
            <SearchableSelect
              placeholder="Select Claims"
              name="other payments"
              label="Claims"
              onChange={(selectedOption: any) => {
                setPaymentSelectedData(null);
                setPaymentClaimSelectedData(selectedOption);
                handleGetAllPaymentList(selectedOption);
              }}
              selectedData={paymentClaimSelectedData}
              options={paymentClaimsOptions}
              renderKey="label"
              valueKey="value"
              required
              isInPopup={true}
            />
          </div>
          <div style={{ marginBottom: "0.8rem" }}>
            <SearchableSelect
              placeholder="Select Payments"
              name="other payments"
              label="Payments"
              onChange={(selectedOption: any) => {
                setPaymentSelectedData(selectedOption);
                handleGetOverpaymentList(selectedOption?.value);
              }}
              selectedData={paymentSelectedData}
              options={aLLPaymentOptions}
              renderKey="label"
              valueKey="value"
              required
              isInPopup={true}
            />
          </div>
          {viewLogData.error_code == "WH_OVERPAYMENT_REFUND_MISSING_FIELDS" ||
            (viewLogData?.error_code ==
              "SCHEDULER_OVERPAYMENT_REFUND_MISSING_FIELDS" && (
              <SearchableSelect
                placeholder="Select Overpayment"
                name="other payments"
                label="Overpayment"
                onChange={(selectedOption: any) => {
                  setOverPaymentsSelectedValue(selectedOption);
                }}
                selectedData={overPaymentsSelectedValue}
                options={overPaymentList}
                renderKey="label"
                valueKey="value"
                required
              />
            ))}
        </BaseModal>
      )}
      {openGeneratedClaimModel && generateClaimData?.length > 0 && (
        <BaseModal
          title="Subcontractor Claim List"
          displayModal={openGeneratedClaimModel}
          onClose={() => setOpenGeneratedClaimModel(false)}
          secondButtonName={"Save"}
          onConfirm={handleSaveReasons}
          halfScreenPopup
          firstButtonName={"Close"}
        >
          <div className="container-fluid">
            <div className="grid">
              <div className="pt_box">
                <DynamicTable
                  headers={GridListHeaders}
                  gridData={
                    generateClaimData?.length > 0 ? generateClaimData : []
                  }
                  gridActions={[]}
                  onRowClick={(data: any) => {}}
                  loaderColSpan={10}
                  renderRowList={GenereateRenderData}
                  currentPage={page}
                  hidePagination
                  entriesPerPage={perPage}
                  onEntriesPerPageChange={setPerPage}
                  onPageChange={setPage}
                  totalEntries={generateClaimCount}
                  customHallowGrid="half_screen_modal_no_grid_Data"
                />
              </div>
            </div>
          </div>
        </BaseModal>
      )}
      {openAttachmentModel && (
        <BaseModal
          title="Attachments"
          displayModal={openAttachmentModel}
          onClose={() => setOpenAttachmentModel(false)}
          secondButtonName={"Save"}
          onConfirm={handleSaveAttachment}
          halfScreenPopup
          firstButtonName={"Close"}
        >
          <div className="container-fluid">
            <div className="grid">
              <div
                className="pt_box"
                style={{ marginTop: "70px", marginBottom: "70px" }}
              >
                <MultipleFileHandler
                  titleName="Supporting statement attachments"
                  required
                  afterFileChange={handleAttachmentChange}
                  onError={handleAttachmentError}
                  filesToAccept={`${uploadFile.pdf}, ${uploadFile.word}`}
                  existingFiles={compulsoryAttachments}
                  displayInfoIcon={
                    viewLogData.error_code ==
                      "WH_MISSING_SUPPORTING_ATTACHMENTS_PAYMENTS" ||
                    viewLogData.error_code ==
                      "SCHEDULER_MISSING_SUPPORTING_ATTACHMENTS_PAYMENTS"
                      ? false
                      : true
                  }
                  infoText={`Section 75 of the Building Industry Fairness (Security of
                Payment) Act 2017 (BIF Act) requires a "supporting statement" to
                be included with every payment claim. This statement must either
                declare that all subcontractors have been paid all amounts owed,
                or, if not, provide specific details for each unpaid
                subcontractor, including their name, the unpaid amount, details
                of the relevant payment claim, the date of the work, and the
                reasons for non-payment.`}
                />
                {attachmentError && (
                  <div
                    className="error-message"
                    style={{ color: "red", marginTop: "10px" }}
                  >
                    {attachmentError}
                  </div>
                )}
              </div>
            </div>
          </div>
        </BaseModal>
      )}
      {openTextareaModel && (
        <BaseModal
          title="Reason for withholding payment"
          displayModal={openTextareaModel}
          onClose={() => setOpenTextareaModel(false)}
          secondButtonName={"Save"}
          onConfirm={handleTextAreaSave}
          firstButtonName={"Close"}
          disableSecondButton={textareaReason.trim() ? false : true}
        >
          <div className="container-fluid">
            {/* <div className="grid">
              <div className="pt_box"> */}
            <textarea
              name="reason"
              placeholder="Reason for withholding payment"
              aria-label="Report"
              value={textareaReason}
              maxLength={100}
              onChange={(e) => setTextareaReason(e.target.value)}
            />
            {/* </div> */}
            {/* </div> */}
          </div>
        </BaseModal>
      )}
      {openBankDraftGapFill && (
        <BaseModal
          modalId="bank-draft-gap-fill"
          displayModal={openBankDraftGapFill}
          onClose={() => setOpenBankDraftGapFill(false)}
          secondButtonName="Activate Account"
          firstButtonName="Cancel"
          onConfirm={handleBankDraftGapFill}
          title="Complete Bank Account Details"
          disableSecondButton={!isBankDraftFormValid()}
        >
          <div className="container-fluid">
            <p style={{ marginBottom: "1rem", fontSize: "0.9rem" }}>
              This bank account was auto-created from Xero as a draft.
              Please provide the required fields to activate it.
            </p>
            {viewLogData?.dynamic_values?.account_name && (
              <p style={{ marginBottom: "1rem", fontWeight: "bold" }}>
                Account: {viewLogData.dynamic_values.account_name}
              </p>
            )}
            <div style={{ marginBottom: "0.8rem" }}>
              <label style={{ display: "block", marginBottom: "0.3rem", fontWeight: 500 }}>
                Account Type <span style={{ color: "red" }}>*</span>
              </label>
              <select
                className="pt_input"
                value={bankDraftForm.account_type}
                onChange={(e) =>
                  setBankDraftForm({ ...bankDraftForm, account_type: e.target.value })
                }
              >
                <option value="">Select Account Type</option>
                <option value="Cash Account">General Account</option>
                <option value="Project Trust Account">Project Trust Account</option>
                <option value="Retention Trust Account">Retention Trust Account</option>
              </select>
            </div>
            <div style={{ marginBottom: "0.8rem" }}>
              <label style={{ display: "block", marginBottom: "0.3rem", fontWeight: 500 }}>
                Financial Institution <span style={{ color: "red" }}>*</span>
              </label>
              <input
                className="pt_input"
                type="text"
                placeholder="e.g. Commonwealth Bank"
                value={bankDraftForm.financial_institution}
                onChange={(e) =>
                  setBankDraftForm({ ...bankDraftForm, financial_institution: e.target.value })
                }
              />
            </div>
            <div style={{ marginBottom: "0.8rem" }}>
              <label style={{ display: "block", marginBottom: "0.3rem", fontWeight: 500 }}>
                Opening Date <span style={{ color: "red" }}>*</span>
              </label>
              <input
                className="pt_input"
                type="date"
                value={bankDraftForm.opening_date}
                onChange={(e) =>
                  setBankDraftForm({ ...bankDraftForm, opening_date: e.target.value })
                }
              />
            </div>
            <div style={{ marginBottom: "0.8rem" }}>
              <label style={{ display: "block", marginBottom: "0.3rem", fontWeight: 500 }}>
                Delegate Powers <span style={{ color: "red" }}>*</span>
              </label>
              <select
                className="pt_input"
                value={bankDraftForm.delegate_powers}
                onChange={(e) =>
                  setBankDraftForm({ ...bankDraftForm, delegate_powers: e.target.value })
                }
              >
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div style={{ marginBottom: "0.8rem" }}>
              <label style={{ display: "block", marginBottom: "0.3rem", fontWeight: 500 }}>
                Account Number
              </label>
              <input
                className="pt_input"
                type="text"
                placeholder="Account number"
                value={bankDraftForm.account_number}
                onChange={(e) =>
                  setBankDraftForm({ ...bankDraftForm, account_number: e.target.value })
                }
              />
            </div>
            <div style={{ marginBottom: "0.8rem" }}>
              <label style={{ display: "block", marginBottom: "0.3rem", fontWeight: 500 }}>
                BSB Number
              </label>
              <input
                className="pt_input"
                type="text"
                placeholder="BSB number"
                value={bankDraftForm.bsb_number}
                onChange={(e) =>
                  setBankDraftForm({ ...bankDraftForm, bsb_number: e.target.value })
                }
              />
            </div>
            {isTrustAccount && (
              <>
                <hr style={{ margin: "1rem 0", borderColor: "#eee" }} />
                <p style={{ marginBottom: "0.8rem", fontSize: "0.85rem", color: "#666" }}>
                  Trust account fields (required for {bankDraftForm.account_type})
                </p>
                <div style={{ marginBottom: "0.8rem" }}>
                  <label style={{ display: "block", marginBottom: "0.3rem", fontWeight: 500 }}>
                    Associated General Account ID <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    className="pt_input"
                    type="number"
                    placeholder="General account ID"
                    value={bankDraftForm.associated_cash_account_id}
                    onChange={(e) =>
                      setBankDraftForm({ ...bankDraftForm, associated_cash_account_id: e.target.value })
                    }
                  />
                </div>
                <div style={{ marginBottom: "0.8rem" }}>
                  <label style={{ display: "block", marginBottom: "0.3rem", fontWeight: 500 }}>
                    Trustee ID <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    className="pt_input"
                    type="number"
                    placeholder="Trustee ID"
                    value={bankDraftForm.trustee_id}
                    onChange={(e) =>
                      setBankDraftForm({ ...bankDraftForm, trustee_id: e.target.value })
                    }
                  />
                </div>
              </>
            )}
          </div>
        </BaseModal>
      )}
    </>
  );
}
