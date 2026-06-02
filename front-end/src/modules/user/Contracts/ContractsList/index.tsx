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
import { IContractListDetail } from "../contracts.types";

import {
  contractListHeaders,
  contractListPDFHeaders,
  contractsRenderData,
  excelColumnNames,
  pdfDataRow,
} from "../contracts.constant";

import {
  connectWebSocket,
  convertPositiveDecimalTwoDigit,
  formatDate,
  getCompanyIdFromStorage,
} from "@/utils";
import {
  getClientSupplierLists,
  getContractListsForCompany,
  getProjectsLists,
} from "../contracts.functions";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";
import BaseModal from "@/components/BaseModal";
import { updateContractStatusById } from "../../ContractOverview/ContractOverview.function";

export default function ContractsList({ overViewDetails = {} }: any) {
  const {
    overViewMode,
    data: overviewData,
    isArchived = false,
  } = overViewDetails;
  console.log("overViewDetails", overViewDetails);

  const [contractListData, setContractListData] = useState<
    IContractListDetail[]
  >([]);
  const router = useRouter();

  const [searchValue, setSearchValue] = useState("");
  const [sortValues, setSortValues] = useState<any>("");

  const [selectedProjectType, setSelectedProjectType] = useState("");
  const [selectedProjectTypeObj, setSelectedProjectTypeObj] = useState<any>(null);
  const [selectedContact, setSelectedContact] = useState("");
  const [selectedContactObj, setSelectedContactObj] = useState<any>(null);
  const [contactOptions, setContactOptions] = useState<any>([
    { label: "All", value: "All" },
  ]);
  const [selectedDataStatus, setSelectedDataStatus] = useState("All");
  const [selectedDataStatusObj, setSelectedDataStatusObj] = useState<any>({
    label: "All",
    value: "All",
  });
  const [totalRows, setTotalRows] = useState(0);
  const [tabStatus, setTabStatus] = useState("");
  const [tableLoader, setTableLoader] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [projectOptions, setProjectOptions] = useState<any>([
    { label: "All", value: "All" },
  ]);
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);
  const [emptySearchField, setEmptySearchField] = useState(false);
  const isAnyFilterActive =
    selectedProjectType ||
    selectedContact ||
    searchValue ||
    (selectedDataStatus && selectedDataStatus !== "All");

  const dataStatusOptions = [
    { label: "All", value: "All" },
    { label: "OK", value: "OK" },
    { label: "Has warnings", value: "Warnings" },
    { label: "Contract file", value: "Contract file" },
    { label: "Bank A/C", value: "Bank A/C" },
    { label: "Buyer", value: "Buyer" },
    { label: "Seller", value: "Seller" },
    { label: "Project", value: "Project" },
  ];

  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState(false);
  const [actionData, setActionData] = useState<any>();

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
    if (overViewDetails?.overViewMode) return;
    (async () => {
      const response = await getClientSupplierLists(
        getCompanyIdFromStorage() || 0
      );
      if (response) {
        const formatResponse: any = [
          { label: "All", value: "All" },
          ...(response?.map((contact: any) => ({
            label: contact?.client_supplier_name,
            value: contact?.client_supplier_id,
          })) || []),
        ];
        setContactOptions(formatResponse);
      } else {
        setContactOptions([{ label: "All", value: "All" }]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!overViewMode || (overViewMode && overviewData?.project_id))
      fetchContractsLists();
  }, [
    searchValue,
    tabStatus,
    selectedProjectType,
    selectedContact,
    currentPage,
    entriesPerPage,
    overviewData,
    sortValues,
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
        setDisplayConfirmationModal(true);
        setActionData({ ...row, optionClick: "Completed" });
      },
    },
    {
      label: "Delete",
      style: "contrast",
      icon: "fa-light fa-trash",
      onClick: (row: IContractListDetail) => {
        setDisplayConfirmationModal(true);
        setActionData({ ...row, optionClick: "Deleted" });
      },
    },
  ];

  const archivedActions = [
    {
      label: "View",
      icon: "fa-light fa-inbox",
      style: "primary",
      onClick: (row: IContractListDetail) => {
        router.push(`${AppRoutes.USER_CONTRACTS_OVERVIEW}/${row.id}`);
      },
    },
    {
      label: "Move to current",
      icon: "fa-light fa-inbox-out",
      onClick: (row: IContractListDetail) => {
        upDateContractByActions(row?.id, row?.previous_status);
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
          overviewData?.project_id ||
          // selectedProjectType === "All"
          //   ? null
          //   : selectedProjectType
          //   ? Number(selectedProjectType)
          //   : selectedProjectType || null,
          Number(selectedProjectType) ||
          overViewDetails?.data?.project_id ||
          null,
        contact_id: Number(selectedContact) || null,
        sorting_field: sortValues?.sortKey || "",
        sorting_order: sortValues?.direction || "",
      };

      const response = await getContractListsForCompany(payload);

      if (response?.contract_list?.length > 0) {
        const modifiedGridData = response?.contract_list.map((listObj: any) => {
          const warnings: string[] = [];
          if (!listObj?.attachment_id) warnings.push("Contract file");
          if (!listObj?.payment_from_account || !listObj?.payment_to_account)
            warnings.push("Bank A/C");
          if (!listObj?.buyer_name) warnings.push("Buyer");
          if (!listObj?.seller_name) warnings.push("Seller");
          if (!listObj?.project_name) warnings.push("Project");
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
            missing_data_warnings: warnings,
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
    setSelectedContact("");
    setSelectedContactObj(null);
    setSelectedDataStatus("All");
    setSelectedDataStatusObj({ label: "All", value: "All" });
    setCurrentPage(1);
    setEntriesPerPage(10);
    setTabStatus(value);
  }
  const handleResetFilters = () => {
    setSelectedProjectType("");
    setSelectedProjectTypeObj("");
    setSelectedContact("");
    setSelectedContactObj(null);
    setSelectedDataStatus("All");
    setSelectedDataStatusObj({ label: "All", value: "All" });
    setCurrentPage(1);
    setEntriesPerPage(10);
    setEmptySearchField(true);
  };

  const filteredContractListData = React.useMemo(() => {
    if (!selectedDataStatus || selectedDataStatus === "All") {
      return contractListData;
    }
    return contractListData.filter((row: any) => {
      const warnings: string[] = row?.missing_data_warnings || [];
      if (selectedDataStatus === "OK") return warnings.length === 0;
      if (selectedDataStatus === "Warnings") return warnings.length > 0;
      return warnings.includes(selectedDataStatus);
    });
  }, [contractListData, selectedDataStatus]);

  const isDataStatusFilterActive =
    !!selectedDataStatus && selectedDataStatus !== "All";
  const effectiveTotalRows = isDataStatusFilterActive
    ? filteredContractListData.length
    : totalRows;

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

  const upDateContractByActions = async (id: any, status: any) => {
    try {
      let response = await updateContractStatusById({ id, status });
      if (response) {
        handleTabChange(
          status === "Deleted" || status === "Completed" ? "Archived" : ""
        );
      }
    } catch (error) {}
  };

  const handleDownloadPdfFile = async () => {
    setDisablePDFBtn(true);

    try {
      const clientId = await connectWebSocket();
      await getPDFUrl(clientId, {
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
        {!overViewDetails?.overViewMode && (
          <div className="pt_breadcrumbs">
            <BreadCrumbs
              routePaths={[
                {
                  name: "Dashboard",
                  path: AppRoutes.USER_DASHBOARD,
                },
              ]}
              activeRoute={"Contracts"}
            />
          </div>
        )}
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            {!overViewDetails?.overViewMode && <h1>Contracts</h1>}
          </div>

          <div className="pt_pageactions">
            <Link
              href={`${AppRoutes.USER_ADD_CONTRACTS}?projectid=${
                overViewDetails?.data?.project_id ?? ""
              }&projectname=${
                overViewDetails?.data?.project_name ?? ""
              }&projectrole=${
                overViewDetails?.data?.project_role ?? ""
              }&overview=${overViewDetails?.data?.id ?? ""}`}
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
          <div className="pt_filters">
            {!overViewDetails?.overViewMode && (
              <div role="group">
                <TabSwitch
                  tabOptions={tabOptions}
                  onChange={(value: any) => handleTabChange(value)}
                  tabValue={tabStatus}
                />
              </div>
            )}
          </div>
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
                disabledPDF={disablePDFBtn}
                handleDownloadPrintPDF={() => {
                  handleDownloadPdfFile();
                }}
              />
            </div>
          </div>
        </div>
        <div className="pt_filteroptions">
          {!overViewDetails?.overViewMode && (
            <FormikControl
              placeholder={
                "Search by project name, contract name, buyer or seller"
              }
              control={InputType.SEARCH}
              onChange={(value: any) => {
                if (currentPage !== 1) setCurrentPage(1);
                setSearchValue(value);
              }}
              clearSearch={emptySearchField}
            />
          )}
          {overViewDetails?.overViewMode && (
            <div>
              <FormikControl
                placeholder={"Search by contract name"}
                control={InputType.SEARCH}
                onChange={(value: any) => {
                  if (currentPage !== 1) setCurrentPage(1);
                  setSearchValue(value);
                }}
                clearSearch={emptySearchField}
              />
            </div>
          )}
          {!overViewDetails?.overViewMode && (
            <FormikControl
              control={InputType.SELECT}
              placeholder="Select a project"
              name="project"
              options={projectOptions}
              value={selectedProjectTypeObj?.value || ""}
              renderKey="label"
              valueKey="value"
              returnSelectedObject
              onChange={(selected: any) => {
                setCurrentPage(1);
                setSelectedProjectType(selected?.value);
                setSelectedProjectTypeObj(selected);
              }}
            />
          )}
          {!overViewDetails?.overViewMode && (
            <FormikControl
              control={InputType.SELECT}
              placeholder="Select a contact"
              name="contact"
              options={contactOptions}
              value={selectedContactObj?.value || ""}
              renderKey="label"
              valueKey="value"
              returnSelectedObject
              onChange={(selected: any) => {
                setCurrentPage(1);
                setSelectedContact(
                  selected?.value === "All" ? "" : selected?.value
                );
                setSelectedContactObj(selected);
              }}
            />
          )}
          {!overViewDetails?.overViewMode && (
            <FormikControl
              control={InputType.SELECT}
              placeholder="Data Status"
              name="data_status"
              options={dataStatusOptions}
              value={selectedDataStatusObj?.value || "All"}
              renderKey="label"
              valueKey="value"
              returnSelectedObject
              onChange={(selected: any) => {
                setCurrentPage(1);
                setSelectedDataStatus(selected?.value || "All");
                setSelectedDataStatusObj(
                  selected || { label: "All", value: "All" }
                );
              }}
            />
          )}
        </div>
      </div>
      <div className="grid">
        <div className="pt_box">
          <h4>{tabStatus || "Current"}</h4>
          <DynamicTable
            headers={contractListHeaders}
            gridData={
              filteredContractListData?.length > 0
                ? filteredContractListData
                : []
            }
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
            totalEntries={effectiveTotalRows}
            hoverOnRowClick
            onSortChange={(sortConfig) => {
              setSortValues(sortConfig);
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
            upDateContractByActions(actionData?.id, actionData?.optionClick);
            return true;
          }}
          firstButtonName="No"
          secondButtonName="Yes"
        >
          <h4 className="text_center">
            {actionData?.option === "Deleted"
              ? "Are you sure you wish to move this contract to the archive list with status set to deleted?"
              : "Are you sure you wish to move this contract to the archive list with status set to completed?"}
          </h4>
        </BaseModal>
      )}
    </div>
  );
}
