"use client";
import BreadCrumbs from "@/components/BreadCrumbs";
import { AppRoutes } from "@/shared/constant/appRoutes";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DynamicTable from "@/components/Table";
import TabSwitch from "@/components/TabSwitch";
import FormikControl from "@/components/FormikControl";
import { buttonType, InputType } from "@/shared/constant/general";
import CustomButton from "@/components/CustomButton/CustomButton";
import BaseModal from "@/components/BaseModal";
import {
  autoMappingBankAccounts,
  BatchCreateAccountsInPaytrade,
  CreateBankAccountsInPaytrade,
  CreateBankAccountsInXero,
  getMappedBankAccountsLists,
  GetPaytradeBankAccountsListsForCompany,
  GetUnmappedActiveXeroAccountsCount,
  getXeroBankAccountsListsForCompany,
  getXeroDetailsForCompany,
  manualMappingBankAccounts,
  syncAllBankAccountsByCompanyId,
  unMappingBankAccounts,
} from "../../integration.functions";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  bankAccountsTabOptions,
  mappedBankAccountsHeaders,
  mappedBankAccountsRenderData,
  paytradeBankAccountsHeaders,
  paytradeBankAccountsRenderData,
  statusOptions,
  xeroBankAccountsHeaders,
  xeroBankAccountsRenderData,
} from "../../integration.constant";
import GridExportActions from "@/components/GridExportActions";
import { useSearchParams } from "next/navigation";

interface TableConfig {
  headers: any[];
  gridActions: any[];
  renderRowList: any[];
}

