//default imports
"use client";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
//import from reactstrap components and icons
import { ThreeDots } from "react-bootstrap-icons";
//import from customized components
import FormButton from "@/components/Button/button";
import ReusableDataTable from "@/components/DataTable/dataTable";
import Overlays from "@/components/Overlayes/Overlayes";
//import customized styles
import customStyles from "./clientsAndSuppliers.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { AppModal } from "@/components/model/model";
//import from external libraries
//import from constants, interfaces ,functions and services
import { ApplicationURLS } from "@/common/applicationURLS";
import { RowsPerPageInTable } from "@/common/constants";
import { DELETE, EDIT, VIEW } from "@/common/constants/general";
import {
  deleteClientSuppliersById,
  fetchClientSuppliersList,
  getClientSuppliersListByProjectId,
} from "./clientSuppliers.functions";
import {
  archiveActions,
  currentListActions,
  currentListDraftActions,
  tabOptions,
} from "./clientSuppliers.constant";
import TabContainer from "@/container/addGroups/tabsContainer";
import CustomSubHeader from "./customSubHeader";
import { useClientsSuppliersContext } from "./clientsAndSuppliersContext";
import { useAppDispatch } from "@/redux/store";
import {
  setAccountDetailsData,
  setClientsSuppliersData,
} from "@/redux/slices/clientSuppliersDetails";
import { tabId } from "@/container/userProjectOverview/userProjectOverview.constant";
//module level constants and interfaces

interface TableData {
  id: string;
  client_supplier_name: string;
  business_name: string;
  client_supplier_type: string;
  client_supplier_address: string;
  contract_count: string;
  claim_count: string;
  client_supplier_status: string;
  client_supplier_id: string;
}

