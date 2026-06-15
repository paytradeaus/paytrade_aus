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
  autoMappingBills,
  CreateBillsInPaytrade,
  CreateBillsInXero,
  getMappedBillsLists,
  GetPaytradeBillsListsForCompany,
  getXeroBillsListsForCompany,
  getXeroDetailsForCompany,
  manualMappingBills,
  permanentlyUnmapInvoiceBill,
  reEnableInvoiceBillMapping,
  syncAllBillsByCompanyId,
  unMappingBills,
} from "../../integration.functions";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  billsTabOptions,
  mappedBillsHeaders,
  mappedBillsRenderData,
  paytradeBillsHeaders,
  paytradeBillsRenderData,
  permanentlyUnmappedBillsHeaders,
  permanentlyUnmappedBillsRenderData,
  statusOptions,
  xeroBillsHeaders,
  xeroBillsRenderData,
} from "../../integration.constant";
import GridExportActions from "@/components/GridExportActions";
import { formatDate } from "@/utils";

interface TableConfig {
  headers: any[];
  gridActions: any[];
  renderRowList: any[];
}

export default function XeroBills() {
  const [tabStatus, setTabStatus] = useState(billsTabOptions[0]?.label);
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

  const paytradeBillsActions = [
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
  const xeroBillsActions = [
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
  const mappedBillsActions = [
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
          // Task #368 — Offer plain Unmap (may be re-linked on next sync)
          // or Unmap permanently (sticky exclusion from inbound import).
          description: (
            <>
              Do you wish to unmap the below bill?
              <p style={{ marginTop: "10px" }}>
                {row?.total_amount && (
                  <>
                    <b>Total Amount:</b>&nbsp;{row?.total_amount}
                    <br />
                  </>
                )}
                {row?.contact_name && (
                  <>
                    <b>Contact Name:</b>&nbsp;{row?.contact_name}
                    <br />
                  </>
                )}
                {row?.due_date && (
                  <>
                    <b>Due date:</b>&nbsp;{formatDate(row?.due_date)}
                  </>
                )}
              </p>
              <p style={{ fontSize: "0.9em", color: "#555" }}>
                Choose <b>Unmap</b> to clear the link (the bill may be
                re-linked automatically on the next Xero sync or webhook).
                Choose <b>Unmap permanently</b> to exclude this bill from all
                future inbound import and re-linking.
              </p>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <CustomButton
                  buttonName="UNMAP PERMANENTLY"
                  iconClassName="fa-light fa-ban"
                  buttonType={buttonType.CONTRAST_SMALL}
                  actionType="button"
                  onClick={async () => {
                    setModelConfig((prev: any) => ({ ...prev, show: false }));
                    await handlePermanentlyUnmapBill(row);
                  }}
                />
              </div>
            </>
          ),
        });
      },
      displayByDefault: true,
    },
  ];

  // Task #368 — Per-row action on the "Permanently unmapped" tab.
  const permanentlyUnmappedBillsActions = [
    {
      label: "Re-enable mapping",
      icon: "fa-light fa-rotate-left",
      onClick: (row: any) => {
        setSelectedContact(row);
        setModelConfig({
          show: true,
          title: "Re-enable mapping",
          secondButtonName: "Re-enable",
          firstButtonName: "Cancel",
          id: "Re_enable_mapping?",
          description: (
            <>
              Re-enable mapping for this bill? It will return to the normal
              unmapped pool so it can be imported or re-linked again.
            </>
          ),
        });
      },
      displayByDefault: true,
    },
  ];

  const getTableConfig = (): TableConfig => {
    switch (tabStatus) {
      case "Paytrade bills":
        return {
          headers: paytradeBillsHeaders,
          gridActions: paytradeBillsActions,
          renderRowList: paytradeBillsRenderData,
        };
      case "Xero bills":
        return {
          headers: xeroBillsHeaders,
          gridActions: xeroBillsActions,
          renderRowList: xeroBillsRenderData,
        };
      case "Mapped bills":
        return {
          headers: mappedBillsHeaders,
          gridActions: mappedBillsActions,
          renderRowList: mappedBillsRenderData,
        };
      case "Permanently unmapped":
        return {
          headers: permanentlyUnmappedBillsHeaders,
          gridActions: permanentlyUnmappedBillsActions,
          renderRowList: permanentlyUnmappedBillsRenderData,
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

  const fetchXeroBills = async (
    currentPage: number,
    entriesPerPage: number,
    search: string,
    setTableLoader: (loading: boolean) => void
  ) => {
    const data = await getXeroBillsListsForCompany(
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
        data?.invoice_list.map((val: any) => {
          return {
            ...val,
            dynamicIcon: {
              syncIcon:
                val.mapped_status?.toLocaleLowerCase() == "mapped"
                  ? false
                  : val.status?.toLocaleLowerCase() !== "draft",
              manual: val.mapped_status?.toLocaleLowerCase() !== "mapped",
            },
            total_amount: `$ ${
              val?.total_amount
                ? Number(val?.total_amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "0.00"
            }`,
            due_date: formatDate(val?.due_date),
          };
        }) || [],
      totalCount: data?.total_count || 0,
    };
  };

  const fetchPaytradeBills = async (
    currentPage: number,
    entriesPerPage: number,
    search: string,
    sortValues: any,
    setTableLoader: (loading: boolean) => void
  ) => {
    const data = await GetPaytradeBillsListsForCompany(
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
        data?.invoice_list.map((val: any) => {
          return {
            ...val,
            dynamicIcon: {
              syncIcon:
                val.mapped_status?.toLocaleLowerCase() == "mapped"
                  ? false
                  : val.status?.toLocaleLowerCase() !== "draft",
              manual: val.mapped_status?.toLocaleLowerCase() !== "mapped",
            },
            total_amount: `$ ${
              val?.total_amount
                ? Number(val?.total_amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "0.00"
            }`,
            due_date: formatDate(val?.due_date),
          };
        }) || [],
      totalCount: data?.total_count || 0,
    };
  };

  const fetchMappedBills = async (
    currentPage: number,
    entriesPerPage: number,
    search: string,
    setTableLoader: (loading: boolean) => void
  ) => {
    const data = await getMappedBillsLists(
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
      contacts:
        data?.invoice_list.map((val: any) => {
          return {
            ...val,
            total_amount: `$ ${
              val?.total_amount
                ? Number(val?.total_amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "0.00"
            }`,
            due_date: formatDate(val?.due_date),
          };
        }) ||
        [] ||
        [],
      totalCount: data?.total_count || 0,
    };
  };

  // Task #368 — Re-use the Xero bill list endpoint with the dedicated
  // `Permanently unmapped` filter value.
  const fetchPermanentlyUnmappedBills = async (
    currentPage: number,
    entriesPerPage: number,
    search: string,
    setTableLoader: (loading: boolean) => void
  ) => {
    const data = await getXeroBillsListsForCompany(
      {
        payload: {
          company_id: +(localStorage.getItem("companyId") || 0),
          page_number: currentPage,
          page_size: entriesPerPage,
          search: search || "",
          sorting_field: sortValues?.sortKey || "",
          sorting_order: sortValues?.direction || "",
          mapped_status: "Permanently unmapped",
        },
      },
      setTableLoader
    );
    return {
      contacts:
        data?.invoice_list.map((val: any) => {
          return {
            ...val,
            total_amount: `$ ${
              val?.total_amount
                ? Number(val?.total_amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "0.00"
            }`,
            due_date: formatDate(val?.due_date),
          };
        }) || [],
      totalCount: data?.total_count || 0,
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      setTableLoader(true);
      if (tabStatus === "Xero bills") {
        const { contacts, totalCount } = await fetchXeroBills(
          currentPage,
          entriesPerPage,
          search,
          setTableLoader
        );
        setGridData(contacts);
        setTotalRows(totalCount);
      } else if (tabStatus === "Paytrade bills") {
        const { contacts, totalCount } = await fetchPaytradeBills(
          currentPage,
          entriesPerPage,
          search,
          sortValues,
          setTableLoader
        );
        setGridData(contacts);
        setTotalRows(totalCount);
      } else if (tabStatus === "Mapped bills") {
        const { contacts, totalCount } = await fetchMappedBills(
          currentPage,
          entriesPerPage,
          search,
          setTableLoader
        );
        setGridData(contacts);
        setTotalRows(totalCount);
      } else if (tabStatus === "Permanently unmapped") {
        const { contacts, totalCount } = await fetchPermanentlyUnmappedBills(
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
    if (tabStatus === "Xero bills" && label == "Manual Map") {
      getOptionForManualBillsForXero();
      setSelectedContact(row);
      setShowManualMapping(true);
    } else if (tabStatus === "Paytrade bills" && label == "Manual Map") {
      getOptionForManualBillsMappingForPaytrade();
      setSelectedContact(row);
      setShowManualMapping(true);
    } else if (tabStatus === "Paytrade bills" && label === "Sync to xero") {
      setTableLoader(true);
      await CreateBillsInXero({ paymentClaimId: +row?.invoice_id });
      const { contacts, totalCount } = await fetchPaytradeBills(
        currentPage,
        entriesPerPage,
        search,
        sortValues,
        setTableLoader
      );
      setGridData(contacts);
      setTotalRows(totalCount);
    } else if (tabStatus === "Xero bills" && label === "Sync to paytrade") {
      setTableLoader(true);
      await CreateBillsInPaytrade({
        companyId: +(localStorage.getItem("companyId") || 0),
        invoiceId: row?.invoice_id,
      });
      const { contacts, totalCount } = await fetchXeroBills(
        currentPage,
        entriesPerPage,
        search,
        setTableLoader
      );
      setGridData(contacts);
      setTotalRows(totalCount);
    }
  };

  const syncXeroBills = async () => {
    setTableLoader(true);
    await syncAllBillsByCompanyId(
      {
        companyId: +(localStorage.getItem("companyId") || 0),
        type: "bill",
      },
      setTableLoader
    );
    const { contacts, totalCount } = await fetchXeroBills(
      currentPage,
      entriesPerPage,
      search,
      setTableLoader
    );
    setGridData(contacts);
    setTotalRows(totalCount);
  };

  const handleAutoMappingBills = async () => {
    await autoMappingBills(
      {
        companyId: +(localStorage.getItem("companyId") || 0),
      },
      setTableLoader
    );
    const { contacts, totalCount } = await fetchMappedBills(
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
      syncXeroBills();
    } else if (modelConfig.id === "Map_bankAccounts?") {
      handleAutoMappingBills();
    } else if (modelConfig.id === "Unmap_from?") {
      handleUnmapBills();
    } else if (modelConfig.id === "Re_enable_mapping?") {
      handleReEnableBillMapping();
    }
  };

  // Task #368 — Mark a mapped bill as permanently unmapped, then refresh
  // the mapped list (the row drops out once the link is cleared).
  const handlePermanentlyUnmapBill = async (row?: any) => {
    const bill = row || selectedContact;
    setTableLoader(true);
    await permanentlyUnmapInvoiceBill(
      { invoiceId: bill?.invoice_id },
      setTableLoader
    );
    const { contacts, totalCount } = await fetchMappedBills(
      currentPage,
      entriesPerPage,
      search,
      setTableLoader
    );
    setGridData(contacts);
    setTotalRows(totalCount);
  };

  // Task #368 — Reverse a permanent-unmap, then refresh the
  // "Permanently unmapped" tab.
  const handleReEnableBillMapping = async () => {
    setTableLoader(true);
    await reEnableInvoiceBillMapping(
      { invoiceId: selectedContact?.invoice_id },
      setTableLoader
    );
    const { contacts, totalCount } = await fetchPermanentlyUnmappedBills(
      currentPage,
      entriesPerPage,
      search,
      setTableLoader
    );
    setGridData(contacts);
    setTotalRows(totalCount);
  };

  const handleUnmapBills = async () => {
    await unMappingBills(
      {
        invoiceId: selectedContact?.invoice_id,
      },
      setTableLoader
    );
    setTableLoader(true);
    const { contacts, totalCount } = await fetchMappedBills(
      currentPage,
      entriesPerPage,
      search,
      setTableLoader
    );
    setGridData(contacts);
    setTotalRows(totalCount);
  };

  const getOptionForManualBillsForXero = async () => {
    const data = await GetPaytradeBillsListsForCompany(
      {
        payload: {
          company_id: +(localStorage.getItem("companyId") || 0),
        },
      },
      setTableLoader
    );
    setManualMapOptions(
      data?.invoice_list.map((val: any) => {
        return {
          ...val,
          label: `Invoice Id : ${val.invoice_id} Due Date: ${formatDate(
            val?.due_date
          )} 
                    Total Amount : ${
                      val?.total_amount
                        ? Number(val?.total_amount).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : "0.00"
                    }  Contact :  ${val?.contact_name}`,
        };
      })
    );
  };

  const getOptionForManualBillsMappingForPaytrade = async () => {
    const data = await getXeroBillsListsForCompany(
      {
        payload: {
          company_id: +(localStorage.getItem("companyId") || 0),
          // page_number: currentPage,
          // page_size: entriesPerPage,
          // search: search || "",
          // sorting_field: sortValues?.sortKey || "",
          // sorting_order: sortValues?.direction || "",
          // mapped_status: status,
        },
      },
      setTableLoader
    );
    setManualMapOptions(
      data?.invoice_list.map((val: any) => {
        return {
          ...val,
          label: `Invoice Id : ${val.invoice_id} Due Date: ${formatDate(
            val?.due_date
          )} 
                    Total Amount : ${
                      val?.total_amount
                        ? Number(val?.total_amount).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : "0.00"
                    } Contact :  ${val?.contact_name}`,
        };
      })
    );
  };

  const handleManualMappingBills = async () => {
    await manualMappingBills(
      tabStatus === "Paytrade bills"
        ? {
            payload: {
              invoice_id: manualMapData?.invoice_id,
              pt_claim_id: +selectedContact?.invoice_id,
            },
          }
        : {
            payload: {
              invoice_id: selectedContact?.invoice_id,
              pt_claim_id: +manualMapData?.invoice_id,
            },
          }
    );
    if (tabStatus === "Xero bills") {
      const { contacts, totalCount } = await fetchXeroBills(
        currentPage,
        entriesPerPage,
        search,
        setTableLoader
      );
      setGridData(contacts);
      setTotalRows(totalCount);
    } else if (tabStatus === "Paytrade bills") {
      const { contacts, totalCount } = await fetchPaytradeBills(
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
      "Mapped bills": mappedBillsActions,
      "Permanently unmapped": permanentlyUnmappedBillsActions,
      "Xero bills":
        xeroData?.integration_status === "Connected - active"
          ? xeroBillsActions
          : xeroBillsActions.slice(0, 1),
      "Paytrade bills":
        xeroData?.integration_status === "Connected - active"
          ? paytradeBillsActions
          : paytradeBillsActions.slice(0, 1),
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
            activeRoute={"Bills"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Bills</h1>
            <p>Manage your paytrade and xero bills</p>
          </div>
        </div>
      </div>

      <div className="pt_filtergroup">
        <div className="grid pt_topfilters">
          <div className="pt_filters ">
            <TabSwitch
              tabOptions={billsTabOptions}
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
                width: tabStatus === "Mapped bills" ? "25%" : "50%",
              }}
            >
              <FormikControl
                placeholder={"Search by ID"}
                control={InputType.SEARCH}
                onChange={(value: any) => {
                  if (currentPage !== 1) setCurrentPage(1);
                  setSearch(value);
                }}
                name={search}
                value={search}
                clearSearch={emptySearchField}
              />
              {(tabStatus === "Xero bills" ||
                tabStatus === "Paytrade bills") && (
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
          {/* {tabStatus === "Mapped bills" && (
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
                  description: "Map bills?",
                  id: "Map_bankAccounts?",
                })
              }
              styles={{ margin: "0 10px 10px 10px" }}
            />
          )} */}
          {tabStatus === "Xero bills" && (
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
                    description: "Sync xero bills?",
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
              headers={headers}
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
            handleManualMappingBills();
            return true;
          }}
          title="Bill Mapping"
        >
          <br />
          <p className="text_center">
            Do you wish to map the below bill?
            <p style={{ marginTop: "10px" }}>
              {selectedContact?.total_amount && (
                <>
                  <b>Total Amount:</b>&nbsp;{selectedContact?.total_amount}
                  <br />
                </>
              )}
              {selectedContact?.contact_name && (
                <>
                  <b>Contact Name:</b>&nbsp;{selectedContact?.contact_name}
                  <br />
                </>
              )}
              {selectedContact?.due_date && (
                <>
                  <b>Due date:</b>&nbsp;{formatDate(selectedContact?.due_date)}
                </>
              )}
            </p>
            to:
          </p>
          <br />
          <SearchableSelect
            placeholder={
              tabStatus === "Xero bills"
                ? "Select bill from paytrade"
                : "Select bill from xero"
            }
            label=""
            name={"contact"}
            renderKey="label"
            options={manualMapOptions}
            valueKey="invoice_id"
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
