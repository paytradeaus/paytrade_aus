"use client";
import React, { Fragment, useEffect, useState } from "react";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  CONTRACT,
  PROJECT,
  STATUS,
  currentListActions,
  gridStatusOptions,
  tabOptions,
  variationStatusOptions,
} from "./variationConstantData";
import Overlays from "@/components/Overlayes/Overlayes";
import {
  ArrowClockwise,
  FileEarmarkExcel,
  Printer,
  ThreeDots,
} from "react-bootstrap-icons";
import styles from "./variations.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { usePathname, useRouter } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";
import FormButton from "@/components/Button/button";
import { RowsPerPageInTable } from "@/common/constants";
import {
  deleteVariationsById,
  fetchContractList,
  fetchProjectList,
  fetchVariationsList,
} from "./variations.function";
import {
  convertJsonToExcel,
  convertPositiveDecimalTwoDigit,
  formatDate,
  generateAndPrintPDF,
} from "@/common/commonFunctions";
import { ApplicationURLS } from "@/common/applicationURLS";
import { AppModal } from "@/components/model/model";
import { DD_MM_YYYY, DELETE, EDIT, VIEW } from "@/common/constants/general";
import { tabId } from "@/container/userProjectOverview/userProjectOverview.constant";
import TabContainer from "@/container/addGroups/tabsContainer";

type UserData = {
  created_on: string;
  variation_id: string;
  project_name: string;
  contract_name: string;
  variation_amount: number;
  variation_status: string;
};

