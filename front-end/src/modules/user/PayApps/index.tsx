//default imports
"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
//import from external libraries
//import from constants, interfaces ,functions and services
import { deleteCookie, getCookie, setCookie } from "cookies-next";
import {
  changeStatusOfAPaymentClaim,
  fetchAllPaymentClaims,
  PaymentClaim,
} from "./payApps.functions";
import { fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList } from "@/app/api/commonApi";
import { connectWebSocket, formatDate } from "@/utils";
import DynamicTable from "@/components/Table";
import { AppRoutes } from "@/shared/constant/appRoutes";
import BreadCrumbs from "@/components/BreadCrumbs";
import GridExportActions from "@/components/GridExportActions";
import FormikControl from "@/components/FormikControl";
import TabSwitch from "@/components/TabSwitch";
import BaseModal from "@/components/BaseModal";
import {
  payAppsheaderNames,
  paymentRenderData,
  receivableOptions,
  statusOptions,
  tabOptions,
  toggleOptions,
} from "./payApps.constant";
import ColumnSettingsMenu, {
  ColumnOption,
  buildEffectiveOrder,
} from "@/components/ColumnSettingsMenu";
import { useAppSelector } from "@/redux/store";
import { setTablePreference } from "@/redux/slices/uiPreferences";
import { persistUiPreferences } from "@/network/uiPreferences";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  buttonType,
  filterByDuration,
  InputType,
} from "@/shared/constant/general";
import Link from "next/link";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";
import { useLoaderContext } from "@/context/useLoader";
import { tabTypes } from "../AddUpdatePayments/Payments.constants";
import { ProjectOptions } from "next/dist/build/swc";
import { format, isValid } from "date-fns";
import { setPaymentClaims } from "@/redux/slices/subscribeRouteBackDetails";
import { useAppDispatch } from "@/redux/store";

interface RowData {
  id: string;
  type: string;
  status: string;
}

interface ContractOption {
  value: string;
  label: string;
  contract_id: number;
}

