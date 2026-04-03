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
  CreateBankAccountsInPaytrade,
  CreateBankAccountsInXero,
  getMappedBankAccountsLists,
  GetPaytradeBankAccountsListsForCompany,
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
  }, []);

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
      if (tabStatus === "Xero bank accounts") {
        const { contacts, totalCount } = await fetchXeroBankAccounts(
          currentPage,
          entriesPerPage,
          search,
          setTableLoader
        );
        setGridData(contacts);
        setTotalRows(totalCount);
      } else if (tabStatus === "Paytrade bank accounts") {
        const { contacts, totalCount } = await fetchPaytradeBankAccounts(
          currentPage,
          entriesPerPage,
          search,
          sortValues,
          setTableLoader
        );
        setGridData(contacts);
        setTotalRows(totalCount);
      } else if (tabStatus === "Mapped bank accounts") {
        const { contacts, totalCount } = await fetchMappedBankAccounts(
          currentPage,
          entriesPerPage,
          search,
          setTableLoader
        );
        setGridData(contacts);
        setTotalRows(totalCount);
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
    await manualMappingBankAccounts(
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
    if (tabStatus === "Xero bank accounts") {
      const { contacts, totalCount } = await fetchXeroBankAccounts(
        currentPage,
        entriesPerPage,
        search,
        setTableLoader
      );
      setGridData(contacts);
      setTotalRows(totalCount);
    } else if (tabStatus === "Paytrade bank accounts") {
      const { contacts, totalCount } = await fetchPaytradeBankAccounts(
        currentPage,
        entriesPerPage,
        search,
        sortValues,
        setTableLoader
      );
      setGridData(contacts);
      setTotalRows(totalCount);
    }
    setManualMapData("");
  };
  const checkActionCondition = () => {
    const inactiveStatuses = ["Inactive", "Deleted - archived", "Disconnected", "Connected - paused"];
    const isConnected = xeroData?.integration_status && !inactiveStatuses.includes(xeroData.integration_status);
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

      <div className="pt_filtergroup">
        <div className="grid pt_topfilters">
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
