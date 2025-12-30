//default imports
"use client";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
//import from reactstrap components and icons
import { Col, Row } from "react-bootstrap";
import {
  ArrowClockwise,
  FileEarmarkExcel,
  Printer,
  QuestionCircle,
  ThreeDots,
} from "react-bootstrap-icons";
//import from customized components
import FormButton from "@/components/Button/button";
import ReusableDataTable from "@/components/DataTable/dataTable";
import Overlays from "@/components/Overlayes/Overlayes";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import RadioSwitchToggle from "@/components/RadioSwitch/RadioSwitch";
import TabContainer from "../../addGroups/tabsContainer";
//import customized styles
import customStyles from "./payApps.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { AppModal } from "@/components/model/model";
import {
  convertJsonToExcel,
  formatDate,
  generateAndPrintPDF,
} from "@/common/commonFunctions";
//import from external libraries
//import from constants, interfaces ,functions and services
import { ApplicationURLS } from "@/common/applicationURLS";
import { RowsPerPageInTable } from "@/common/constants";
import {
  toggleOptions,
  claimOptions,
  statusOptions,
  receivableOptions,
  beneficiaryPaymentsModalOptions,
  paymentsModalOptions,
} from "./payApps.constant";
import { PaymentClaim, fetchAllPaymentClaims } from "./payApps.functions";
import { deleteCookie, getCookie, setCookie } from "cookies-next";
import { changeStatusOfAPaymentClaim } from "./payApps.functions";
import { tabTypes } from "./payments/payments.constant";
import {
  fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList,
  getListActionButtons,
} from "@/app/api/commonAPIs";
import { getTooltipMessage } from "../payment/payment.constant";
import TooltipInfoIcon from "@/components/customToolTip/customToolTip";

interface ContractOption {
  value: string;
  label: string;
  contract_id: number;
}