export default function PayApps({ overViewDetails = {} }: any) {
  const {
    overViewMode,
    isArchived = false,
    data: overviewData,
  } = overViewDetails;
  const dispatch = useAppDispatch();
  // Per-user table prefs for the Claims grid (column order + visibility).
  // Persisted to user_details.ui_preferences.extra.tablePreferences.payApps.
  const PAY_APPS_TABLE_KEY = "payApps";
  const tablePref = useAppSelector(
    (s: any) => s?.uiPreferences?.tablePreferences?.[PAY_APPS_TABLE_KEY]
  ) as { columnOrder?: string[]; hiddenColumns?: string[] } | undefined;
  const persistTimerRef = useRef<any>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const claimType = useSearchParams().get("claim-type");
  const retentionType = useSearchParams().get("retention-type");
  const [loading, setLoading] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [sortValues, setSortValues] = useState<any>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [displayPaymentModel, setDisplayPaymentModel] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [emptySearchField, setEmptySearchField] = useState(false);

  const [contractOptions, setContractOptions] = useState<ContractOption[]>([]);
  const [projectOptions, setProjectOptions] = useState<ProjectOptions[]>([]);
  const [actionData, setActionData] = useState<any>();

  const [selectedStatus, setSelectedStatus] = useState(
    isArchived ? "Archived" : ""
  );

  const [selectedStatusName, setSelectedStatusName] = useState<any>(null);
  // Multi-select status values (array of {label, value}). Empty array =
  // "All". Persisted to tablePreferences.payApps.filters.statuses.
  const [selectedStatuses, setSelectedStatuses] = useState<any[]>([]);
  // Multi-select client/supplier values (array of {label, value}). value
  // is the client_supplier_id as string. Empty = no filter.
  const [selectedClientSuppliers, setSelectedClientSuppliers] = useState<
    any[]
  >([]);
  const [clientSupplierOptions, setClientSupplierOptions] = useState<any[]>([]);
  // Track whether we have already applied the one-time hydration of
  // filters from the user's saved prefs (we don't want to overwrite a
  // mid-session change just because tablePref re-emits).
  const filtersHydratedRef = useRef(false);
  const filterPersistTimerRef = useRef<any>(null);
  // Mirror of latest `tablePref` so `saveTablePrefs` can always merge from
  // the freshest snapshot — protects against last-write-wins when the gear
  // menu and a filter onChange fire back-to-back before a re-render.
  const tablePrefRef = useRef<any>(null);
  const [paymentclaimGridData, setPaymentClaimGridData] = useState<any>([]);

  const [openModal, setOpenModal] = useState(false);
  const [selectedClaimType, setSelectedClaimType] = useState<string>(
    retentionType || ""
  );

  const { setLoader }: any = useLoaderContext();
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);

  const [selectedPaymentType, setSelectedPaymentType] = useState<string>(
    claimType || ""
  );
  const [selectedProjectId, setSelectedProjectId] = useState<
    number | null | any
  >(null);

  const [selectedContractId, setSelectedContractId] = useState<
    number | null | any
  >(null);
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);
  const [selectedProjectName, setSelectedProjectName] = useState<number | null>(
    null
  );

  const [paymentClaimsData, setPaymentClaimsData] = useState<PaymentClaim[]>(
    []
  );
  const [activityDate, setActivityDate] = useState("");
  const [singleActivyDate, setSingleActivyDate] = useState<any>({
    value: "All",
    label: "All dates",
  });
  const [activityLogStartDate, setActivityLogStartDate] = useState<
    Date | null | any
  >(new Date().toISOString().split("T")[0]);

  const [activityLogEndDate, setActivityLogEndDate] = useState<
    Date | null | any
  >(new Date().toISOString().split("T")[0]);

  const selectedCompanyId = Number(getCookie("companyId")) || 0;

  const [displayDeleteConfirmationModal, setDisplayDeleteConfirmationModal] =
    useState(false);

  const [activeTab, setActiveTab] = useState("");
  const resetFilters = () => {
    setEmptySearchField(true);
    setSelectedStatus("");
    setSelectedStatusName(null);
    setSelectedStatuses([]);
    setSelectedClientSuppliers([]);
    setSelectedContractId(null);
    setSelectedProjectId(null);
    setSelectedProjectName(null);
    setSingleActivyDate({ value: "All", label: "All" }); // Reset Activity Range filter
    setActivityDate(""); // Reset activityDate state
    setIsCustomDate(false); // Reset custom date state
    const today = new Date().toISOString().split("T")[0];
    setActivityLogStartDate(today); // Reset start date to today
    setActivityLogEndDate(today); // Reset end date to today
    // Also clear the persisted multi-select filter slice so a reload
    // doesn't restore the cleared selections from server prefs.
    saveTablePrefs({ filters: {} });
  };

  const isAnyFilterActive =
    selectedStatusName !== null ||
    selectedStatuses.length > 0 ||
    selectedClientSuppliers.length > 0 ||
    selectedContractId !== null ||
    selectedProjectId !== null ||
    selectedProjectName !== null ||
    searchValue !== "" ||
    activityDate !== "";

  useEffect(() => {
    if (displayPaymentModel && dialogRef.current) {
      dialogRef.current.showModal(); // Open the dialog
    } else if (dialogRef.current) {
      dialogRef.current.close(); // Close the dialog if needed
    }
  }, [displayPaymentModel]);

  useEffect(() => {
    // Delete the 'redirectAfterLogin' cookie when the component renders
    const isCookiePresent = getCookie("redirectAfterLogin");
    if (isCookiePresent) {
      deleteCookie("redirectAfterLogin");
    }
  }, []);

  // Defensive: cancel any pending column-prefs persist on unmount so a
  // delayed write can't fire after the component has gone away.
  useEffect(() => {
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      if (filterPersistTimerRef.current)
        clearTimeout(filterPersistTimerRef.current);
    };
  }, []);

  // Keep tablePrefRef in sync with the latest snapshot so saveTablePrefs
  // always merges from the freshest value, not a render-captured stale one.
  useEffect(() => {
    tablePrefRef.current = tablePref || null;
  }, [tablePref]);

  // One-shot hydration of saved filter selections from tablePref.filters.
  // Status values are resolved against the UNION of Billable + Receivable
  // option lists (the two lists only differ on "Confirm payment" vs
  // "Confirm receipt"); if a saved value isn't in either list we synthesize
  // a {label, value} so it still applies as a filter regardless of which
  // payment-type tab the user lands on. Client/supplier hydration still
  // waits for the options list so labels render correctly.
  useEffect(() => {
    if (filtersHydratedRef.current) return;
    if (!tablePref) return;
    const filters = (tablePref as any).filters as
      | Record<string, any>
      | undefined;
    if (!filters || typeof filters !== "object") {
      filtersHydratedRef.current = true;
      return;
    }
    const unionStatuses = [...statusOptions, ...receivableOptions];
    const savedStatuses = Array.isArray(filters.statuses)
      ? (filters.statuses as string[]).filter(
          (v) => typeof v === "string" && v.length > 0
        )
      : [];
    if (savedStatuses.length > 0) {
      const resolved = savedStatuses.map(
        (v) =>
          unionStatuses.find((o: any) => o.value === v) || {
            label: v,
            value: v,
          }
      );
      setSelectedStatuses(resolved as any[]);
    }
    const savedCsIds = Array.isArray(filters.clientSupplierIds)
      ? (filters.clientSupplierIds as any[]).map((v) => String(v))
      : [];
    if (savedCsIds.length === 0) {
      filtersHydratedRef.current = true;
    } else if (clientSupplierOptions.length > 0) {
      const resolved = savedCsIds
        .map((v) => clientSupplierOptions.find((o: any) => o.value === v))
        .filter(Boolean);
      setSelectedClientSuppliers(resolved as any[]);
      filtersHydratedRef.current = true;
    }
    // If savedCsIds.length > 0 but options not yet loaded, leave the
    // hydration latch open; the effect re-runs when clientSupplierOptions
    // arrives.
  }, [tablePref, clientSupplierOptions]);

  const truncateText = (text: any, maxLength = 25) => {
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  };

  useEffect(() => {
    (async () => {
      const data = {
        company_id: selectedCompanyId || null,
        project_id:
          overviewData?.project_id || Number(selectedProjectId) || null,
        contract_id:
          overviewData?.contract_id || Number(selectedContractId) || null,
      };

      const response =
        await fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList(data);
      if (response) {
        // Set Project List
        const projectOptions: any = [
          { label: "All", value: null, project_id: "" },
          ...(response.projects?.map((project: any) => ({
            label: project?.project_name,
            value: project?.project_id.toString(),
            project_id: project?.project_id.toString(),
          })) || []),
        ];
        setProjectOptions(projectOptions);

        // Set Contract List
        const contractOptions = [
          { label: "All", value: null, contract_id: "" }, // Add this line
          ...(response.contracts?.map((contract: any) => ({
            label: contract?.contract_name,
            value: contract?.contract_id.toString(),
            contract_id: contract?.contract_id.toString(),
          })) || []),
        ];
        setContractOptions(contractOptions);

        // Set Client/Supplier list for the multi-select filter. Dedupe by
        // id so the same party appearing on multiple contracts isn't shown
        // twice.
        const seen = new Set<string>();
        const csOpts: any[] = [];
        for (const cs of response.clientSuppliers || []) {
          const id = cs?.client_supplier_id?.toString();
          if (!id || seen.has(id)) continue;
          seen.add(id);
          csOpts.push({
            label: cs?.client_supplier_name,
            value: id,
            client_supplier_id: id,
            client_supplier_type: cs?.client_supplier_type,
          });
        }
        setClientSupplierOptions(csOpts);
      }
    })();
  }, [selectedCompanyId, selectedProjectId]); // Add necessary dependencies

  useEffect(() => {
    if (selectedCompanyId !== null) {
      fetchClaimsList(currentPage, entriesPerPage);
    }
  }, [
    selectedCompanyId,
    currentPage,
    entriesPerPage,
    sortValues,
    activityDate,
    activityLogEndDate,
    activityLogStartDate,
    selectedStatuses,
    selectedClientSuppliers,
  ]);

  useEffect(() => {
    setCurrentPage(1); // Reset to the first page
  }, [
    selectedClaimType,
    selectedStatusName,
    selectedPaymentType,
    selectedProjectId,
    selectedContractId,
    activeTab,
    activityDate,
    activityLogEndDate,
    activityLogStartDate,
    selectedStatuses,
    selectedClientSuppliers,
  ]);
  useEffect(() => {
    if (selectedContractId || selectedProjectId) {
      fetchClaimsList(currentPage, entriesPerPage);
    }
  }, [selectedContractId, selectedProjectId]);

  useEffect(() => {
    if (!overViewMode || (overViewMode && overviewData?.contract_id))
      fetchClaimsList(currentPage, entriesPerPage);
  }, [
    selectedClaimType,
    selectedStatusName,
    selectedPaymentType,
    selectedProjectId,
    selectedContractId,
    activeTab,
    overviewData,
    currentPage,
    entriesPerPage,
    searchValue,
  ]);

  async function fetchClaimsList(page: number, rowsPerPage: number) {
    if (!selectedCompanyId) {
      return; // Early return if selectedCompanyId is not present
    }
    if (emptySearchField) {
      setEmptySearchField(false);
    }
    setPaymentClaimGridData([]);
    setLoading(true);
    const response = await fetchAllPaymentClaims({
      cash_retention_type: selectedClaimType || null,
      claim_type: selectedPaymentType || null,
      contract_id:
        overviewData?.contract_id || Number(selectedContractId) || null,
      company_id: selectedCompanyId || null,
      items_per_page: rowsPerPage,
      page: page,
      project_id: overviewData?.project_id || Number(selectedProjectId) || null,
      status:
        activeTab === "Archived" ? "Archived" : selectedStatusName || null,
      statuses:
        activeTab === "Archived"
          ? null
          : selectedStatuses.length > 0
          ? selectedStatuses.map((s: any) => s.value).filter(Boolean)
          : null,
      client_supplier_ids:
        selectedClientSuppliers.length > 0
          ? selectedClientSuppliers
              .map((c: any) => Number(c.value))
              .filter((n: any) => Number.isFinite(n) && n > 0)
          : null,
      sorting_field: sortValues?.sortKey || "",
      sorting_order: sortValues?.direction || "",
      search: searchValue ?? "",
      date_filter: activityDate === "All dates" ? null : activityDate,
      start_date: isCustomDate ? activityLogStartDate : null,
      end_date: isCustomDate ? activityLogEndDate : null,
    });

    if (response) {
      const responseData = JSON.parse(JSON.stringify(response));
      setTotalRows(response.total_count || 0);
      setEntriesPerPage(rowsPerPage);

      let printDataObjCreation = responseData?.payment_claims?.map(
        (paymentClaim: PaymentClaim) => {
          return {
            ...paymentClaim,
            cash_retention_type: paymentClaim?.cash_retention_type,
            claim_type: paymentClaim?.claim_type,
            claim_reference: paymentClaim?.claim_reference || "-",
            client_supplier_name: paymentClaim?.client_supplier_name || "-",
            project_name: paymentClaim?.project_name,
            contract_name: paymentClaim?.contract_name,
            due_date: formatDate(paymentClaim?.due_date),
            claim_amount: `$ ${
              paymentClaim?.claim_amount
                ? Number(paymentClaim.claim_amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "0.00"
            }`,
            status: truncateText(paymentClaim?.list_status),
            payment_claim_id: paymentClaim?.payment_claim_id,
          };
        }
      );
      setPaymentClaimGridData(printDataObjCreation || []);
      setPaymentClaimsData(printDataObjCreation || []);
    }
    setLoading(false);
    setDisableExcelBtn(false);
  }

  const handleStatusChange = (selectedValue: any) => {
    setSelectedStatus(selectedValue);
    setSelectedStatusName(selectedValue);
    // Perform any other actions based on the selected valuef
  };

  const handleClearAndNavigate = () => {
    dispatch(setPaymentClaims({})); // clear redux before navigating
  };
  //Other Hooks
  const router = useRouter();

  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "payment_claims",
        cash_retention_type: selectedClaimType || null,
        claim_type: selectedPaymentType || null,
        contract_id: Number(selectedContractId) || null,
        company_id: selectedCompanyId || null,
        project_id: Number(selectedProjectId) || null,
        status:
          activeTab === "Archived" ? "Archived" : selectedStatusName || null,
      });

      if (responseFileURL) {
        await downloadExcelFileFromAPI(responseFileURL);
      } else {
        showErrorToast("Failed to generate Excel file URL");
      }
    } catch (error) {
      console.error(error, "outside loop");
    } finally {
      setDisableExcelBtn(false);
    }
  };

  const handleDownloadPdfFile = async () => {
    setDisablePDFBtn(true);
    try {
      const clientId = await connectWebSocket();
      await getPDFUrl(clientId, {
        screen_name: "payment_claims",
        cash_retention_type: selectedClaimType || null,
        claim_type: selectedPaymentType || null,
        contract_id: Number(selectedContractId) || null,
        company_id: selectedCompanyId || null,
        project_id: Number(selectedProjectId) || null,
        status:
          activeTab === "Archived" ? "Archived" : selectedStatusName || null,
      });
      setDisablePDFBtn(false);
    } catch (error) {
      console.error(error, "outside loop");
    } finally {
      setDisablePDFBtn(false);
    }
  };

  const gridActions: any = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      style: buttonType.PRIMARY,
      onClick: (row: any, index: number) => {
        navigateToViewMode(row);
      },
      displayByDefault: true,
    },
    {
      label: "Add next payment",
      icon: "fa-light fa-money-bill-transfer",
      style: buttonType.SECONDARY,
      onClick: (row: any) => {
        const getPaymentType = row?.payments.find(
          (x: any) =>
            x?.payment_type === tabTypes.PART ||
            x?.payment_type === tabTypes.PAY_LESS_PART
        );
        setCookie("PaymentType", getPaymentType?.payment_type);
        router.push(
          `${AppRoutes.USER_ADD_PAYMENT}?claim=${row?.payment_claim_id}&tab=${
            selectedClaimType === toggleOptions[1]?.value
              ? "retention-claim"
              : ""
          }&next-payment=true`
        );
        setActionData(row);
      },
      conditionalApiDisplayKey: "add_next_payment",
    },

    {
      label: "Edit",
      icon: "fa-light fa-pen-to-square",
      style: buttonType.SECONDARY,
      onClick: (row: any) => {
        router.push(`${AppRoutes.USER_EDIT_CLAIMS}/${row?.payment_claim_id}`);
      },
      conditionalApiDisplayKey: "edit",
    },
    {
      label: "Add payment",
      icon: "a-light fa-money-bill-simple",
      style: buttonType.SECONDARY,
      onClick: (row: any) => {
        setDisplayPaymentModel(true);
        setActionData(row);
      },
      conditionalApiDisplayKey: "add_payment",
    },

    {
      label: "View all payments",
      icon: "fa-light fa-file-invoice-dollar",
      style: buttonType.SECONDARY,
      // onClick: (row: any) => {},
      onClick: (row: any) => {
        router.push(
          `${AppRoutes.USER_PAYMENTS_LIST}?partclaimid=${row?.payment_claim_id}`
        );
      },

      conditionalApiDisplayKey: "view_all_payment",
    },

    {
      label: "View payments",
      icon: "fa-light fa-file-invoice-dollar",
      style: buttonType.SECONDARY,
      // onClick: (row: any) => {},
      onClick: (row: any) => {
        setCookie("from_page", AppRoutes.USER_PAY_APPS);

        router.push(
          `${AppRoutes.USER_ADD_PAYMENT}?claim=${
            row?.payment_claim_id
          }&mode=view&payment=${row?.payments[0]?.payment_id}&crt=${
            selectedClaimType === toggleOptions[1]?.value
              ? "RetentionClaim"
              : ""
          }`
        );
      },

      conditionalApiDisplayKey: "view_payment",
    },

    {
      label: "View notices",
      icon: "fa-light fa-message-dollar",
      style: buttonType.SECONDARY,
      onClick: (row: any) => {
        // Check if any notice has status 'Sent' or 'Sending'
        const hasSentOrSendingNotice = row?.notices?.some((notice: any) =>
          ["Sent", "Sending", "Not Sent"].includes(notice.status)
        );

        // Determine if we should route to archived
        const isArchivedView =
          activeTab === "Archived" || !hasSentOrSendingNotice;
        router.push(
          `${AppRoutes.USER_NOTICES}?payment-claim=${row?.payment_claim_id}${
            isArchivedView ? "&archived=true" : ""
          }`
        );
      },
      conditionalApiDisplayKey: "view_notice",
    },

    {
      label: "Delete",
      icon: "fa-light fa-trash",
      style: buttonType.CONTRAST,
      onClick: (row: any) => {
        setDisplayDeleteConfirmationModal(true);
        setActionData(row);
      },
      conditionalApiDisplayKey: "delete",
    },
  ];

  async function handleDeleteFunction() {
    try {
      setLoader(true);
      const response = await changeStatusOfAPaymentClaim({
        payment_claim_id: actionData?.payment_claim_id,
        status: "Deleted",
      });
      if (response) {
        // Refresh the contract list after deletion
        fetchClaimsList(currentPage, entriesPerPage);
      }
      setOpenModal(false);
      setLoader(false);
    } catch {
      setOpenModal(false);
      setLoader(false);
    }
  }

  function navigateToViewMode(data: any) {
    let paymentObj: any = 0;

    if (data?.payments?.length > 0) {
      const isPartPayment = data?.payments.some(
        (x: any) =>
          x?.payment_type === tabTypes.PART ||
          x?.payment_type === tabTypes.PAY_LESS_PART
      );

      if (isPartPayment) {
        paymentObj = data?.payments.findLast(
          (x: any) =>
            x?.payment_type === tabTypes.PART ||
            x?.payment_type === tabTypes.PAY_LESS_PART
        );
      }
    }

    router.push(
      `${AppRoutes.USER_VIEW_CLAIMS}/${data?.payment_claim_id}?type=${
        data?.cash_retention_type
      }&cash-retention-type=${
        data?.cash_retention_type === "Claim" ? "" : "RetentionClaim"
      }&beneficiary=${data?.beneficiary_type || ""}&payment-type=${
        paymentObj
          ? paymentObj?.payment_type
          : data?.payments?.length > 0
          ? data?.payments[0]?.payment_type
          : ""
      }&payment=${
        paymentObj
          ? paymentObj?.payment_id
          : data?.payments?.length > 0
          ? data?.payments[0]?.payment_id
          : ""
      }&ctype=${data?.claim_type}`
    );
  }

  function handleSearch(searchedValue: any) {
    if (currentPage != 1) {
      setCurrentPage(1);
    }
    if (entriesPerPage != 10) {
      setEntriesPerPage(10);
    }
    setSearchValue(searchedValue);
  }

  const handleActivityChange = (selectedValue: any) => {
    setSingleActivyDate(selectedValue);
    if (selectedValue === "Custom") {
      setIsCustomDate(true);
    } else {
      setIsCustomDate(false);
    }
    setActivityDate(selectedValue); // Perform any other actions based on the selected value
  };

  // ─── Column preferences (reorder + show/hide, persisted per user) ───────
  // Canonical column list for the Claims grid. dataKey matches the header
  // dataKey returned by payAppsheaderNames; renderKey is the key used by
  // paymentRenderData (Status uses "list_status" in the header but "status"
  // in the render row). Labels here are what the column-settings menu shows
  // — kept stable regardless of Billable/Receivable toggle so the user's
  // saved order doesn't get confusing labels.
  const CLAIM_COLUMN_DEFS: Array<{
    dataKey: string;
    renderKey: string;
    label: string;
  }> = [
    { dataKey: "claim_date", renderKey: "claim_date", label: "Received/Sent Date" },
    { dataKey: "claim_reference", renderKey: "claim_reference", label: "Reference" },
    { dataKey: "cash_retention_type", renderKey: "cash_retention_type", label: "Type" },
    { dataKey: "claim_type", renderKey: "claim_type", label: "Billable/Receivable" },
    { dataKey: "project_name", renderKey: "project_name", label: "Project" },
    { dataKey: "contract_name", renderKey: "contract_name", label: "Contract" },
    { dataKey: "client_supplier_name", renderKey: "client_supplier_name", label: "Client / Supplier" },
    { dataKey: "due_date", renderKey: "due_date", label: "Due Date" },
    { dataKey: "claim_amount", renderKey: "claim_amount", label: "Total Claim (Gross of GST)" },
    { dataKey: "list_status", renderKey: "status", label: "Status" },
  ];

  const allClaimsColumns: ColumnOption[] = CLAIM_COLUMN_DEFS.map((c) => ({
    dataKey: c.dataKey,
    label: c.label,
  }));

  const savedOrder: string[] = Array.isArray(tablePref?.columnOrder)
    ? (tablePref!.columnOrder as string[])
    : [];
  const savedHidden: string[] = Array.isArray(tablePref?.hiddenColumns)
    ? (tablePref!.hiddenColumns as string[])
    : [];

  // Build the effective header list: take the *current* header objects
  // (titles depend on selectedPaymentType), filter out hidden columns,
  // reorder to match the user's saved order, then append the trailing
  // "Actions" header so the row-action icons always sit on the right.
  const currentHeaders = payAppsheaderNames(selectedPaymentType);
  const headerByKey = new Map<string, any>(
    currentHeaders
      .filter((h: any) => h?.dataKey)
      .map((h: any) => [h.dataKey, h])
  );
  const renderByKey = new Map<string, any>(
    paymentRenderData.map((r: any) => [r.key, r])
  );

  const orderedDefs = buildEffectiveOrder(allClaimsColumns, savedOrder);
  const hiddenSet = new Set(savedHidden);
  const visibleDefs = orderedDefs.filter((c) => !hiddenSet.has(c.dataKey));

  // Effective table headers: visible data columns (in saved order) + the
  // unchangeable trailing Actions header from the original list.
  const trailingActions = currentHeaders.find(
    (h: any) => !h?.dataKey || h?.title === "Actions"
  );
  const effectiveHeaders = [
    ...visibleDefs
      .map((c) => headerByKey.get(c.dataKey))
      .filter(Boolean),
    ...(trailingActions ? [trailingActions] : []),
  ];

  // Effective render row list, mapped via renderKey (Status uses "status").
  const effectiveRenderRowList = visibleDefs
    .map((c) => {
      const def = CLAIM_COLUMN_DEFS.find((d) => d.dataKey === c.dataKey);
      return def ? renderByKey.get(def.renderKey) : null;
    })
    .filter(Boolean);

  // Unified writer for the PayApps table prefs. Reads current redux state
  // for the slices the caller didn't touch and persists the *full* pref
  // payload, so the column-settings writer and the filter writer can't
  // clobber each other's slice on the server (last-write-wins guard).
  const saveTablePrefs = (
    patch: Partial<{
      columnOrder: string[];
      hiddenColumns: string[];
      filters: Record<string, any>;
    }>
  ) => {
    // Always merge from the freshest ref-mirrored snapshot, not the
    // render-captured `tablePref`, so two writers firing in the same tick
    // (e.g. gear-menu reorder + filter change) don't clobber each other's
    // slice via stale closure state.
    const current = (tablePrefRef.current || tablePref || {}) as any;
    const next = {
      columnOrder: Array.isArray(patch.columnOrder)
        ? patch.columnOrder
        : Array.isArray(current.columnOrder)
        ? current.columnOrder
        : [],
      hiddenColumns: Array.isArray(patch.hiddenColumns)
        ? patch.hiddenColumns
        : Array.isArray(current.hiddenColumns)
        ? current.hiddenColumns
        : [],
      filters:
        patch.filters && typeof patch.filters === "object"
          ? patch.filters
          : current.filters && typeof current.filters === "object"
          ? current.filters
          : {},
    };
    // Keep the ref in sync immediately so a subsequent same-tick call
    // sees this write's effects without waiting for the redux re-render.
    tablePrefRef.current = next;
    dispatch(
      setTablePreference({ tableKey: PAY_APPS_TABLE_KEY, pref: next })
    );
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      persistUiPreferences({
        extra: {
          tablePreferences: { [PAY_APPS_TABLE_KEY]: next },
        },
      });
    }, 600);
  };

  const handleColumnPrefsChange = ({
    order,
    hidden,
  }: {
    order: string[];
    hidden: string[];
  }) => {
    saveTablePrefs({ columnOrder: order, hiddenColumns: hidden });
  };

  const handleColumnPrefsReset = () => {
    saveTablePrefs({ columnOrder: [], hiddenColumns: [] });
  };

  return (
    <div className="container-fluid">
      <div className="pt_title">
        {!overViewMode && (
          <div className="pt_breadcrumbs">
            <BreadCrumbs
              routePaths={[
                {
                  name: "Dashboard",
                  path: AppRoutes.USER_DASHBOARD,
                },
              ]}
              activeRoute={"Claims"}
            />
          </div>
        )}
        <div className="grid">
          {!overViewMode && (
            <div className="pt_pagetitle">
              <h1>Claims</h1>
            </div>
          )}
          <div className="pt_pageactions">
            <Link
              href={`${AppRoutes.USER_ADD_CLAIMS}?mode=add`}
              passHref
              legacyBehavior
            >
              <a className="pt_addnewbutton">
                <button className="secondary" onClick={handleClearAndNavigate}>
                  <i className="fa-light fa-hexagon-plus"></i>Add claim
                </button>
              </a>
            </Link>
          </div>
        </div>
      </div>

      <div className="pt_filtergroup">
        <div className="grid pt_topfilters">
          <div className="pt_filters">
            {!overViewMode && (
              <div role="group">
                <TabSwitch
                  tabOptions={tabOptions}
                  onChange={(value: any) => setActiveTab(value)}
                />
              </div>
            )}
          </div>
          <div className="pt_pageactions">
            <div className="actionbuttons">
              <ColumnSettingsMenu
                allColumns={allClaimsColumns}
                order={savedOrder}
                hidden={savedHidden}
                onChange={handleColumnPrefsChange}
                onReset={handleColumnPrefsReset}
              />
              <GridExportActions
                resetFilterFunction={() => {
                  resetFilters();
                }}
                hideExcelButton={paymentclaimGridData.length > 0 ? false : true}
                hidePdfButton={paymentclaimGridData.length > 0 ? false : true}
                hideResetButton={!isAnyFilterActive}
                handleDownloadExcelFile={() => {
                  handleDownloadExcelFile();
                }}
                disabledOnExcel={disableExcelBtn}
                exportFromAPI={true}
                disabledPDF={disablePDFBtn}
                handleDownloadPrintPDF={() => {
                  handleDownloadPdfFile();
                }}
              />
            </div>
          </div>
        </div>
        <div className="pt_filters pt_toggles">
          <fieldset>
            <input
              type="radio"
              id="allClaimRetentionClaim"
              name="claims"
              value={""}
              checked={selectedClaimType === ""}
              onChange={(e: any) => setSelectedClaimType(e.target.value)}
            />
            <label htmlFor="allClaimRetentionClaim">All</label>
            <input
              type="radio"
              id="claims"
              name="claimsType"
              value="Claim"
              checked={selectedClaimType === "Claim"}
              onChange={(e: any) => setSelectedClaimType(e.target.value)}
            />
            <label htmlFor="claims">Payment Claims</label>
            <input
              type="radio"
              id="claims"
              name="claimsType"
              value="Retention claim"
              checked={selectedClaimType === "Retention claim"}
              onChange={(e: any) => setSelectedClaimType(e.target.value)}
            />
            <label htmlFor="claims">Retention claims</label>
          </fieldset>
          <fieldset>
            <input
              type="radio"
              id="AllBillableReceivable"
              name="paymentstype"
              value={""}
              checked={selectedPaymentType === ""}
              onChange={(e: any) => setSelectedPaymentType(e.target.value)}
            />
            <label htmlFor="AllBillableReceivable">All</label>
            <input
              type="radio"
              id="billable"
              name="paymentstype"
              value="Billable"
              checked={selectedPaymentType === "Billable"}
              onChange={(e: any) => setSelectedPaymentType(e.target.value)}
            />
            <label htmlFor="Billable">Billables</label>
            <input
              type="radio"
              id="receivable"
              name="paymentstype"
              value="Receivable"
              checked={selectedPaymentType === "Receivable"}
              onChange={(e: any) => setSelectedPaymentType(e.target.value)}
            />
            <label htmlFor="Receivable">Receivables</label>
          </fieldset>
        </div>
        <div className="pt_filteroptions">
          <FormikControl
            control={InputType.SEARCH}
            onChange={(value: any) => handleSearch(value)}
            placeholder="Search"
            clearSearch={emptySearchField}
          />

          <FormikControl
            placeholder={"Select a project"}
            name="Project"
            options={projectOptions}
            onChange={(selectedOption: any) => {
              if (selectedOption) {
                setSelectedProjectId(selectedOption);
                setSelectedProjectName(selectedOption);
              }
            }}
            control={InputType.SELECT}
            value={selectedProjectName}
            renderKey="label"
            valueKey="value"
          />

          {!overViewMode && (
            <FormikControl
              placeholder={"Select a contract"}
              name="Contract"
              options={contractOptions}
              onChange={(selectedOption: any) => {
                if (selectedOption) {
                  setSelectedContractId(selectedOption);
                }
              }}
              control={InputType.SELECT}
              value={selectedContractId}
              renderKey="label"
              valueKey="value"
            />
          )}

          {/* Multi-select Status filter. We hide "All" because deselecting
              everything is the multi-select equivalent. Persisted on every
              change to tablePreferences.payApps.filters.statuses. */}
          <SearchableSelect
            isMulti
            placeholder={"Status"}
            name="Status"
            options={(selectedPaymentType === "Billable"
              ? statusOptions
              : receivableOptions
            ).filter((o: any) => o.value !== "")}
            onChange={(vals: any) => {
              const next = Array.isArray(vals) ? vals : [];
              setSelectedStatuses(next);
              const fresh = (tablePrefRef.current || tablePref) as any;
              const currentFilters: Record<string, any> =
                fresh?.filters && typeof fresh.filters === "object"
                  ? { ...fresh.filters }
                  : {};
              currentFilters.statuses = next.map((s: any) => s.value);
              saveTablePrefs({ filters: currentFilters });
            }}
            multiSelectedData={selectedStatuses}
            renderKey="label"
            valueKey="value"
          />

          {/* Multi-select Client/Supplier filter. Options come from the
              same combinational-filters resolver as projects/contracts. */}
          <SearchableSelect
            isMulti
            placeholder={"Client / Supplier"}
            name="Client / Supplier"
            options={clientSupplierOptions}
            onChange={(vals: any) => {
              const next = Array.isArray(vals) ? vals : [];
              setSelectedClientSuppliers(next);
              const fresh = (tablePrefRef.current || tablePref) as any;
              const currentFilters: Record<string, any> =
                fresh?.filters && typeof fresh.filters === "object"
                  ? { ...fresh.filters }
                  : {};
              currentFilters.clientSupplierIds = next.map(
                (c: any) => c.value
              );
              saveTablePrefs({ filters: currentFilters });
            }}
            multiSelectedData={selectedClientSuppliers}
            renderKey="label"
            valueKey="value"
          />

          <FormikControl
            placeholder={"Activity Range"}
            name="Activity Range"
            options={filterByDuration}
            onChange={handleActivityChange}
            control={InputType.SELECT}
            value={singleActivyDate}
            renderKey="label"
            valueKey="value"
          />
        </div>
        {isCustomDate && (
          <div className="grid">
            <div>
              <FormikControl
                label="From date"
                name="activityLogStartDate"
                control={InputType.DATE_PICKER}
                type="date"
                // value={
                //   activityLogStartDate
                //     ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
                //     : ""
                // }
                value={
                  activityLogStartDate &&
                  isValid(new Date(activityLogStartDate))
                    ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
                    : ""
                }
                onChange={(selectedDate: any) => {
                  if (!selectedDate) {
                    setActivityLogStartDate(null);
                    return;
                  }

                  if (selectedDate > activityLogEndDate) {
                    setActivityLogStartDate(selectedDate);
                    setActivityLogEndDate(selectedDate);
                  } else {
                    setActivityLogStartDate(selectedDate);
                  }
                }}
                minDate="" // Set any minimum date if needed
                // maxDate={format(new Date(activityLogEndDate), "yyyy-MM-dd")}
                disabled={false}
              />
            </div>
            <div>
              <FormikControl
                label="To date"
                name="activityLogEndDate"
                type="date"
                control={InputType.DATE_PICKER}
                // value={
                //   activityLogEndDate
                //     ? format(new Date(activityLogEndDate), "yyyy-MM-dd")
                //     : ""
                // }

                value={
                  activityLogEndDate && isValid(new Date(activityLogEndDate))
                    ? format(new Date(activityLogEndDate), "yyyy-MM-dd")
                    : ""
                }
                onChange={(selectedDate: any) => {
                  if (!selectedDate) {
                    setActivityLogEndDate(null);
                    return;
                  }

                  // Ensure end date is not before start date
                  if (selectedDate >= activityLogStartDate) {
                    setActivityLogEndDate(selectedDate);
                  }
                }}
                minDate={
                  activityLogStartDate
                    ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
                    : ""
                }
                maxDate="" // Set any maximum date if needed
                disabled={false}
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid">
        <div className="pt_box">
          <div className="grid">
            <h4>{activeTab || "Current"}</h4>
          </div>

          <DynamicTable
            headers={effectiveHeaders}
            gridData={
              paymentclaimGridData.length > 0 ? paymentclaimGridData : []
            }
            gridActions={gridActions}
            dynamicApiGridIconsKey={"claim_list_buttons"}
            onRowClick={(data: any) => navigateToViewMode(data)}
            hoverOnRowClick
            showLoader={loading}
            loaderColSpan={10}
            renderRowList={effectiveRenderRowList}
            currentPage={currentPage}
            entriesPerPage={entriesPerPage}
            onEntriesPerPageChange={setEntriesPerPage}
            onPageChange={setCurrentPage}
            totalEntries={totalRows}
            onSortChange={(sortConfig) => {
              setSortValues(sortConfig);
            }}
          />
        </div>
      </div>
      {displayPaymentModel && (
        <dialog id="paytype" ref={dialogRef}>
          <article>
            <header>
              <button
                aria-label="Close"
                rel="prev"
                data-target="paytype"
                onClick={() => setDisplayPaymentModel(false)}
              ></button>
              <p>
                <strong>Select payment type</strong>
              </p>
            </header>
            {actionData?.beneficiary_type === "Self" ? (
              <div className="grid" style={{ columnGap: "var(--space-s)" }}>
                <Link
                  href={`${AppRoutes.USER_ADD_PAYMENT}?claim=${
                    actionData?.payment_claim_id
                  }&tab=${
                    selectedClaimType === toggleOptions[1]?.value
                      ? "retention-claim"
                      : ""
                  }&beneficiary=${actionData?.beneficiary_type || ""}`}
                  onClick={() => {
                    setCookie("PaymentType", "Full");
                    setCookie("from_page", AppRoutes.USER_PAY_APPS);
                  }}
                  className="pt_selectbox"
                >
                  <h4>Full payment</h4>
                  <p>Where you intend to pay the full claim in full.</p>
                </Link>
                <Link
                  href={`${AppRoutes.USER_ADD_PAYMENT}?claim=${
                    actionData?.payment_claim_id
                  }&tab=${
                    selectedClaimType === toggleOptions[1]?.value
                      ? "retention-claim"
                      : ""
                  }&beneficiary=${actionData?.beneficiary_type || ""}`}
                  onClick={() => {
                    setCookie("PaymentType", "Part");
                    setCookie("from_page", AppRoutes.USER_PAY_APPS);
                  }}
                  className="pt_selectbox"
                >
                  <h4>Part payment</h4>
                  <p>
                    Where you intend to pay the claim in full, but due to
                    available funds, will need to pay part now and part later.
                    You will be required to notify the QBCC where this is the
                    case.
                  </p>
                </Link>
              </div>
            ) : (
              <>
                <div className="grid" style={{ columnGap: "var(--space-s)" }}>
                  <Link
                    href={`${AppRoutes.USER_ADD_PAYMENT}?claim=${
                      actionData?.payment_claim_id
                    }&tab=${
                      selectedClaimType === toggleOptions[1]?.value
                        ? "retention-claim"
                        : ""
                    }&beneficiary=${actionData?.beneficiary_type || ""}`}
                    onClick={() => {
                      setCookie("PaymentType", "Full");
                      setCookie("from_page", AppRoutes.USER_PAY_APPS);
                    }}
                    className="pt_selectbox"
                  >
                    <h4>Full payment</h4>
                    <p>Where you intend to pay the full claim in full.</p>
                  </Link>
                  <Link
                    href={`${AppRoutes.USER_ADD_PAYMENT}?claim=${
                      actionData?.payment_claim_id
                    }&tab=${
                      selectedClaimType === toggleOptions[1]?.value
                        ? "retention-claim"
                        : ""
                    }&beneficiary=${actionData?.beneficiary_type || ""}`}
                    onClick={() => {
                      setCookie("PaymentType", "Part");
                      setCookie("from_page", AppRoutes.USER_PAY_APPS);
                    }}
                    className="pt_selectbox"
                  >
                    <h4>Part payment</h4>
                    <p>
                      Where you intend to pay the claim in full, but due to
                      available funds, will need to pay part now and part later.
                      You will be required to notify the QBCC where this is the
                      case.
                    </p>
                  </Link>
                  <Link
                    href={`${AppRoutes.USER_ADD_PAYMENT}?claim=${
                      actionData?.payment_claim_id
                    }&tab=${
                      selectedClaimType === toggleOptions[1]?.value
                        ? "retention-claim"
                        : ""
                    }&beneficiary=${actionData?.beneficiary_type || ""}`}
                    onClick={() => {
                      setCookie("PaymentType", "Pay Less - Full");
                      setCookie("from_page", AppRoutes.USER_PAY_APPS);
                    }}
                    className="pt_selectbox"
                  >
                    <h4>Pay Less - Full</h4>
                    <p>
                      Where you intend to pay less due to part completed work or
                      other reduced payment reason. You will be required to
                      confirm the reasons why and input the reduced payment
                      amount.
                    </p>
                  </Link>
                </div>
                <div className="grid" style={{ columnGap: "var(--space-s)" }}>
                  <Link
                    href={`${AppRoutes.USER_ADD_PAYMENT}?claim=${
                      actionData?.payment_claim_id
                    }&tab=${
                      selectedClaimType === toggleOptions[1]?.value
                        ? "retention-claim"
                        : ""
                    }&beneficiary=${actionData?.beneficiary_type || ""}`}
                    onClick={() => {
                      setCookie("PaymentType", "Pay Less - Part");
                      setCookie("from_page", AppRoutes.USER_PAY_APPS);
                    }}
                    className="pt_selectbox"
                  >
                    <h4>Pay Less - Part</h4>
                    <p>
                      Where you intend to pay less due to part completed work or
                      other reduced payment reason and due to available funds,
                      will need to pay part now and part later. You will be
                      required to notify the QBCC where this is the case.
                    </p>
                  </Link>
                  <Link
                    href={`${AppRoutes.USER_ADD_PAYMENT}?claim=${
                      actionData?.payment_claim_id
                    }&tab=${
                      selectedClaimType === toggleOptions[1]?.value
                        ? "retention-claim"
                        : ""
                    }&beneficiary=${actionData?.beneficiary_type || ""}`}
                    onClick={() => {
                      setCookie("PaymentType", "Pay - Zero");
                      setCookie("from_page", AppRoutes.USER_PAY_APPS);
                    }}
                    className="pt_selectbox"
                  >
                    <h4>Pay - Zero</h4>
                    <p>
                      Where you don’t intend to pay anything to settle the
                      claim. This may be due to a claim error. You will be
                      required to confirm to the sub-contractor the reason why.
                    </p>
                  </Link>
                  <Link
                    href={`${AppRoutes.USER_ADD_PAYMENT}?claim=${
                      actionData?.payment_claim_id
                    }&tab=${
                      selectedClaimType === toggleOptions[1]?.value
                        ? "retention-claim"
                        : ""
                    }&beneficiary=${actionData?.beneficiary_type || ""}`}
                    onClick={() => {
                      setCookie("PaymentType", "3rd Party");
                      setCookie("from_page", AppRoutes.USER_PAY_APPS);
                    }}
                    className="pt_selectbox"
                  >
                    <h4>3rd Party</h4>
                    <p>Where you intend to pay a third party.</p>
                  </Link>
                </div>
              </>
            )}
          </article>
        </dialog>
      )}
      {displayDeleteConfirmationModal && (
        <BaseModal
          modalId={"claims delete modal"}
          displayModal={displayDeleteConfirmationModal}
          onHeaderIconClose={() => setDisplayDeleteConfirmationModal(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setDisplayDeleteConfirmationModal(false)}
          onConfirm={() => {
            handleDeleteFunction();
            return true;
          }}
          firstButtonName="No"
          secondButtonName="Yes"
        >
          <h4 className="text_center">
            {
              "Are you sure you wish to move this claim to the archive list with status set to Deleted?"
            }
          </h4>
        </BaseModal>
      )}
    </div>
  );
}
