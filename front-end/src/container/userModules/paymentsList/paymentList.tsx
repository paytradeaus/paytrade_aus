"use client";
import React, { useEffect, useState } from "react";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import Overlays from "@/components/Overlayes/Overlayes";
import {
  Printer,
  ThreeDots,
  FileEarmarkExcel,
  ArrowClockwise,
} from "react-bootstrap-icons";
import FormButton from "@/components/Button/button";
import styles from "./paymentList.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { usePathname, useRouter } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";
import { ApplicationURLS } from "@/common/applicationURLS";
import { RowsPerPageInTable } from "@/common/constants";
import { AppModal } from "@/components/model/model";
import {
  convertJsonToExcel,
  convertPositiveDecimalTwoDigit,
  generateAndPrintPDF,
} from "@/common/commonFunctions";
import RadioSwitchToggle from "@/components/RadioSwitch/RadioSwitch";
import {
  ActionItem,
  PAYMENT_CLAIM_OPTIONS,
  PAYMENT_OPTIONS,
  TOGGLE_OPTIONS,
  overviewModeType,
} from "./paymentsList.constant";
import { Col } from "react-bootstrap";
import { getCookie } from "cookies-next";
import { ListAllPaymentsInput } from "../paymentToDoList/paymentToDoList.functions";
import { PaymentData } from "../paymentToDoList/paymentToDoList.types";
import { tabOptions } from "../bankTrustAccount/bankTrustAccount.constant";
import TabContainer from "@/container/addGroups/tabsContainer";
import { DeletePayments } from "../bankTrustAccount/backTrustAccount.functions";
import { VIEW, VIEW_ARCHIVE } from "@/common/constants/general";
import { tabId } from "@/container/userProjectOverview/userProjectOverview.constant";
import {
  fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList,
  getListActionButtons,
} from "@/app/api/commonAPIs";
import { useDispatch } from "react-redux";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";

