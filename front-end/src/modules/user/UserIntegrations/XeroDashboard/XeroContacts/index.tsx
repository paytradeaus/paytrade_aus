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
  autoMappingContact,
  CreateContactInPaytrade,
  CreateContactInXero,
  fetchClientSuppliersList,
  getMappedContactListsForCompany,
  getPaytradeContactListsForCompany,
  getXeroContactListsForCompany,
  getXeroDetailsForCompany,
  manualMappingContact,
  syncAllContactsByCompanyId,
  unMappingContact,
} from "../../integration.functions";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  contactsTabOptions,
  mappedContactsHeaders,
  mappedContactsRenderData,
  paytradeContactsHeaders,
  paytradeContactsRenderData,
  statusOptions,
  xeroContactsHeaders,
  xeroContactsRenderData,
} from "../../integration.constant";
import GridExportActions from "@/components/GridExportActions";
import { useSearchParams } from "next/navigation";

interface TableConfig {
  headers: any[];
  gridActions: any[];
  renderRowList: any[];
}

export default function XeroContacts() {
  const queryParams = useSearchParams();
  const to = queryParams.get("navigateTo") || 0;
  const [tabStatus, setTabStatus] = useState(contactsTabOptions[+to]?.label);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [emptySearchField, setEmptySearchField] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [tableLoader, setTableLoader] = useState(false);

  const [headers, setHeaders] = useState<any>([]);
  const [gridData, setGridData] = useState([]);
  const [gridActions, setGridActions] = useState([]);
  const [renderRowList, setRenderRowList] = useState([]);

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
  const [xeroData, setXeroData] = useState<any>("");

  const [status, setStatus] = useState("");

  const [showTable, setShowTable] = useState(true);
  const [showManualMapping, setShowManualMapping] = useState(false);
  const [manualMapData, setManualMapData] = useState<any>("");
  const [manualMapOptions, setManualMapOptions] = useState([]);

  const paytradeContactsActions = [
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
  const xeroContactsActions = [
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
  const mappedContactsActions = [
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
              <b>{row?.pt_contact_name}</b> from <b>{row?.contact_name}</b>?
            </>
          ),
        });
      },
      displayByDefault: true,
    },
  ];

  const getTableConfig = (): TableConfig => {
    switch (tabStatus) {
      case "Paytrade contacts":
        return {
          headers: paytradeContactsHeaders,
          gridActions: paytradeContactsActions,
          renderRowList: paytradeContactsRenderData,
        };
      case "Xero contacts":
        return {
          headers: xeroContactsHeaders,
          gridActions: xeroContactsActions,
          renderRowList: xeroContactsRenderData,
        };
      case "Mapped contacts":
        return {
          headers: mappedContactsHeaders,
          gridActions: mappedContactsActions,
          renderRowList: mappedContactsRenderData,
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

  const fetchXeroContacts = async (
    currentPage: number,
    entriesPerPage: number,
    search: string,
    setTableLoader: (loading: boolean) => void
  ) => {
    const data = await getXeroContactListsForCompany(
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
        data?.contact_list.map((val: any) => {
          return {
            ...val,
            dynamicIcon: {
              syncIcon:
                val.mapped_status?.toLocaleLowerCase() == "mapped"
                  ? false
                  : val.contact_status?.toLocaleLowerCase() !== "draft",
              manual: val.mapped_status?.toLocaleLowerCase() !== "mapped",
            },
          };
        }) || [],
      totalCount: data?.total_count || 0,
    };
  };

  const fetchPaytradeContacts = async (
    currentPage: number,
    entriesPerPage: number,
    search: string,
    sortValues: any,
    setTableLoader: (loading: boolean) => void
  ) => {
    const data = await fetchClientSuppliersList(
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
        data?.contact_list.map((val: any) => {
          return {
            ...val,
            dynamicIcon: {
              syncIcon:
                val.mapped_status?.toLocaleLowerCase() == "mapped"
                  ? false
                  : val.contact_status?.toLocaleLowerCase() !== "draft",
              manual: val.mapped_status?.toLocaleLowerCase() !== "mapped",
            },
          };
        }) || [],
      totalCount: data?.total_count || 0,
    };
  };

  const fetchMappedContacts = async (
    currentPage: number,
    entriesPerPage: number,
    search: string,
    setTableLoader: (loading: boolean) => void
  ) => {
    const data = await getMappedContactListsForCompany(
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
      contacts: data?.contact_list || [],
      totalCount: data?.total_count || 0,
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      setTableLoader(true);
      if (tabStatus === "Xero contacts") {
        const { contacts, totalCount } = await fetchXeroContacts(
          currentPage,
          entriesPerPage,
          search,
          setTableLoader
        );
        setGridData(contacts);
        setTotalRows(totalCount);
      } else if (tabStatus === "Paytrade contacts") {
        const { contacts, totalCount } = await fetchPaytradeContacts(
          currentPage,
          entriesPerPage,
          search,
          sortValues,
          setTableLoader
        );
        setGridData(contacts);
        setTotalRows(totalCount);
      } else if (tabStatus === "Mapped contacts") {
        const { contacts, totalCount } = await fetchMappedContacts(
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
    if (tabStatus === "Xero contacts" && label == "Manual Map") {
      getOptionForManualContactMapping();
      setSelectedContact(row);
      setShowManualMapping(true);
    } else if (tabStatus === "Paytrade contacts" && label == "Manual Map") {
      getOptionForManualContactMappingXero();
      setSelectedContact(row);
      setShowManualMapping(true);
    } else if (tabStatus === "Paytrade contacts" && label === "Sync to xero") {
      setTableLoader(true);
      await CreateContactInXero({ clientSupplierId: +row?.contact_id });
      const { contacts, totalCount } = await fetchPaytradeContacts(
        currentPage,
        entriesPerPage,
        search,
        sortValues,
        setTableLoader
      );
      setGridData(contacts);
      setTotalRows(totalCount);
    } else if (tabStatus === "Xero contacts" && label === "Sync to paytrade") {
      setTableLoader(true);
      await CreateContactInPaytrade({
        companyId: +(localStorage.getItem("companyId") || 0),
        contactId: row?.contact_id,
      });
      const { contacts, totalCount } = await fetchXeroContacts(
        currentPage,
        entriesPerPage,
        search,
        setTableLoader
      );
      setGridData(contacts);
      setTotalRows(totalCount);
    }
  };

  const syncXeroContacts = async () => {
    setTableLoader(true);
    await syncAllContactsByCompanyId(
      {
        companyId: +(localStorage.getItem("companyId") || 0),
      },
      setTableLoader
    );
    const { contacts, totalCount } = await fetchXeroContacts(
      currentPage,
      entriesPerPage,
      search,
      setTableLoader
    );
    setGridData(contacts);
    setTotalRows(totalCount);
  };

  const handleAutoMappingContact = async () => {
    await autoMappingContact(
      {
        companyId: +(localStorage.getItem("companyId") || 0),
      },
      setTableLoader
    );
    const { contacts, totalCount } = await fetchMappedContacts(
      currentPage,
      entriesPerPage,
      search,
      setTableLoader
    );
    setGridData(contacts);
    setTotalRows(totalCount);
  };

  const modelClose = () => {
    if (modelConfig.id === "Sync_xero_contacts?") {
      syncXeroContacts();
    } else if (modelConfig.id === "Map_contacts?") {
      handleAutoMappingContact();
    } else if (modelConfig.id === "Unmap_from?") {
      handleUnmapContact();
    }
  };

  const handleUnmapContact = async () => {
    await unMappingContact(
      {
        contactId: selectedContact?.contact_id,
      },
      setTableLoader
    );
    setTableLoader(true);
    const { contacts, totalCount } = await fetchMappedContacts(
      currentPage,
      entriesPerPage,
      search,
      setTableLoader
    );
    setGridData(contacts);
    setTotalRows(totalCount);
  };

  const getOptionForManualContactMapping = async () => {
    const option = await getPaytradeContactListsForCompany({
      payload: {
        company_id: +(localStorage.getItem("companyId") || 0),
        search: null,
      },
    });
    setManualMapOptions(option);
  };

  const getOptionForManualContactMappingXero = async () => {
    const data = await getXeroContactListsForCompany(
      {
        payload: {
          company_id: +(localStorage.getItem("companyId") || 0),
          search: search,
        },
      },
      setTableLoader
    );
    setManualMapOptions(data?.contact_list);
  };

  const handleManualMappingContact = async () => {
    await manualMappingContact(
      tabStatus === "Paytrade contacts"
        ? {
            payload: {
              contact_id: manualMapData?.contact_id,
              pt_contact_id: selectedContact?.contact_id,
            },
          }
        : {
            payload: {
              contact_id: selectedContact?.contact_id,
              pt_contact_id: manualMapData?.contact_id,
            },
          }
    );
    if (tabStatus === "Xero contacts") {
      const { contacts, totalCount } = await fetchXeroContacts(
        currentPage,
        entriesPerPage,
        search,
        setTableLoader
      );
      setGridData(contacts);
      setTotalRows(totalCount);
    } else if (tabStatus === "Paytrade contacts") {
      const { contacts, totalCount } = await fetchPaytradeContacts(
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
      "Mapped contacts": mappedContactsActions,
      "Xero contacts":
        xeroData?.integration_status === "Connected - active"
          ? xeroContactsActions
          : xeroContactsActions.slice(0, 1),
      "Paytrade contacts":
        xeroData?.integration_status === "Connected - active"
          ? paytradeContactsActions
          : paytradeContactsActions.slice(0, 1),
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
            activeRoute={"Contacts"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Contacts</h1>
            <p>Manage your paytrade and xero contacts</p>
          </div>
        </div>
      </div>

      <div className="pt_filtergroup">
        <div className="grid pt_topfilters">
          <div className="pt_filters ">
            <TabSwitch
              tabOptions={contactsTabOptions}
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
              style={{ width: tabStatus === "Mapped contacts" ? "25%" : "50%" }}
            >
              <FormikControl
                placeholder={"Search by contact name"}
                control={InputType.SEARCH}
                onChange={(value: any) => {
                  if (currentPage !== 1) setCurrentPage(1);
                  setSearch(value);
                }}
                name={search}
                value={search}
                clearSearch={emptySearchField}
              />
              {(tabStatus === "Xero contacts" ||
                tabStatus === "Paytrade contacts") && (
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
          {tabStatus === "Mapped contacts" && (
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
                  description: "Map contacts?",
                  id: "Map_contacts?",
                })
              }
              styles={{ margin: "0 10px 10px 10px" }}
            />
          )}
          {tabStatus === "Xero contacts" && (
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
                    description: "Sync xero contacts?",
                    id: "Sync_xero_contacts?",
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
            handleManualMappingContact();
            return true;
          }}
          title="Contact Mapping"
        >
          <br />
          <p className="text_center">
            Map{" "}
            <b>
              {selectedContact?.contact_name ||
                selectedContact?.client_supplier_name}
            </b>{" "}
            to:{" "}
          </p>
          <br />
          <SearchableSelect
            placeholder={
              tabStatus === "Xero contacts"
                ? "Select contact from paytrade contacts"
                : "Select contact from xero contacts"
            }
            label=""
            isInPopup={true}
            name={"contact"}
            renderKey="contact_name"
            options={manualMapOptions}
            valueKey="contact_id"
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