export default function XeroBankAccount() {
  const router = useRouter();
  const queryParams = useSearchParams();
  const to = queryParams.get("navigateTo") || 0;
  const [tabStatus, setTabStatus] = useState(
    bankAccountsTabOptions[+to]?.label
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [emptySearchField, setEmptySearchField] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [tableLoader, setTableLoader] = useState(false);

  const [headers, setHeaders] = useState([]);
  const [gridData, setGridData] = useState([]);
  const [gridActions, setGridActions] = useState([]);
  const [renderRowList, setRenderRowList] = useState([]);
  const [status, setStatus] = useState("");
  const [xeroData, setXeroData] = useState<any>("");

  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [sortValues, setSortValues] = useState<any>("");
  const [modelConfig, setModelConfig] = useState<any>({
    show: false,
    title: "",
    secondButtonName: "",
    firstButtonName: "",
    description: "",
    id: "",
  });

  const [showTable, setShowTable] = useState(true);
  const [showManualMapping, setShowManualMapping] = useState(false);
  const [manualMapData, setManualMapData] = useState<any>("");
  const [manualMapOptions, setManualMapOptions] = useState([]);

  // Task #122 — track count of unmapped active Xero bank accounts so we
  // can show the count in the "Create All in PayTrade" confirmation and
  // disable the button when there's nothing to import.
  const [unmappedXeroAccountsCount, setUnmappedXeroAccountsCount] =
    useState<number>(0);

  // Task #123 — Bulk dialog now lets the user pick a default account
  // type (and override individual rows) before confirming. We open a
  // dedicated modal (separate from the generic confirmation modal) so
  // the picker UI has room to breathe and we can fetch the per-row
  // list lazily.
  const ACCOUNT_TYPE_OPTIONS = [
    { label: "Cash Account", value: "Cash Account" },
    { label: "Project Trust Account", value: "Project Trust Account" },
    { label: "Retention Trust Account", value: "Retention Trust Account" },
  ];
  const [showBatchCreateModal, setShowBatchCreateModal] = useState(false);
  const [batchDefaultAccountType, setBatchDefaultAccountType] =
    useState<string>("Cash Account");
  const [batchRowOverrides, setBatchRowOverrides] = useState<
    Record<string, string>
  >({});
  const [batchUnmappedAccounts, setBatchUnmappedAccounts] = useState<any[]>([]);
  const [batchUnmappedLoading, setBatchUnmappedLoading] = useState(false);
  const [showPerRowOverrides, setShowPerRowOverrides] = useState(false);

  const paytradeBankAccountsActions = [
    {
      label: "Manual map",
      icon: "fa-light fa-link",
      onClick: (row: any) => handleOptionClick(row, "Manual Map"),
      conditionalApiDisplayKey: "manual",
    },
    {
      label: "Create in Xero",
      icon: "fa-light fa-plus-circle",
      onClick: (row: any) => handleOptionClick(row, "Create in Xero"),
      conditionalApiDisplayKey: "createIcon",
    },
  ];
  const xeroBankAccountsActions = [
    {
      label: "Manual map",
      icon: "fa-light fa-link",
      onClick: (row: any) => handleOptionClick(row, "Manual Map"),
      conditionalApiDisplayKey: "manual",
    },
    {
      label: "Create in PayTrade",
      icon: "fa-light fa-plus-circle",
      onClick: (row: any) => handleOptionClick(row, "Create in PayTrade"),
      conditionalApiDisplayKey: "createIcon",
    },
  ];
  const mappedBankAccountsActions = [
    {
      label: "Unmap",
      icon: "fa-light fa-unlink",
      onClick: (row: any) => {
        setSelectedContact(row);
        setModelConfig({
          show: true,
          title: "Unmap",
          secondButtonName: "Unmap",
          firstButtonName: "Cancel",
          id: "Unmap_from?",
          description: (
            <>
              <b>{row?.pt_account_name}</b> from <b>{row?.account_name}</b>?
            </>
          ),
        });
      },
      displayByDefault: true,
    },
  ];

  const getTableConfig = (): TableConfig => {
    switch (tabStatus) {
      case "Paytrade bank accounts":
        return {
          headers: paytradeBankAccountsHeaders,
          gridActions: paytradeBankAccountsActions,
          renderRowList: paytradeBankAccountsRenderData,
        };
      case "Xero bank accounts":
        return {
          headers: xeroBankAccountsHeaders,
          gridActions: xeroBankAccountsActions,
          renderRowList: xeroBankAccountsRenderData,
        };
      case "Mapped bank accounts":
        return {
          headers: mappedBankAccountsHeaders,
          gridActions: mappedBankAccountsActions,
          renderRowList: mappedBankAccountsRenderData,
        };
      default:
        return {
          headers: [],
          gridActions: [],
          renderRowList: [],
        };
    }
  };

  function handleTabChange(value: string) {
    if (value != tabStatus) {
      setShowTable(false);
      setCurrentPage(1);
      setEntriesPerPage(10);
      setSearch("");
      setSortValues("");
      setStatus("");
      setTabStatus(value);
    }
  }

  useEffect(() => {
    const { headers, gridActions, renderRowList } = getTableConfig();
    setHeaders(headers as never[]);
    setGridActions(gridActions as never[]);
    setRenderRowList(renderRowList as never[]);
    setShowTable(true);
  }, [tabStatus]);

  useEffect(() => {
    fetchGetXeroDetailsForCompany();
    refreshUnmappedXeroAccountsCount();
  }, []);

  // Task #122 — Keep the bulk-button count fresh whenever the Xero tab
  // table reloads (after sync, manual map, per-row create, etc.).
  useEffect(() => {
    if (tabStatus === "Xero bank accounts") {
      refreshUnmappedXeroAccountsCount();
    }
  }, [tabStatus, gridData]);

  const fetchGetXeroDetailsForCompany = () => {
    setTableLoader(true);
    getXeroDetailsForCompany().then((data) => {
      setXeroData(data);
      setTableLoader(false);
    });
  };

  const fetchXeroBankAccounts = async (
    currentPage: number,
    entriesPerPage: number,
    search: string,
    setTableLoader: (loading: boolean) => void
  ) => {
    const data = await getXeroBankAccountsListsForCompany(
      {
        payload: {
          company_id: +(localStorage.getItem("companyId") || 0),
          page_number: currentPage,
          page_size: entriesPerPage,
          search: search || "",
          sorting_field: sortValues?.sortKey || "",
          sorting_order: sortValues?.direction || "",
          mapped_status: status,
        },
      },
      setTableLoader
    );
    return {
      contacts:
        data?.account_list.map((val: any) => {
          const isUnmapped = val.mapped_status?.toLocaleLowerCase() !== "mapped";
          return {
            ...val,
            dynamicIcon: {
              syncIcon: isUnmapped && val.account_status?.toLocaleLowerCase() !== "draft",
              manual: isUnmapped,
              createIcon: isUnmapped,
            },
          };
        }) || [],
      totalCount: data?.total_count || 0,
    };
  };

  const fetchPaytradeBankAccounts = async (
    currentPage: number,
    entriesPerPage: number,
    search: string,
    sortValues: any,
    setTableLoader: (loading: boolean) => void
  ) => {
    const data = await GetPaytradeBankAccountsListsForCompany(
      {
        payload: {
          company_id: +(localStorage.getItem("companyId") || 0),
          page_number: currentPage,
          page_size: entriesPerPage,
          search: search,
          sorting_field: sortValues?.sortKey || "",
          sorting_order: sortValues?.direction || "",
          mapped_status: status,
        },
      },
      setTableLoader
    );
    return {
      contacts:
        data?.account_list.map((val: any) => {
          const isUnmapped = val.mapped_status?.toLocaleLowerCase() !== "mapped";
          const isNotDraft = val.account_status?.toLocaleLowerCase() !== "draft";
          return {
            ...val,
            dynamicIcon: {
              syncIcon: isUnmapped && isNotDraft,
              manual: isUnmapped,
              createIcon: isUnmapped && isNotDraft,
            },
          };
        }) || [],
      totalCount: data?.total_count || 0,
    };
  };

  const fetchMappedBankAccounts = async (
    currentPage: number,
    entriesPerPage: number,
    search: string,
    setTableLoader: (loading: boolean) => void
  ) => {
    const data = await getMappedBankAccountsLists(
      {
        payload: {
          company_id: +(localStorage.getItem("companyId") || 0),
          page_number: currentPage,
          page_size: entriesPerPage,
          search: search,
          sorting_field: sortValues?.sortKey || "",
          sorting_order: sortValues?.direction || "",
        },
      },
      setTableLoader
    );
    return {
      contacts: data?.account_list || [],
      totalCount: data?.total_count || 0,
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      setTableLoader(true);
      // Task #115 — defensive guard. The list helpers return `null` on
      // GraphQL errors, which used to crash the Pending Bank Account
      // Mapping tab via `const { contacts, totalCount } = null`.
      try {
        let result: any = null;
        if (tabStatus === "Xero bank accounts") {
          result = await fetchXeroBankAccounts(
            currentPage,
            entriesPerPage,
            search,
            setTableLoader
          );
        } else if (tabStatus === "Paytrade bank accounts") {
          result = await fetchPaytradeBankAccounts(
            currentPage,
            entriesPerPage,
            search,
            sortValues,
            setTableLoader
          );
        } else if (tabStatus === "Mapped bank accounts") {
          result = await fetchMappedBankAccounts(
            currentPage,
            entriesPerPage,
            search,
            setTableLoader
          );
        }
        setGridData(result?.contacts || []);
        setTotalRows(result?.totalCount || 0);
      } catch (err) {
        console.error("[XeroBankAccount] fetchData failed", err);
        setGridData([]);
        setTotalRows(0);
      } finally {
        setTableLoader(false);
      }
    };
    fetchData();
  }, [tabStatus, currentPage, entriesPerPage, search, sortValues, status]);
  const handleOptionClick = async (row: any, label: string) => {
    if (tabStatus === "Xero bank accounts" && label == "Manual Map") {
      getOptionForManualBankAccountsMappingForXero();
      setSelectedContact(row);
      setShowManualMapping(true);
    } else if (
      tabStatus === "Paytrade bank accounts" &&
      label == "Manual Map"
    ) {
      getOptionForManualBankAccountsMappingForPaytrade();
      setSelectedContact(row);
      setShowManualMapping(true);
    } else if (
      tabStatus === "Paytrade bank accounts" &&
      label === "Create in Xero"
    ) {
      setSelectedContact(row);
      setModelConfig({
        show: true,
        title: "Create in Xero",
        secondButtonName: "Create",
        firstButtonName: "Cancel",
        description: (
          <>
            Create <b>{row?.account_name}</b> in Xero?
          </>
        ),
        id: "Create_in_xero?",
      });
    } else if (
      tabStatus === "Xero bank accounts" &&
      label === "Create in PayTrade"
    ) {
      setSelectedContact(row);
      setModelConfig({
        show: true,
        title: "Create in PayTrade",
        secondButtonName: "Create",
        firstButtonName: "Cancel",
        description: (
          <>
            Create <b>{row?.account_name}</b> in PayTrade?
          </>
        ),
        id: "Create_in_paytrade?",
      });
    }
  };

  const syncXeroBankAccounts = async () => {
    setTableLoader(true);
    await syncAllBankAccountsByCompanyId(
      {
        companyId: +(localStorage.getItem("companyId") || 0),
      },
      setTableLoader
    );
    const { contacts, totalCount } = await fetchXeroBankAccounts(
      currentPage,
      entriesPerPage,
      search,
      setTableLoader
    );
    setGridData(contacts);
    setTotalRows(totalCount);
  };

  const handleAutoMappingBankAccounts = async () => {
    await autoMappingBankAccounts(
      {
        companyId: +(localStorage.getItem("companyId") || 0),
      },
      setTableLoader
    );
    const { contacts, totalCount } = await fetchMappedBankAccounts(
      currentPage,
      entriesPerPage,
      search,
      setTableLoader
    );
    setGridData(contacts);
    setTotalRows(totalCount);
  };

  const handleCreateInXero = async () => {
    setTableLoader(true);
    await CreateBankAccountsInXero({ bankAccountId: +selectedContact?.account_id });
    const { contacts, totalCount } = await fetchPaytradeBankAccounts(
      currentPage,
      entriesPerPage,
      search,
      sortValues,
      setTableLoader
    );
    setGridData(contacts);
    setTotalRows(totalCount);
  };

  const handleCreateInPaytrade = async () => {
    setTableLoader(true);
    await CreateBankAccountsInPaytrade({
      companyId: +(localStorage.getItem("companyId") || 0),
      accountId: selectedContact?.account_id,
    });
    const { contacts, totalCount } = await fetchXeroBankAccounts(
      currentPage,
      entriesPerPage,
      search,
      setTableLoader
    );
    setGridData(contacts);
    setTotalRows(totalCount);
  };

  // Task #122 — Bulk-create every unmapped active Xero bank account in
  // PayTrade in one click, then refresh the table so newly-mapped rows
  // flip to "Mapped". Surfaces a per-row error breakdown modal when
  // the batch reports skipped/failed accounts.
  const handleBatchCreateInPaytrade = async () => {
    // Task #123 — Build override list from row-level picks. Skip rows
    // that already match the default so we send the smallest possible
    // payload.
    const overrides = Object.entries(batchRowOverrides)
      .filter(([, type]) => type && type !== batchDefaultAccountType)
      .map(([account_id, account_type]) => ({ account_id, account_type }));

    setShowBatchCreateModal(false);
    setTableLoader(true);
    const batchResult = await BatchCreateAccountsInPaytrade({
      companyId: +(localStorage.getItem("companyId") || 0),
      defaultAccountType: batchDefaultAccountType,
      accountTypeOverrides: overrides.length > 0 ? overrides : null,
    });
    const { contacts, totalCount } = await fetchXeroBankAccounts(
      currentPage,
      entriesPerPage,
      search,
      setTableLoader
    );
    setGridData(contacts);
    setTotalRows(totalCount);
    refreshUnmappedXeroAccountsCount();

    if (batchResult?.errors && batchResult.errors.length > 0) {
      setBatchErrors(batchResult.errors);
    }
  };

  // Task #123 — Open the bulk dialog: reset picker state and lazily
  // fetch the unmapped Xero accounts list so the per-row override
  // section can render without an extra round-trip when expanded.
  const openBatchCreateModal = async () => {
    setBatchDefaultAccountType("Cash Account");
    setBatchRowOverrides({});
    setShowPerRowOverrides(false);
    setShowBatchCreateModal(true);
    setBatchUnmappedLoading(true);
    try {
      const data = await getXeroBankAccountsListsForCompany(
        {
          payload: {
            company_id: +(localStorage.getItem("companyId") || 0),
            page_number: 1,
            page_size: 500,
            search: "",
            sorting_field: "",
            sorting_order: "",
            mapped_status: "Unmapped",
          },
        },
        () => {}
      );
      const list = (data?.account_list || []).filter(
        (a: any) =>
          (a.account_status || "").toString().toLowerCase() === "active"
      );
      setBatchUnmappedAccounts(list);
    } catch (err) {
      console.error("[XeroBankAccount] failed to load unmapped accounts", err);
      setBatchUnmappedAccounts([]);
    } finally {
      setBatchUnmappedLoading(false);
    }
  };

  // Task #122 — Per-row error breakdown shown in a follow-up modal
  // after the batch completes (so users can see *which* accounts
  // failed and why, not just an aggregate count).
  const [batchErrors, setBatchErrors] = useState<
    { account_id?: string; account_name?: string; reason: string }[]
  >([]);

  // Task #122 — Fetch how many active Xero bank accounts are still
  // unmapped so the bulk button can show a count and disable when
  // zero. Uses the dedicated backend count endpoint that mirrors the
  // batch eligibility filter (active + unmapped) exactly.
  const refreshUnmappedXeroAccountsCount = async () => {
    const count = await GetUnmappedActiveXeroAccountsCount({
      companyId: +(localStorage.getItem("companyId") || 0),
    });
    setUnmappedXeroAccountsCount(count);
  };

  const modelClose = () => {
    if (modelConfig.id === "Sync_xero_bankAccounts?") {
      syncXeroBankAccounts();
    } else if (modelConfig.id === "Map_bankAccounts?") {
      handleAutoMappingBankAccounts();
    } else if (modelConfig.id === "Unmap_from?") {
      handleUnmapBankAccounts();
    } else if (modelConfig.id === "Create_in_xero?") {
      handleCreateInXero();
    } else if (modelConfig.id === "Create_in_paytrade?") {
      handleCreateInPaytrade();
    }
  };

  const handleUnmapBankAccounts = async () => {
    await unMappingBankAccounts(
      {
        accountId: selectedContact?.account_id,
      },
      setTableLoader
    );
    setTableLoader(true);
    const { contacts, totalCount } = await fetchMappedBankAccounts(
      currentPage,
      entriesPerPage,
      search,
      setTableLoader
    );
    setGridData(contacts);
    setTotalRows(totalCount);
  };

  const getOptionForManualBankAccountsMappingForXero = async () => {
    const data = await GetPaytradeBankAccountsListsForCompany(
      {
        payload: {
          company_id: +(localStorage.getItem("companyId") || 0),
        },
      },
      setTableLoader
    );
    setManualMapOptions(data?.account_list);
  };

  const getOptionForManualBankAccountsMappingForPaytrade = async () => {
    const data = await getXeroBankAccountsListsForCompany(
      {
        payload: {
          company_id: +(localStorage.getItem("companyId") || 0),
          page_number: currentPage,
          page_size: entriesPerPage,
          search: search || "",
          sorting_field: sortValues?.sortKey || "",
          sorting_order: sortValues?.direction || "",
          mapped_status: status,
        },
      },
      setTableLoader
    );
    setManualMapOptions(data?.account_list);
  };

  const handleManualMappingBankAccounts = async () => {
    // Task #115 — guard against missing selection so the modal shows a
    // friendly toast instead of firing an invalid GraphQL mutation.
    if (!manualMapData?.account_id || !selectedContact?.account_id) {
      const { showErrorToast } = await import("@/components/Toaster");
      showErrorToast(
        "Please select a bank account to map before confirming."
      );
      return;
    }
    const mapResult = await manualMappingBankAccounts(
      tabStatus === "Paytrade bank accounts"
        ? {
            payload: {
              account_id: manualMapData?.account_id,
              pt_bank_account_id: +selectedContact?.account_id,
            },
          }
        : {
            payload: {
              account_id: selectedContact?.account_id,
              pt_bank_account_id: +manualMapData?.account_id,
            },
          }
    );
    // Task #115 — if the mutation failed `manualMappingBankAccounts`
    // already surfaced a toast. Keep the modal open so the user can
    // pick a different account or close manually, and skip the
    // refetch (which would otherwise destructure a null and crash).
    if (!mapResult) {
      return;
    }
    setShowManualMapping(false);
    try {
      if (tabStatus === "Xero bank accounts") {
        const result = await fetchXeroBankAccounts(
          currentPage,
          entriesPerPage,
          search,
          setTableLoader
        );
        setGridData(result?.contacts || []);
        setTotalRows(result?.totalCount || 0);
      } else if (tabStatus === "Paytrade bank accounts") {
        const result = await fetchPaytradeBankAccounts(
          currentPage,
          entriesPerPage,
          search,
          sortValues,
          setTableLoader
        );
        setGridData(result?.contacts || []);
        setTotalRows(result?.totalCount || 0);
      }
    } catch (err) {
      console.error("[XeroBankAccount] post-map refetch failed", err);
    }
    setManualMapData("");
  };
  const checkActionCondition = () => {
    const isConnected = xeroData?.status === "ACTIVE";
    const actionMapping: any = {
      "Mapped bank accounts": mappedBankAccountsActions,
      "Xero bank accounts": isConnected
        ? xeroBankAccountsActions
        : xeroBankAccountsActions.slice(0, 1),
      "Paytrade bank accounts": isConnected
        ? paytradeBankAccountsActions
        : paytradeBankAccountsActions.slice(0, 1),
    };
    return actionMapping[tabStatus] || [];
  };

  const gridActionsCondition = useMemo(checkActionCondition, [
    tabStatus,
    xeroData,
  ]);

  return (
    <div className="container-fluid">
      <div className="pt_title">
        <div className="pt_breadcrumbs">
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
            activeRoute={"Bank accounts"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Bank accounts</h1>
            <p>Manage your paytrade and xero bank accounts</p>
          </div>
        </div>
      </div>

      <div className="pt_filtergroup">
        <div className="grid pt_topfilters">
          <div className="pt_filters ">
            <TabSwitch
              tabOptions={bankAccountsTabOptions}
              tabValue={tabStatus}
              onChange={(value: any) => handleTabChange(value)}
            />
          </div>
          <div className="pt_pageactions">
            <div className="actionbuttons">
              <GridExportActions
                resetFilterFunction={() => {
                  setStatus("");
                  setSearch("");
                }}
                hideExcelButton={true}
                hidePdfButton={true}
                hideResetButton={
                  status.length == 0 && search.length == 0 ? true : false
                }
              />
            </div>
          </div>
        </div>
        {showTable && (
          <>
            <div
              className="pt_filteroptions"
              style={{
                width: tabStatus === "Mapped bank accounts" ? "25%" : "50%",
              }}
            >
              <FormikControl
                placeholder={"Search by bank account name"}
                control={InputType.SEARCH}
                onChange={(value: any) => {
                  if (currentPage !== 1) setCurrentPage(1);
                  setSearch(value);
                }}
                name={search}
                value={search}
                clearSearch={emptySearchField}
              />
              {(tabStatus === "Xero bank accounts" ||
                tabStatus === "Paytrade bank accounts") && (
                <FormikControl
                  placeholder={"Select status"}
                  control={InputType.SELECT}
                  onChange={(value: any) => {
                    if (currentPage !== 1) setCurrentPage(1);
                    setStatus(value);
                  }}
                  options={statusOptions}
                  name={status}
                  value={status}
                  renderKey={"label"}
                  valueKey={"value"}
                />
              )}
            </div>
          </>
        )}
      </div>

      <div className="grid">
        <div className="pt_box">
          {tabStatus === "Mapped bank accounts" && (
            <CustomButton
              buttonName="AUTO MAP"
              iconClassName="fa-light fa-link"
              buttonType={buttonType.CONTRAST_SMALL}
              actionType="button"
              onClick={() =>
                setModelConfig({
                  show: true,
                  title: "",
                  secondButtonName: "Map",
                  firstButtonName: "Cancel",
                  description: "Map bank accounts?",
                  id: "Map_bankAccounts?",
                })
              }
              styles={{ margin: "0 10px 10px 10px" }}
            />
          )}
          {tabStatus === "Xero bank accounts" && (
            <>
              <CustomButton
                buttonName="SYNC"
                iconClassName="fa-light fa-sync"
                buttonType={buttonType.CONTRAST_SMALL}
                actionType="button"
                onClick={() =>
                  setModelConfig({
                    show: true,
                    title: "",
                    secondButtonName: "Sync",
                    firstButtonName: "Cancel",
                    description: "Sync xero bank accounts?",
                    id: "Sync_xero_bankAccounts?",
                  })
                }
                styles={{ margin: "0 10px 10px 10px" }}
              />
              {xeroData?.status === "ACTIVE" && (
                <span
                  title={
                    unmappedXeroAccountsCount === 0
                      ? "No unmapped active Xero bank accounts to import."
                      : ""
                  }
                >
                  <CustomButton
                    buttonName="CREATE ALL IN PAYTRADE"
                    iconClassName="fa-light fa-plus-circle"
                    buttonType={buttonType.CONTRAST_SMALL}
                    actionType="button"
                    disabled={unmappedXeroAccountsCount === 0}
                    onClick={openBatchCreateModal}
                    styles={{ margin: "0 10px 10px 10px" }}
                  />
                </span>
              )}
              {/* <CustomButton
                buttonName="RESET"
                iconClassName="fa-light fa-undo"
                buttonType={buttonType.SMALL_BUTTON}
                actionType="button"
                onClick={() => setShowResetModal(true)}
                styles={{ margin: "0 10px 10px 10px" }}
              /> */}
            </>
          )}
          {showTable && (
            <DynamicTable
              headers={
                gridActionsCondition.length > 1
                  ? headers
                  : headers.map((header: any, index: any) =>
                      index === 2 ? { ...header, title: "Action" } : header
                    )
              }
              gridData={gridData}
              gridActions={gridActionsCondition}
              dynamicApiGridIconsKey={"dynamicIcon"}
              showLoader={tableLoader}
              loaderColSpan={headers.length}
              renderRowList={renderRowList}
              currentPage={currentPage}
              entriesPerPage={entriesPerPage}
              onEntriesPerPageChange={(perPage) => {
                setCurrentPage(1);
                setEntriesPerPage(perPage);
              }}
              onPageChange={setCurrentPage}
              totalEntries={totalRows}
              onSortChange={(sortConfig) => {
                if (gridData?.length > 0) {
                  setSortValues(sortConfig);
                }
              }}
            />
          )}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}>
        <CustomButton
          styles={{ height: "40px" }}
          buttonName="Close"
          iconClassName="fa-light fa-close"
          buttonType={buttonType.CONTRAST_SMALL}
          actionType="button"
          onClick={() => {
            router.push("/user/integrations/xero");
          }}
        />
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
      {showBatchCreateModal && (
        <BaseModal
          modalId="batchCreateAccountsConfig"
          displayModal={showBatchCreateModal}
          onClose={() => setShowBatchCreateModal(false)}
          secondButtonName="Create All"
          firstButtonName="Cancel"
          onConfirm={() => {
            handleBatchCreateInPaytrade();
            return true;
          }}
          title="Create All in PayTrade"
        >
          <div style={{ padding: "0 4px" }}>
            <p>
              Create <b>{unmappedXeroAccountsCount}</b> unmapped Xero bank
              account{unmappedXeroAccountsCount === 1 ? "" : "s"} in PayTrade.
            </p>
            <br />
            <label
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: "6px",
              }}
            >
              Default account type
            </label>
            <select
              value={batchDefaultAccountType}
              onChange={(e) => setBatchDefaultAccountType(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid #ccc",
                borderRadius: 4,
              }}
            >
              {ACCOUNT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p style={{ fontSize: "0.85em", color: "#666", marginTop: 6 }}>
              Trust account types need extra fields (trustee, projects,
              contract dates) which can&apos;t be set in this dialog. Rows
              picked as a trust type will be skipped with a per-row reason so
              you can finish the setup in PayTrade&apos;s bank account form.
            </p>

            <div style={{ marginTop: 14 }}>
              <button
                type="button"
                onClick={() => setShowPerRowOverrides((v) => !v)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#0066cc",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: "0.95em",
                }}
              >
                <i
                  className={`fa-light ${
                    showPerRowOverrides ? "fa-chevron-down" : "fa-chevron-right"
                  }`}
                  style={{ marginRight: 6 }}
                />
                Customize per account
                {batchUnmappedAccounts.length > 0
                  ? ` (${batchUnmappedAccounts.length})`
                  : ""}
              </button>
              {/* Task #123 — The override list is capped at 500 rows
                  to keep the dialog responsive. Anything beyond that
                  still gets created with the default account type;
                  users can re-classify the overflow rows in PayTrade
                  afterwards. */}
              {unmappedXeroAccountsCount > batchUnmappedAccounts.length &&
                !batchUnmappedLoading && (
                  <p
                    style={{
                      fontSize: "0.85em",
                      color: "#a15c00",
                      marginTop: 6,
                    }}
                  >
                    Showing the first {batchUnmappedAccounts.length} of{" "}
                    {unmappedXeroAccountsCount} unmapped accounts for per-row
                    overrides. The remaining accounts will be created with the
                    selected default account type and can be re-classified
                    afterwards in PayTrade.
                  </p>
                )}
            </div>

            {showPerRowOverrides && (
              <div
                style={{
                  marginTop: 10,
                  maxHeight: 280,
                  overflowY: "auto",
                  border: "1px solid #eee",
                  borderRadius: 4,
                }}
              >
                {batchUnmappedLoading ? (
                  <div style={{ padding: 12, textAlign: "center" }}>
                    Loading accounts...
                  </div>
                ) : batchUnmappedAccounts.length === 0 ? (
                  <div style={{ padding: 12, textAlign: "center" }}>
                    No unmapped accounts to display.
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "6px 8px",
                            borderBottom: "1px solid #ddd",
                            background: "#fafafa",
                          }}
                        >
                          Xero account
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "6px 8px",
                            borderBottom: "1px solid #ddd",
                            background: "#fafafa",
                          }}
                        >
                          Account type
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchUnmappedAccounts.map((row: any) => {
                        const id = row.account_id;
                        const value =
                          batchRowOverrides[id] || batchDefaultAccountType;
                        return (
                          <tr key={id}>
                            <td
                              style={{
                                padding: "6px 8px",
                                borderBottom: "1px solid #eee",
                                verticalAlign: "top",
                              }}
                            >
                              {row.account_name || id}
                            </td>
                            <td
                              style={{
                                padding: "6px 8px",
                                borderBottom: "1px solid #eee",
                              }}
                            >
                              <select
                                value={value}
                                onChange={(e) =>
                                  setBatchRowOverrides((prev) => ({
                                    ...prev,
                                    [id]: e.target.value,
                                  }))
                                }
                                style={{
                                  width: "100%",
                                  padding: "4px 6px",
                                  border: "1px solid #ccc",
                                  borderRadius: 4,
                                }}
                              >
                                {ACCOUNT_TYPE_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </BaseModal>
      )}
      {batchErrors.length > 0 && (
        <BaseModal
          modalId="batchCreateAccountsErrors"
          displayModal={batchErrors.length > 0}
          onClose={() => setBatchErrors([])}
          secondButtonName="Close"
          firstButtonName=""
          onConfirm={() => {
            setBatchErrors([]);
            return true;
          }}
          title="Some Xero bank accounts were not created"
        >
          <p className="text_center">
            The following Xero bank account
            {batchErrors.length === 1 ? " was" : "s were"} skipped or failed.
            You can fix the issue in Xero (or in PayTrade) and re-run
            <b> CREATE ALL IN PAYTRADE</b>.
          </p>
          <br />
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "6px 8px",
                      borderBottom: "1px solid #ddd",
                    }}
                  >
                    Account
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "6px 8px",
                      borderBottom: "1px solid #ddd",
                    }}
                  >
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody>
                {batchErrors.map((e, i) => (
                  <tr key={`${e.account_id || i}`}>
                    <td
                      style={{
                        padding: "6px 8px",
                        borderBottom: "1px solid #eee",
                        verticalAlign: "top",
                      }}
                    >
                      {e.account_name || e.account_id || "(unknown)"}
                    </td>
                    <td
                      style={{
                        padding: "6px 8px",
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      {e.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            handleManualMappingBankAccounts();
            return true;
          }}
          title="Account mapping"
        >
          <br />
          <p className="text_center">
            Map <b>{selectedContact?.account_name}</b> to:{" "}
          </p>
          <br />
          <SearchableSelect
            placeholder={
              tabStatus === "Xero bank accounts"
                ? "Select account from paytrade bank accounts"
                : "Select account from xero bank accounts"
            }
            label=""
            name={"contact"}
            renderKey="account_name"
            options={manualMapOptions}
            valueKey="account_id"
            isInPopup={true}
            onChange={(selectedOption: any) => {
              setManualMapData(selectedOption);
            }}
            selectedData={manualMapData}
          />
        </BaseModal>
      )}
    </div>
  );
}