const PaymentLists = (props: any) => {
  const { isArchived = false, overViewDetails = {} } = props;
  const dispatch = useDispatch();
  const routePath = usePathname();
  const router = useRouter();
  const selectedCompanyId = Number(getCookie("companyId")) || 0;

  const [loading, setLoading] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);
  const [paymentsListData, setPaymentsListData] = useState<any[]>([]);
  console.log("🚀 ~ PaymentLists ~ paymentsListData:", paymentsListData);
  const [openModal, setOpenModal] = useState(false);
  const [actionData, setActionData] = useState<any>();
  console.log("🚀 ~ PaymentLists ~ actionData:", actionData);
  const [popupMessage, setPopupMessage] = useState({
    headerMsg: "",
    subHeaderMsg: "",
  });
  const [printDocumentData, setPrintDocumentData] = useState<any>([]);

  const [selectedToggle, setSelectedToggle] = useState<string>("All");

  const [selectedPayment, setSelectedPayment] = useState<any>();
  const [paymentType, setPaymentType] = useState("");

  const [selectedClaim, setSelectedClaim] = useState<any>();
  const [claimType, setClaimType] = useState("");

  const [projectOpt, setProjectOpt] = useState<any>([]);
  const [selectedProject, setSelectedProject] = useState<any>();
  const [projectId, setProjectId] = useState("");

  const [contractOpt, setContractOpt] = useState<any>([]);
  const [selectedContract, setSelectedContract] = useState<any>();
  const [contractId, setContractId] = useState("");

  const [clientsOpt, setClientsOpt] = useState<any>([]);
  const [selectedClient, setSelectedClient] = useState<any>();
  const [clientId, setClientId] = useState("");
  const [activeTab, setActiveTab] = useState(
    isArchived ? tabOptions[1].id : tabOptions[0].id
  );
  const [popoverActions, setPopoverActions] = useState<ActionItem[]>([]);
  const [actionLoader, setActionLoader] = useState(false);

  const [displayDatePopup, setDisplayDatePopup] = useState(false); // State to control the popup

  const [datePopupAcknowledged, setDatePopupAcknowledged] = useState(false);

  const [tempselectedDate, setTempSelectedDate] = useState<any>();

  // Constant to check if any filter is applied
  const isAnyFilterActive = Boolean(
    paymentType || claimType || projectId || contractId || clientId
  );

  const resetFilters = () => {
    setSelectedPayment(null);
    setPaymentType("");
    setSelectedClaim(null);
    setClaimType("");
    setSelectedProject(null);
    setProjectId("");
    setSelectedContract(null);
    setContractId("");
    setSelectedClient(null);
    setClientId("");
  };

  useEffect(() => {
    dispatch(setScreenDetails({}));

    const fetchFilterOptions = async () => {
      const filterPayload = {
        project_id: projectId || overViewDetails?.data?.project_id || null,
        contract_id: contractId || overViewDetails?.data?.contract_id || null,
        client_supplier_id: clientId ? +clientId : null,
        company_id: selectedCompanyId || null,
        client_supplier_type:
          selectedToggle === "Receivable"
            ? "Client"
            : selectedToggle === "Billable"
            ? "Supplier"
            : null,
      };

      // Fetch the filter options for projects, contracts, and client suppliers
      const filterData =
        await fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList(
          filterPayload
        );

      if (filterData) {
        // Set Project Options
        if (filterData?.projects && filterData?.projects.length > 0) {
          const projectOptions = [
            { label: "All", value: "" },
            ...filterData.projects.map((project: any) => ({
              label: project.project_name,
              value: project.project_id,
            })),
          ];
          setProjectOpt(projectOptions);
        }

        // Set Client Supplier Options
        if (
          filterData?.clientSuppliers &&
          filterData?.clientSuppliers.length > 0
        ) {
          const clientSupplierOptions = [
            { label: "All", value: "" },
            ...filterData.clientSuppliers.map((client: any) => ({
              label: client.client_supplier_name,
              value: client.client_supplier_id,
            })),
          ];
          setClientsOpt(clientSupplierOptions);
        }

        // Set Contract Options
        if (filterData?.contracts && filterData?.contracts.length > 0) {
          const contractOptions = [
            { label: "All", value: "" },
            ...filterData.contracts.map((contract: any) => ({
              label: contract.contract_name,
              value: contract.contract_id,
            })),
          ];
          setContractOpt(contractOptions);
        }
      }
    };

    fetchFilterOptions();
  }, [selectedCompanyId, projectId, contractId, clientId, selectedToggle]);

  useEffect(() => {
    getPaymentsListData(page, perPage);
  }, [selectedToggle, paymentType, projectId, contractId, claimType, clientId]);

  const getPaymentsListData = async (page: number, rowsPerPage: number) => {
    setLoading(true);
    const adminUserList = await ListAllPaymentsInput(
      {
        payment_type: paymentType === "All" ? "" : paymentType || "",
        company_id: selectedCompanyId,
        page_number: page,
        page_size: rowsPerPage,
        status: isArchived ? "Void" : null,
        // is_paid_confirmed: false,
        project_id: projectId || overViewDetails?.data?.project_id || null,
        contract_id: contractId || overViewDetails?.data?.contract_id || null,
        cash_retention_type: claimType || null,
        claim_type: selectedToggle === "All" ? null : selectedToggle || null,
        client_supplier_id: clientId ? +clientId : null,
      },
      setLoading
    );
    setPaymentsListData(adminUserList?.payments || []);
    setTotalRows(adminUserList?.total_count || 0);
    setPerPage(rowsPerPage);
    let printDataObjCreation = adminUserList?.payments?.map(
      (user: PaymentData) => {
        return {
          payment_type: user?.payment_type || "",
          project_name: user?.project_name || "",
          contract_name: user?.contract_name || "",
          payment_from_account: user?.payment_from_account_name || "",
          payment_to_account: user?.payment_to_account_name || "",
          payment_amount: `$ ${
            user?.payment_amount
              ? convertPositiveDecimalTwoDigit(user?.payment_amount)
              : " 0.00"
          }`,
          status: user?.status || "",
        };
      }
    );

    setPrintDocumentData(printDataObjCreation);
  };
  function downloadExcel() {
    const columnNames = [
      { value: "payment_type", label: "Payment Type" },
      { value: "project_name", label: "Project" },
      { value: "contract_name", label: "Contract" },
      { value: "payment_from_account", label: "Payment From Account" },
      { value: "payment_to_account", label: "Payment To Account" },
      { value: "payment_amount", label: "Payment Amount" },
      { value: "status", label: "Status" },
    ];
    convertJsonToExcel(printDocumentData, "payments list", columnNames);
  }

  const handlePaymentChange = (selectedValue: any) => {
    setPaymentType(selectedValue.value);
    setSelectedPayment(selectedValue);
  };

  const handleClaimChange = (selectedValue: any) => {
    setClaimType(selectedValue.value);
    setSelectedClaim(selectedValue);
  };

  const handleProjectChange = (selectedValue: any) => {
    setProjectId(selectedValue.value);
    setSelectedProject(selectedValue);
  };

  const handleContractChange = (selectedValue: any) => {
    setContractId(selectedValue.value);
    setSelectedContract(selectedValue);
  };

  const handleClientsChange = (selectedValue: any) => {
    setClientId(selectedValue.value);
    setSelectedClient(selectedValue);
  };

  const handleThreeDotsClick = async (row: PaymentData) => {
    setPopoverActions([]);
    setActionLoader(true);
    try {
      const Payload = {
        payment_id: row?.payment_id,
      };

      const response = await getListActionButtons(Payload);

      if (response && response?.payment_list_buttons) {
        const newPopoverActions = [
          { label: "View", value: "View" },
          ...(response.payment_list_buttons.delete
            ? [{ label: "Delete", value: "Delete", isDelete: true }]
            : []),
        ];

        // Update popoverActions state with fetched actions
        setPopoverActions(newPopoverActions);
      } else {
        // Handle case where response is null or does not contain expected data
        console.error("Failed to fetch action buttons");
      }
      setActionLoader(false);
    } catch (error) {
      setActionLoader(false);
    }
  };

  const handleOptionClick = async (
    data: { id: string; option: string; type: any },
    row: PaymentData
  ) => {
    const { option } = data;
    setActionData(data);
    if (option === "Delete") {
      setOpenModal(!openModal);
      setPopupMessage((prev) => ({
        headerMsg: "",
        subHeaderMsg:
          "Are you sure you wish to move this Payment to the archive?",
      }));
    }
    if (option === "View") {
      navigateToViewPage(row);
    }
  };

  const handlePaymentClick = async (data: { id: string; option: string }) => {
    const { id, option } = data;
    switch (option) {
      case "Payment Claim":
        router.push(`${ApplicationURLS.USER_PAY_APPS}`);
        break;

      case "Retention Claim":
        router.push(
          `${ApplicationURLS.USER_PAY_APPS}?retention-type=Retention claim`
        );
        break;

      case "Interest Received":
        router.push(
          `${ApplicationURLS.USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT}?type=Interest Received`
        );
        break;
      case "Interest Withdrawal":
        router.push(
          `${ApplicationURLS.USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT}?type=Interest Withdrawal`
        );
        break;
      case "Bank Charge Applied":
        router.push(
          `${ApplicationURLS.USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT}?type=Bank Charge Applied`
        );
        break;
      case "Bank Charge Top Up":
        router.push(
          `${ApplicationURLS.USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT}?type=Bank Charge Top Up`
        );
        break;
      case "Top Up":
        router.push(
          `${ApplicationURLS.USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT}?type=Top Up`
        );
        break;
      case "Top Up Retention":
        router.push(
          `${ApplicationURLS.USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT}?type=Top Up Retention`
        );
        break;
      case "Withdrawal":
        router.push(
          `${ApplicationURLS.USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT}?type=Withdrawal`
        );
        break;
      case "Overpayment refund from supplier":
        router.push(
          `${ApplicationURLS.USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT}?type=Overpayment refund from supplier`
        );
        break;
      case "Overpayment refund to client":
        router.push(
          `${ApplicationURLS.USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT}?type=Overpayment refund to client`
        );
        break;
      case "Overpayment to supplier":
        router.push(
          `${ApplicationURLS.USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT}?type=Overpayment to supplier`
        );
        break;
      case "Underpayment to supplier":
        router.push(
          `${ApplicationURLS.USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT}?type=Underpayment to supplier`
        );
        break;
      case "Overpayment from client":
        router.push(
          `${ApplicationURLS.USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT}?type=Overpayment from client`
        );
        break;
      case "Underpayment from client":
        router.push(
          `${ApplicationURLS.USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT}?type=Underpayment from client`
        );
        break;
      default:
        break;
    }
  };
  const handlePrintPDF = () => {
    let formatedTableData: any[] = printDocumentData?.map((user: any) => [
      user?.payment_type,
      user?.project_name,
      user?.contract_name,
      user?.payment_from_account,
      user?.payment_to_account,
      user?.payment_amount,
      user?.status,
    ]);

    let headerNames: string[] = [
      "Payment Type",
      "Project",
      "Contract",
      "Payment From Account",
      "Payment To Account",
      "Payment Amount",
      "Status",
    ];
    generateAndPrintPDF(formatedTableData, headerNames, "payments list");
  };

  // const handleModalPopUpFunction = async () => {
  //   setOpenModal(!openModal);
  //   if (actionData.option === "Delete") {
  //     const payload = {
  //       payment_id: actionData?.id,
  //       status: "Deleted",
  //     };
  //     const response = await DeletePayments(payload);
  //     if (response) {
  //       await getPaymentsListData(page, perPage);
  //     }
  //   }
  // };

  // Popup confirmation handler
  function handleDatePopupConfirm() {
    if (!tempselectedDate) {
      console.warn("Please select a date before confirming."); // Handle missing date
      return;
    }

    setDatePopupAcknowledged(true); // Mark popup as acknowledged
    setDisplayDatePopup(false); // Close the popup
    deletePayment(actionData?.id); // Proceed with deletion
  }

  const handleModalPopUpFunction = async () => {
    setOpenModal(!openModal);

    if (actionData.option === "Delete") {
      const paymentType = actionData?.type;

      // List of payment types that require a date input popup
      const paymentTypesRequiringPopup = [
        "Pay Less - Full",
        "Pay Less - Part",
        "Pay - Zero",
        "pay 3rd party only",
        "3rd Party",
        null,
      ];

      const userMode = localStorage.getItem("userMode");

      // If popup conditions are met, show the date input popup
      if (
        !datePopupAcknowledged &&
        userMode !== "Normal" &&
        paymentTypesRequiringPopup.includes(paymentType)
      ) {
        setDisplayDatePopup(true);
      } else {
        // Call the new function to handle deletion
        await deletePayment(actionData?.id);
      }
    }
  };

  const deletePayment = async (paymentId: string | undefined) => {
    if (!paymentId) return;

    const payload = {
      payment_id: paymentId,
      status: "Deleted",
      input_date: tempselectedDate ? new Date(tempselectedDate) : null,
    };

    const response = await DeletePayments(payload);

    if (response) {
      // After deletion, fetch updated data
      await getPaymentsListData(page, perPage);
    }
  };

  const handlePageChange = async (page: number) => {
    setPage(page);
    await getPaymentsListData(page, perPage);
  };

  const handlePerRowsChange = async (newPerPage: number, page: number) => {
    setPerPage(newPerPage);
    await getPaymentsListData(page, newPerPage);
  };

  const handleTabClick = (tabId: string) => {
    if (activeTab === tabId) {
      return;
    }

    if (tabId === "currentAccounts") {
      router.push(ApplicationURLS.USER_PAYMENTS_LIST_CURRENT);
    } else {
      router.push(ApplicationURLS.USER_PAYMENTS_LIST_ARCHIVED);
    }
  };

  const handleResetClick = () => {
    resetFilters();
    getPaymentsListData(1, perPage); // Reset and fetch data
  };

  const columns = [
    {
      name: "Payment Type",
      minWidth: "200px",
      wrap: true,
      selector: (row: PaymentData) => row?.payment_type || "",
    },
    {
      name: "Project",
      minWidth: "200px",
      selector: (row: PaymentData) => row?.project_name || "",
      wrap: true,
      fixed: "left",
    },
    {
      name: "Contract",
      minWidth: "200px",
      selector: (row: PaymentData) => row?.contract_name || "",
      wrap: true,
      fixed: "left",
    },
    {
      name: "Payment From Account",
      minWidth: "200px",
      selector: (row: PaymentData) => row?.payment_from_account_name || "",
      wrap: true,
      fixed: "left",
    },
    {
      name: "Payment To Account",
      minWidth: "200px",
      selector: (row: PaymentData) => row?.payment_to_account_name || "",
      wrap: true,
      fixed: "left",
      grow: true,
    },
    {
      name: "Payment Amount",
      right: true,
      selector: (row: PaymentData) =>
        `$ ${
          row?.payment_amount
            ? convertPositiveDecimalTwoDigit(row?.payment_amount)
            : "0.00"
        }`,
      wrap: true,
      minWidth: "200px",
      fixed: "left",
      grow: true,
    },
    {
      name: "Status",
      selector: (row: PaymentData) => row?.list_status || "",
      fixed: "right",
      grow: true,
      wrap: true,
      minWidth: "200px",
    },

    {
      name: "Actions",
      fixed: "right",
      grow: true,
      center: true,
      cell: (row: PaymentData, index: number) => (
        <Overlays
          trigger="click"
          placement={"bottom-end"}
          overlay={<span></span>}
          isLoading={actionLoader}
          popoverTypes={"tableActions"}
          popoverActions={popoverActions}
          optionClick={(data) => handleOptionClick(data, row)}
          cellData={{
            id: row?.payment_id,
            type: row?.payment_type,
            Inputdate: row?.input_date,
          }}
          popperConfig={{
            modifiers: [
              {
                name: "offset",
                options: {
                  offset: [20, 10], // Adjust the offset as needed
                },
              },
            ],
          }}
        >
          <div className={styles.dotsContainer}>
            <ThreeDots onClick={() => handleThreeDotsClick(row)} />
          </div>
        </Overlays>
      ),
    },
  ];

  const CustomSubHeader = () => (
    <div className={styles.customSubHeaderCon}>
      <div className={styles.textAndSelectCon}>
        <Col xs={12} sm={6} md={5} lg={4}>
          <RadioSwitchToggle
            radioOptions={TOGGLE_OPTIONS}
            selected={selectedToggle}
            handleToggleChange={(e: any) => {
              setProjectOpt([]);
              setClientsOpt([]);
              setContractOpt([]);
              resetFilters();
              setSelectedToggle(e);
            }}
          />
        </Col>
        <SearchableSelect
          options={PAYMENT_OPTIONS}
          onChange={handlePaymentChange}
          disabled={false}
          placeholder="Payment Type"
          singleSelectedData={selectedPayment}
          className={styles.textFieldStyles}
        />
        <SearchableSelect
          options={PAYMENT_CLAIM_OPTIONS}
          onChange={handleClaimChange}
          disabled={false}
          placeholder="Payment Claim Type"
          singleSelectedData={selectedClaim}
          className={styles.textFieldStyles}
        />
        {overViewDetails?.overViewType !== overviewModeType.PROJECTS &&
          overViewDetails?.overViewType !== overviewModeType.CONTRACTS && (
            <SearchableSelect
              options={projectOpt}
              onChange={handleProjectChange}
              disabled={false}
              placeholder="Projects"
              singleSelectedData={selectedProject}
              className={styles.textFieldStyles}
            />
          )}
        {overViewDetails?.overViewType !== overviewModeType.CONTRACTS && (
          <SearchableSelect
            options={contractOpt}
            onChange={handleContractChange}
            disabled={false}
            placeholder="Contracts"
            singleSelectedData={selectedContract}
            className={styles.textFieldStyles}
          />
        )}
        <SearchableSelect
          options={clientsOpt}
          onChange={handleClientsChange}
          disabled={false}
          placeholder={
            selectedToggle === "Receivable"
              ? "Clients"
              : selectedToggle === "Billable"
              ? "Suppliers"
              : "Clients/Suppliers"
          }
          singleSelectedData={selectedClient}
          className={styles.textFieldStyles}
        />
        {isAnyFilterActive && (
          <button
            onClick={handleResetClick}
            title="Reset Filters"
            className={styles.resetButton}
          >
            <ArrowClockwise className={styles.iconSpacing} />
            Reset Filters
          </button>
        )}
      </div>
      {printDocumentData?.length > 0 && (
        <div className={styles.headerIconCon}>
          <span
            className={styles.iconStyles}
            onClick={() => {
              if (printDocumentData?.length) {
                handlePrintPDF();
              }
            }}
            title="Print PDF"
          >
            <Printer />
          </span>
          <span
            className={styles.iconStyles}
            onClick={() => {
              if (printDocumentData?.length) {
                downloadExcel();
              }
            }}
            title="Export to Excel"
          >
            <FileEarmarkExcel />
          </span>
        </div>
      )}
    </div>
  );

  function navigateToViewPage(rowData: any) {
    const dynamicRoute = `${ApplicationURLS.USER_PAYMENTS}?claim=${
      rowData?.payment_claim_id
    }&mode=${isArchived ? VIEW_ARCHIVE : VIEW}&payment=${rowData?.payment_id}`;

    const isNormalPaymentType = [
      "Full",
      "Part",
      "Pay Less - Full",
      "Pay Less - Part",
      "Pay - Zero",
      "3rd Party",
    ].includes(rowData?.payment_type);

    if (overViewDetails?.overViewMode) {
      isNormalPaymentType
        ? router.push(
            `${dynamicRoute}&overview=${overViewDetails?.data?.id}&from=${tabId.PAYMENTS}&overview-type=${overViewDetails?.screenName}`
          )
        : router.push(
            `${ApplicationURLS.USER_VIEW_INTEREST_CHARGES_OTHER_PAYMENT}/${rowData?.payment_id}`
          );
    } else
      isNormalPaymentType
        ? router.push(dynamicRoute)
        : router.push(
            `${ApplicationURLS.USER_VIEW_INTEREST_CHARGES_OTHER_PAYMENT}/${rowData?.payment_id}`
          );
  }

  return (
    <div className={styles.dataContainer}>
      {!overViewDetails?.overViewMode && (
        <ReusableBreadcrumb
          items={[
            {
              href: ApplicationURLS.USER_DASHBOARD,
              label: "Home",
              active: routePath === ApplicationURLS.USER_DASHBOARD,
            },
            {
              href: "",
              label: "Payments",
              active: true,
            },
          ]}
          separator={<span className={styles.separatorStyle}>&gt;</span>}
        />
      )}
      {!overViewDetails?.overViewMode && (
        <div className={styles.headerAndButtonCon}>
          <span className={styles.headerText}>Payments</span>

          {!isArchived && (
            <Overlays
              trigger="click"
              placement={"bottom"}
              overlay={<span></span>}
              popoverTypes={"tableActions"}
              popoverActions={[
                {
                  label: "Payment Claim",
                  value: "Payment Claim",
                },
                {
                  label: "Retention Claim",
                  value: "Retention Claim",
                },
                { value: "Interest Received", label: "Interest Received" },
                { value: "Interest Withdrawal", label: "Interest Withdrawal" },
                { value: "Bank Charge Applied", label: "Bank Charge Applied" },
                { value: "Bank Charge Top Up", label: "Bank Charge Top-up" },
                { value: "Top Up", label: "Top Up" },
                { value: "Top Up Retention", label: "Top Up Retention" },
                { value: "Withdrawal", label: "Withdrawal" },
                {
                  value: "Overpayment refund from supplier",
                  label: "Overpayment refund from supplier",
                },
                {
                  value: "Overpayment refund to client",
                  label: "Overpayment refund to client",
                },
                {
                  value: "Overpayment to supplier",
                  label: "Overpayment to supplier",
                },
                {
                  value: "Underpayment to supplier",
                  label: "Underpayment to supplier",
                },
                {
                  value: "Overpayment from client",
                  label: "Overpayment from client",
                },
                {
                  value: "Underpayment from client",
                  label: "Underpayment from client",
                },
              ]}
              optionClick={(data) => handlePaymentClick(data)}
              popperConfig={{
                modifiers: [
                  {
                    name: "offset",
                    options: {
                      offset: [20, 10], // Adjust the offset as needed
                    },
                  },
                ],
              }}
            >
              <FormButton className={styles.buttonStyles}>+ Payment</FormButton>
            </Overlays>
          )}
        </div>
      )}
      {!overViewDetails?.overViewMode && (
        <TabContainer
          tabs={tabOptions}
          activeTab={activeTab}
          onTabClick={handleTabClick}
        />
      )}
      <ReusableDataTable
        columns={columns}
        data={paymentsListData}
        subHeader
        subHeaderComponent={<CustomSubHeader />}
        pagination
        progressPending={loading}
        paginationServer
        paginationTotalRows={totalRows}
        onChangeRowsPerPage={handlePerRowsChange}
        onChangePage={handlePageChange}
        onRowClicked={(data: any) => navigateToViewPage(data)}
      />
      <AppModal
        show={openModal}
        onHide={() => setOpenModal(false)}
        secondButtonLabel="No"
        firstButtonLabel="Yes"
        modalHeading={popupMessage?.headerMsg || ""}
        modalBodyContent={popupMessage?.subHeaderMsg || ""}
        onConfirm={() => {
          handleModalPopUpFunction();
        }}
      />
      {displayDatePopup && (
        <AppModal
          show={displayDatePopup}
          onHide={() => setDisplayDatePopup(false)} // Close popup on cancel
          secondButtonLabel="Close"
          firstButtonLabel="Save"
          minimumDate={
            actionData?.Inputdate ? new Date(actionData.Inputdate) : null
          }
          modalBodyContent={
            "Only for onboarding mode for related transactions requiring the input date.  Please input the required input date which will be input into your journal records if different from today"
          }
          onConfirm={() => {
            if (tempselectedDate) {
              handleDatePopupConfirm(); // Save action only if a date is selected
            } else {
              console.warn("Please select a date before saving.");
            }
          }} // Confirm submit
          showDatePickerInput={true}
          datePickerLabel={"Select input date *"}
          datePickerValue={tempselectedDate}
          onDatePickerChange={(date) => setTempSelectedDate(date)}
        />
      )}
    </div>
  );
};

export default PaymentLists;
