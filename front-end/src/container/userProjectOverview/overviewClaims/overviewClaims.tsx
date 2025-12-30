//default imports
"use client";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
//import from reactstrap components and icons
import { Col, Row } from "react-bootstrap";
import { FileEarmarkExcel, Printer, ThreeDots } from "react-bootstrap-icons";
//import from customized components
import FormButton from "@/components/Button/button";
import ReusableDataTable from "@/components/DataTable/dataTable";
import Overlays from "@/components/Overlayes/Overlayes";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import RadioSwitchToggle from "@/components/RadioSwitch/RadioSwitch";
import TabContainer from "../../addGroups/tabsContainer";
//import customized styles
import customStyles from "./overviewClaims.module.scss";
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
import { filterByDuration } from "@/common/constants/data";
import { RowsPerPageInTable } from "@/common/constants";
import {
  tabOptions,
  toggleOptions,
  claimOptions,
  statusOptions,
} from "../../userModules/payApps/payApps.constant";
import {
  PaymentClaim,
  fetchAllPaymentClaims,
  changeStatusOfAPaymentClaim,
} from "../../userModules/payApps/payApps.functions";
import { getCookie, setCookie } from "cookies-next";
import {
  getContractListsForCompany,
  getProjectsLists,
} from "@/container/contracts/contracts.functions";
import { useDispatch } from "react-redux";
import { SetProjectOverview } from "@/redux/slices/dashboardSlices";
import { getListActionButtons } from "@/app/api/commonAPIs";

interface ContractOption {
  value: string;
  label: string;
  contract_id: number;
}

const lisActionOptions = [
  { label: "View", value: "View" },
  { label: "Edit", value: "Edit" },

  { label: "Delete", value: "Delete", isDelete: true },
];

const paymentActionOptions = [
  { label: "Add Payment", value: "Add Payment" },
  { label: "View Payments", value: "View Payments" },
  // { label: "View Notices", value: "View Notices" },
];

