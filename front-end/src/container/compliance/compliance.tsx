"use client";
import React, { useEffect, useState } from "react";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  allOption,
  ptaDropdownOptions,
  rtaDropdownOptions,
} from "./compliance.constant";

import {
  ArrowClockwise,
  FileEarmarkExcel,
  Printer,
} from "react-bootstrap-icons";
import styles from "./compliance.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { usePathname, useRouter } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";
import { Col, Container, Row } from "react-bootstrap";
import {
  fetchAllDropdowns,
  fetchFiltersForAdminCompliance,
} from "./compliances.function";
import {
  convertJsonToExcel,
  formatDate,
  generateAndPrintPDF,
  mapDropdownOptions,
} from "@/common/commonFunctions";

import { RowsPerPageInTable } from "@/common/constants";
import { fetchCompliancesList } from "../userModules/compliance/compliance.function";
import { ApplicationURLS } from "@/common/applicationURLS";

type gridData = {
  company_name: string;
  project_name: string;
  project_added_on_date: string;
  site_address: string;
  role: string;
  pta_compliance: string;
  rta_compliance: string;
};

function Compliance() {
  const routePath = usePathname();

  const router = useRouter();

  const [companyList, setCompanyList] = useState<any[]>([]);
  const [accountList, setAccountList] = useState<any[]>([]);
  const [projectList, setProjectList] = useState<any[]>([]);
  const [accountType, setAccountType] = useState<any>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [selectedAccountType, setSelectedAccountType] = useState<any>(null);
  const [selectedPta, setSelectedPta] = useState<any>(null);
  const [selectedRta, setSelectedRta] = useState<any>(null);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [gridList, setGridList] = useState([]);

  useEffect(() => {
    getAllDropdowns();
  }, [selectedAccount, selectedAccountType, selectedCompany, selectedProject]);

  useEffect(() => {
    getComplianceList();
  }, [
    selectedAccount,
    selectedAccountType,
    selectedCompany,
    selectedProject,
    selectedPta,
    selectedRta,
    perPage,
    page,
  ]);

  const resetFilters = () => {
    setSelectedCompany(null);
    setSelectedProject(null);
    setSelectedAccount(null);
    setSelectedAccountType(null);
    setSelectedPta(null);
    setSelectedRta(null);
    setPage(1); // Optional: Reset page number to 1
  };

  const isAnyFilterActive = !!(
    selectedCompany?.value ||
    selectedProject?.value ||
    selectedAccount?.value ||
    selectedAccountType?.value ||
    selectedPta?.value ||
    selectedRta?.value
  );

  const columns = [
    {
      name: "Company Profile",
      maxWidth: "250px",
      selector: (row: gridData) => row?.company_name,
      wrap: true,
    },
    {
      name: "Project Name",
      selector: (row: gridData) => row?.project_name,
    },
    {
      name: "Date Added",
      selector: (row: gridData) =>
        row?.project_added_on_date
          ? formatDate(row?.project_added_on_date)
          : "",
    },
    {
      name: "Site Address",
      selector: (row: gridData) => row?.site_address,
    },
    {
      name: "Role",
      selector: (row: gridData) => row?.role,
    },
    {
      name: "PTA Compliance",
      selector: (row: gridData) => row?.pta_compliance,
      cell: (row: gridData) => (
        <span style={{ color: row?.pta_compliance === "Ok" ? "green" : "red" }}>
          {row?.pta_compliance}
        </span>
      ),
    },
    {
      name: "RTA Compliance",
      selector: (row: gridData) => row?.rta_compliance,
      cell: (row: gridData) => (
        <span style={{ color: row?.rta_compliance === "Ok" ? "green" : "red" }}>
          {row?.rta_compliance}
        </span>
      ),
    },

    {
      name: "Action",
      cell: (row: gridData) => (
        <span
          className={styles.gridAction}
          onClick={() => navigateToOverview(row)}
        >
          View
        </span>
      ),
    },
  ];

  const CustomSubHeader = () => (
    <div className={styles.customSubHeaderCon}>
      <div className={styles.textAndSelectCon}>
        <Container>
          <Row>
            <Col lg="3" md="6">
              <SearchableSelect
                options={companyList}
                onChange={(selectedValue) => setSelectedCompany(selectedValue)}
                placeholder="Company Profile"
                className={styles.textFieldStyles}
                selectedData={selectedCompany}
              />
            </Col>

            <Col lg="3" md="6">
              <SearchableSelect
                options={projectList}
                onChange={(selectedValue) => setSelectedProject(selectedValue)}
                placeholder="Project Name"
                className={styles.textFieldStyles}
                selectedData={selectedProject}
              />
            </Col>

            <Col lg="3" md="6">
              <SearchableSelect
                options={accountList}
                onChange={(selectedValue) => setSelectedAccount(selectedValue)}
                placeholder="Account Name"
                className={styles.textFieldStyles}
                selectedData={selectedAccount}
              />
            </Col>
            <Col lg="3" md="6">
              <SearchableSelect
                options={accountType}
                onChange={(selectedValue) =>
                  setSelectedAccountType(selectedValue)
                }
                placeholder="Account Type"
                className={styles.textFieldStyles}
                selectedData={selectedAccountType}
              />
            </Col>
          </Row>
          <div className="secondRow">
            <Row>
              <Col lg="3" md="6">
                <SearchableSelect
                  options={ptaDropdownOptions}
                  onChange={(selectedValue) => setSelectedPta(selectedValue)}
                  placeholder="PTA Status"
                  className={styles.textFieldStyles}
                  selectedData={selectedPta}
                />
              </Col>
              <Col lg="3" md="6">
                <SearchableSelect
                  options={rtaDropdownOptions}
                  onChange={(selectedValue) => setSelectedRta(selectedValue)}
                  placeholder="RTA Status"
                  className={styles.textFieldStyles}
                  selectedData={selectedRta}
                />
              </Col>
              <Col lg="3" md="6">
                {isAnyFilterActive && (
                  <button
                    onClick={resetFilters}
                    title="Reset Filters"
                    className={styles.resetButton}
                  >
                    <ArrowClockwise className={styles.iconSpacing} />
                    Reset Filters
                  </button>
                )}
              </Col>
              <Col lg="3" md="6"></Col>
            </Row>
          </div>
        </Container>
      </div>
      <div className={styles.headerIconCon}>
        <span
          onClick={() => {
            if (gridList?.length) {
              handlePrintPDF();
            }
          }}
          className="c-p"
          title="Print PDF"
        >
          <Printer />
        </span>
        <span
          onClick={() => {
            if (gridList?.length) {
              downloadExcel();
            }
          }}
          title="Export to Excel"
          className="c-p"
        >
          <FileEarmarkExcel />
        </span>
      </div>
    </div>
  );

  async function handlePerRowsChange(newPerPage: number, page: number) {
    setPerPage(newPerPage);
  }

  async function handlePageChange(page: number) {
    setPage(page);
  }

  async function getAllDropdowns() {
    const postData = {
      payload: {
        bank_account_id: selectedAccount?.value
          ? Number(selectedAccount?.value)
          : null,
        company_id: selectedCompany?.value
          ? Number(selectedCompany?.value)
          : null,
        project_id: selectedProject?.value
          ? Number(selectedProject?.value)
          : null,
      },
    };

    const response: any = await fetchFiltersForAdminCompliance(postData);

    if (response) {
      setCompanyList(
        response?.company_list?.length > 0
          ? [
              { label: "All", value: "" },
              ...mapDropdownOptions(response?.company_list, "name", "value"),
            ]
          : []
      );

      setProjectList(
        response?.project_list?.length > 0
          ? [
              { label: "All", value: "" },
              ...mapDropdownOptions(response?.project_list, "name", "value"),
            ]
          : []
      );

      setAccountList(
        response?.account_list?.length > 0
          ? [
              { label: "All", value: "" },
              ...mapDropdownOptions(response?.account_list, "name", "value"),
            ]
          : []
      );

      setAccountType(
        response?.account_type_list?.length > 0
          ? [
              { label: "All", value: "" },
              ...mapDropdownOptions(
                response?.account_type_list,
                "name",
                "value"
              ),
            ]
          : []
      );
    }
  }

  async function getComplianceList() {
    try {
      setLoading(true);

      const postData = {
        payload: {
          account_type: selectedAccountType?.value || null,
          bank_account_id: selectedAccount?.value
            ? Number(selectedAccount?.value)
            : null,
          company_id: selectedCompany?.value
            ? Number(selectedCompany?.value)
            : null,
          items_per_page: perPage,
          page_number: page,
          pta_compliance: selectedPta?.value || null,
          rta_compliance: selectedRta?.value || null,
          project_id: selectedProject?.value
            ? Number(selectedProject?.value)
            : null,
          date_filter: null,
          end_date: null,
          start_date: null,
        },
      };

      const response: any = await fetchCompliancesList(postData);

      if (response) {
        setGridList(response?.results);
      }
      setTotalRows(response?.total_count);
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
    }
  }

  function navigateToOverview(gridRow: any) {
    router.push(
      `${ApplicationURLS.ADMIN_COMPLIANCE_OVERVIEW}?project=${gridRow?.project_id}`
    );
  }

  function handlePrintPDF() {
    let formattedTableData: any[] = gridList.map((data: gridData) => [
      data?.company_name,
      data?.project_name,
      formatDate(data?.project_added_on_date),
      data?.site_address,
      data?.role,
      data?.pta_compliance,
      data?.rta_compliance,
    ]);
    let headerNames: string[] = [
      "Company Profile",
      "Project Name",
      "Date Added",
      "Site Address",
      "Role",
      "PTA Compliance",
      "RTA Compliance",
    ];
    generateAndPrintPDF(formattedTableData, headerNames, "compliances");
  }

  function downloadExcel() {
    const columnNames = [
      { value: "company_name", label: "Company Profile" },
      { value: "project_name", label: "Project Name" },
      { value: "project_added_on_date", label: "Date Added" },
      { value: "site_address", label: "Site Address" },
      { value: "role", label: "Role" },
      { value: "pta_compliance", label: "PTA Compliance" },
      { value: "rta_compliance", label: "RTA Compliance" },
    ];
    convertJsonToExcel(gridList, "compliances list", columnNames);
  }

  return (
    <div className={styles.dataContainer}>
      <ReusableBreadcrumb
        items={[
          {
            href: "/admin/dashboard",
            label: "Home",
            active: routePath === "/admin/dashboard",
          },
          {
            href: ApplicationURLS.ADMIN_COMPLIANCE,
            label: "Compliances",
            active: routePath === ApplicationURLS.ADMIN_COMPLIANCE,
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      <div className={styles.headerAndButtonCon}>
        <span className={styles.headerText}>Compliances</span>
      </div>

      <ReusableDataTable
        columns={columns}
        data={gridList}
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

export default Compliance;
