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
  autoMappingInvoices,
  CreateInvoicesInPaytrade,
  CreateInvoicesInXero,
  getMappedInvoicesLists,
  GetPaytradeInvoicesListsForCompany,
  getXeroDetailsForCompany,
  getXeroInvoicesListsForCompany,
  manualMappingInvoices,
  syncAllInvoicesByCompanyId,
  unMappingInvoices,
} from "../../integration.functions";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  invoicesTabOptions,
  mappedInvoicesHeaders,
  mappedInvoicesRenderData,
  paytradeInvoicesHeaders,
  paytradeInvoicesRenderData,
  statusOptions,
  xeroInvoicesHeaders,
  xeroInvoicesRenderData,
} from "../../integration.constant";
import GridExportActions from "@/components/GridExportActions";
import { formatDate } from "@/utils";

interface TableConfig {
  headers: any[];
  gridActions: any[];
  renderRowList: any[];
}

export default function XeroInvoices() {
  const [tabStatus, setTabStatus] = useState(invoicesTabOptions[0]?.label);
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

  const paytradeInvoicesActions = [
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
  const xeroInvoicesActions = [
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
  const mappedInvoicesActions = [
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
              Do you wish to unmap the below invoice?
              <p style={{ marginTop: "10px" }}>
                {row?.total_amount && (
                  <>
                    <b>Total Amount:</b>&nbsp;{row?.total_amount}
                    <br />
                  </>
                )}
                {row?.contact_name && (
                  <>
                    <b>Contact Name:</b>&nbsp;{row?.contact_name} <br />
                  </>
                )}
                {row?.due_date && (
                  <>
                    <b>Due date:</b>&nbsp;{formatDate(row?.due_date)}
                  </>
                )}
              </p>
            </>
          ),
        });
      },
      displayByDefault: true,
    },
  ];

  const getTableConfig = (): TableConfig => {
    switch (tabStatus) {
      case "Paytrade invoices":
        return {
          headers: paytradeInvoicesHeaders,
          gridActions: paytradeInvoicesActions,
          renderRowList: paytradeInvoicesRenderData,
        };
      case "Xero invoices":
        return {
          headers: xeroInvoicesHeaders,
          gridActions: xeroInvoicesActions,
          renderRowList: xeroInvoicesRenderData,
        };
      case "Mapped invoices":
        return {
          headers: mappedInvoicesHeaders,
          gridActions: mappedInvoicesActions,
          renderRowList: mappedInvoicesRenderData,
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

  const fetchXeroInvoices = async (
    currentPage: number,
    entriesPerPage: number,
    search: string,
    setTableLoader: (loading: boolean) => void
  ) => {
    const data = await getXeroInvoicesListsForCompany(
      {
        payload: {
          company_id: +(localStorage.getItem("companyId") || 0),
          page_number: currentPage,
          page_size: entriesPerPage,
          search: search || "",
          sorting_field: sortValues?.sortKey || "",
          sorting_order: sortValues?.direction || "",
          mapped_status: status,
          type: "invoice",
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

  const fetchPaytradeInvoices = async (
    currentPage: number,
    entriesPerPage: number,
    search: string,
    sortValues: any,
    setTableLoader: (loading: boolean) => void
  ) => {
    const data = await GetPaytradeInvoicesListsForCompany(
      {
        payload: {
          company_id: +(localStorage.getItem("companyId") || 0),
          page_number: currentPage,
          page_size: entriesPerPage,
          search: search,
          sorting_field: sortValues?.sortKey || "",
          sorting_order: sortValues?.direction || "",
          mapped_status: status,
          type: "invoice",
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

  const fetchMappedInvoices = async (
    currentPage: number,
    entriesPerPage: number,
    search: string,
    setTableLoader: (loading: boolean) => void
  ) => {
    const data = await getMappedInvoicesLists(
      {
        payload: {
          company_id: +(localStorage.getItem("companyId") || 0),
          page_number: currentPage,
          page_size: entriesPerPage,
          search: search,
          sorting_field: sortValues?.sortKey || "",
          sorting_order: sortValues?.direction || "",
          type: "invoice",
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
      if (tabStatus === "Xero invoices") {
        const { contacts, totalCount } = await fetchXeroInvoices(
          currentPage,
          entriesPerPage,
          search,
          setTableLoader
        );
        setGridData(contacts);
        setTotalRows(totalCount);
      } else if (tabStatus === "Paytrade invoices") {
        const { contacts, totalCount } = await fetchPaytradeInvoices(
          currentPage,
          entriesPerPage,
          search,
          sortValues,
          setTableLoader
        );
        setGridData(contacts);
        setTotalRows(totalCount);
      } else if (tabStatus === "Mapped invoices") {
        const { contacts, totalCount } = await fetchMappedInvoices(
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
    if (tabStatus === "Xero invoices" && label == "Manual Map") {
      getOptionForManualInvoicesMappingForXero();
      setSelectedContact(row);
      setShowManualMapping(true);
    } else if (tabStatus === "Paytrade invoices" && label == "Manual Map") {
      getOptionForManualInvoicesMappingForPaytrade();
      setSelectedContact(row);
      setShowManualMapping(true);
    } else if (tabStatus === "Paytrade invoices" && label === "Sync to xero") {
      setTableLoader(true);
      await CreateInvoicesInXero({ paymentClaimId: +row?.invoice_id });
      const { contacts, totalCount } = await fetchPaytradeInvoices(
        currentPage,
        entriesPerPage,
        search,
        sortValues,
        setTableLoader
      );
      setGridData(contacts);
      setTotalRows(totalCount);
    } else if (tabStatus === "Xero invoices" && label === "Sync to paytrade") {
      setTableLoader(true);
      await CreateInvoicesInPaytrade({
        companyId: +(localStorage.getItem("companyId") || 0),
        invoiceId: row?.invoice_id,
      });
      const { contacts, totalCount } = await fetchXeroInvoices(
        currentPage,
        entriesPerPage,
        search,
        setTableLoader
      );
      setGridData(contacts);
      setTotalRows(totalCount);
    }
  };

  const syncXeroInvoices = async () => {
    setTableLoader(true);
    await syncAllInvoicesByCompanyId(
      {
        companyId: +(localStorage.getItem("companyId") || 0),
        type: "invoice",
      },
      setTableLoader
    );
    const { contacts, totalCount } = await fetchXeroInvoices(
      currentPage,
      entriesPerPage,
      search,
      setTableLoader
    );
    setGridData(contacts);
    setTotalRows(totalCount);
  };

  const handleAutoMappingInvoices = async () => {
    await autoMappingInvoices(
      {
        companyId: +(localStorage.getItem("companyId") || 0),
      },
      setTableLoader
    );
    const { contacts, totalCount } = await fetchMappedInvoices(
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
      syncXeroInvoices();
    } else if (modelConfig.id === "Map_bankAccounts?") {
      handleAutoMappingInvoices();
    } else if (modelConfig.id === "Unmap_from?") {
      handleUnmapInvoices();
    }
  };

  const handleUnmapInvoices = async () => {
    await unMappingInvoices(
      {
        invoiceId: selectedContact?.invoice_id,
      },
      setTableLoader
    );
    setTableLoader(true);
    const { contacts, totalCount } = await fetchMappedInvoices(
      currentPage,
      entriesPerPage,
      search,
      setTableLoader
    );
    setGridData(contacts);
    setTotalRows(totalCount);
  };

  const getOptionForManualInvoicesMappingForXero = async () => {
    const data = await GetPaytradeInvoicesListsForCompany(
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

  const getOptionForManualInvoicesMappingForPaytrade = async () => {
    const data = await getXeroInvoicesListsForCompany(
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
                }  Contact :  ${val?.contact_name}`,
        };
      })
    );
  };

  const handleManualMappingInvoices = async () => {
    await manualMappingInvoices(
      tabStatus === "Paytrade invoices"
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
    if (tabStatus === "Xero invoices") {
      const { contacts, totalCount } = await fetchXeroInvoices(
        currentPage,
        entriesPerPage,
        search,
        setTableLoader
      );
      setGridData(contacts);
      setTotalRows(totalCount);
    } else if (tabStatus === "Paytrade invoices") {
      const { contacts, totalCount } = await fetchPaytradeInvoices(
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
      "Mapped invoices": mappedInvoicesActions,
      "Xero invoices":
        xeroData?.integration_status === "Connected - active"
          ? xeroInvoicesActions
          : xeroInvoicesActions.slice(0, 1),
      "Paytrade invoices":
        xeroData?.integration_status === "Connected - active"
          ? paytradeInvoicesActions
          : paytradeInvoicesActions.slice(0, 1),
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
            activeRoute={"Invoices"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Invoices</h1>
            <p>Manage your paytrade and xero invoices</p>
          </div>
        </div>
      </div>

      <div className="pt_filtergroup">
        <div className="grid pt_topfilters">
          <div className="pt_filters ">
            <TabSwitch
              tabOptions={invoicesTabOptions}
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
                width: tabStatus === "Mapped invoices" ? "25%" : "50%",
              }}
            >
              <FormikControl
                placeholder={"Search by invoice"}
                control={InputType.SEARCH}
                onChange={(value: any) => {
                  if (currentPage !== 1) setCurrentPage(1);
                  setSearch(value);
                }}
                name={search}
                value={search}
                clearSearch={emptySearchField}
              />
              {(tabStatus === "Xero invoices" ||
                tabStatus === "Paytrade invoices") && (
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
          {/* {tabStatus === "Mapped invoices" && (
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
                  description: "Map invoices?",
                  id: "Map_bankAccounts?",
                })
              }
              styles={{ margin: "0 10px 10px 10px" }}
            />
          )} */}
          {tabStatus === "Xero invoices" && (
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
                    description: "Sync xero invoices?",
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
            handleManualMappingInvoices();
            return true;
          }}
          title="Invoice Mapping"
        >
          <br />
          <p className="text_center">
            Do you wish to map the below invoice?
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
              tabStatus === "Xero invoices"
                ? "Select invoice from paytrade"
                : "Select invoice from xero"
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