const OverviewClaims = (props: any) => {
  const {
    isArchived = false,
    selectedProject,
    selectedContract,
    selectedType,
    screenName,
  } = props;
  const claimType = useSearchParams().get("claim-type");
  //useState and useEffect Management
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedPaymentType, setSelectedPaymentType] = useState<number>(0);
  const dispatch = useDispatch();
  const [actionButtons, setActionButtons] = useState<any>([
    {
      label: "View",
      value: "View",
    },
  ]);
  const [actionMenuLoader, setActionMenuLoader] = useState<boolean>(false);

  const [totalRows, setTotalRows] = useState(0);
  const [projectList, setProjectList] = useState<[]>([]);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);
  const [searchedValue, setSearchedValue] = useState<string>("");
  const [contractOptions, setContractOptions] = useState<ContractOption[]>([]);
  const [actionData, setActionData] = useState<any>();
  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState<boolean>(false);
  const [gridRowData, setGridRowData] = useState<any>({});
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [search, setSearch] = useState("");
  const [selectedValue, setSelectedValue] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(
    isArchived ? "Archived" : ""
  );
  const [selectedStatusName, setSelectedStatusName] = useState({
    value: "",
    label: "All",
  });
  const [paymentclaimGridData, setPaymentClaimGridData] = useState<any>([]);
  const [openModal, setOpenModal] = useState(false);
  const [openAddPaymentModal, setOpenAddPaymentModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState();
  const [displayArchiveGrid, SetDisplayArchiveGrid] = useState();
  const [selectedDuration, setSelectedDuration] = useState(filterByDuration[0]);
  const [selectedToggle, setSelectedToggle] = useState<string>("Claim");
  const [selectToggled, setSelectToggled] = useState<string>(
    claimType || "Billable"
  );
  const [selectedProjectId, setSelectedProjectId] = useState<
    number | null | any
  >(null);
  const [selectedContractId, setSelectedContractId] = useState<
    number | null | any
  >(null);

  // console.log("🚀 ~ OverviewClaims ~ selectedContractId:", selectedContractId);

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

  const SelectedProjectId =
    screenName === "Project" || screenName === "Contracts"
      ? selectedProject
      : selectedProjectId || null;

  const SelectedContractId =
    screenName === "Contracts"
      ? selectedContract
      : Number(selectedContractId) || null;

  const getFilteredOptions = (isArchived: any) => {
    if (isArchived) {
      return lisActionOptions.filter((option) => option.value === "View");
    }
    return lisActionOptions;
  };
  const filteredOptions = getFilteredOptions(isArchived);
  const PaymentTypeList = [
    { label: "Full-Payment", value: "Full" },
    { label: "Part-Payment", value: "Part" },
    { label: "Pay Less - Full", value: "Pay Less - Full" },
    { label: "Pay Less - Part", value: "Pay Less - Part" },
    { label: "Pay - Zero", value: "Pay - Zero" },
    { label: "3rd Party", value: "3rd Party" },
  ];

  const tabs = [
    { id: "CurrentClaims", label: "Current", hasError: false },
    { id: "ArchivedClaims", label: "Archived", hasError: true },
  ];
  const [activeTab, setActiveTab] = useState(
    isArchived ? tabs[1].id : tabs[0].id
  );

  useEffect(() => {
    (async () => {
      const response = await getProjectsLists(selectedCompanyId);
      if (response) {
        const projectOptions: any = [
          {
            label: "All",
            value: "",
          },
          ...(response?.map((project: any) => ({
            label: project?.project_name,
            value: project?.project_id,
          })) || []),
        ];
        setProjectList(projectOptions);
        fetchContractsForProject(selectedProjectId);
      }
    })();
  }, []);

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

  useEffect(() => {
    if (selectedContract || selectedProject) {
      fetchData(page, perPage);
    }
  }, [selectedContract, selectedProject]);

  const fetchContractsForProject = async (projectId: string) => {
    const data = {
      company_id: selectedCompanyId,
      project_id: selectedProject,
      page_number: null,
      page_size: null,
      search: "",
      isAlphabeticalOrder: true,
      // client_supplier_type:  "Client" | "Supplier";
      // client_supplier_type: togglePaymentReceivables() ? "Client" : "Supplier",
    };

    const contractListData = await getContractListsForCompany(data);
    if (contractListData && contractListData?.contract_list?.length > 0) {
      let modifiedContracts = contractListData?.contract_list?.map(
        (contract: any) => {
          return {
            label: contract?.contract_name,
            value: contract?.contract_id.toString(),
            contract_id: contract?.contract_id.toString(),
          };
        }
      );
      setContractOptions(modifiedContracts || []);
    }
  };

  const fetchData = async (page: number, rowsPerPage: number) => {
    if (!selectedCompanyId) {
      return; // Early return if selectedCompanyId is not present
    }
    setLoading(true);
    const response = await fetchAllPaymentClaims({
      cash_retention_type: selectedToggle || null,
      claim_type: selectToggled || null,
      contract_id:
        screenName === "Contracts"
          ? selectedContract
          : Number(selectedContractId) || null,
      company_id: selectedCompanyId || null,
      items_per_page: rowsPerPage,
      page: page,
      project_id:
        screenName === "Project" ? selectedProject : selectedProjectId || null,
      status: selectedStatus || null,
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
                handleToggleChange={(e: any) => setSelectedToggle(e)}
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
                handleToggleChange={(e: any) => setSelectToggled(e)}
              />
            </Col>
          </Row>
        </Col>
        <Row className={customStyles.filterStyles}>
          {screenName != "Project" && (
            <Col
              xs={12}
              sm={12}
              md={4}
              lg={3}
              xl={3}
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
          )}
          <>
            {screenName != "Contracts" && (
              <Col xs={12} sm={12} md={4} lg={3} xl={3}>
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
            )}
          </>
          <Col
            xl={4}
            xs={12}
            lg={4}
            md={4}
            sm={12}
            className={customStyles.statusDropdown}
          >
            <SearchableSelect
              options={statusOptions}
              onChange={handleStatusChange}
              disabled={false}
              placeholder="Select Status"
              singleSelectedData={selectedStatusName}
              className={customStyles.dropdown}
            />
          </Col>
          <Col></Col>
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
      router.push(
        `${ApplicationURLS.USER_PAYMENT_CLAIMS_VIEW}/${data?.payment_claim_id}?&ctype=${data?.claim_type}`
      );
    } else if (option === "Delete") {
      setOpenModal(true);
      setActionData(data);
    } else if (option === "Add Payment") {
      setOpenAddPaymentModal(true);
      setActionData(data);

      // router.push(
      //   `${ApplicationURLS.USER_PAYMENTS}?claim=${data?.payment_claim_id}`
      // );
    } else if (option === "View Payments") {
      setCookie("from_page", ApplicationURLS.USER_PAY_APPS);
      router.push(ApplicationURLS.USER_PAYMENT_TO_DO_LIST);
    }
  }

  function handleSearch(value: string) {
    setSearchedValue(value);
  }

  async function handlePageChange(page: number) {
    setPage(page);
  }

  function navigateToViewMode(data: any) {
    router.push(
      `${ApplicationURLS.USER_PAYMENT_CLAIMS_VIEW}/${
        data?.payment_claim_id
      }?type=${data?.cash_retention_type}&cash-retention-type=${
        data?.cash_retention_type === "Claim" ? "" : "RetentionClaim"
      }&beneficiary=${actionData?.beneficiary_type || ""}&payment-type=${
        data?.payments?.length > 0 ? data?.payments[0]?.payment_type : ""
      }&payment=${
        data?.payments?.length > 0 ? data?.payments[0]?.payment_id : ""
      }&ctype=${data?.claim_type}`
    );
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
      // toast.success("This claim has been archived.");
    } catch (error) {
      console.error("Error deleting user from company:", error);
    }
  };

  function handleSelect(selectedvalue: any) {
    setSelectedPaymentType(selectedvalue);

    setOpenAddPaymentModal(false);
    router.push(
      `${ApplicationURLS.USER_PAYMENTS}?claim=${actionData?.payment_claim_id}`
    );
  }
  if (selectedPaymentType) {
    setCookie("from_page", ApplicationURLS.USER_PAY_APPS);
    setCookie("PaymentType", selectedPaymentType);
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
      selector: (row: PaymentClaim) => row.cash_retention_type,
    },
    {
      name: selectToggled === "Billable" ? "Billable" : "Receivable",
      selector: (row: PaymentClaim) => row.claim_type,
    },
    {
      name: getColumnNames(selectToggled).supplierClient,
      selector: (row: PaymentClaim) => row.client_supplier_name,
      wrap: true,
    },
    {
      name: "Project Name",
      selector: (row: PaymentClaim) => row.project_name,
      wrap: true,
    },
    {
      name: "Contract Name",
      selector: (row: PaymentClaim) => row.contract_name,
      wrap: true,
    },
    {
      name: "Due Date",
      selector: (row: PaymentClaim) => formatDate(row.due_date),
    },
    {
      name: "Total Claim (Gross of GST)",
      selector: (row: PaymentClaim) => row.claim_amount,
      format: (row: any) => `$ ${row.claim_amount.toFixed(2)}`,
      wrap: true,
      grow: 2,
    },
    {
      name: "Status",
      selector: (row: PaymentClaim) => row.status,
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
            id: row.payment_claim_id,
          }}
          isLoading={actionMenuLoader}
          popoverActions={actionButtons}
          customPopupstyles={customStyles.customPopupstyles}
          optionClick={(data) => handleActions(data, row)}
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
      <div className={customStyles.addButton}>
        <FormButton
          className={customStyles.buttonStyles}
          //   onClick={() => router.push(ApplicationURLS.USER_PAYMENT_CLAIMS_ADD)}
          // >
          onClick={() => {
            dispatch(
              SetProjectOverview({
                toScreen: "Addclaim",
                fromScreen: "ProjectOverview",
                mainActiveTab: "Claims",
                selectTab: "",
                subSelectTab: "",
              })
            );
            router.push(
              `${
                ApplicationURLS.USER_PAYMENT_CLAIMS_ADD
              }?pid=${SelectedProjectId}&&cid=${SelectedContractId}&overtype=${screenName}&screenname=${"overview"}&client-supplier-type=${selectedType}`
            );
          }}
        >
          + Claim
        </FormButton>
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
              <p className="">How do you intend to settle this claim?</p>
            </div>
            <div>
              <div className={customStyles.paymentTypeBtnStyles}>
                {PaymentTypeList.map((paymentType: any, index: number) => (
                  <FormButton
                    onClick={() => handleSelect(paymentType?.value)}
                    key={index}
                  >
                    {paymentType?.label}
                  </FormButton>
                ))}
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
};
export default OverviewClaims;