const Variations = ({ isArchived, overViewDetails = {} }: any) => {
  const {
    overViewMode,
    data: overviewData,
    screenName: overviewScreenName,
  } = overViewDetails;

  const [loading, setLoading] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);
  const [variationsGridList, setVariationsGridList] = useState([]);
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);
  const [availableContracts, setAvailableContracts] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [selectedStatus, setSelectedStatus] = useState<any>(null);
  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState<boolean>(false);
  const [gridRowData, setGridRowData] = useState<any>({});
  const [selectedTab, setSelectedTab] = useState(
    !isArchived ? tabOptions[0]?.id : tabOptions[1]?.id
  );
  const [printDocumentData, setPrintDocumentData] = useState<any>([]);
  const resetFilters = () => {
    setSelectedProject(null);
    setSelectedStatus(null);
    // getVariationsList(); // Optionally fetch the variations list again
  };
  const isAnyFilterActive = selectedProject !== null || selectedStatus !== null;
  //  selectedProjectId !== null;
  const router = useRouter();
  const routePath = usePathname();

  const handleSelectChange = (dropdownType: string, selectedValue: any) => {
    if (dropdownType === PROJECT) {
      setSelectedProject(selectedValue);
    } else if (dropdownType === CONTRACT) {
      setSelectedContract(selectedValue);
    } else if (dropdownType === STATUS) {
      setSelectedStatus(selectedValue);
    }
  };

  useEffect(() => {
    getProjectList();
    getContractList();
  }, []);

  useEffect(() => {
    if (!overViewMode || (overViewMode && overviewData?.project_id))
      getVariationsList();
  }, [
    selectedContract,
    selectedProject,
    selectedStatus,
    page,
    perPage,
    overviewData,
  ]);

  function handleActions(data: any, row: any) {
    const { option } = data;

    if (option === "View") {
      navigateToViewEditPage(VIEW, row?.id);
    } else if (option === "edit") {
      navigateToViewEditPage(EDIT, row?.id);
    } else if (option === DELETE) {
      setGridRowData(row);
      setDisplayConfirmationModal(true);
    }
  }

  const columns = [
    {
      name: "Date Created",
      grow: 1,
      wrap: true,
      selector: (row: UserData) =>
        row?.created_on ? formatDate(row.created_on) : "",
    },
    {
      name: "Variation ID",
      grow: 1,
      wrap: true,
      selector: (row: UserData) => row.variation_id,
    },
    {
      name: "Project Name",
      grow: 2,
      wrap: true,
      selector: (row: UserData) => row.project_name,
    },
    {
      name: "Contract Name",
      grow: 1,
      wrap: true,
      selector: (row: UserData) => row.contract_name,
    },
    {
      name: "Variation Amount",
      grow: 1,
      wrap: true,
      selector: (row: UserData) => `$ ${row.variation_amount.toFixed(2)}`,
    },
    {
      name: "Status",
      grow: 0.5,
      selector: (row: UserData) => row.variation_status,
      wrap: true,
    },
    {
      name: "Actions",
      fixed: "left",
      grow: 0.5,

      cell: (row: UserData, index: number) => (
        <Overlays
          trigger="click"
          placement={"auto"}
          overlay={<span></span>}
          popoverTypes={"tableActions"}
          popoverActions={
            isArchived ? [currentListActions[0]] : currentListActions
          }
          optionClick={(data) => handleActions(data, row)}
        >
          <div className={styles.actionDots}>
            <ThreeDots />
          </div>
        </Overlays>
      ),
    },
  ];

  const CustomSubHeader = () => (
    <div className={styles.customSubHeaderCon}>
      <div className={styles.textAndSelectCon}>
        {availableProjects?.length > 0 && !overViewMode && (
          <SearchableSelect
            options={availableProjects}
            onChange={(value: any) => handleSelectChange(PROJECT, value)}
            disabled={false}
            placeholder="Projects"
            singleSelectedData={selectedProject}
            className={styles.dropdown}
          />
        )}
        {availableContracts?.length > 0 && !overViewMode && (
          <SearchableSelect
            options={availableContracts}
            onChange={(value: any) => handleSelectChange(CONTRACT, value)}
            disabled={false}
            placeholder="Contracts"
            singleSelectedData={selectedContract}
          />
        )}
        {!isArchived &&
          (availableProjects?.length > 0 || availableContracts?.length > 0) && (
            <SearchableSelect
              options={gridStatusOptions}
              onChange={(value: any) => handleSelectChange(STATUS, value)}
              disabled={false}
              placeholder="Status"
              singleSelectedData={selectedStatus}
            />
          )}
        {isAnyFilterActive && (
          <div>
            <button onClick={resetFilters} className={styles.resetButton}>
              <ArrowClockwise /> Reset Filters
            </button>
          </div>
        )}
      </div>
      {variationsGridList?.length > 0 && (
        <div className={styles.headerIcons}>
          <span
            className={styles.icon}
            onClick={() => {
              if (variationsGridList?.length) {
                handlePrintPDF();
              }
            }}
            title="Print PDF"
          >
            <Printer />
          </span>
          <span
            className={styles.icon}
            onClick={() => {
              if (variationsGridList?.length) {
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

  function handlePrintPDF() {
    let formattedTableData: any[] = printDocumentData.map((data: UserData) => [
      data?.created_on,
      data?.variation_id,
      data?.project_name,
      data?.contract_name,
      data?.variation_amount,
      data?.variation_status,
    ]);
    let headerNames: string[] = [
      "Date Created",
      "Variation ID",
      "Project Name",
      "Contract Name",
      "Variation Amount",
      "Status",
    ];
    generateAndPrintPDF(formattedTableData, headerNames, "variations");
  }

  function downloadExcel() {
    const columnNames = [
      { value: "created_on", label: "Date Created" },
      { value: "variation_id", label: "Variation ID" },
      { value: "project_name", label: "Project Name" },
      { value: "contract_name", label: "Contract Name" },
      { value: "variation_amount", label: "Variation Amount" },
      { value: "variation_status", label: "Status" },
    ];
    convertJsonToExcel(printDocumentData, "variations list", columnNames);
  }

  async function getVariationsList() {
    const postData = {
      getVariationListsInput: {
        company_id: Number(localStorage.getItem("companyId")),
        page_number: page,
        page_size: perPage,
        project_id: overviewData?.project_id || selectedProject?.value,
        contract_id: overviewData?.contract_id || selectedContract?.value,
        variation_status: isArchived ? "Archived" : selectedStatus?.value,
        search: null,
        date_filter: null,
        start_date: null,
        end_date: null,
      },
    };
    setLoading(true);
    const response = await fetchVariationsList(postData);

    try {
      if (response) {
        setVariationsGridList(response?.variation_list);
        setTotalRows(response?.total_count);
        setLoading(false);
        let printDataObjCreation = response?.variation_list?.map(
          (eachData: UserData) => {
            return {
              variation_id: eachData?.variation_id,
              project_name: eachData?.project_name,
              contract_name: eachData?.contract_name,
              variation_amount: `$ ${
                eachData?.variation_amount
                  ? convertPositiveDecimalTwoDigit(eachData?.variation_amount)
                  : " 0.00"
              }`,
              variation_status: eachData?.variation_status,
              created_on: eachData?.created_on
                ? formatDate(eachData?.created_on, DD_MM_YYYY)
                : "N/A",
            };
          }
        );

        setPrintDocumentData(printDataObjCreation);
      }
    } catch (err: any) {
      setLoading(false);
    }
  }

  async function getProjectList() {
    const postData = {
      companyId: Number(localStorage.getItem("companyId")) || "",
    };

    const response: any = await fetchProjectList(postData);

    if (response?.length > 0) {
      const modifiedData = response.map((data: any) => {
        return { label: data?.project_name, value: data?.project_id };
      });
      setAvailableProjects([{ label: "All", value: null }, ...modifiedData]);
    } else {
      setAvailableProjects([]);
    }
  }

  async function getContractList() {
    const postData = {
      company_id: Number(localStorage.getItem("companyId")) || "",
    };

    const response: any = await fetchContractList(postData);

    if (response?.length > 0) {
      const modifiedData = response.map((data: any) => {
        return { label: data?.contract_name, value: data?.contract_id };
      });
      setAvailableContracts([{ label: "All", value: null }, ...modifiedData]);
    } else {
      setAvailableContracts([]);
    }
  }

  async function handlePerRowsChange(newPerPage: number, page: number) {
    setPerPage(newPerPage);
  }

  async function handlePageChange(page: number) {
    setPage(page);
  }

  async function handleDelete() {
    setLoading(true);

    const postData: any = {
      id: gridRowData?.id,
      status: "Deleted",
    };

    const response = await deleteVariationsById(postData);
    if (response) {
      await getVariationsList();
    }
    setDisplayConfirmationModal(false);

    setLoading(false);
  }

  function handleTabClick(tab: any) {
    if (tab === selectedTab) {
      return;
    } else if (tab === tabOptions[0]?.id) {
      setSelectedTab(tab);
      router.push(ApplicationURLS.USER_VARIATIONS_CURRENT);
    } else if (tab === tabOptions[1]?.id) {
      setSelectedTab(tab);
      router.push(ApplicationURLS.USER_VARIATIONS_ARCHIVED);
    }
  }

  function navigateToViewEditPage(selectedOption: string, rowId: string) {
    let dynamicRoute = "";

    if (overViewMode) {
      dynamicRoute = `${ApplicationURLS.USER_VARIATIONS}/${selectedOption}/${rowId}?from=${tabId.VARIATIONS}`;
    } else {
      dynamicRoute = `${ApplicationURLS.USER_VARIATIONS}/${selectedOption}/${rowId}`;
    }

    router.push(dynamicRoute);
  }

  function handleAddVariation() {
    if (overviewScreenName === "contracts") {
      router.push(
        `/user/variations/add?project=${overviewData?.project_id}&contract=${overviewData?.contract_id}&from=${tabId.VARIATIONS}`
      );
    } else if (overviewScreenName === "projects") {
      router.push(
        `/user/variations/add?project=${overviewData?.project_id}&overview=${overviewData?.id}&from=${tabId.VARIATIONS}`
      );
    } else {
      router.push("/user/variations/add");
    }
  }

  return (
    <Fragment>
      <div
        className={
          overViewMode
            ? `${styles.dataContainer} ${"py-0"}`
            : styles.dataContainer
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
                href: ApplicationURLS.USER_VARIATIONS,
                label: "Contracts",
                active: true,
              },
              {
                href: "",
                label: "Variations",
                active: true,
              },
            ]}
            separator={<span className={styles.separatorStyle}>&gt;</span>}
          />
        )}
        <div
          className={
            overViewMode
              ? `${styles.headerAndButtonCon} ${"justify-content-end"}`
              : styles.headerAndButtonCon
          }
        >
          {!overViewMode && (
            <span className={styles.headerText}>Variations</span>
          )}
          {!isArchived && (
            <FormButton
              className={styles.buttonStyles}
              onClick={() => handleAddVariation()}
            >
              {overViewMode ? "+ Add" : "+ Variation"}
            </FormButton>
          )}
        </div>
        {!overViewMode && (
          <div className={styles.subHeaderTabs}>
            <TabContainer
              tabs={tabOptions}
              activeTab={selectedTab}
              onTabClick={handleTabClick}
            />
          </div>
        )}

        <ReusableDataTable
          columns={columns}
          data={variationsGridList}
          subHeader
          subHeaderComponent={<CustomSubHeader />}
          pagination
          progressPending={loading}
          paginationServer
          paginationTotalRows={totalRows}
          onChangeRowsPerPage={handlePerRowsChange}
          onChangePage={handlePageChange}
          onRowClicked={(data: any) => navigateToViewEditPage(VIEW, data?.id)}
        />
      </div>
      {displayConfirmationModal && (
        <AppModal
          show={displayConfirmationModal}
          onHide={() => setDisplayConfirmationModal(false)}
          secondButtonLabel="No"
          firstButtonLabel="Yes"
          modalHeading=""
          modalBodyTitle=""
          modalBodyContent={"Do you want to delete this variation?"}
          onConfirm={() => handleDelete()}
        />
      )}
    </Fragment>
  );
};

export default Variations;
