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
  autoMappingPayments,
  CreatePaymentsInPaytrade,
  CreatePaymentsInXero,
  getMappedPaymentsLists,
  GetPaytradePaymentsListsForCompany,
  getXeroDetailsForCompany,
  getXeroPaymentsListsForCompany,
  manualMappingPayments,
  syncAllPaymentsByCompanyId,
  unMappingPayments,
} from "../../integration.functions";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  invoicesTabOptions,
  mappedPaymentsHeaders,
  mappedPaymentsRenderData,
  paymentsTabOptions,
  paytradePaymentsHeaders,
  paytradePaymentsRenderData,
  statusOptions,
  xeroPaymentsHeaders,
  xeroPaymentsRenderData,
} from "../../integration.constant";
import GridExportActions from "@/components/GridExportActions";
import { formatDate } from "@/utils";

interface TableConfig {
  headers: any[];
  gridActions: any[];
  renderRowList: any[];
}

export default function XeroPayments() {
  const [tabStatus, setTabStatus] = useState(paymentsTabOptions[0]?.label);
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

  const paytradePaymentsActions = [
    {
      label: "Manual map",
      icon: "fa-light fa-link",
      onClick: (row: any) => handleOptionClick(row, "Manual Map"),
      conditionalApiDisplayKey: "manual",
    },
    // {
    //   label: "Sync to xero",
    //   icon: "fa-light fa-angle-double-right",
    //   onClick: (row: any) => handleOptionClick(row, "Sync to xero"),
    //   conditionalApiDisplayKey: "syncIcon",
    // },
  ];
  const xeroPaymentsActions = [
    {
      label: "Manual map",
      icon: "fa-light fa-link",
      onClick: (row: any) => handleOptionClick(row, "Manual Map"),
      conditionalApiDisplayKey: "manual",
    },
    // {
    //   label: "Sync to paytrade",
    //   icon: "fa-light fa-angle-double-left",
    //   onClick: (row: any) => handleOptionClick(row, "Sync to paytrade"),
    //   conditionalApiDisplayKey: "syncIcon",
    // },
  ];
  const mappedPaymentsActions = [
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
              Do you wish to unmap the below payment?
              <p style={{ marginTop: "10px" }}>
                {row?.payment_amount && (
                  <>
                    <b>Total Amount:</b>&nbsp;{row?.payment_amount}
                    <br />
                  </>
                )}
                {row?.contact_name && (
                  <>
                    <b>Contact Name:</b>&nbsp;{row?.contact_name}
                    <br />
                  </>
                )}
                {row?.payment_date && (
                  <>
                    <b>Payment date:</b>&nbsp;{formatDate(row?.payment_date)}
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
      case "Paytrade payments":
        return {
          headers: paytradePaymentsHeaders,
          gridActions: paytradePaymentsActions,
          renderRowList: paytradePaymentsRenderData,
        };
      case "Xero payments":
        return {
          headers: xeroPaymentsHeaders,
          gridActions: xeroPaymentsActions,
          renderRowList: xeroPaymentsRenderData,
        };
      case "Mapped payments":
        return {
          headers: mappedPaymentsHeaders,
          gridActions: mappedPaymentsActions,
          renderRowList: mappedPaymentsRenderData,
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

  const fetchXeroPayments = async (
    currentPage: number,
    entriesPerPage: number,
    search: string,
    setTableLoader: (loading: boolean) => void
  ) => {
    const data = await getXeroPaymentsListsForCompany(
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
        data?.payment_list.map((val: any) => {
          return {
            ...val,
            dynamicIcon: {
              syncIcon:
                val.mapped_status?.toLocaleLowerCase() == "mapped"
                  ? false
                  : val.status?.toLocaleLowerCase() !== "draft",
              manual: val.mapped_status?.toLocaleLowerCase() !== "mapped",
            },
            payment_amount: `$ ${
              val?.payment_amount
                ? Number(val?.payment_amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "0.00"
            }`,
            payment_date: formatDate(val?.payment_date),
          };
        }) || [],
      totalCount: data?.total_count || 0,
    };
  };

  const fetchPaytradePayments = async (
    currentPage: number,
    entriesPerPage: number,
    search: string,
    sortValues: any,
    setTableLoader: (loading: boolean) => void
  ) => {
    const data = await GetPaytradePaymentsListsForCompany(
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
        data?.payment_list.map((val: any) => {
          return {
            ...val,
            dynamicIcon: {
              syncIcon:
                val.mapped_status?.toLocaleLowerCase() == "mapped"
                  ? false
                  : val.status?.toLocaleLowerCase() !== "draft",
              manual: val.mapped_status?.toLocaleLowerCase() !== "mapped",
            },
            payment_amount: `$ ${
              val?.payment_amount
                ? Number(val?.payment_amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "0.00"
            }`,
            payment_date: formatDate(val?.payment_date),
          };
        }) || [],
      totalCount: data?.total_count || 0,
    };
  };

  const fetchMappedPayments = async (
    currentPage: number,
    entriesPerPage: number,
    search: string,
    setTableLoader: (loading: boolean) => void
  ) => {
    const data = await getMappedPaymentsLists(
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
        data?.payment_list.map((val: any) => {
          return {
            ...val,
            payment_amount: `$ ${
              val?.payment_amount
                ? Number(val?.payment_amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "0.00"
            }`,
            payment_date: formatDate(val?.payment_date),
          };
        }) || [],
      totalCount: data?.total_count || 0,
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      setTableLoader(true);
      if (tabStatus === "Xero payments") {
        const { contacts, totalCount } = await fetchXeroPayments(
          currentPage,
          entriesPerPage,
          search,
          setTableLoader
        );
        setGridData(contacts);
        setTotalRows(totalCount);
      } else if (tabStatus === "Paytrade payments") {
        const { contacts, totalCount } = await fetchPaytradePayments(
          currentPage,
          entriesPerPage,
          search,
          sortValues,
          setTableLoader
        );
        setGridData(contacts);
        setTotalRows(totalCount);
      } else if (tabStatus === "Mapped payments") {
        const { contacts, totalCount } = await fetchMappedPayments(
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
    if (tabStatus === "Xero payments" && label == "Manual Map") {
      getOptionForManualPaymentsMappingForXero();
      setSelectedContact(row);
      setShowManualMapping(true);
    } else if (tabStatus === "Paytrade payments" && label == "Manual Map") {
      getOptionForManualPaymentsMappingForPaytrade();
      setSelectedContact(row);
      setShowManualMapping(true);
    } else if (tabStatus === "Paytrade payments" && label === "Sync to xero") {
      setTableLoader(true);
      await CreatePaymentsInXero({ paymentClaimId: +row?.pt_claim_id });
      const { contacts, totalCount } = await fetchPaytradePayments(
        currentPage,
        entriesPerPage,
        search,
        sortValues,
        setTableLoader
      );
      setGridData(contacts);
      setTotalRows(totalCount);
    } else if (tabStatus === "Xero payments" && label === "Sync to paytrade") {
      setTableLoader(true);
      await CreatePaymentsInPaytrade({
        companyId: +(localStorage.getItem("companyId") || 0),
        invoiceId: row?.invoice_id,
      });
      const { contacts, totalCount } = await fetchXeroPayments(
        currentPage,
        entriesPerPage,
        search,
        setTableLoader
      );
      setGridData(contacts);
      setTotalRows(totalCount);
    }
  };

  const syncXeroPayments = async () => {
    setTableLoader(true);
    await syncAllPaymentsByCompanyId(
      {
        companyId: +(localStorage.getItem("companyId") || 0),
      },
      setTableLoader
    );
    const { contacts, totalCount } = await fetchXeroPayments(
      currentPage,
      entriesPerPage,
      search,
      setTableLoader
    );
    setGridData(contacts);
    setTotalRows(totalCount);
  };

  const handleAutoMappingPayments = async () => {
    await autoMappingPayments(
      {
        companyId: +(localStorage.getItem("companyId") || 0),
      },
      setTableLoader
    );
    const { contacts, totalCount } = await fetchMappedPayments(
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
      syncXeroPayments();
    } else if (modelConfig.id === "Map_bankAccounts?") {
      handleAutoMappingPayments();
    } else if (modelConfig.id === "Unmap_from?") {
      handleUnmapPayments();
    }
  };

  const handleUnmapPayments = async () => {
    await unMappingPayments(
      {
        paymentId: selectedContact?.payment_id,
      },
      setTableLoader
    );
    setTableLoader(true);
    const { contacts, totalCount } = await fetchMappedPayments(
      currentPage,
      entriesPerPage,
      search,
      setTableLoader
    );
    setGridData(contacts);
    setTotalRows(totalCount);
  };

  const getOptionForManualPaymentsMappingForXero = async () => {
    const data = await GetPaytradePaymentsListsForCompany(
      {
        payload: {
          company_id: +(localStorage.getItem("companyId") || 0),
        },
      },
      setTableLoader
    );
    setManualMapOptions(
      data?.payment_list.map((val: any) => {
        return {
          ...val,
          label: `Payment date: ${
            val?.payment_date ? formatDate(val?.payment_date) : "N/A"
          } 
                  Total Amount : ${
                    val?.payment_amount
                      ? Number(val?.payment_amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : "0.00"
                  }  Contact :  ${val?.contact_name}`,
        };
      })
    );
  };

  const getOptionForManualPaymentsMappingForPaytrade = async () => {
    const data = await getXeroPaymentsListsForCompany(
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
      data?.payment_list.map((val: any) => {
        return {
          ...val,
          label: `Payment date: ${
            val?.payment_date ? formatDate(val?.payment_date) : "N/A"
          } 
                  Total Amount : ${
                    val?.payment_amount
                      ? Number(val?.payment_amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : "0.00"
                  }  Contact :  ${val?.contact_name}`,
        };
      })
    );
  };

  const handleManualMappingPayments = async () => {
    await manualMappingPayments(
      tabStatus === "Paytrade payments"
        ? {
            payload: {
              payment_id: manualMapData?.payment_id,
              pt_payment_id: +selectedContact?.payment_id,
            },
          }
        : {
            payload: {
              payment_id: selectedContact?.payment_id,
              pt_payment_id: +manualMapData?.payment_id,
            },
          }
    );
    if (tabStatus === "Xero payments") {
      const { contacts, totalCount } = await fetchXeroPayments(
        currentPage,
        entriesPerPage,
        search,
        setTableLoader
      );
      setGridData(contacts);
      setTotalRows(totalCount);
    } else if (tabStatus === "Paytrade payments") {
      const { contacts, totalCount } = await fetchPaytradePayments(
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
      "Mapped payments": mappedPaymentsActions,
      "Xero payments":
        xeroData?.integration_status === "Connected - active"
          ? xeroPaymentsActions
          : xeroPaymentsActions.slice(0, 1),
      "Paytrade payments":
        xeroData?.integration_status === "Connected - active"
          ? paytradePaymentsActions
          : paytradePaymentsActions.slice(0, 1),
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
            activeRoute={"Payments"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Payments</h1>
            <p>Manage your paytrade and xero payments</p>
          </div>
        </div>
      </div>

      <div className="pt_filtergroup">
        <div className="grid pt_topfilters">
          <div className="pt_filters ">
            <TabSwitch
              tabOptions={paymentsTabOptions}
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
                width: tabStatus === "Mapped payments" ? "25%" : "50%",
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
              {(tabStatus === "Xero payments" ||
                tabStatus === "Paytrade payments") && (
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
          {tabStatus === "Xero payments" && (
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
                    description: "Sync xero payments?",
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
            handleManualMappingPayments();
            return true;
          }}
          title="Payment Mapping"
        >
          <br />
          <p className="text_center">
            Do you wish to map the below payment?
            <p style={{ marginTop: "10px" }}>
              {selectedContact?.payment_amount && (
                <>
                  <b>Total Amount:</b>&nbsp;{selectedContact?.payment_amount}
                  <br />
                </>
              )}
              {selectedContact?.contact_name && (
                <>
                  <b>Contact Name:</b>&nbsp;{selectedContact?.contact_name}
                  <br />
                </>
              )}
              {selectedContact?.payment_date && (
                <>
                  <b>Payment date:</b>&nbsp;
                  {formatDate(selectedContact?.payment_date)}
                </>
              )}
            </p>
            to:{" "}
          </p>
          <br />
          <SearchableSelect
            placeholder={
              tabStatus === "Xero payments"
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
