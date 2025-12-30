"use client";
import BreadCrumbs from "@/components/BreadCrumbs";
import FormikControl from "@/components/FormikControl";
import GridExportActions from "@/components/GridExportActions";
import DynamicTable from "@/components/Table";
import TabSwitch from "@/components/TabSwitch";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { InputType, NA, tabOptions } from "@/shared/constant/general";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { IVariationsListDetails } from "../Variations/variations.types";

import {
  variationsRenderData,
  variationsListHeaders,
  excelColumnNames,
  pdfDataRow,
  variationStatusOptions,
  variationsListPDFHeaders,
} from "../Variations/variations.constant";

import {
  connectWebSocket,
  convertPositiveDecimalTwoDigit,
  formatDate,
  getCompanyIdFromStorage,
} from "@/utils";
import {
  deleteVariationsById,
  fetchContractList,
  GetVariationListsForCompany,
} from "../Variations/variations.functions";
import { getProjectsLists } from "../Contracts/contracts.functions";
import { useRouter } from "next/navigation";
import BaseModal from "@/components/BaseModal";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";

export default function Variations() {
  const [variationsListData, setVariationsListData] = useState<
    IVariationsListDetails[]
  >([]);

  const [searchValue, setSearchValue] = useState("");
  const router = useRouter();
  const [sortValues, setSortValues] = useState<any>("");
  const [selectedProjectType, setSelectedProjectType] = useState("");
  const [selectedContractType, setSelectedContractType] = useState("");
  const [selectedProjectTypeObj, setSelectedProjectTypeObj] = useState("");
  const [selectedContractTypeObj, setSelectedContractTypeObj] = useState("");
  const [selectedStatusType, setSelectedStatusType] = useState("");
  const [totalRows, setTotalRows] = useState(0);
  const [tabStatus, setTabStatus] = useState("");
  const [tableLoader, setTableLoader] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [projectOptions, setProjectOptions] = useState<any>([
    { label: "All", value: "All" },
  ]);
  const [contractOptions, setContractOptions] = useState<any>([
    { label: "All", value: "All" },
  ]);
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);
  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState(false);
  const [actionData, setActionData] = useState<any>();

  const [disableExcelBtn, setDisableExcelBtn] = useState(false);

  const isAnyFilterActive =
    selectedProjectType || selectedContractType || selectedStatusType;

  useEffect(() => {
    fetchProjectsList();
    getContractList();
  }, []);

  useEffect(() => {
    fetchVariationsLists();
  }, [
    searchValue,
    tabStatus,
    selectedProjectType,
    selectedStatusType,
    selectedContractType,
    currentPage,
    entriesPerPage,
    sortValues,
  ]);

  // Define actions dynamically
  const currentActions = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      style: "primary",
      onClick: (row: IVariationsListDetails) => {
        router.push(`${AppRoutes.USER_VIEW_VARIATIONS}/${row.id}`);
      },
    },
    {
      label: "Edit",
      icon: "fa-light fa-pen-to-square",
      onClick: (row: IVariationsListDetails) => {
        router.push(`${AppRoutes.USER_EDIT_VARIATIONS}/${row.id}`);
      },
    },

    {
      label: "Delete",
      style: "contrast",
      icon: "fa-light fa-trash",
      onClick: (row: IVariationsListDetails) => {
        setActionData({ ...row, option: "Deleted" });
        setDisplayConfirmationModal(true);
      },
    },
  ];

  const archivedActions = [
    {
      label: "View",
      icon: "fa-light fa-inbox",
      style: "primary",
      onClick: (row: IVariationsListDetails) => {
        router.push(`${AppRoutes.USER_VIEW_VARIATIONS}/${row.id}`);
      },
    },
  ];

  // Row click handler
  const handleRowClick = (row: IVariationsListDetails) => {
    router.push(`${AppRoutes.USER_VIEW_VARIATIONS}/${row.id}`);
  };

  async function getContractList() {
    const postData = {
      company_id: getCompanyIdFromStorage() || 0,
    };
    const response: any = await fetchContractList(postData);
    if (response?.length > 0) {
      const modifiedData: any = [
        { label: "All", value: "All" },
        ...(response.map((data: any) => ({
          label: data?.contract_name,
          value: data?.contract_id,
        })) || []),
      ];
      setContractOptions(modifiedData);
    } else {
      setContractOptions([{ label: "All", value: "All" }]);
    }
  }

  async function fetchProjectsList() {
    const response = await getProjectsLists({
      companyId: getCompanyIdFromStorage() || 0,
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
  }

  async function fetchVariationsLists() {
    try {
      setTableLoader(true);
      const payload = {
        getVariationListsInput: {
          company_id: getCompanyIdFromStorage() || 0,
          page_number: currentPage,
          page_size: entriesPerPage,
          project_id:
            selectedProjectType === "All"
              ? null
              : selectedProjectType
              ? Number(selectedProjectType)
              : selectedProjectType || null,
          contract_id:
            selectedContractType === "All"
              ? null
              : selectedContractType
              ? Number(selectedContractType)
              : selectedContractType || null,
          variation_status:
            tabStatus == tabOptions[1]?.value
              ? tabStatus
              : selectedStatusType === "All"
              ? null
              : selectedStatusType || null,
          search: null,
          date_filter: null,
          start_date: null,
          end_date: null,
          sorting_field: sortValues?.sortKey || "",
          sorting_order: sortValues?.direction || "",
        },
      };
      const response = await GetVariationListsForCompany(payload);

      if (response?.variation_list?.length > 0) {
        const modifiedGridData = response?.variation_list.map(
          (listObj: any) => {
            return {
              ...listObj,
              variation_id: listObj?.variation_id,
              project_name: listObj?.project_name,
              contract_name: listObj?.contract_name,
              variation_amount: `$ ${
                listObj?.variation_amount
                  ? convertPositiveDecimalTwoDigit(
                      listObj?.variation_amount,
                      true
                    )
                  : "0.00"
              }`,
              variation_status: listObj?.variation_status,
              created_on: listObj?.created_on
                ? formatDate(listObj?.created_on)
                : NA,
            };
          }
        );

        setVariationsListData(modifiedGridData);
      } else {
        setVariationsListData([]);
      }

      setTotalRows(response?.total_count || 0);
      setTableLoader(false);
    } catch (err: any) {
      setTableLoader(false);
    } finally {
      setDisableExcelBtn(false);
    }
  }

  function handleTabChange(value: string) {
    // setTotalRows(0);
    setSelectedProjectType("");
    setSelectedContractType("");
    setSelectedProjectTypeObj("");
    setSelectedContractTypeObj("");
    setSelectedStatusType("");
    setCurrentPage(1);
    setEntriesPerPage(10);
    setTabStatus(value);
  }

  const handleResetFilters = () => {
    setSelectedProjectType("");
    setSelectedContractType("");
    setSelectedProjectTypeObj("");
    setSelectedContractTypeObj("");
    setSelectedStatusType("");
    setCurrentPage(1);
    setEntriesPerPage(10);
    // setSearchValue("");
  };
  const handleModalPopUpFunction = async () => {
    setDisplayConfirmationModal(!displayConfirmationModal);
    const { id, option } = actionData;

    const postData: any = {
      id: actionData?.id,
      status: "Deleted",
    };

    const response = await deleteVariationsById(postData);
    if (response) {
      await fetchVariationsLists();
    }
  };

  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "variation",
        company_id: getCompanyIdFromStorage() || 0,
        project_id:
          selectedProjectType === "All"
            ? null
            : selectedProjectType
            ? Number(selectedProjectType)
            : selectedProjectType || null,
        contract_id:
          selectedContractType === "All"
            ? null
            : selectedContractType
            ? Number(selectedContractType)
            : selectedContractType || null,
        variation_status:
          tabStatus == tabOptions[1]?.value
            ? tabStatus
            : selectedStatusType === "All"
            ? null
            : selectedStatusType || null,
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

  const handleDownloadPdfFile = async () => {
    setDisablePDFBtn(true);

    try {
      const clientId = await connectWebSocket();
      await getPDFUrl(clientId, {
        screen_name: "variation",
        company_id: getCompanyIdFromStorage() || 0,
        project_id:
          selectedProjectType === "All"
            ? null
            : selectedProjectType
            ? Number(selectedProjectType)
            : selectedProjectType || null,
        contract_id:
          selectedContractType === "All"
            ? null
            : selectedContractType
            ? Number(selectedContractType)
            : selectedContractType || null,
        variation_status:
          tabStatus == tabOptions[1]?.value
            ? tabStatus
            : selectedStatusType === "All"
            ? null
            : selectedStatusType || null,
      });
      setDisablePDFBtn(false);
    } catch (error) {
      console.error(error, "outside loop");
    } finally {
      setDisablePDFBtn(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="pt_title">
        <div className="grid pt_topfilters">
          <div className="pt_pageactions">
            <Link href={AppRoutes.USER_ADD_VARIATIONS} passHref legacyBehavior>
              <a className="pt_addnewbutton">
                <button className="secondary">
                  <i className="fa-light fa-hexagon-plus"></i>Add variation
                </button>
              </a>
            </Link>
          </div>
        </div>
      </div>

      <div className="pt_filtergroup">
        <div className="grid pt_topfilters">
          <div className="pt_filters">
            {/* <div role="group">
              <TabSwitch
                tabOptions={tabOptions}
                onChange={(value: any) => handleTabChange(value)}
              />
            </div> */}
          </div>

          <div className="pt_pageactions">
            <div className="actionbuttons">
              <GridExportActions
                excelFile={{
                  sheetName: "Variations list",
                  tableData: variationsListData,
                  LabelAndValueKey: excelColumnNames,
                }}
                pdfFile={{
                  fileName: "Variations list",
                  headerRow: variationsListPDFHeaders,
                  tableData: variationsListData,
                  dataRow: pdfDataRow,
                }}
                resetFilterFunction={() => handleResetFilters()}
                hideExcelButton={variationsListData.length > 0 ? false : true}
                hidePdfButton={variationsListData.length > 0 ? false : true}
                hideResetButton={!isAnyFilterActive}
                handleDownloadExcelFile={() => {
                  handleDownloadExcelFile();
                }}
                disabledOnExcel={disableExcelBtn}
                exportFromAPI={true}
                disabledPDF={disablePDFBtn}
                handleDownloadPrintPDF={() => {
                  handleDownloadPdfFile();
                }}
              />
            </div>
          </div>
        </div>
        <div className="pt_filteroptions">
          {tabStatus !== tabOptions[1].value && (
            <FormikControl
              placeholder={"Select a status"}
              name="status"
              options={variationStatusOptions}
              control={InputType.SELECT}
              value={selectedStatusType}
              renderKey="label"
              valueKey="value"
              onChange={(value: any) => {
                setCurrentPage(1);
                setSelectedStatusType(value);
              }}
            />
          )}
        </div>
      </div>

      <div className="grid">
        <div className="pt_box">
          <div className="grid">
            <h4>{tabStatus || "Current"}</h4>
          </div>
          <DynamicTable
            headers={[
              ...variationsListHeaders,
              {
                title: "Actions",
                dataKey: "status",
                restrictSorting: true,
              },
            ]}
            gridData={variationsListData?.length > 0 ? variationsListData : []}
            gridActions={
              tabStatus === tabOptions[1]?.label
                ? archivedActions
                : currentActions
            }
            onRowClick={handleRowClick}
            showLoader={tableLoader}
            loaderColSpan={10}
            renderRowList={variationsRenderData}
            currentPage={currentPage}
            entriesPerPage={entriesPerPage}
            onEntriesPerPageChange={setEntriesPerPage}
            onPageChange={setCurrentPage}
            totalEntries={totalRows}
            onSortChange={(sortConfig) => {
              if (variationsListData?.length > 0) {
                setSortValues(sortConfig);
              }
            }}
          />
        </div>
      </div>
      {displayConfirmationModal && (
        <BaseModal
          modalId={"variation delete modal"}
          displayModal={displayConfirmationModal}
          onHeaderIconClose={() => setDisplayConfirmationModal(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setDisplayConfirmationModal(false)}
          onConfirm={() => {
            handleModalPopUpFunction();
            return true;
          }}
          firstButtonName="No"
          secondButtonName="Yes"
        >
          <h4 className="text_center">
            {"Do you want to delete this variation?"}
          </h4>
        </BaseModal>
      )}
    </div>
  );
}
