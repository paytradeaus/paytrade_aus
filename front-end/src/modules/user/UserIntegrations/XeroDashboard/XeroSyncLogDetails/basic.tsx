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
  commentsTableResolve,
  handleManualMappingLogic,
  handleResolveByErrorCodeMap,
  overpayment,
  textareaErrorCode,
  uploadAttachment,
} from "./resolveByMap";
import DynamicTable from "@/components/Table";
import { GridListHeaders } from "@/modules/user/AddUpdateClaims/AddUpdateClaims.constant";
import {
  checkAndCreateOverPaymentAndRefunds,
  CreateClaimInPaytradeForTable,
  CreateClaimInPaytradeReason,
  createInvoiceOrBillInPaytradeTable,
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

  const [compulsoryAttachments, setCompulsoryAttachments] = useState<any>();
  const [attachmentError, setAttachmentError] = useState<string>("");

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
        const contact =
          xero?.invoice?.contact?.name || xero?.contact?.name || "-";
        data["ClaimDetails"] = [
          {
            tracking: "Invoice Id",
            paytrade: paytrade?.payment_claim_id || "-",
            xero: xero?.invoice?.invoiceID || "-",
          },
          {
            tracking: "Payment Type",
            paytrade: paytrade?.payment_type || "-",
            xero: xero?.paymentType || "-",
          },
          {
            tracking: "Status",
            paytrade: paytrade?.current_status || "-",
            xero: xero?.status || "-",
          },
          {
            tracking: "Client/Supplier",
            paytrade:
              paytrade?.clientSupplierDetails?.client_supplier_name || "-",
            xero: contact || "-",
            status:
              paytrade?.clientSupplierDetails?.client_supplier_name == contact
                ? "Ok"
                : "Failed",
          },
          {
            tracking: "Date",
            paytrade: formatDate(paytrade?.payment_date?.split("T")[0]) || "-",
            xero: formatDate(xero?.date?.split("T")[0]) || "-",
            status:
              formatDate(paytrade?.payment_date?.split("T")[0]) ==
              formatDate(xero?.date?.split("T")[0])
                ? "Ok"
                : "Failed",
          },
          {
            tracking: "Due Date",
            paytrade:
              formatDate(paytrade?.paymentClaims?.due_date?.split("T")[0]) ||
              "-",
            xero: formatDate(xero?.invoice?.dueDate?.split("T")[0]) || "-",
            status:
              formatDate(paytrade?.paymentClaims?.due_date?.split("T")[0]) ==
              formatDate(xero?.invoice?.dueDate?.split("T")[0])
                ? "Ok"
                : "Failed",
          },
          {
            tracking: "Payment Amount ",
            paytrade:
              formatDollars(formatDisplayAmount(paytrade?.total_amount)) || "-",
            xero:
              formatDollars(formatDisplayAmount(xero?.invoice?.total)) || "-",
            status:
              formatDollars(formatDisplayAmount(paytrade?.total_amount)) ==
              formatDollars(formatDisplayAmount(xero?.invoice?.total))
                ? "Ok"
                : "Failed",
          },
        ];
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
            </div>
            <div className="pt_pageactions">
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
                            flex: 1, // places it below the heading
                            whiteSpace: "normal",
                            wordWrap: "break-word",
                            overflowWrap: "break-word",
                            lineHeight: "1.5",
                            margin: 0,
                          }}
                        >
                          {syncLogDetailsData?.error_message}
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
                        >
                          <i
                            className="fa-light fa-refresh"
                            style={{
                              marginRight: "10px",
                              marginLeft: "10px",
                            }}
                          ></i>
                          {resolveInprogress ? "Inprogress..." : "Resolve"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}
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
                                    >
                                      <i
                                        className="fa-light fa-refresh"
                                        style={{
                                          marginRight: "10px",
                                          marginLeft: "10px",
                                        }}
                                      ></i>
                                      {resolveInprogress
                                        ? "Inprogress..."
                                        : "Resolve"}
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
                      {syncLogDetailsData?.history?.map((val: any) => (
                        <>
                          {val} <br />
                        </>
                      ))}
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
    </>
  );
}