const PayApps = (props: any) => {
  const { isArchived = false } = props;
  const claimType = useSearchParams().get("claim-type");
  const retentionType = useSearchParams().get("retention-type");
  const [loading, setLoading] = useState<boolean>(false);
  const [actionMenuLoader, setActionMenuLoader] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [projectList, setProjectList] = useState<[]>([]);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);

  const [contractOptions, setContractOptions] = useState<ContractOption[]>([]);
  const [actionData, setActionData] = useState<any>();

  const [selectedStatus, setSelectedStatus] = useState(
    isArchived ? "Archived" : ""
  );
  const [selectedStatusName, setSelectedStatusName] = useState<any>(null);
  const [paymentclaimGridData, setPaymentClaimGridData] = useState<any>([]);
  const [openModal, setOpenModal] = useState(false);
  const [openAddPaymentModal, setOpenAddPaymentModal] = useState(false);

  const [selectedToggle, setSelectedToggle] = useState<string>(
    retentionType || "Claim"
  );
  const [selectToggled, setSelectToggled] = useState<string>(
    claimType || "Billable"
  );
  const [selectedProjectId, setSelectedProjectId] = useState<
    number | null | any
  >(null);
  const [selectedContractId, setSelectedContractId] = useState<
    number | null | any
  >(null);

  const [selectedContractName, setSelectedContractName] = useState<
    number | null
  >(null);

  const [selectedProjectName, setSelectedProjectName] = useState<number | null>(
    null
  );

  const [paymentClaimsData, setPaymentClaimsData] = useState<PaymentClaim[]>(
    []
  );

  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const [availablePayments, setAvailablePayments] = useState<any[]>([]);

  const tabs = [
    { id: "CurrentClaims", label: "Current", hasError: false },
    { id: "ArchivedClaims", label: "Archived", hasError: true },
  ];
  const [activeTab, setActiveTab] = useState(
    isArchived ? tabs[1].id : tabs[0].id
  );

  const [actionButtons, setActionButtons] = useState<any>([
    {
      label: "View",
      value: "View",
    },
  ]);

  const resetFilters = () => {
    setSelectedStatus("");
    setSelectedStatusName(null);
    setSelectedContractName(null);
    setSelectedContractId(null);
    setSelectedProjectId(null);
    setSelectedProjectName(null);
  };

  const isAnyFilterActive =
    selectedStatusName !== null ||
    selectedContractName !== null ||
    selectedContractId !== null ||
    selectedProjectId !== null ||
    selectedProjectName !== null;

  useEffect(() => {
    // Delete the 'redirectAfterLogin' cookie when the component renders
    const isCookiePresent = getCookie("redirectAfterLogin");
    if (isCookiePresent) {
      deleteCookie("redirectAfterLogin");
    }
  }, []);

  useEffect(() => {
    (async () => {
      const data = {
        company_id: selectedCompanyId || null,
        project_id: selectedProjectId || null,
        contract_id: selectedContractId || null,
      };

      const response =
        await fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList(data);
      if (response) {
        // Set Project List
        const projectOptions: any = [
          { label: "All", value: null },
          ...(response.projects?.map((project: any) => ({
            label: project?.project_name,
            value: project?.project_id,
          })) || []),
        ];
        setProjectList(projectOptions);

        // Set Contract List
        const contractOptions = [
          { label: "All", value: null, contract_id: "" }, // Add this line
          ...(response.contracts?.map((contract: any) => ({
            label: contract?.contract_name,
            value: contract?.contract_id.toString(),
            contract_id: contract?.contract_id.toString(),
          })) || []),
        ];
        setContractOptions(contractOptions);
      }
    })();
  }, [selectedCompanyId, selectedProjectId]); // Add necessary dependencies

  useEffect(() => {
    if (selectedCompanyId !== null) {
      fetchData(page, perPage);
    }
  }, [selectedCompanyId, page, perPage]);

  useEffect(() => {
    fetchData(page, perPage);
  }, [
    selectedStatus,
    selectedToggle,
    selectToggled,
    selectedProjectId,
    selectedContractId,
  ]);

  const fetchData = async (page: number, rowsPerPage: number) => {
    if (!selectedCompanyId) {
      return; // Early return if selectedCompanyId is not present
    }
    setLoading(true);
    const response = await fetchAllPaymentClaims({
      cash_retention_type: selectedToggle || null,
      claim_type: selectToggled || null,
      contract_id: Number(selectedContractId) || null,
      company_id: selectedCompanyId || null,
      items_per_page: rowsPerPage,
      page: page,
      project_id: selectedProjectId || null,
      status: isArchived ? "Archived" : selectedStatus || null,
    });

    if (response) {
      const responseData = JSON.parse(JSON.stringify(response));
      setPaymentClaimsData(response.payment_claims || []);
      setTotalRows(response.total_count || 0);
      setPerPage(rowsPerPage);

      let printDataObjCreation = responseData?.payment_claims?.map(
        (paymentClaim: PaymentClaim) => {
          return {
            cash_retention_type: paymentClaim?.cash_retention_type,
            claim_type: paymentClaim?.claim_type,
            client_supplier_name: paymentClaim?.client_supplier_name,
            project_name: paymentClaim?.project_name,
            contract_name: paymentClaim?.contract_name,
            due_date: formatDate(paymentClaim?.due_date),
            claim_amount: `$ ${
              paymentClaim?.claim_amount
                ? Number(paymentClaim.claim_amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "0.00"
            }`,
            status: paymentClaim?.status,
          };
        }
      );
      setPaymentClaimGridData(printDataObjCreation);
    }
    setLoading(false);
  };

  const handleStatusChange = (selectedValue: any) => {
    setSelectedStatus(selectedValue?.value);
    setSelectedStatusName(selectedValue);
    // Perform any other actions based on the selected valuef
  };
  //Other Hooks
  const routePath = usePathname();
  const router = useRouter();

  function CustomSubHeader() {
    return (
      <Row className="w-100">
        <Col xs={12} sm={12} md={11} lg={11} xl={11}>
          <Row className={customStyles.alignFilter}>
            <Col xs={12} sm={6} md={6} lg={6} xl={3}>
              <RadioSwitchToggle
                radioOptions={toggleOptions}
                selected={selectedToggle}
                handleToggleChange={(e: any) => {
                  resetFilters(), setSelectedToggle(e);
                }}
              />
            </Col>
            <Col
              xl={3}
              xs={12}
              md={6}
              lg={6}
              sm={12}
              className={customStyles.receiveStyle}
            >
              <RadioSwitchToggle
                radioOptions={claimOptions}
                selected={selectToggled}
                handleToggleChange={(e: any) => {
                  resetFilters(), setSelectToggled(e);
                }}
              />
            </Col>
          </Row>
        </Col>
        <Row className={customStyles.filterStyles}>
          <Col
            xs={12}
            sm={12}
            md={4}
            lg={2}
            xl={2}
            className={customStyles.projectStyles}
          >
            <SearchableSelect
              options={projectList}
              onChange={(selectedOption) => {
                if (selectedOption) {
                  setSelectedProjectId(selectedOption?.value);
                  setSelectedProjectName(selectedOption);
                }
              }}
              disabled={false}
              singleSelectedData={selectedProjectName}
              placeholder="Select Project"
              className={customStyles.dropdown}
            />
          </Col>
          <Col xs={12} sm={12} md={4} lg={2} xl={2}>
            <SearchableSelect
              options={contractOptions}
              onChange={(selectedOption) => {
                if (selectedOption) {
                  setSelectedContractName(selectedOption);
                  const selectedContract = contractOptions.find(
                    (contract) => contract.value === selectedOption?.value
                  );
                  if (selectedContract) {
                    setSelectedContractId(selectedContract?.contract_id);
                  }
                }
              }}
              disabled={false}
              singleSelectedData={selectedContractName}
              placeholder="Select Contract"
              className={customStyles.dropdown}
            />
          </Col>
          {!isArchived && (
            <Col
              xl={3}
              xs={12}
              lg={3}
              md={4}
              sm={12}
              className={customStyles.statusDropdown}
            >
              <SearchableSelect
                options={
                  selectToggled === "Billable"
                    ? statusOptions
                    : receivableOptions
                }
                onChange={handleStatusChange}
                disabled={false}
                placeholder="Select Status"
                singleSelectedData={selectedStatusName}
                className={customStyles.dropdown}
              />
            </Col>
          )}
          <Col>
            {isAnyFilterActive && (
              <button
                onClick={resetFilters}
                title="Reset Filters"
                className={customStyles.resetButton}
              >
                <ArrowClockwise className={customStyles.iconSpacing} />
                Reset Filters
              </button>
            )}
          </Col>
          <Col
            xs={12}
            sm={12}
            md={12}
            lg={1}
            xl={1}
            className={customStyles?.subHeaderIcon}
          >
            <span
              className={customStyles.icon}
              onClick={() => {
                if (paymentclaimGridData?.length) {
                  handlePrintPDF();
                }
              }}
              title="Print PDF"
            >
              <Printer />
            </span>
            <span
              className={customStyles.icon}
              onClick={() => {
                if (paymentclaimGridData?.length) {
                  downloadExcel();
                }
              }}
              title="Export to Excel"
            >
              <FileEarmarkExcel />
            </span>
          </Col>
        </Row>
      </Row>
    );
  }

  const handleTabClick = (tabId: string) => {
    if (activeTab === tabId) {
      return;
    }

    if (tabId === "CurrentClaims") {
      router.push(ApplicationURLS.USER_PAY_APPS);
    } else {
      router.push(ApplicationURLS.USER_PAY_APPS_ARCHIVED);
    }
  };

  function handleActions(type: any, data: any) {
    const { option } = type;

    if (option === "Edit") {
      router.push(
        `${ApplicationURLS.USER_PAYMENT_CLAIMS_EDIT}/${data?.payment_claim_id}`
      );
    }
    if (option === "View") {
      navigateToViewMode(data);
    } else if (option === "Delete") {
      setOpenModal(true);
      setActionData(data);
    } else if (option === "Add Payment") {
      if (
        data?.payments?.length &&
        (data?.payments.some((x: any) => x?.payment_type === tabTypes.PART) ||
          data?.payments.some(
            (x: any) => x?.payment_type === tabTypes.PAY_LESS_PART
          ))
      ) {
        const getPaymentType = data?.payments.find(
          (x: any) =>
            x?.payment_type === tabTypes.PART ||
            x?.payment_type === tabTypes.PAY_LESS_PART
        );
        setCookie("PaymentType", getPaymentType?.payment_type);
        router.push(
          `${ApplicationURLS.USER_PAYMENTS}?claim=${
            data?.payment_claim_id
          }&tab=${
            selectedToggle === toggleOptions[1]?.value ? "retention-claim" : ""
          }&next-payment=true`
        );
      } else {
        setAvailablePayments(
          data?.beneficiary_type === "Self"
            ? beneficiaryPaymentsModalOptions
            : paymentsModalOptions
        );
        setActionData(data);
        setOpenAddPaymentModal(true);
      }
    } else if (option === "View Payments") {
      setCookie("from_page", ApplicationURLS.USER_PAY_APPS);
      if (
        data?.payments?.length < 2 ||
        (data?.payments[0]?.payment_type !== tabTypes.PART &&
          data?.payments[0]?.payment_type !== tabTypes.PAY_LESS_PART)
      ) {
        router.push(
          `${ApplicationURLS.USER_PAYMENTS}?claim=${
            data?.payment_claim_id
          }&mode=view&payment=${data?.payments[0]?.payment_id}&crt=${
            selectedToggle === toggleOptions[1]?.value ? "RetentionClaim" : ""
          }`
        );
      } else {
        router.push(ApplicationURLS.USER_PAYMENTS_LIST_CURRENT);
      }
    } else if (option === "View Notices") {
      const isArchived =
        Array.isArray(data?.notices) &&
        data.notices.length > 0 &&
        data.notices.every(
          (notice: any) =>
            notice.status === "Delete-Unsent" || notice.status === "Delete-Sent"
        );

      router.push(
        `${
          isArchived
            ? ApplicationURLS.USER_NOTICESARCHIVE
            : ApplicationURLS.USER_NOTICES
        }?payment-claim=${data?.payment_claim_id}`
      );
    }
  }

  function navigateToViewMode(data: any) {
    let paymentObj: any = 0;

    if (data?.payments?.length > 0) {
      const isPartPayment = data?.payments.some(
        (x: any) =>
          x?.payment_type === tabTypes.PART ||
          x?.payment_type === tabTypes.PAY_LESS_PART
      );

      if (isPartPayment) {
        paymentObj = data?.payments.findLast(
          (x: any) =>
            x?.payment_type === tabTypes.PART ||
            x?.payment_type === tabTypes.PAY_LESS_PART
        );
      }
    }

    router.push(
      `${ApplicationURLS.USER_PAYMENT_CLAIMS_VIEW}/${
        data?.payment_claim_id
      }?type=${data?.cash_retention_type}&cash-retention-type=${
        data?.cash_retention_type === "Claim" ? "" : "RetentionClaim"
      }&beneficiary=${data?.beneficiary_type || ""}&payment-type=${
        paymentObj
          ? paymentObj?.payment_type
          : data?.payments?.length > 0
          ? data?.payments[0]?.payment_type
          : ""
      }&payment=${
        paymentObj
          ? paymentObj?.payment_id
          : data?.payments?.length > 0
          ? data?.payments[0]?.payment_id
          : ""
      }&ctype=${data?.claim_type}`
    );
  }

  async function handlePageChange(page: number) {
    setPage(page);
  }

  function handlePrintPDF() {
    let formattedTableData: any[] = paymentclaimGridData.map(
      (paymentClaim: PaymentClaim) => [
        paymentClaim?.cash_retention_type,
        paymentClaim?.claim_type,
        paymentClaim?.client_supplier_name,
        paymentClaim?.project_name,
        paymentClaim?.contract_name,
        paymentClaim?.due_date,
        paymentClaim?.claim_amount,
        paymentClaim?.status,
      ]
    );
    let headerNames: string[] = [
      "Type",
      "Billable/Receivable",
      "Supplier/Client",
      "Project Name",
      "Contract Name",
      "Due Date",
      "Total Claim (Gross of GST)",
      "Status",
    ];
    generateAndPrintPDF(
      formattedTableData,
      headerNames,
      "payment-claims",
      true
    );
  }

  function downloadExcel() {
    const columnNames = [
      { value: "cash_retention_type", label: "Type" },
      { value: "claim_type", label: "Billable/Receivable" },
      { value: "client_supplier_name", label: "Supplier/Client" },
      { value: "project_name", label: "Project Name" },
      { value: "contract_name", label: "Contract Name" },
      { value: "due_date", label: "Due Date" },
      { value: "claim_amount", label: "Total Claim (Gross of GST)" },
      { value: "status", label: "Status" },
    ];
    convertJsonToExcel(paymentclaimGridData, "payment claims", columnNames);
  }

  async function handlePerRowsChange(newPerPage: number, page: number) {
    setPerPage(newPerPage);
  }

  const handleDeleteFunction = async (id: string) => {
    setOpenModal(false); // Close the modal
    try {
      await changeStatusOfAPaymentClaim({
        payment_claim_id: id,
        status: "Deleted",
      });
      // Refresh the contract list after deletion
      fetchData(page, perPage);
    } catch (error) {
      console.error("Error deleting user from company:", error);
    }
  };

  function handleSelect(selectedValue: any) {
    setOpenAddPaymentModal(false);
    router.push(
      `${ApplicationURLS.USER_PAYMENTS}?claim=${
        actionData?.payment_claim_id
      }&tab=${
        selectedToggle === toggleOptions[1]?.value ? "retention-claim" : ""
      }&beneficiary=${actionData?.beneficiary_type || ""}`
    );

    setCookie("from_page", ApplicationURLS.USER_PAY_APPS);
    setCookie("PaymentType", selectedValue);
  }

  const getColumnNames = (selectedToggle: any) => {
    return {
      type: "Type",
      billableReceivable:
        selectedToggle === "Billable" ? "Billable" : "Receivable",
      supplierClient: selectedToggle === "Billable" ? "Supplier" : "Client",
    };
  };

  const columns = [
    {
      name: "Type",
      maxWidth: "200px",
      wrap: true,
      selector: (row: PaymentClaim) => row?.cash_retention_type,
    },
    {
      name: selectToggled === "Billable" ? "Billable" : "Receivable",
      selector: (row: PaymentClaim) => row?.claim_type,
    },
    {
      name: getColumnNames(selectToggled)?.supplierClient,
      selector: (row: PaymentClaim) => row?.client_supplier_name,
      wrap: true,
    },
    {
      name: "Project Name",
      selector: (row: PaymentClaim) => row?.project_name,
      wrap: true,
    },
    {
      name: "Contract Name",
      selector: (row: PaymentClaim) => row?.contract_name,
      wrap: true,
    },
    {
      name: "Due Date",
      selector: (row: PaymentClaim) =>
        row?.due_date ? formatDate(row?.due_date) : null,
    },
    {
      name: "Total Claim (Gross of GST)",
      selector: (row: PaymentClaim) => row?.claim_amount,
      format: (row: any) =>
        row?.claim_amount !== null && row?.claim_amount !== undefined
          ? `$ ${Number(row.claim_amount).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          : "$ 0.00",
      wrap: true,
      grow: 2,
      right: true,
    },
    {
      name: "Status",
      selector: (row: PaymentClaim) => row?.list_status,
      wrap: true,
      grow: 2,
    },
    {
      name: "Actions",
      cell: (row: PaymentClaim, index: number) => (
        <Overlays
          trigger="click"
          placement={"auto"}
          overlay={<span></span>}
          popoverTypes={"tableActions"}
          cellData={{
            id: row?.payment_claim_id,
          }}
          popoverActions={actionButtons}
          optionClick={(data) => handleActions(data, row)}
          isLoading={actionMenuLoader}
        >
          <div className={customStyles.dotsContainer}>
            <ThreeDots onClick={() => displayDynamicOptions(row)} />
          </div>
        </Overlays>
      ),
    },
  ];

  async function displayDynamicOptions(data: any) {
    setActionButtons([]);
    setActionMenuLoader(true);

    try {
      const postData = {
        payment_claim_id: data?.payment_claim_id,
      };

      const response: any = await getListActionButtons(postData);

      let filteredButtons: any = [];
      if (response?.claim_list_buttons) {
        const {
          add_next_payment,
          add_payment,
          edit,
          view_all_payment,
          view_payment,
          view_notice,
        } = response.claim_list_buttons;

        filteredButtons = [
          { label: "View", value: "View" },
          ...(add_next_payment
            ? [{ label: "Add next Payment", value: "Add Payment" }]
            : []),
          ...(edit
            ? [
                {
                  label: "Edit",
                  value: "Edit",
                },
              ]
            : []),
          ...(add_payment
            ? [
                {
                  label: "Add Payment",
                  value: "Add Payment",
                },
              ]
            : []),

          ...(view_all_payment || view_payment
            ? [
                {
                  label: "View Payments",
                  value: "View Payments",
                },
              ]
            : []),
          ...(view_notice
            ? [
                {
                  label: "View Notices",
                  value: "View Notices",
                },
              ]
            : []),
          ...(response.claim_list_buttons?.delete
            ? [
                {
                  label: "Delete",
                  value: "Delete",
                  isDelete: true,
                },
              ]
            : []),
        ];
      }

      setActionButtons(filteredButtons);
      setActionMenuLoader(false);
    } catch (err: any) {
      setActionMenuLoader(false);
    }
  }

  //Render Template
  return (
    <div className={customStyles.container}>
      <ReusableBreadcrumb
        items={[
          {
            href: ApplicationURLS.USER_DASHBOARD,
            label: "Home",
            active: routePath === ApplicationURLS.USER_DASHBOARD,
          },
          {
            href: ApplicationURLS.USER_PAY_APPS,
            label: "Pay Apps",
            active: true,
          },
        ]}
        separator={
          <span className={customStyles.breadcrumbSeparator}>&gt;</span>
        }
      />
      <div className={customStyles.headerContent}>
        <span className={customStyles.headerText}>Payment Claims</span>

        <FormButton
          className={customStyles.button}
          onClick={() => router.push(ApplicationURLS.USER_PAYMENT_CLAIMS_ADD)}
        >
          + Claim
        </FormButton>
      </div>
      <div className={customStyles.subHeaderTabs}>
        <TabContainer
          tabs={tabs}
          activeTab={activeTab}
          onTabClick={handleTabClick}
        />
      </div>
      <ReusableDataTable
        columns={columns}
        data={paymentClaimsData}
        subHeader
        subHeaderComponent={<CustomSubHeader />}
        pagination
        paginationServer
        progressPending={loading}
        paginationTotalRows={totalRows}
        onChangeRowsPerPage={handlePerRowsChange}
        onChangePage={handlePageChange}
        onRowClicked={(data: any) => navigateToViewMode(data)}
      />

      <AppModal
        show={openModal}
        onHide={() => setOpenModal(false)}
        firstButtonLabel="Yes"
        secondButtonLabel="No"
        modalHeading=""
        modalBodyTitle=""
        modalBodyContent={
          "Are you sure you wish to move this claim to the archive list with status set to Deleted?"
        }
        onConfirm={() => handleDeleteFunction(actionData?.payment_claim_id)}
      />
      <AppModal
        show={openAddPaymentModal}
        onHide={() => setOpenAddPaymentModal(false)}
        firstButtonStyle={customStyles.savebtn}
        secondButtonLabel="Close"
        secondButtonStyle={customStyles.closeBtn}
        modalHeading=""
        modalBodyTitle=""
        modalBodyContent={
          <div>
            <div>
              <p className="">
                {" "}
                {selectToggled === claimOptions[0].value
                  ? "How do you intend to settle this claim?"
                  : "How did you receive the payment for this claim?"}
              </p>
            </div>
            <div>
              <div className={customStyles.paymentTypeBtnStyles}>
                {availablePayments?.length > 0 &&
                  availablePayments.map((paymentType: any, index: number) => (
                    <div
                      key={index}
                      className={customStyles.paymentTypeWrapper}
                    >
                      <FormButton
                        onClick={() => handleSelect(paymentType?.value)}
                        className={customStyles.formButtonWithIcon}
                      >
                        {paymentType?.label}
                        <TooltipInfoIcon
                          tooltipText={getTooltipMessage(paymentType?.label)}
                          className={customStyles.tooltipIcon}
                          icon={<QuestionCircle></QuestionCircle>}
                          iconColor="#FFFFFF"
                        />
                      </FormButton>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
};

export default PayApps;
