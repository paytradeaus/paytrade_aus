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
  BatchCreateContactsInPaytrade,
  BatchCreateContactsInXero,
  CreateContactInPaytrade,
  CreateContactInXero,
  fetchClientSuppliersList,
  getMappedContactListsForCompany,
  getPaytradeContactListsForCompany,
  getXeroContactListsForCompany,
  getXeroDetailsForCompany,
  manualMappingContact,
  permanentlyUnmapContact,
  reEnableContactMapping,
  syncAllContactsByCompanyId,
  syncContactFinancialDetails,
  syncContactInformation,
  unMappingContact,
} from "../../integration.functions";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  contactsTabOptions,
  mappedContactsHeaders,
  mappedContactsRenderData,
  paytradeContactsHeaders,
  paytradeContactsRenderData,
  permanentlyUnmappedContactsHeaders,
  permanentlyUnmappedContactsRenderData,
  statusOptions,
  xeroContactsHeaders,
  xeroContactsRenderData,
} from "../../integration.constant";
import GridExportActions from "@/components/GridExportActions";
import { useRouter, useSearchParams } from "next/navigation";

interface TableConfig {
  headers: any[];
  gridActions: any[];
  renderRowList: any[];
}

export default function XeroContacts() {
  const router = useRouter();
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

  const isXeroConnected = xeroData?.status === "ACTIVE";
  const [financialSyncLoading, setFinancialSyncLoading] =
    useState<boolean>(false);
  const [contactInfoSyncLoading, setContactInfoSyncLoading] =
    useState<boolean>(false);

  const paytradeContactsActions = [
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
  const xeroContactsActions = [
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
          // Task #289 — Render two-button choice inside the modal body
          // so the user can either Unmap (today's behaviour, may be
          // re-linked by name match) or Unmap permanently (sticky
          // exclusion).
          description: (
            <>
              <p>
                <b>{row?.pt_contact_name}</b> from <b>{row?.contact_name}</b>?
              </p>
              <br />
              <p style={{ fontSize: "0.9em", color: "#555" }}>
                Choose <b>Unmap</b> to clear the link (the contact may be
                re-linked automatically on the next Xero sync or webhook if the
                names match). Choose <b>Unmap permanently</b> to exclude this
                contact from all future auto-mapping and invoice/bill sync.
              </p>
              <br />
              <div style={{ display: "flex", justifyContent: "center" }}>
                <CustomButton
                  buttonName="UNMAP PERMANENTLY"
                  iconClassName="fa-light fa-ban"
                  buttonType={buttonType.CONTRAST_SMALL}
                  actionType="button"
                  onClick={async () => {
                    setModelConfig((prev: any) => ({ ...prev, show: false }));
                    await handlePermanentlyUnmapContact(row);
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

  // Task #289 — Per-row action on the "Permanently unmapped" tab.
  const permanentlyUnmappedContactsActions = [
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
              Re-enable mapping for <b>{row?.contact_name}</b>? This will
              return the contact to the normal unmapped pool so it can be
              mapped manually or by the auto-mapper.
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
      case "Permanently unmapped":
        return {
          headers: permanentlyUnmappedContactsHeaders,
          gridActions: permanentlyUnmappedContactsActions,
          renderRowList: permanentlyUnmappedContactsRenderData,
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
          const isUnmapped = val.mapped_status?.toLocaleLowerCase() !== "mapped";
          return {
            ...val,
            dynamicIcon: {
              syncIcon: isUnmapped && val.contact_status?.toLocaleLowerCase() !== "draft",
              manual: isUnmapped,
              createIcon: isUnmapped,
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
          const isUnmapped = val.mapped_status?.toLocaleLowerCase() !== "mapped";
          const isNotDraft = val.contact_status?.toLocaleLowerCase() !== "draft";
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
      } else if (tabStatus === "Permanently unmapped") {
        // Task #289 — Re-use the Xero contact list endpoint with the
        // dedicated `Permanently unmapped` filter value.
        const data = await getXeroContactListsForCompany(
          {
            payload: {
              company_id: +(localStorage.getItem("companyId") || 0),
              page_number: currentPage,
              page_size: entriesPerPage,
              search: search,
              sorting_field: sortValues?.sortKey || "",
              sorting_order: sortValues?.direction || "",
              mapped_status: "Permanently unmapped",
            },
          },
          setTableLoader
        );
        setGridData(data?.contact_list || []);
        setTotalRows(data?.total_count || 0);
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
    } else if (
      tabStatus === "Paytrade contacts" &&
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
            Create <b>{row?.client_supplier_name || row?.contact_name}</b> in Xero?
          </>
        ),
        id: "Create_in_xero?",
      });
    } else if (
      tabStatus === "Xero contacts" &&
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
            Create <b>{row?.contact_name}</b> in PayTrade?
          </>
        ),
        id: "Create_in_paytrade?",
      });
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

  const handleCreateInXero = async () => {
    setTableLoader(true);
    await CreateContactInXero({ clientSupplierId: +selectedContact?.contact_id });
    const { contacts, totalCount } = await fetchPaytradeContacts(
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
    await CreateContactInPaytrade({
      companyId: +(localStorage.getItem("companyId") || 0),
      contactId: selectedContact?.contact_id,
    });
    const { contacts, totalCount } = await fetchXeroContacts(
      currentPage,
      entriesPerPage,
      search,
      setTableLoader
    );
    setGridData(contacts);
    setTotalRows(totalCount);
  };

  const handleBatchCreateInPaytrade = async () => {
    setTableLoader(true);
    await BatchCreateContactsInPaytrade({
      companyId: +(localStorage.getItem("companyId") || 0),
    });
    const { contacts, totalCount } = await fetchXeroContacts(
      currentPage,
      entriesPerPage,
      search,
      setTableLoader
    );
    setGridData(contacts);
    setTotalRows(totalCount);
  };

  const handleBatchCreateInXero = async () => {
    setTableLoader(true);
    await BatchCreateContactsInXero({
      companyId: +(localStorage.getItem("companyId") || 0),
    });
    const { contacts, totalCount } = await fetchPaytradeContacts(
      currentPage,
      entriesPerPage,
      search,
      sortValues,
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
    } else if (modelConfig.id === "Create_in_xero?") {
      handleCreateInXero();
    } else if (modelConfig.id === "Create_in_paytrade?") {
      handleCreateInPaytrade();
    } else if (modelConfig.id === "Batch_create_in_paytrade?") {
      handleBatchCreateInPaytrade();
    } else if (modelConfig.id === "Batch_create_in_xero?") {
      handleBatchCreateInXero();
    } else if (modelConfig.id === "Re_enable_mapping?") {
      handleReEnableMapping();
    }
  };

  // Task #289 — Wire the in-modal "Unmap permanently" button.
  const handlePermanentlyUnmapContact = async (row?: any) => {
    const contact = row || selectedContact;
    setTableLoader(true);
    await permanentlyUnmapContact(
      { contactId: contact?.contact_id },
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

  const handleReEnableMapping = async () => {
    setTableLoader(true);
    await reEnableContactMapping(
      { contactId: selectedContact?.contact_id },
      setTableLoader
    );
    const data = await getXeroContactListsForCompany(
      {
        payload: {
          company_id: +(localStorage.getItem("companyId") || 0),
          page_number: currentPage,
          page_size: entriesPerPage,
          search: search,
          sorting_field: sortValues?.sortKey || "",
          sorting_order: sortValues?.direction || "",
          mapped_status: "Permanently unmapped",
        },
      },
      setTableLoader
    );
    setGridData(data?.contact_list || []);
    setTotalRows(data?.total_count || 0);
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
      "Xero contacts": isXeroConnected
        ? xeroContactsActions
        : xeroContactsActions.slice(0, 1),
      "Paytrade contacts": isXeroConnected
        ? paytradeContactsActions
        : paytradeContactsActions.slice(0, 1),
      "Permanently unmapped": permanentlyUnmappedContactsActions,
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
            <>
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
              {isXeroConnected && (
                <>
                  <CustomButton
                    buttonName={contactInfoSyncLoading ? "Syncing..." : "SYNC CONTACT INFO"}
                    iconClassName="fa-light fa-address-card"
                    buttonType={buttonType.CONTRAST_SMALL}
                    actionType="button"
                    disabled={contactInfoSyncLoading}
                    onClick={async () => {
                      setContactInfoSyncLoading(true);
                      await syncContactInformation(
                        { companyId: +(localStorage.getItem("companyId") || 0) },
                        setContactInfoSyncLoading
                      );
                    }}
                    styles={{ margin: "0 10px 10px 10px" }}
                  />
                  <CustomButton
                    buttonName={financialSyncLoading ? "Syncing..." : "SYNC FINANCIAL DETAILS"}
                    iconClassName="fa-light fa-money-check-dollar"
                    buttonType={buttonType.CONTRAST_SMALL}
                    actionType="button"
                    disabled={financialSyncLoading}
                    onClick={async () => {
                      setFinancialSyncLoading(true);
                      await syncContactFinancialDetails(
                        { companyId: +(localStorage.getItem("companyId") || 0) },
                        setFinancialSyncLoading
                      );
                    }}
                    styles={{ margin: "0 10px 10px 10px" }}
                  />
                </>
              )}
            </>
          )}
          {tabStatus === "Xero contacts" && (
            <>
              <CustomButton
                buttonName={tableLoader ? "Syncing..." : "SYNC"}
                iconClassName="fa-light fa-sync"
                buttonType={buttonType.CONTRAST_SMALL}
                actionType="button"
                // Task #135 — Disable while a sync (or any other table
                // load) is in flight so a rapid double-click can't fire
                // a second `syncAllContactsByCompanyId` mutation. The
                // backend per-company Redis lock backstops this, but
                // gating the button keeps the UI quiet for the user.
                disabled={tableLoader}
                onClick={() => {
                  if (tableLoader) return;
                  setModelConfig({
                    show: true,
                    title: "",
                    secondButtonName: "Sync",
                    firstButtonName: "Cancel",
                    description: "Sync xero contacts?",
                    id: "Sync_xero_contacts?",
                  });
                }}
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
                        "Create all unmapped Xero contacts in PayTrade? Contacts with missing required fields will be skipped.",
                      id: "Batch_create_in_paytrade?",
                    })
                  }
                  styles={{ margin: "0 10px 10px 10px" }}
                />
              )}
            </>
          )}
          {tabStatus === "Paytrade contacts" &&
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
                      "Create all unmapped PayTrade contacts in Xero?",
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
