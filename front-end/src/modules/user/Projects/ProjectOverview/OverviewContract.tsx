"use client";
import BreadCrumbs from "@/components/BreadCrumbs";
import FormikControl from "@/components/FormikControl";
import GridExportActions from "@/components/GridExportActions";
import DynamicTable from "@/components/Table";
import TabSwitch from "@/components/TabSwitch";
import { AppRoutes } from "@/shared/constant/appRoutes";
import {
  currencySymbol,
  InputType,
  NA,
  tabOptions,
} from "@/shared/constant/general";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { IContractListDetail } from "../../Contracts/contracts.types";

import {
  contractListHeaders,
  contractListPDFHeaders,
  contractsRenderData,
  excelColumnNames,
  pdfDataRow,
} from "../../Contracts/contracts.constant";

import {
  convertPositiveDecimalTwoDigit,
  formatDate,
  getCompanyIdFromStorage,
} from "@/utils";
import {
  getContractListsForCompany,
  getProjectsLists,
} from "../../Contracts/contracts.functions";
import { useRouter } from "next/navigation";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { downloadExcelFileFromAPI, GenerateSignedUrl } from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";
import { ApiResponse } from "@/shared/constant/messages";
import { jwtDecode } from "jwt-decode";

const OverviewContracts = ({ selectedContract }: any) => {
  const [contractListData, setContractListData] = useState<
    IContractListDetail[]
  >([]);
  const router = useRouter();

  const [searchValue, setSearchValue] = useState("");

  const [selectedProjectType, setSelectedProjectType] = useState("");
  const [selectedProjectTypeObj, setSelectedProjectTypeObj] = useState("");
  const [totalRows, setTotalRows] = useState(0);
  const [tabStatus, setTabStatus] = useState("");
  const [tableLoader, setTableLoader] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [projectOptions, setProjectOptions] = useState<any>([
    { label: "All", value: "All" },
  ]);
  const [emptySearchField, setEmptySearchField] = useState(false);
  const isAnyFilterActive = selectedProjectType || searchValue;

  const [disableExcelBtn, setDisableExcelBtn] = useState(false);

  useEffect(() => {
    (async () => {
      const response = await getProjectsLists({
        companyId: getCompanyIdFromStorage() || 0,
        isArchived: tabStatus === tabOptions[1].value ? true : false,
      });
      if (response) {
        const formatResponse: any = [
          { label: "All", value: "All" },
          ...(response?.map((project: any) => ({
            label: project?.project_name,
            value: project?.project_id,
          })) || []),
        ];
        setProjectOptions(formatResponse);
      } else {
        setProjectOptions([{ label: "All", value: "All" }]);
      }
    })();
  }, [tabStatus]);

  useEffect(() => {
    fetchContractsLists();
  }, [
    searchValue,
    tabStatus,
    selectedProjectType,
    currentPage,
    entriesPerPage,
  ]);

  // Define actions dynamically
  const currentActions = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      style: "primary",
      onClick: (row: IContractListDetail) => {
        router.push(`${AppRoutes.USER_CONTRACTS_OVERVIEW}/${row.id}`);
      },
    },
    {
      label: "Edit",
      icon: "fa-light fa-pen-to-square",
      onClick: (row: IContractListDetail) => {
        router.push(`${AppRoutes.USER_EDIT_CONTRACTS}/${row.id}`);
      },
    },
    {
      label: "Completed",
      icon: "fa-light fa-circle-check",
      onClick: (row: IContractListDetail) => {
        console.log("Claiming for row:", row);
      },
    },
    {
      label: "Delete",
      style: "contrast",
      icon: "fa-light fa-trash",
      onClick: (row: IContractListDetail) => {
        console.log("Claiming for row:", row);
      },
    },
  ];

  const archivedActions = [
    {
      label: "View",
      icon: "fa-light fa-inbox",
      style: "primary",
      onClick: (row: IContractListDetail) => {
        console.log("Viewing row:", row);
      },
    },
    {
      label: "Move to current",
      icon: "fa-light fa-inbox-out",
      onClick: (row: IContractListDetail) => {
        console.log("Withdrawing from row:", row);
      },
    },
  ];

  // Row click handler
  const handleRowClick = (id: any) => {
    router.push(`${AppRoutes.USER_CONTRACTS_OVERVIEW}/${id}`);
  };

  async function fetchContractsLists() {
    try {
      if (emptySearchField) {
        setEmptySearchField(false);
      }
      setTableLoader(true);
      const payload = {
        company_id: getCompanyIdFromStorage() || 0, // Change companyId as per your requirement
        page_number: currentPage,
        page_size: entriesPerPage,
        search: searchValue,
        contract_status: tabStatus === tabOptions[1]?.value ? tabStatus : null,
        project_id:
          selectedProjectType === "All"
            ? ""
            : selectedProjectType
            ? Number(selectedProjectType)
            : selectedProjectType,
      };
      const response = await getContractListsForCompany(payload);

      if (response?.contract_list?.length > 0) {
        const modifiedGridData = response?.contract_list.map((listObj: any) => {
          return {
            ...listObj,
            contract_date: listObj?.contract_date
              ? formatDate(listObj?.contract_date)
              : NA,
            initial_contract_sum: `$ ${
              listObj?.initial_contract_sum
                ? convertPositiveDecimalTwoDigit(
                    listObj?.initial_contract_sum,
                    true
                  )
                : "0.00"
            }`,
            variation_amount: `$ ${
              listObj?.variation_amount
                ? convertPositiveDecimalTwoDigit(
                    listObj?.variation_amount,
                    true
                  )
                : "0.00"
            }`,
          };
        });

        setContractListData(modifiedGridData);
      } else {
        setContractListData([]);
      }

      setTotalRows(response?.total_count || 0);
    } catch (err: any) {
    } finally {
      setTableLoader(false);
      setDisableExcelBtn(false);
    }
  }

  function handleTabChange(value: string) {
    // setTotalRows(0);
    setSelectedProjectType("");
    setSelectedProjectTypeObj("");
    setCurrentPage(1);
    setEntriesPerPage(10);
    setTabStatus(value);
  }
  const handleResetFilters = () => {
    setSelectedProjectType("");
    setSelectedProjectTypeObj("");
    setCurrentPage(1);
    setEntriesPerPage(10);
    setEmptySearchField(true);
  };

  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "contract",
        company_id: getCompanyIdFromStorage() || 0, // Change companyId as per your requirement
        search: searchValue,
        contract_status: tabStatus === tabOptions[1]?.value ? tabStatus : null,
        project_id:
          selectedProjectType === "All"
            ? null
            : selectedProjectType
            ? Number(selectedProjectType)
            : selectedProjectType || null,
      });

      if (responseFileURL) {
        await downloadExcelFileFromAPI(responseFileURL);
      } else {
        showErrorToast("Failed to generate Excel file URL");
      }
    } catch (error) {
      console.error(error, "outside loop");
    } finally {
      setDisableExcelBtn(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="pt_title">
        <div className="grid pt_topfilters">
          <div className="pt_pageactions">
            <Link
              href={`${AppRoutes.USER_ADD_CONTRACTS}?projectid=${selectedContract?.project_id}&projectname=${selectedContract?.project_name}&projectrole=${selectedContract?.project_role}&overview=${selectedContract?.id}`}
              passHref
              legacyBehavior
            >
              <a className="pt_addnewbutton">
                <button className="secondary">
                  <i className="fa-light fa-hexagon-plus"></i>Add contract
                </button>
              </a>
            </Link>
          </div>
        </div>
      </div>
      <div className="pt_filtergroup">
        <div className="grid pt_topfilters">
          <div className="pt_filters"></div>
          <div className="pt_pageactions">
            <div className="actionbuttons">
              <GridExportActions
                excelFile={{
                  sheetName: "contracts list",
                  tableData: contractListData,
                  LabelAndValueKey: excelColumnNames,
                }}
                pdfFile={{
                  fileName: "contracts list",
                  headerRow: contractListPDFHeaders,
                  tableData: contractListData,
                  dataRow: pdfDataRow,
                }}
                resetFilterFunction={() => handleResetFilters()}
                hideExcelButton={contractListData.length > 0 ? false : true}
                hidePdfButton={contractListData.length > 0 ? false : true}
                hideResetButton={!isAnyFilterActive}
                handleDownloadExcelFile={() => {
                  handleDownloadExcelFile();
                }}
                disabledOnExcel={disableExcelBtn}
                exportFromAPI={true}
              />
            </div>
          </div>
        </div>
        <div className="pt_filteroptions">
          <FormikControl
            placeholder={"Search by contract name"}
            control={InputType.SEARCH}
            onChange={(value: any) => {
              if (currentPage !== 1) setCurrentPage(1);
              setSearchValue(value);
            }}
            clearSearch={emptySearchField}
          />

          <SearchableSelect
            placeholder="Select project"
            name="project"
            options={projectOptions}
            onChange={(selected: any) => {
              setCurrentPage(1);
              setSelectedProjectType(selected?.value);
              setSelectedProjectTypeObj(selected);
            }}
            selectedData={selectedProjectTypeObj}
            renderKey="label"
            valueKey="value"
          />
        </div>
      </div>
      <div className="grid">
        <div className="pt_box">
          <h4>{tabStatus || "Current"}</h4>
          <DynamicTable
            headers={contractListHeaders}
            gridData={contractListData?.length > 0 ? contractListData : []}
            gridActions={
              tabStatus === tabOptions[1]?.label
                ? archivedActions
                : currentActions
            }
            onRowClick={(data: any) => handleRowClick(data?.id)}
            displayAllStaticActions
            showLoader={tableLoader}
            loaderColSpan={10}
            renderRowList={contractsRenderData}
            currentPage={currentPage}
            entriesPerPage={entriesPerPage}
            onEntriesPerPageChange={setEntriesPerPage}
            onPageChange={setCurrentPage}
            totalEntries={totalRows}
          />
        </div>
      </div>
    </div>
  );
};
export default OverviewContracts;
