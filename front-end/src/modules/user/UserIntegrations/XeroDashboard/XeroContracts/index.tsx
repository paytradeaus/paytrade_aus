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
  autoMappingContract,
  CreateContractInPaytrade,
  CreateContractInXero,
  getMappedContractLists,
  getPaytradeContractListsForCompany,
  getXeroContractsListsForCompany,
  getXeroDetailsForCompany,
  manualMappingContract,
  syncAllContractsByCompanyId,
  unMappingContract,
} from "../../integration.functions";
import { showSuccessToast } from "@/components/Toaster";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  contractsTabOptions,
  mappedContractsHeaders,
  mappedContractsRenderData,
  paytradeContractsHeaders,
  paytradeContractsRenderData,
  statusOptions,
  xeroContractsHeaders,
  xeroContractsRenderData,
} from "../../integration.constant";
import GridExportActions from "@/components/GridExportActions";
import { useRouter, useSearchParams } from "next/navigation";

interface TableConfig {
  headers: any[];
  gridActions: any[];
  renderRowList: any[];
}

export default function XeroContracts() {
  const router = useRouter();
  const queryParams = useSearchParams();
  const to = queryParams.get("navigateTo") || 0;
  const [tabStatus, setTabStatus] = useState(contractsTabOptions[+to]?.label);
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

  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [sortValues, setSortValues] = useState<any>("");
  const [modelConfig, setModelConfig] = useState<any>({
    show: false,
    title: "",
    secondButtonName: "",
    firstButtonName: "",
    description: "",
    id: "",
  });
  const [xeroData, setXeroData] = useState<any>("");

  const [showTable, setShowTable] = useState(true);
  const [showManualMapping, setShowManualMapping] = useState(false);
  const [manualMapData, setManualMapData] = useState<any>("");
  const [manualMapOptions, setManualMapOptions] = useState([]);

  const xeroInactiveStatuses = ["Inactive", "Deleted - archived", "Disconnected", "Connected - paused"];
  const isXeroConnected = xeroData?.integration_status && !xeroInactiveStatuses.includes(xeroData.integration_status);

  const paytradeContractsActions = [
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
  const xeroContractsActions = [
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
  const mappedContractsActions = [
    {
      label: "Unmap",
      icon: "fa-light fa-unlink",
      onClick: (row: any) => {
        setSelectedContract(row);
        setModelConfig({
          show: true,
          title: "Unmap",
          secondButtonName: "Unmap",
          firstButtonName: "Cancel",
          id: "Unmap_from?",
          description: (
            <>
              <b>{row?.pt_contract_name}</b> from <b>{row?.contract_name}</b>?{" "}
            </>
          ),
        });
      },
      displayByDefault: true,
    },
  ];

  const getTableConfig = (): TableConfig => {
    switch (tabStatus) {
      case "Paytrade contracts":
        return {
          headers: paytradeContractsHeaders,
          gridActions: paytradeContractsActions,
          renderRowList: paytradeContractsRenderData,
        };
      case "Xero contracts":
        return {
          headers: xeroContractsHeaders,
          gridActions: xeroContractsActions,
          renderRowList: xeroContractsRenderData,
        };
      case "Mapped contracts":
        return {
          headers: mappedContractsHeaders,
          gridActions: mappedContractsActions,
          renderRowList: mappedContractsRenderData,
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

  const fetchXeroContracts = async (
    currentPage: number,
    entriesPerPage: number,
    search: string,
    setTableLoader: (loading: boolean) => void
  ) => {
    const data = await getXeroContractsListsForCompany(
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
      contracts:
        data?.contract_list.map((val: any) => {
          const isUnmapped = val.mapped_status?.toLocaleLowerCase() !== "mapped";
          const isNotDraft = val.contract_status?.toLocaleLowerCase() !== "draft";
          return {
            ...val,
            dynamicIcon: {
              syncIcon: isUnmapped && isNotDraft,
              manual: isUnmapped,
              createIcon: isUnmapped,
            },
          };
        }) || [],
      totalCount: data?.total_count || 0,
    };
  };

  const fetchPaytradeContracts = async (
    currentPage: number,
    entriesPerPage: number,
    search: string,
    sortValues: any,
    setTableLoader: (loading: boolean) => void
  ) => {
    const data = await getPaytradeContractListsForCompany(
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
      contracts:
        data?.contract_list.map((val: any) => {
          const isUnmapped = val.mapped_status?.toLocaleLowerCase() !== "mapped";
          const isNotDraft = val.contract_status?.toLocaleLowerCase() !== "draft";
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

  const fetchMappedContracts = async (
    currentPage: number,
    entriesPerPage: number,
    search: string,
    setTableLoader: (loading: boolean) => void
  ) => {
    const data = await getMappedContractLists(
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
      contracts: data?.contract_list || [],
      totalCount: data?.total_count || 0,
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      setTableLoader(true);
      if (tabStatus === "Xero contracts") {
        const { contracts, totalCount } = await fetchXeroContracts(
          currentPage,
          entriesPerPage,
          search,
          setTableLoader
        );
        setGridData(contracts);
        setTotalRows(totalCount);
      } else if (tabStatus === "Paytrade contracts") {
        const { contracts, totalCount } = await fetchPaytradeContracts(
          currentPage,
          entriesPerPage,
          search,
          sortValues,
          setTableLoader
        );
        setGridData(contracts);
        setTotalRows(totalCount);
      } else if (tabStatus === "Mapped contracts") {
        const { contracts, totalCount } = await fetchMappedContracts(
          currentPage,
          entriesPerPage,
          search,
          setTableLoader
        );
        setGridData(contracts);
        setTotalRows(totalCount);
      }
    };
    fetchData();
  }, [tabStatus, currentPage, entriesPerPage, search, sortValues, status]);

  const handleOptionClick = async (row: any, label: string) => {
    if (tabStatus === "Xero contracts" && label == "Manual Map") {
      getOptionForManualContractMappingForXero();
      setSelectedContract(row);
      setShowManualMapping(true);
    } else if (tabStatus === "Paytrade contracts" && label == "Manual Map") {
      getOptionForManualContactMappingForPaytrade();
      setSelectedContract(row);
      setShowManualMapping(true);
    } else if (
      tabStatus === "Paytrade contracts" &&
      label === "Create in Xero"
    ) {
      setSelectedContract(row);
      setModelConfig({
        show: true,
        title: "Create in Xero",
        secondButtonName: "Create",
        firstButtonName: "Cancel",
        description: (
          <>
            Create <b>{row?.contract_name || row?.client_supplier_name}</b> in Xero?
          </>
        ),
        id: "Create_in_xero?",
      });
    } else if (
      tabStatus === "Xero contracts" &&
      label === "Create in PayTrade"
    ) {
      setSelectedContract(row);
      setModelConfig({
        show: true,
        title: "Create in PayTrade",
        secondButtonName: "Create",
        firstButtonName: "Cancel",
        description: (
          <>
            Create <b>{row?.contract_name}</b> in PayTrade?
          </>
        ),
        id: "Create_in_paytrade?",
      });
    }
  };

  const syncXeroContracts = async () => {
    setTableLoader(true);
    await syncAllContractsByCompanyId(
      {
        companyId: +(localStorage.getItem("companyId") || 0),
      },
      setTableLoader
    );
    const { contracts, totalCount } = await fetchXeroContracts(
      currentPage,
      entriesPerPage,
      search,
      setTableLoader
    );
    setGridData(contracts);
    setTotalRows(totalCount);
  };

  const handleAutoMappingContract = async () => {
    await autoMappingContract(
      {
        companyId: +(localStorage.getItem("companyId") || 0),
      },
      setTableLoader
    );
    const { contracts, totalCount } = await fetchMappedContracts(
      currentPage,
      entriesPerPage,
      search,
      setTableLoader
    );
    setGridData(contracts);
    setTotalRows(totalCount);
  };

  const handleCreateInXero = async () => {
    setTableLoader(true);
    await CreateContractInXero({ contractId: +selectedContract?.contract_id });
    const { contracts, totalCount } = await fetchPaytradeContracts(
      currentPage,
      entriesPerPage,
      search,
      sortValues,
      setTableLoader
    );
    setGridData(contracts);
    setTotalRows(totalCount);
  };

  const handleCreateInPaytrade = async () => {
    setTableLoader(true);
    await CreateContractInPaytrade({
      companyId: +(localStorage.getItem("companyId") || 0),
      contractId: selectedContract?.contract_id,
    });
    const { contracts, totalCount } = await fetchXeroContracts(
      currentPage,
      entriesPerPage,
      search,
      setTableLoader
    );
    setGridData(contracts);
    setTotalRows(totalCount);
  };

  const handleBatchCreateInPaytrade = async () => {
    setTableLoader(true);
    let created = 0;
    let failed = 0;
    for (const row of gridData) {
      try {
        await CreateContractInPaytrade({
          companyId: +(localStorage.getItem("companyId") || 0),
          contractId: row.contract_id,
        });
        created++;
      } catch (e) {
        failed++;
      }
    }
    showSuccessToast(`Created ${created} contract(s)${failed > 0 ? `, ${failed} failed` : ""}`);
    const { contracts, totalCount } = await fetchXeroContracts(
      currentPage,
      entriesPerPage,
      search,
      setTableLoader
    );
    setGridData(contracts);
    setTotalRows(totalCount);
  };

  const handleBatchCreateInXero = async () => {
    setTableLoader(true);
    let created = 0;
    let failed = 0;
    for (const row of gridData) {
      try {
        await CreateContractInXero({ contractId: +row.contract_id });
        created++;
      } catch (e) {
        failed++;
      }
    }
    showSuccessToast(`Created ${created} contract(s) in Xero${failed > 0 ? `, ${failed} failed` : ""}`);
    const { contracts, totalCount } = await fetchPaytradeContracts(
      currentPage,
      entriesPerPage,
      search,
      sortValues,
      setTableLoader
    );
    setGridData(contracts);
    setTotalRows(totalCount);
  };

  const modelClose = () => {
    if (modelConfig.id === "Sync_xero_contracts?") {
      syncXeroContracts();
    } else if (modelConfig.id === "Map_contracts?") {
      handleAutoMappingContract();
    } else if (modelConfig.id === "Unmap_from?") {
      handleUnmapContract();
    } else if (modelConfig.id === "Create_in_xero?") {
      handleCreateInXero();
    } else if (modelConfig.id === "Create_in_paytrade?") {
      handleCreateInPaytrade();
    } else if (modelConfig.id === "Batch_create_in_paytrade?") {
      handleBatchCreateInPaytrade();
    } else if (modelConfig.id === "Batch_create_in_xero?") {
      handleBatchCreateInXero();
    }
  };

  const handleUnmapContract = async () => {
    await unMappingContract(
      {
        contractId: selectedContract?.contract_id,
      },
      setTableLoader
    );
    setTableLoader(true);
    const { contracts, totalCount } = await fetchMappedContracts(
      currentPage,
      entriesPerPage,
      search,
      setTableLoader
    );
    setGridData(contracts);
    setTotalRows(totalCount);
  };

  const getOptionForManualContractMappingForXero = async () => {
    const data = await getPaytradeContractListsForCompany(
      {
        payload: {
          company_id: +(localStorage.getItem("companyId") || 0),
        },
      },
      setTableLoader
    );
    setManualMapOptions(data?.contract_list);
  };

  const getOptionForManualContactMappingForPaytrade = async () => {
    const data = await getXeroContractsListsForCompany(
      {
        payload: {
          company_id: +(localStorage.getItem("companyId") || 0),
        },
      },
      setTableLoader
    );
    setManualMapOptions(data?.contract_list);
  };

  const handleManualMappingContact = async () => {
    await manualMappingContract(
      tabStatus === "Paytrade contracts"
        ? {
            payload: {
              contract_id: manualMapData?.contract_id,
              pt_contract_id: selectedContract?.contract_id,
            },
          }
        : {
            payload: {
              contract_id: selectedContract?.contract_id,
              pt_contract_id: manualMapData?.contract_id,
            },
          }
    );
    if (tabStatus === "Xero contracts") {
      const { contracts, totalCount } = await fetchXeroContracts(
        currentPage,
        entriesPerPage,
        search,
        setTableLoader
      );
      setGridData(contracts);
      setTotalRows(totalCount);
    } else if (tabStatus === "Paytrade contracts") {
      const { contracts, totalCount } = await fetchPaytradeContracts(
        currentPage,
        entriesPerPage,
        search,
        sortValues,
        setTableLoader
      );
      setGridData(contracts);
      setTotalRows(totalCount);
    }
    setManualMapData("");
  };

  const checkActionCondition = () => {
    const actionMapping: any = {
      "Mapped contracts": mappedContractsActions,
      "Xero contracts": isXeroConnected
        ? xeroContractsActions
        : xeroContractsActions.slice(0, 1),
      "Paytrade contracts": isXeroConnected
        ? paytradeContractsActions
        : paytradeContractsActions.slice(0, 1),
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
            activeRoute={"Contracts"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Contracts</h1>
            <p>Manage your paytrade and xero contracts</p>
          </div>
        </div>
      </div>

      <div className="pt_filtergroup">
        <div className="grid pt_topfilters">
          <div className="pt_filters ">
            <TabSwitch
              tabOptions={contractsTabOptions}
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
                width: tabStatus === "Mapped contracts" ? "25%" : "50%",
              }}
            >
              <FormikControl
                placeholder={"Search by contract name"}
                control={InputType.SEARCH}
                onChange={(value: any) => {
                  if (currentPage !== 1) setCurrentPage(1);
                  setSearch(value);
                }}
                name={search}
                value={search}
                clearSearch={emptySearchField}
              />
              {(tabStatus === "Xero contracts" ||
                tabStatus === "Paytrade contracts") && (
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
          {tabStatus === "Mapped contracts" && (
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
                  description: "Map contracts?",
                  id: "Map_contracts?",
                })
              }
              styles={{ margin: "0 10px 10px 10px" }}
            />
          )}
          {tabStatus === "Xero contracts" && (
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
                    description: "Sync xero contracts?",
                    id: "Sync_xero_contracts?",
                  })
                }
                styles={{ margin: "0 10px 10px 10px" }}
              />
              {isXeroConnected && (
                <CustomButton
                  buttonName="CREATE ALL IN PAYTRADE"
                  iconClassName="fa-light fa-plus-circle"
                  buttonType={buttonType.CONTRAST_SMALL}
                  actionType="button"
                  onClick={() =>
                    setModelConfig({
                      show: true,
                      title: "Create All in PayTrade",
                      secondButtonName: "Create All",
                      firstButtonName: "Cancel",
                      description:
                        "Create all unmapped Xero contracts in PayTrade? Contracts with missing required fields will be skipped.",
                      id: "Batch_create_in_paytrade?",
                    })
                  }
                  styles={{ margin: "0 10px 10px 10px" }}
                />
              )}
            </>
          )}
          {tabStatus === "Paytrade contracts" &&
            isXeroConnected && (
              <CustomButton
                buttonName="CREATE ALL IN XERO"
                iconClassName="fa-light fa-plus-circle"
                buttonType={buttonType.CONTRAST_SMALL}
                actionType="button"
                onClick={() =>
                  setModelConfig({
                    show: true,
                    title: "Create All in Xero",
                    secondButtonName: "Create All",
                    firstButtonName: "Cancel",
                    description:
                      "Create all unmapped PayTrade contracts in Xero?",
                    id: "Batch_create_in_xero?",
                  })
                }
                styles={{ margin: "0 10px 10px 10px" }}
              />
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
      {showManualMapping && (
        <BaseModal
          modalId="confirmation"
          displayModal={showManualMapping}
          onClose={() => setShowManualMapping(false)}
          secondButtonName="Map"
          firstButtonName="Cancel"
          onConfirm={() => {
            handleManualMappingContact();
            return true;
          }}
          title="Contract Mapping"
        >
          <br />
          <p className="text_center">
            Map{" "}
            <b>
              {selectedContract?.contract_name ||
                selectedContract?.client_supplier_name}
            </b>{" "}
            to:{" "}
          </p>
          <br />
          <SearchableSelect
            isInPopup={true}
            placeholder={
              tabStatus === "Xero contracts"
                ? "Select contract from paytrade contracts"
                : "Select contract from xero contracts"
            }
            label=""
            name={"contract"}
            renderKey="contract_name"
            options={manualMapOptions}
            valueKey="contract_id"
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