export default function ClientsAndSuppliers({ overViewDetails = {} }: any) {
  const { overViewMode = false, data: overviewData } = overViewDetails;
  //Other Hooks
  const routePath = usePathname();
  const router = useRouter();
  const { selectedToggle, searchedValue }: any = useClientsSuppliersContext();
  const queryParams = useSearchParams();

  //useState and useEffect Management
  const [loading, setLoading] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);
  const dispatch = useAppDispatch();

  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState<boolean>(false);
  const [gridRowData, setGridRowData] = useState<any>({});

  const [clientSuppliersGridData, setClientSuppliersGridData] = useState<
    TableData[]
  >([]);

  const [selectedTab, setSelectedTab] = useState(
    queryParams.get("tab") === "archived"
      ? tabOptions[1]?.id
      : tabOptions[0]?.id
  );
  const [displayArchiveGrid] = useState(queryParams.get("tab") === "archived");

  useEffect(() => {
    dispatch(setClientsSuppliersData(""));
    dispatch(setAccountDetailsData(""));
  }, []);

  useEffect(() => {
    if (!overViewMode || (overViewMode && !!overviewData?.project_id)) {
      getClientSuppliersList(page, perPage);
    }
  }, [page, perPage, displayArchiveGrid, overviewData]);

  //Functions

  async function getClientSuppliersList(page: number, newPerPage: number) {
    const generalPayload = {
      company_id: Number(localStorage.getItem("companyId")),
      page_number: page,
      page_size: newPerPage,
      search: searchedValue,
      client_supplier_type: selectedToggle === "All" ? "" : selectedToggle,
    };
    const commonPostData = {
      getClientSupplierListsInput: {
        ...generalPayload,
        list_type: displayArchiveGrid ? "Archived" : null,
        client_supplier_status: null,
      },
    };

    const projectOverviewPostData = {
      getClientSuppliersListForProjectsInput: {
        ...generalPayload,
        project_id: overviewData?.project_id,
      },
    };

    const api = overViewMode
      ? getClientSuppliersListByProjectId(projectOverviewPostData)
      : fetchClientSuppliersList(commonPostData);

    setLoading(true);
    const response = await api;

    try {
      if (response) {
        setClientSuppliersGridData(response?.client_suppliers_list);
        setTotalRows(response?.total_count);
        setLoading(false);
      }
    } catch (err: any) {
      setLoading(false);
    }
  }

  function handleTabClick(tab: any) {
    if (tab === selectedTab) {
      return;
    } else if (tab === tabOptions[0]?.id) {
      setSelectedTab(tab);
      router.push(ApplicationURLS.USER_CLIENTS_AND_SUPPLIERS);
    } else if (tab === tabOptions[1]?.id) {
      setSelectedTab(tab);
      router.push(ApplicationURLS.USER_CLIENTS_AND_SUPPLIERS_ARCHIVE);
    }
  }

  function handleActions(type: any, data: TableData) {
    const { option } = type;

    if (option == VIEW || option == EDIT) {
      onSelectionOfViewOrEditMode(option, data?.id);
    } else if (option === DELETE || option === "Undo Delete") {
      setGridRowData(data);
      setDisplayConfirmationModal(true);
    } else if (option === "Add Payment Claim") {
      router.push(
        `${ApplicationURLS.USER_PAYMENT_CLAIMS_ADD}?client-supplier-type=${data?.client_supplier_type}&id=${data?.client_supplier_id}`
      );
    }
  }

  async function handlePageChange(page: number) {
    setPage(page);
  }

  async function handlePerRowsChange(newPerPage: number, page: number) {
    setPerPage(newPerPage);
  }

  const columns = [
    {
      name: "Name",

      wrap: true,
      fixed: "left",
      grow: 1,
      selector: (row: TableData) => row?.client_supplier_name,
    },
    {
      name: "Business name",
      grow: 1,
      selector: (row: TableData) => row?.business_name,
      wrap: true,
      fixed: "left",
    },
    {
      name: "Client/Supplier",
      wrap: true,
      grow: 0.5,
      selector: (row: TableData) => row?.client_supplier_type,
      fixed: "left",
    },

    {
      name: "Address",
      grow: 1.5,
      wrap: true,
      selector: (row: TableData) => row?.client_supplier_address,
      fixed: "left",
    },
    {
      name: "Payment Claims",
      grow: 0.8,
      wrap: true,
      selector: (row: TableData) => row?.claim_count,
      fixed: "left",
    },
    {
      name: "Contracts",
      fixed: "left",
      grow: 0,
      selector: (row: TableData) => row?.contract_count,
    },
    {
      name: "Status",
      wrap: true,
      grow: 0.5,
      selector: (row: TableData) => row?.client_supplier_status,
      fixed: "left",
    },
    {
      name: "Actions",
      fixed: "left",
      grow: true,

      cell: (row: TableData, index: number) => (
        <Overlays
          trigger="click"
          placement={"auto"}
          overlay={<span></span>}
          popoverTypes={"tableActions"}
          popoverActions={
            displayArchiveGrid
              ? archiveActions
              : row?.client_supplier_status === "Draft" || !row?.contract_count
              ? currentListDraftActions
              : currentListActions
          }
          optionClick={(data) => handleActions(data, row)}
        >
          <div className={customStyles.actionDots}>
            <ThreeDots />
          </div>
        </Overlays>
      ),
    },
  ];

  async function handleDelete() {
    setLoading(true);

    const postData: any = {
      id: gridRowData?.id,
      isDeleted: !displayArchiveGrid,
    };

    const response = await deleteClientSuppliersById(postData);
    if (response) {
      setDisplayConfirmationModal(false);
      await getClientSuppliersList(page, perPage);
    }

    setLoading(false);
  }

  function onSelectionOfViewOrEditMode(selectionOption: string, clientId: any) {
    if (overViewMode) {
      let route =
        selectionOption === VIEW
          ? ApplicationURLS.USER_VIEW_CLIENTS_AND_SUPPLIERS
          : ApplicationURLS.USER_EDIT_CLIENTS_AND_SUPPLIERS;

      router.push(
        `${route}/${clientId}?overview=${overviewData?.id}&from=${tabId.CLIENTS_AND_SUPPLIERS}`
      );
    } else {
      let route =
        selectionOption === VIEW
          ? ApplicationURLS.USER_VIEW_CLIENTS_AND_SUPPLIERS
          : ApplicationURLS.USER_EDIT_CLIENTS_AND_SUPPLIERS;

      router.push(
        `${route}/${clientId}?tab=${
          queryParams.get("tab") === "archived" ? "archived" : "current"
        }`
      );
    }
  }

  function navigateToViewPage(clientId: string) {
    router.push(
      `${ApplicationURLS.USER_VIEW_CLIENTS_AND_SUPPLIERS}/${clientId}`
    );
    onSelectionOfViewOrEditMode(VIEW, clientId);
  }

  //Render Template
  return (
    <div
      className={
        overViewMode
          ? `${customStyles.container} ${"p-0"}`
          : customStyles.container
      }
    >
      {!overViewMode && (
        <ReusableBreadcrumb
          items={[
            {
              href: ApplicationURLS.USER_DASHBOARD,
              label: "Home",
              active: routePath === ApplicationURLS.USER_DASHBOARD,
            },

            {
              href: displayArchiveGrid
                ? ApplicationURLS.USER_CLIENTS_AND_SUPPLIERS_ARCHIVE
                : ApplicationURLS.USER_CLIENTS_AND_SUPPLIERS,
              label: "Clients & Suppliers",
              active: true,
            },
          ]}
          separator={
            <span className={customStyles.breadcrumbSeparator}>&gt;</span>
          }
        />
      )}
      <div className={customStyles.headerContent}>
        {!overViewMode && (
          <span className={customStyles.headerText}>Clients & Suppliers</span>
        )}

        {!displayArchiveGrid && !overViewMode && (
          <FormButton
            className={customStyles.button}
            onClick={() =>
              router.push(ApplicationURLS.USER_ADD_CLIENTS_AND_SUPPLIERS)
            }
          >
            + New
          </FormButton>
        )}
      </div>
      {!overViewMode && (
        <div className={customStyles.subHeaderTabs}>
          <TabContainer
            tabs={tabOptions}
            activeTab={selectedTab}
            onTabClick={handleTabClick}
          />
        </div>
      )}
      <ReusableDataTable
        columns={columns}
        data={clientSuppliersGridData}
        subHeader
        subHeaderComponent={
          <CustomSubHeader
            invokeGridList={() => getClientSuppliersList(page, perPage)}
            gridData={clientSuppliersGridData}
          />
        }
        pagination
        progressPending={loading}
        paginationServer
        paginationTotalRows={totalRows}
        onChangeRowsPerPage={handlePerRowsChange}
        onChangePage={handlePageChange}
        onRowClicked={(data: any) => navigateToViewPage(data?.id)}
      />

      {displayConfirmationModal && (
        <AppModal
          show={displayConfirmationModal}
          onHide={() => setDisplayConfirmationModal(false)}
          secondButtonLabel="No"
          firstButtonLabel="Yes"
          modalHeading=""
          modalBodyTitle=""
          modalBodyContent={
            !displayArchiveGrid
              ? "Are you sure you wish to move the client / supplier to the archive with status updated to Deleted?"
              : "Do you want to undo delete on this client / supplier record?"
          }
          onConfirm={() => handleDelete()}
        />
      )}
    </div>
  );
}
