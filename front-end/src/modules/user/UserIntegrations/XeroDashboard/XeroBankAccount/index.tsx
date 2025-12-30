"use client";
import BreadCrumbs from "@/components/BreadCrumbs";
import { AppRoutes } from "@/shared/constant/appRoutes";
import React, { useEffect, useMemo, useState } from "react";
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
      label: "Sync to xero",
      icon: "fa-light fa-angle-double-right",
      onClick: (row: any) => handleOptionClick(row, "Sync to xero"),
      conditionalApiDisplayKey: "syncIcon",
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
      label: "Sync to paytrade",
      icon: "fa-light fa-angle-double-left",
      onClick: (row: any) => handleOptionClick(row, "Sync to paytrade"),
      conditionalApiDisplayKey: "syncIcon",
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
          return {
            ...val,
            dynamicIcon: {
              syncIcon:
                val.mapped_status?.toLocaleLowerCase() == "mapped"
                  ? false
                  : val.account_status?.toLocaleLowerCase() !== "draft",
              manual: val.mapped_status?.toLocaleLowerCase() !== "mapped",
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
          return {
            ...val,
            dynamicIcon: {
              syncIcon:
                val.mapped_status?.toLocaleLowerCase() == "mapped"
                  ? false
                  : val.account_status?.toLocaleLowerCase() !== "draft",
              manual: val.mapped_status?.toLocaleLowerCase() !== "mapped",
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
      label === "Sync to xero"
    ) {
      setTableLoader(true);
      await CreateBankAccountsInXero({ bankAccountId: +row?.account_id });
      const { contacts, totalCount } = await fetchPaytradeBankAccounts(
        currentPage,
        entriesPerPage,
        search,
        sortValues,
        setTableLoader
      );
      setGridData(contacts);
      setTotalRows(totalCount);
    } else if (
      tabStatus === "Xero bank accounts" &&
      label === "Sync to paytrade"
    ) {
      setTableLoader(true);
      await CreateBankAccountsInPaytrade({
        companyId: +(localStorage.getItem("companyId") || 0),
        accountId: row?.account_id,
      });
      const { contacts, totalCount } = await fetchXeroBankAccounts(
        currentPage,
        entriesPerPage,
        search,
        setTableLoader
      );
      setGridData(contacts);
      setTotalRows(totalCount);
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

  const modelClose = () => {
    if (modelConfig.id === "Sync_xero_bankAccounts?") {
      syncXeroBankAccounts();
    } else if (modelConfig.id === "Map_bankAccounts?") {
      handleAutoMappingBankAccounts();
    } else if (modelConfig.id === "Unmap_from?") {
      handleUnmapBankAccounts();
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
    const actionMapping: any = {
      "Mapped bank accounts": mappedBankAccountsActions,
      "Xero bank accounts":
        xeroData?.integration_status === "Connected - active"
          ? xeroBankAccountsActions
          : xeroBankAccountsActions.slice(0, 1),
      "Paytrade bank accounts":
        xeroData?.integration_status === "Connected - active"
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
