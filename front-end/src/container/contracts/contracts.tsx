"use client";
import React, { useCallback, useEffect, useState } from "react";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import Overlays from "@/components/Overlayes/Overlayes";
import {
  ArrowClockwise,
  ExclamationTriangleFill,
  FileEarmarkExcel,
  Printer,
  Share,
  ThreeDots,
} from "react-bootstrap-icons";
import styles from "./contracts.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { usePathname, useRouter } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";
import TextField from "@/components/TextField/textField";
import { DD_MM_YYYY } from "@/common/constants/general";
import FormButton from "@/components/Button/button";
import {
  ContractType,
  getContractListsForCompany,
  getProjectsLists,
  updateContractStatusById,
} from "./contracts.functions";
import {
  convertJsonToExcel,
  formatDate,
  generateAndPrintPDF,
} from "@/common/commonFunctions";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import { ApplicationURLS } from "@/common/applicationURLS";
import TabContainer from "../addGroups/tabsContainer";
import { AppModal } from "@/components/model/model";
import { toast } from "react-toastify";
import debounce from "lodash/debounce";

const Contracts = (props: any) => {
  const { isArchived = false } = props;
  const [companyId, setCompanyId] = useState<number | null | any>(null);
  const [contracts, setContracts] = useState<ContractType[]>([]);
  const [projectList, setProjectList] = useState<[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    null
  );
  const [selectedProjectName, setSelectedProjectName] = useState<number | null>(
    null
  );

  const [totalRows, setTotalRows] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [timeKey, setTimekey] = useState(new Date().getTime());
  const [openModal, setOpenModal] = useState(false);
  const [actionData, setActionData] = useState<any>();
  const [printDocumentData, setPrintDocumentData] = useState<any>([]);

  const [selectedValue, setSelectedValue] = useState("");
  const [statusValue, setStatusValue] = useState(isArchived ? "Archived" : "");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const resetFilters = () => {
    setSelectedProjectId(null);
    setSelectedProjectName(null);
    setSearch("");
  };
  const isAnyFilterActive =
    selectedProjectName !== null || search !== "" || selectedProjectId !== null;
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const delayedSearch = debounce(() => {
      setDebouncedSearch(search);
    }, 500);

    delayedSearch();
    return delayedSearch.cancel; // Cleanup
  }, [search]);

  const routePath = usePathname();
  const router = useRouter();

  const tabs = [
    { id: "CurrentContracts", label: "Current", hasError: false },
    { id: "ArchivedContracts", label: "Archived", hasError: true },
  ];
  const [activeTab, setActiveTab] = useState(
    isArchived ? tabs[1].id : tabs[0].id
  );

  const CompanyId: any =
    typeof window !== "undefined"
      ? Number(localStorage.getItem("companyId"))
      : null;

  useEffect(() => {
    (async () => {
      const response = await getProjectsLists(
        CompanyId,
        isArchived ? true : undefined
      );
      if (response) {
        const projectOptions: any = [
          { label: "All", value: "" },
          ...(response?.map((project: any) => ({
            label: project?.project_name,
            value: project?.project_id,
          })) || []),
        ];
        setProjectList(projectOptions);
      }
    })();
  }, []);

  useEffect(() => {
    if (companyId !== null) {
      fetchData(page, perPage);
    }
  }, [companyId, page, perPage, debouncedSearch]);

  useEffect(() => {
    if (companyId !== null) {
      fetchData(1, perPage);
    }
  }, [selectedProjectId]);

  // useEffect(() => {
  //   if (companyId !== null && search.length > 2) {
  //     fetchData(1, perPage);
  //     return;
  //   }
  //   if (companyId !== null && !search.length) {
  //     fetchData(1, perPage);
  //     return;
  //   }
  // }, [search]);

  const fetchData = async (page: number, rowsPerPage: number) => {
    setLoading(true);
    try {
      const response = await getContractListsForCompany({
        company_id: companyId, // Change companyId as per your requirement
        page_number: page,
        page_size: rowsPerPage,
        search: search,
        // dateFilter: activityDate,
        // startDate: isCustomDate ? activityLogStartDate : null,
        // endDate: isCustomDate ? activityLogEndDate : null,
        contract_status: statusValue,
        project_id: selectedProjectId,
      });
      if (response) {
        const responseData = JSON.parse(JSON.stringify(response));
        setContracts(response.contract_list || []);
        setTotalRows(response.total_count || 0);
        // const projectOptions: any = [
        //   { label: "All", value: "" },
        //   ...(response.project_list?.map((project: any) => ({
        //     label: project?.project_name,
        //     value: project?.project_id,
        //   })) || []),
        // ];

        // setProjectList(projectOptions);

        setPerPage(rowsPerPage);
        let printDataObjCreation = responseData?.contract_list?.map(
          (contract: ContractType) => {
            return {
              contract_date: formatDate(contract?.contract_date),
              project_name: contract?.project_name,
              contract_name: contract?.contract_name,
              buyer_name: contract?.buyer_name,
              seller_name: contract?.seller_name,
              initial_contract_sum: `$ ${
                contract?.initial_contract_sum
                  ? Number(contract.initial_contract_sum).toLocaleString(
                      undefined,
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )
                  : "0.00"
              }`,

              variation_amount: `$ ${
                contract?.variation_amount?.toLocaleString() || "0.00"
              }`,
            };
          }
        );

        setPrintDocumentData(printDataObjCreation);
      }
    } catch (error) {
      console.error("Error fetching contract lists:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch company ID from local storage
    const storedCompanyId = localStorage.getItem("companyId");

    if (storedCompanyId) {
      setCompanyId(parseInt(storedCompanyId, 10)); // Parse string to integer
    }
  }, []);

  // useEffect(() => {
  //   if (companyId !== null) {
  //     fetchData(page, perPage);
  //   }
  // }, [activityDate, activityLogEndDate, activityLogStartDate]);

  const handleSelectChange = (selectedValue: any) => {
    setSelectedValue(selectedValue);
    // Perform any other actions based on the selected value
  };
  const handleRowView = (id: any) => {
    router.push(`${ApplicationURLS.USER_CONTRACTS_OVERVIEW}/${id}`);
    // Perform any other actions based on the selected value
  };

  const handleOptionClick = async (data: {
    id: string;
    option: string;
    user_id: string;
    email: string; // Add email to the data type
    name: string;
    contract_status: string;
    previous_status: string;
  }) => {
    const { id, option, contract_status, previous_status } = data;

    if (option === "Edit") {
      router.push(`${ApplicationURLS.USER_EDIT_CONTRACTS}/${id}`);
    } else if (option === "Delete") {
      setOpenModal(true);
      setActionData(data);
    } else if (option === "View") {
      router.push(`${ApplicationURLS.USER_CONTRACTS_OVERVIEW}/${id}`);
    } else if (option === "Completed") {
      setOpenModal(true);
      setActionData(data);
      ("Move To Current");
    } else if (option === "Move To Current") {
      setActionData(data);
      ("Move To Current");
      {
        // Move contract to In Progress
        await updateContractStatusById({ id, status: previous_status });
        // Refresh the contract list after deletion
        fetchData(page, perPage);
        // Add any additional logic for other statuses if needed
      }
    }
  };

  const handleDeleteFunction = async (id: string) => {
    setOpenModal(false); // Close the modal
    try {
      await updateContractStatusById({ id, status: "Deleted" });
      // Refresh the contract list after deletion
      fetchData(page, perPage);
    } catch (error) {
      console.error("Error deleting user from company:", error);
    }
  };

  const handleCompletedFunction = async (id: string) => {
    setOpenModal(false); // Close the modal
    try {
      await updateContractStatusById({ id, status: "Completed" });
      // Refresh the contract list after deletion
      fetchData(page, perPage);
    } catch (error) {
      console.error("Error deleting user from company:", error);
    }
  };

  const handlePageChange = async (page: number) => {
    setPage(page);
    await fetchData(page, perPage);
  };

  const handlePerRowsChange = async (newPerPage: number, page: number) => {
    setPerPage(newPerPage);
    await fetchData(page, newPerPage);
  };
  const columns = [
    {
      name: "Date Created",
      selector: (row: ContractType) => formatDate(row.contract_date),
      maxWidth: "120px",
      center: true,
    },
    {
      name: "Project Name",
      selector: (row: ContractType) => row.project_name,
      wrap: true, // Allow the text to wrap
      grow: 4,
    },
    {
      name: "Contract Name",
      selector: (row: ContractType) => row.contract_name,
      wrap: true, // Allow the text to wrap
      grow: 4,
    },
    {
      name: "Buyer Name",
      selector: (row: ContractType) => row.buyer_name,
      wrap: true, // Allow the text to wrap
      grow: 2,
    },
    {
      name: "Seller Name",
      selector: (row: ContractType) => row.seller_name,
      wrap: true,
      grow: 2,
    },
    {
      name: "Contract Sum",
      selector: (row: ContractType) => row.initial_contract_sum,
      format: (row: any) =>
        `$ ${
          row.initial_contract_sum
            ? Number(row.initial_contract_sum).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : "0.00"
        }`,

      wrap: true,
      grow: 2,
      width: "150px",
      fixed: "right",
    },
    {
      name: "Agreed Variations",
      selector: (row: ContractType) => row.variation_amount,
      format: (row: any) =>
        row.variation_amount !== null
          ? `$ ${Number(row.variation_amount).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          : "",

      wrap: true,
      grow: 2,
      fixed: "right",
      width: "150px",
    },
    {
      name: "Actions",
      fixed: "right",
      grow: true,
      center: true,
      cell: (row: ContractType, index: number) => (
        <Overlays
          trigger="click"
          placement={index === 0 ? "bottom-end" : "auto"}
          overlay={<span></span>}
          popoverTypes={"tableActions"}
          popoverActions={
            isArchived
              ? [
                  { label: "View", value: "View" },
                  { label: "Move To Current", value: "Move To Current" },
                ]
              : [
                  { label: "View", value: "View" },
                  { label: "Edit", value: "Edit" },
                  { label: "Completed", value: "Completed" },
                  { label: "Delete", value: "Delete", isDelete: true },
                ]
          }
          customPopupstyles={styles.customPopupstyles}
          cellData={{
            id: row.id,
            contract_status: row.contract_status,
            previous_status: row.previous_status,
          }}
          optionClick={(data) => handleOptionClick({ ...data })}
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
            <ThreeDots />
          </div>
        </Overlays>
      ),
    },
  ];

  const handlePrintPDF = () => {
    let formatedTableData: any[] = printDocumentData?.map(
      (contract: ContractType) => [
        contract?.contract_date,
        contract?.project_name,
        contract?.contract_name,
        contract?.buyer_name,
        contract?.seller_name,
        contract?.initial_contract_sum,
        contract?.variation_amount,
      ]
    );
    let headerNames: string[] = [
      "Date Created",
      "Project Name",
      "Contract Name",
      "Buyer Name",
      "Seller Name",
      "Contract Sum",
      "Agreed Variations",
    ];
    generateAndPrintPDF(formatedTableData, headerNames, "contracts", true);
  };

  function downloadExcel() {
    const columnNames = [
      { value: "contract_date", label: "Date Created" },
      { value: "project_name", label: "Project Name" },
      { value: "contract_name", label: "Contract Name" },
      { value: "buyer_name", label: "Buyer Name" },
      { value: "seller_name", label: "Seller Name" },
      { value: "initial_contract_sum", label: "Contract Sum" },
      { value: "variation_amount", label: "Agreed Variations" },
    ];
    convertJsonToExcel(printDocumentData, "Contracts list", columnNames);
  }

  const handleExportExcel = () => {
    if (printDocumentData?.length) {
      downloadExcel();
    }
  };

  const onInputChange = useCallback((e: { target: { value: string } }) => {
    const inputvalue = e.target.value?.trim()
      ? e.target.value
      : e.target.value?.trim();
    setSearch(inputvalue);
  }, []);

  const handleTabClick = (tabId: string) => {
    if (activeTab === tabId) {
      return;
    }

    if (tabId === "CurrentContracts") {
      router.push(ApplicationURLS.USER_CONTRACT_LIST_CURRENT);
    } else {
      router.push(ApplicationURLS.USER_CONTRACT_LIST_ARCHIVED);
    }
  };
  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
    // Perform any other actions based on the selected date
  };

  // const handleActivityChange = (selectedValue: any) => {
  //   setSingleActivyDate(selectedValue);
  //   if (selectedValue.value === "Custom") {
  //     setIsCustomDate(true);
  //   } else {
  //     setIsCustomDate(false);
  //   }
  //   setActivityDate(selectedValue?.value); // Perform any other actions based on the selected value
  // };

  const CustomSubHeader = () => (
    <div className={styles.customSubHeaderCon}>
      <div className={styles.textAndSelectCon}>
        <TextField
          placeholder="Search By Project Name, Contract Name"
          value={search}
          onChange={onInputChange}
          type="text"
          autoFocus
          className={styles.textFieldStyles}
        />
        <div className={styles.DropdownStyles}>
          <SearchableSelect
            key={timeKey}
            options={projectList}
            onChange={(selectedOption) => {
              if (selectedOption) {
                setSelectedProjectId(selectedOption?.value);
                setSelectedProjectName(selectedOption);
              }
            }}
            disabled={false}
            placeholder="Select project"
            singleSelectedData={selectedProjectName}
          />
        </div>
        {isAnyFilterActive && (
          <div>
            <button onClick={resetFilters} className={styles.resetButton}>
              <ArrowClockwise /> Reset Filters
            </button>
          </div>
        )}
        {/* <SearchableSelect
          options={activityDateOptions}
          onChange={handleActivityChange}
          disabled={false}
          placeholder="select option"
          singleSelectedData={singleActivyDate}
        />
        {isCustomDate && (
          <>
            <CustomDatePicker
              showIcon={true}
              toggleCalendarOnIconClick
              placeholderText="&nbsp;From date"
              className={styles.DatePickerCustomStyles}
              selected={activityLogStartDate}
              onChange={(selectedDate: string) => {
                let fromDate = new Date(
                  new Date(selectedDate).setHours(0, 0, 0, 0)
                );
                if (fromDate > activityLogEndDate) {
                  setActivityLogStartDate(fromDate);
                  setActivityLogEndDate(new Date(selectedDate));
                } else {
                  setActivityLogStartDate(fromDate);
                }
              }}
              disabled={false}
              format={DD_MM_YYYY}
              value={activityLogStartDate}
              maxDate={new Date()}
            />

            <CustomDatePicker
              showIcon={true}
              toggleCalendarOnIconClick
              placeholderText="&nbsp;To date"
              selected={activityLogEndDate}
              value={activityLogEndDate}
              onChange={(selectedDate: string) => {
                let toDate = new Date(selectedDate);
                if (toDate < activityLogStartDate) {
                  return;
                } else {
                  setActivityLogEndDate(toDate);
                }
              }}
              disabled={false}
              format={DD_MM_YYYY}
              className={styles.DatePickerCustomStyles}
            />
          </>
        )} */}
      </div>
      <div className={styles.headerIconCon}>
        {printDocumentData?.length > 0 && (
          <>
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
              onClick={handleExportExcel}
              title="Export to Excel"
            >
              <FileEarmarkExcel />
            </span>
          </>
        )}
      </div>
    </div>
  );
  return (
    <div className={styles.dataContainer}>
      <ReusableBreadcrumb
        items={[
          {
            href: "/user/dashboard",
            label: "Home",
            active: routePath === ApplicationURLS.USER_DASHBOARD,
          },
          {
            href: "",
            label: "Contracts",
            active: true,
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      <div className={styles.headerAndButtonCon}>
        <span className={styles.headerText}>Contracts</span>
        {!isArchived && (
          <FormButton
            className={styles.buttonStyles}
            onClick={() => router.push("/user/contracts/add")}
          >
            + Contract
          </FormButton>
        )}
      </div>
      <TabContainer
        tabs={tabs}
        activeTab={activeTab}
        onTabClick={handleTabClick}
      />

      <ReusableDataTable
        columns={columns}
        data={contracts}
        subHeader
        subHeaderComponent={<CustomSubHeader />}
        pagination
        paginationServer
        progressPending={loading}
        paginationTotalRows={totalRows}
        onChangeRowsPerPage={handlePerRowsChange}
        onChangePage={handlePageChange}
        onRowClicked={(data: any) => handleRowView(data?.id)}
      />

      <AppModal
        show={openModal}
        onHide={() => setOpenModal(false)}
        firstButtonLabel="Yes"
        secondButtonLabel="No"
        modalHeading=""
        modalBodyTitle=""
        modalBodyContent={
          actionData?.option === "Delete"
            ? "Are you sure you wish to move this contract to the archive list with status set to Deleted?"
            : "Are you sure you wish to move this contract to the archive list with status set to Completed?"
        }
        onConfirm={() =>
          actionData?.option === "Delete"
            ? handleDeleteFunction(actionData?.id)
            : handleCompletedFunction(actionData?.id)
        }
      />
    </div>
  );
};

export default Contracts;
