//default imports
"use client";
import React, { Fragment, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
//import from reactstrap components and icons
import {
  ArrowClockwise,
  FileEarmarkExcel,
  Printer,
} from "react-bootstrap-icons";
//import from customized components
import ReusableDataTable from "@/components/DataTable/dataTable";

//import customized styles
import customStyles from "./compliance.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
//import from external libraries
//import from constants, interfaces ,functions and services
import { ApplicationURLS } from "@/common/applicationURLS";

import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import { DD_MM_YYYY } from "@/common/constants/general";
import { getProjectsLists } from "@/container/contracts/contracts.functions";
import { getCookie } from "cookies-next";
import {
  convertJsonToExcel,
  formatDate,
  generateAndPrintPDF,
  mapDropdownOptions,
} from "@/common/commonFunctions";
import { FetchAllBankAccounts } from "../bankTrustAccount/backTrustAccount.functions";
import { fetchCompliancesList } from "./compliance.function";
import { RowsPerPageInTable } from "@/common/constants";
import {
  accountTypes,
  complianceDateOptions,
  dropdownAllOption,
} from "./complianceConstantData";

//module level constants and interfaces

type gridListProps = {
  project_name: string;
  project_added_on_date: string;
  site_address: string;
  role: string;
  pta_compliance: string;
  rta_compliance: string;
  project_id: number;
};

type ComplianceProps = {
  projectData?: { project_id: number };
  isOverView?: boolean;
};

export default function Compliances({
  isOverView,
  projectData,
}: Readonly<ComplianceProps>) {
  //Other Hooks
  const routePath = usePathname();
  const router = useRouter();
  const companyId = Number(getCookie("companyId")) || "";

  const [selectedAccountType, setSelectedAccountType] = useState<any>("");

  const [availableBankAccounts, setAvailableBankAccounts] = useState<any>([]);
  const [selectedBankAccount, setSelectedBankAccount] = useState<any>("");
  const [availableProjects, setAvailableProjects] = useState<any>([]);
  const [selectedProject, setSelectedProject] = useState<any>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);
  const [gridList, setGridList] = useState([]);
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [selectedDateOption, setSelectedDateOption] = useState<any>(
    complianceDateOptions[0]
  );
  const [customStartDate, setCustomStartDate] = useState<any>(
    new Date(new Date().setHours(0, 0, 0, 0))
  );
  const resetFilters = () => {
    setSelectedAccountType("");
    setSelectedProject("");
    setSelectedBankAccount("");
    setSelectedDateOption(complianceDateOptions[0]);
    setCustomStartDate(new Date(new Date().setHours(0, 0, 0, 0)));
    setCustomEndDate(new Date());
    setIsCustomDate(false);
  };
  const isAnyFilterActive =
    selectedProject !== "" ||
    selectedAccountType !== "" ||
    selectedBankAccount !== "";
  selectedDateOption.label !== "All Dates";

  const [customEndDate, setCustomEndDate] = useState<any>(new Date());

  useEffect(() => {
    fetchAllProjects();
  }, []);

  useEffect(() => {
    getBankAccountName();
  }, [selectedProject]);

  useEffect(() => {
    getComplianceList();
  }, [
    selectedBankAccount,
    selectedProject,
    selectedAccountType,
    page,
    perPage,
    selectedDateOption,
    customStartDate,
    customEndDate,
  ]);

  function handleDurationChange(selectedValue: any) {
    setSelectedDateOption(selectedValue);
    if (selectedValue.value === "Custom") {
      setIsCustomDate(true);
    } else {
      setCustomStartDate(null);
      setCustomEndDate(null);
      setIsCustomDate(false);
    }
  }

  const CustomSubHeader = () => (
    // <Row className="w-100">
    //   <Col>
    //     <Row>
    //       {!isOverView && (
    //         <Col lg={2}>
    //           <SearchableSelect
    //             options={availableProjects}
    //             onChange={(selectedOption: any) =>
    //               setSelectedProject(selectedOption)
    //             }
    //             disabled={false}
    //             selectedData={selectedProject}
    //             placeholder="Project Name"
    //           />
    //         </Col>
    //       )}

    //       <Col lg={2}>
    //         <SearchableSelect
    //           options={availableBankAccounts}
    //           onChange={(selectedOption: any) =>
    //             setSelectedBankAccount(selectedOption)
    //           }
    //           disabled={false}
    //           placeholder="Account Name"
    //           selectedData={selectedBankAccount}
    //         />
    //       </Col>
    //       <Col lg={2}>
    //         <SearchableSelect
    //           options={accountTypes}
    //           onChange={(selectedOption: any) =>
    //             setSelectedAccountType(selectedOption)
    //           }
    //           disabled={false}
    //           placeholder="Account Type"
    //           selectedData={selectedAccountType}
    //         />
    //       </Col>
    //       <Col>
    //         <Col lg={2}>
    //           <SearchableSelect
    //             options={complianceDateOptions}
    //             onChange={handleDurationChange}
    //             disabled={false}
    //             placeholder="select option"
    //             selectedData={selectedDateOption}
    //           />
    //         </Col>
    //         <Col lg={3}>
    //           {isCustomDate && (
    //             <Row>
    //               <Col>
    //                 <CustomDatePicker
    //                   showIcon={true}
    //                   placeholderText="&nbsp;From date"
    //                   value={customStartDate}
    //                   onChange={(selectedDate: string) =>
    //                     onStartDateChange(selectedDate)
    //                   }
    //                   format={DD_MM_YYYY}
    //                   className={customStyles.listDatePicker}
    //                 />
    //               </Col>
    //               <Col>
    //                 <CustomDatePicker
    //                   showIcon={true}
    //                   placeholderText="&nbsp;To date"
    //                   value={customEndDate}
    //                   onChange={(selectedDate: string) =>
    //                     onEndDateChange(selectedDate)
    //                   }
    //                   format={DD_MM_YYYY}
    //                   className={customStyles.listDatePicker}
    //                 />
    //               </Col>
    //               <Col lg={1}>
    //                 <div>
    //                   <button
    //                     onClick={resetFilters}
    //                     className={customStyles.resetButton}
    //                   >
    //                     <ArrowClockwise /> Reset Filters
    //                   </button>
    //                 </div>
    //               </Col>
    //             </Row>
    //           )}
    //         </Col>
    //       </Col>
    //     </Row>
    //   </Col>

    //   <Col
    //     xl={1}
    //     lg={1}
    //     sm={12}
    //     xs={12}
    //     md={12}
    //     className="d-flex justify-content-end gap-3"
    //   >
    //     <span
    //       className="c-p"
    //       onClick={() => {
    //         if (gridList?.length) {
    //           handlePrintPDF();
    //         }
    //       }}
    //       title="Print PDF"
    //     >
    //       <Printer />
    //     </span>
    //     <span
    //       className="c-p"
    //       onClick={() => {
    //         if (gridList?.length) {
    //           downloadExcel();
    //         }
    //       }}
    //       title="Export to Excel"
    //     >
    //       <FileEarmarkExcel />
    //     </span>
    //   </Col>
    // </Row>

    <div className={customStyles.customSubHeaderCon}>
      <div className={customStyles.textAndSelectCon}>
        <div>
          {!isOverView && (
            <SearchableSelect
              options={availableProjects}
              onChange={(selectedOption: any) =>
                setSelectedProject(selectedOption)
              }
              disabled={false}
              selectedData={selectedProject}
              placeholder="Project Name"
            />
          )}
        </div>
        <div>
          <SearchableSelect
            options={availableBankAccounts}
            onChange={(selectedOption: any) =>
              setSelectedBankAccount(selectedOption)
            }
            disabled={false}
            placeholder="Account Name"
            selectedData={selectedBankAccount}
          />
        </div>
        <div>
          <SearchableSelect
            options={accountTypes}
            onChange={(selectedOption: any) =>
              setSelectedAccountType(selectedOption)
            }
            disabled={false}
            placeholder="Account Type"
            selectedData={selectedAccountType}
          />
        </div>
        <div>
          <SearchableSelect
            options={complianceDateOptions}
            onChange={handleDurationChange}
            disabled={false}
            placeholder="select option"
            selectedData={selectedDateOption}
          />
        </div>
        <div>
          {isCustomDate && (
            <>
              <CustomDatePicker
                showIcon={true}
                placeholderText="&nbsp;From date"
                value={customStartDate}
                onChange={(selectedDate: string) =>
                  onStartDateChange(selectedDate)
                }
                format={DD_MM_YYYY}
                className={customStyles.listDatePicker}
              />
              <CustomDatePicker
                showIcon={true}
                placeholderText="&nbsp;To date"
                value={customEndDate}
                onChange={(selectedDate: string) =>
                  onEndDateChange(selectedDate)
                }
                format={DD_MM_YYYY}
                className={customStyles.listDatePicker}
              />
            </>
          )}
          {isAnyFilterActive && (
            <div>
              <button
                onClick={resetFilters}
                className={customStyles.resetButton}
              >
                <ArrowClockwise /> Reset Filters
              </button>
            </div>
          )}
        </div>

        <div className={customStyles.headerIconCon}>
          <span
            className="c-p"
            onClick={() => {
              if (gridList?.length) {
                handlePrintPDF();
              }
            }}
            title="Print PDF"
          >
            <Printer />
          </span>
          <span
            className="c-p"
            onClick={() => {
              if (gridList?.length) {
                downloadExcel();
              }
            }}
            title="Export to Excel"
          >
            <FileEarmarkExcel />
          </span>
        </div>
      </div>
    </div>
  );

  function handlePrintPDF() {
    let formattedTableData: any[] = gridList.map((data: gridListProps) => [
      data.project_name,
      data.project_added_on_date ? formatDate(data.project_added_on_date) : "",
      data.site_address,
      data.role,
      data.pta_compliance,
      data.rta_compliance,
    ]);
    let headerNames: string[] = [
      "Project Name",
      "Date Added",
      "Site Address",
      "Role",
      "PTA Compliance",
      "RTA Compliance",
    ];
    generateAndPrintPDF(formattedTableData, headerNames, "compliance");
  }

  function downloadExcel() {
    const columnNames = [
      { value: "project_name", label: "Project Name" },
      { value: "project_added_on_date", label: "Date Added" },
      { value: "site_address", label: "Site Address" },
      { value: "role", label: "Role" },
      { value: "pta_compliance", label: "PTA Compliance" },
      { value: "rta_compliance", label: "RTA Compliance" },
    ];
    convertJsonToExcel(gridList, "compliance list", columnNames);
  }

  const columns = [
    {
      name: "Project Name",
      selector: (row: gridListProps) => row.project_name,
    },
    {
      name: "Date Added",
      selector: (row: gridListProps) =>
        row?.project_added_on_date ? formatDate(row.project_added_on_date) : "",
    },
    {
      name: "Site Address",
      selector: (row: gridListProps) => row.site_address,
    },
    {
      name: "Role",
      selector: (row: gridListProps) => row.role,
    },
    {
      name: "PTA Compliance",
      selector: (row: gridListProps) => row.pta_compliance,
      cell: (row: gridListProps) => (
        <span
          style={{ color: row.pta_compliance === "Ok" ? "green" : "red" }}
          onClick={() => navigateToOverview(row)}
        >
          {row.pta_compliance}
        </span>
      ),
    },
    {
      name: "RTA Compliance",
      selector: (row: gridListProps) => row.rta_compliance,
      cell: (row: gridListProps) => (
        <span
          style={{ color: row.rta_compliance === "Ok" ? "green" : "red" }}
          onClick={() => navigateToOverview(row)}
        >
          {row.rta_compliance}
        </span>
      ),
    },

    {
      name: "Action",
      cell: (row: gridListProps) => (
        <span
          className={customStyles.gridAction}
          onClick={() => navigateToOverview(row)}
        >
          View
        </span>
      ),
    },
  ];

  async function fetchAllProjects() {
    const companyId: any = getCookie("companyId");
    const response: any = await getProjectsLists(+companyId, false);

    if (response.length > 0) {
      const modifiedData = [
        dropdownAllOption,
        ...mapDropdownOptions(response, "project_name", "project_id"),
      ];

      setAvailableProjects(modifiedData);
    } else {
      setAvailableProjects([]);
    }
  }

  async function getBankAccountName() {
    const postData = {
      company_id: companyId,
      project_id: selectedProject?.value,
      is_alphabetical_order: true,
    };

    const response: any = await FetchAllBankAccounts(postData);

    if (response?.extendedBankAccounts?.length > 0) {
      const modifiedData = [
        dropdownAllOption,
        ...mapDropdownOptions(
          response?.extendedBankAccounts,
          "account_name",
          "bank_account_id"
        ),
      ];

      setAvailableBankAccounts(modifiedData);
    } else {
      setAvailableBankAccounts([]);
    }
  }

  async function getComplianceList() {
    try {
      setLoading(true);

      const postData = {
        payload: {
          account_type: selectedAccountType?.value || null,
          bank_account_id: selectedBankAccount?.value || null,
          company_id: companyId,
          items_per_page: perPage,
          page_number: page,

          project_id:
            (projectData?.project_id ?? selectedProject?.value) || null,
          date_filter: selectedDateOption?.value,
          end_date:
            selectedDateOption?.value === "Custom" ? customEndDate : null,
          start_date:
            selectedDateOption?.value === "Custom" ? customStartDate : null,
        },
      };

      const response: any = await fetchCompliancesList(postData);

      if (response.results.length > 0) {
        setGridList(response.results);
      } else {
        setGridList([]);
      }
      setTotalRows(response?.total_count);
      setLoading(false);
    } catch (err: any) {
      setGridList([]);
      setLoading(false);
    }
  }

  async function handlePerRowsChange(newPerPage: number, page: number) {
    setPerPage(newPerPage);
  }

  async function handlePageChange(page: number) {
    setPage(page);
  }

  function onStartDateChange(selectedDate: string) {
    let fromDate = new Date(selectedDate);
    if (fromDate > customEndDate) {
      setCustomStartDate(new Date(fromDate));
      setCustomEndDate(new Date(selectedDate));
    } else {
      setCustomStartDate(new Date(fromDate));
    }
  }

  function onEndDateChange(selectedDate: string) {
    let toDate = new Date(selectedDate);
    if (toDate < customStartDate) {
      return;
    } else {
      setCustomEndDate(new Date(toDate));
    }
  }

  function navigateToOverview(gridRow: any) {
    router.push(
      `${ApplicationURLS.USER_COMPLIANCE_OVERVIEW}?project=${gridRow?.project_id}`
    );
  }

  //Render Template
  return (
    <div className={customStyles.container}>
      {!isOverView && (
        <Fragment>
          <ReusableBreadcrumb
            items={[
              {
                href: ApplicationURLS.USER_DASHBOARD,
                label: "Home",
                active: routePath === ApplicationURLS.USER_DASHBOARD,
              },

              {
                href: "",
                label: "Compliance",
                active: true,
              },
            ]}
            separator={
              <span className={customStyles.breadcrumbSeparator}>&gt;</span>
            }
          />
          <div className={customStyles.headerContent}>
            <span className={customStyles.headerText}>Compliance</span>
          </div>
        </Fragment>
      )}

      <ReusableDataTable
        columns={columns}
        data={gridList?.length > 0 ? gridList : []}
        subHeader
        subHeaderComponent={<CustomSubHeader />}
        pagination
        progressPending={loading}
        paginationServer
        paginationTotalRows={totalRows}
        onChangeRowsPerPage={handlePerRowsChange}
        onChangePage={handlePageChange}
        onRowClicked={(data: any) => navigateToOverview(data)}
      />
    </div>
  );
}
