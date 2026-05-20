"use client";
import BreadCrumbs from "@/components/BreadCrumbs";
import FormikControl from "@/components/FormikControl";
import GridExportActions from "@/components/GridExportActions";
import DynamicTable from "@/components/Table";
import { AppRoutes } from "@/shared/constant/appRoutes";
import {
  DateFormat,
  filterByDuration,
  InputType,
  NA,
} from "@/shared/constant/general";

import React, { useEffect, useState } from "react";
import { ICompliancesListDetails } from "../compliances.types";

import {
  complianceRenderData,
  complianceListHeaders,
  excelColumnNames,
  pdfDataRow,
  complianceListPDFHeaders,
} from "../compliances.constant";

import { formatDate, getCompanyIdFromStorage } from "@/utils";
import { fetchCompliancesList } from "../compliances.functions";
import { getProjectsLists } from "../../Contracts/contracts.functions";
import { format, isValid } from "date-fns";
import { FetchAllBankAccounts } from "../../BankAccounts/bankAccount.functions";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";
import { useRouter } from "next/navigation";
import { connectWebSocket } from "@/utils";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import { projectOverviewTabs } from "../../Projects/ProjectOverview/ProjectOverview.constant";
import { overviewModeType } from "../../PaymentsList/PaymentList.constants";
import { useDispatch } from "react-redux";

export default function CompliancesList({ overViewDetails = {} }: any) {
  const {
    overViewMode,
    data: overviewData,
    screenName: overviewScreenName,
  } = overViewDetails;
  // const { isArchived = false, overViewDetails = {} } = props;
  const [compliancesListData, setCompliancesListData] = useState<
    ICompliancesListDetails[]
  >([]);
  const router = useRouter();
  const dispatch = useDispatch();

  const [selectedProjectType, setSelectedProjectType] = useState("");
  const [selectedBankAccount, setSelectedBankAccount] = useState("");
  const [selectedAccountType, setSelectedAccountType] = useState("");
  const [selectedProjectTypeObj, setSelectedProjectTypeObj] = useState<any>(null);
  const [selectedBankAccountObj, setSelectedBankAccountObj] = useState<any>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [tableLoader, setTableLoader] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [projectOptions, setProjectOptions] = useState<any>([
    { label: "All", value: "All" },
  ]);
  const [bankOptions, setBankOptions] = useState<any>([
    { label: "All", value: "All" },
  ]);
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [activityLogStartDate, setActivityLogStartDate] = useState<
    Date | null | any
  >(new Date(new Date().setHours(0, 0, 0, 0)));
  const [activityLogEndDate, setActivityLogEndDate] = useState<
    Date | null | any
  >(new Date(new Date().setHours(23, 59, 59, 999)));
  const [selectedActivityRangeType, setSelectedActivityRangeType] =
    useState("All dates");
  const [sortValues, setSortValues] = useState<any>("");
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);

  const isAnyFilterActive =
    selectedProjectType ||
    selectedBankAccount ||
    selectedAccountType ||
    selectedActivityRangeType !== "All dates";

  useEffect(() => {
    fetchProjectsList();
    fetchBankAccountsList();
  }, []);

  useEffect(() => {
    if (!overViewMode || (overViewMode && overviewData?.project_id))
      getCompliancesLists();
  }, [
    selectedProjectType,
    selectedAccountType,
    selectedBankAccount,
    currentPage,
    entriesPerPage,
    selectedActivityRangeType,
    activityLogStartDate,
    activityLogEndDate,
    overviewData,
    sortValues,
  ]);

  // Define actions dynamically
  const currentActions = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      style: "primary",
      onClick: (row: any) => {
        if (overViewDetails?.screenName == overviewModeType.PROJECTS) {
          dispatch(
            setScreenDetails({
              fromScreen: "projectOverview",

              toScreen: "compliances",
              mainActiveTab: projectOverviewTabs.COMPLIANCES,
            })
          );
        }
        navigateToOverview(row); // Call the navigate function directly
      },
    },
  ];

  function navigateToOverview(gridRow: any) {
    router.push(
      `${AppRoutes.USER_COMPLIANCE_VIEW}?project=${gridRow?.project_id}&st=${gridRow?.status}`
    );
  }

  // Row click handler
  const handleRowClick = (row: ICompliancesListDetails) => {
    console.log("Row clicked:", row);

    navigateToOverview(row);
  };

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
  async function fetchBankAccountsList() {
    const postData = {
      payload: {
        company_id: getCompanyIdFromStorage() || 0,
        is_alphabetical_order: true,
      },
    };
    const response = await FetchAllBankAccounts(postData);
    if (response?.extendedBankAccounts?.length > 0) {
      const formatResponse: any = [
        { label: "All", value: "All" },
        ...(response?.extendedBankAccounts?.map((bank: any) => ({
          label: bank?.account_name,
          value: bank?.bank_account_id,
        })) || []),
      ];
      setBankOptions(formatResponse);
    } else {
      setBankOptions([{ label: "All", value: "All" }]);
    }
  }

  async function getCompliancesLists() {
    try {
      setTableLoader(true);
      const postData = {
        payload: {
          account_type:
            selectedAccountType === "All"
              ? null
              : selectedAccountType
              ? selectedAccountType
              : null,
          bank_account_id:
            selectedBankAccount === "All"
              ? null
              : selectedBankAccount
              ? Number(selectedBankAccount)
              : null,
          company_id: getCompanyIdFromStorage() || 0,
          items_per_page: entriesPerPage,
          page_number: currentPage,
          project_id:
            overviewData?.project_id ||
            (selectedProjectType === "All"
              ? null
              : selectedProjectType
              ? Number(selectedProjectType)
              : selectedProjectType || null),
          // project_id:
          // selectedProjectType === "All"
          //   ? null
          //   : selectedProjectType
          //   ? Number(selectedProjectType)
          //   : null,
          date_filter:
            selectedActivityRangeType === "All dates"
              ? null
              : selectedActivityRangeType || null,
          start_date: isCustomDate ? activityLogStartDate : null,
          end_date: isCustomDate ? activityLogEndDate : null,
          sorting_field: sortValues?.sortKey || "",
          sorting_order: sortValues?.direction || "",
        },
      };

      const response = await fetchCompliancesList(postData);

      if (response?.results?.length > 0) {
        const modifiedGridData = response?.results.map((listObj: any) => {
          return {
            ...listObj,
            pta_compliance: (
              <span
                style={{
                  color: listObj?.pta_compliance === "Ok" ? "green" : "red",
                }}
              >
                {listObj?.pta_compliance}
              </span>
            ),
            rta_compliance: (
              <span
                style={{
                  color: listObj?.rta_compliance === "Ok" ? "green" : "red",
                }}
              >
                {listObj?.rta_compliance}
              </span>
            ),
            project_added_on_date: listObj?.project_added_on_date
              ? formatDate(listObj?.project_added_on_date)
              : NA,
          };
        });

        setCompliancesListData(modifiedGridData);
      } else {
        setCompliancesListData([]);
      }

      setTotalRows(response?.total_count || 0);
    } catch (err: any) {
    } finally {
      setTableLoader(false);
      setDisableExcelBtn(false);
    }
  }
  const handleResetFilters = () => {
    setCurrentPage(1);
    setEntriesPerPage(10);
    setSelectedProjectType("");
    setSelectedBankAccount("");
    setSelectedAccountType("");
    setSelectedProjectTypeObj("");
    setSelectedBankAccountObj("");
    setSelectedActivityRangeType("All dates"); // Reset activityDate state
    setIsCustomDate(false); // Reset custom date state
    setActivityLogStartDate(new Date(new Date().setHours(0, 0, 0, 0))); // Reset start date to today
    setActivityLogEndDate(new Date(new Date().setHours(23, 59, 59, 999))); // Reset end date to today
  };

  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "compliance",
        account_type:
          selectedAccountType === "All"
            ? null
            : selectedAccountType
            ? selectedAccountType
            : null,
        bank_account_id:
          selectedBankAccount === "All"
            ? null
            : selectedBankAccount
            ? Number(selectedBankAccount)
            : null,
        company_id: getCompanyIdFromStorage() || 0,

        project_id:
          selectedProjectType === "All"
            ? null
            : selectedProjectType
            ? Number(selectedProjectType)
            : null,
        date_filter:
          selectedActivityRangeType === "All dates"
            ? null
            : selectedActivityRangeType || null,
        start_date: isCustomDate ? activityLogStartDate : null,
        end_date: isCustomDate ? activityLogEndDate : null,
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
        screen_name: "compliance",
        account_type:
          selectedAccountType === "All"
            ? null
            : selectedAccountType
            ? selectedAccountType
            : null,
        bank_account_id:
          selectedBankAccount === "All"
            ? null
            : selectedBankAccount
            ? Number(selectedBankAccount)
            : null,
        company_id: getCompanyIdFromStorage() || 0,

        project_id:
          selectedProjectType === "All"
            ? null
            : selectedProjectType
            ? Number(selectedProjectType)
            : null,
        date_filter:
          selectedActivityRangeType === "All dates"
            ? null
            : selectedActivityRangeType || null,
        start_date: isCustomDate ? activityLogStartDate : null,
        end_date: isCustomDate ? activityLogEndDate : null,
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
      {!overViewMode && (
        <div className="pt_title">
          <div className="pt_breadcrumbs">
            <BreadCrumbs
              routePaths={[
                {
                  name: "Dashboard",
                  path: AppRoutes.USER_DASHBOARD,
                },
              ]}
              activeRoute={"Compliance"}
            />
          </div>
          <div className="grid pt_topfilters">
            <div className="pt_pagetitle">
              <h1>Compliance</h1>
            </div>
          </div>
        </div>
      )}
      <div className="pt_filtergroup">
        <div className="grid pt_topfilters align_view_activity">
          <div className="pt_pageactions">
            <div className="actionbuttons">
              <GridExportActions
                excelFile={{
                  sheetName: "Compliance list",
                  tableData: compliancesListData,
                  LabelAndValueKey: excelColumnNames,
                }}
                pdfFile={{
                  fileName: "Compliance list",
                  headerRow: complianceListPDFHeaders,
                  tableData: compliancesListData,
                  dataRow: pdfDataRow,
                }}
                resetFilterFunction={() => handleResetFilters()}
                hideExcelButton={compliancesListData.length > 0 ? false : true}
                hidePdfButton={compliancesListData.length > 0 ? false : true}
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
          {!overViewMode && (
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
          <FormikControl
            control={InputType.SELECT}
            placeholder="Select an account"
            name="account"
            options={bankOptions}
            value={selectedBankAccountObj?.value || ""}
            renderKey="label"
            valueKey="value"
            returnSelectedObject
            onChange={(selected: any) => {
              setCurrentPage(1);
              setSelectedBankAccount(selected?.value);
              setSelectedBankAccountObj(selected);
            }}
          />

          <FormikControl
            placeholder={"Select a account type"}
            name="account type"
            options={[
              { label: "All", value: "All" },
              {
                value: "Project Trust Account",
                label: "Project Trust Account",
              },
              {
                value: "Retention Trust Account",
                label: "Retention Trust Account",
              },
            ]}
            control={InputType.SELECT}
            value={selectedAccountType}
            renderKey="label"
            valueKey="value"
            onChange={(value: any) => {
              setCurrentPage(1);
              setSelectedAccountType(value);
            }}
          />

          <FormikControl
            placeholder={"Activity Range"}
            name="Activity Range"
            options={filterByDuration}
            onChange={(value: any) => {
              console.log(value);
              if (value === "Custom") {
                setIsCustomDate(true);
              } else {
                setIsCustomDate(false);
              }
              setSelectedActivityRangeType(value);
            }}
            control={InputType.SELECT}
            value={selectedActivityRangeType}
            renderKey="label"
            valueKey="value"
          />
        </div>
      </div>
      {isCustomDate && (
        <div className="grid">
          <div>
            <FormikControl
              label="From date"
              name="activityLogStartDate"
              control={InputType.DATE_PICKER}
              type="date"
              // value={
              //   activityLogStartDate
              //     ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
              //     : ""
              // }
              value={
                activityLogStartDate && isValid(new Date(activityLogStartDate))
                  ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
                  : ""
              }
              onChange={(selectedDate: any) => {
                if (!selectedDate) {
                  setActivityLogStartDate(null);
                  return;
                }
                const fromDate = new Date(
                  new Date(selectedDate).setHours(0, 0, 0, 0)
                );

                if (fromDate > activityLogEndDate) {
                  setActivityLogStartDate(fromDate);
                  // setActivityLogEndDate(fromDate);
                  setActivityLogEndDate(new Date(selectedDate));
                } else {
                  setActivityLogStartDate(fromDate);
                }
              }}
              minDate="" // Set any minimum date if needed
              // maxDate={format(new Date(activityLogEndDate), "yyyy-MM-dd")}
              disabled={false}
            />
          </div>
          <div>
            <FormikControl
              label="To date"
              name="activityLogEndDate"
              type="date"
              control={InputType.DATE_PICKER}
              // value={
              //   activityLogEndDate
              //     ? format(new Date(activityLogEndDate), "yyyy-MM-dd")
              //     : ""
              // }
              value={
                activityLogEndDate && isValid(new Date(activityLogEndDate))
                  ? format(new Date(activityLogEndDate), "yyyy-MM-dd")
                  : ""
              }
              onChange={(selectedDate: any) => {
                if (!selectedDate) {
                  setActivityLogEndDate(null);
                  return;
                }
                const toDate = new Date(
                  new Date(selectedDate).setHours(23, 59, 59, 999)
                );

                // Ensure end date is not before start date
                if (toDate >= activityLogStartDate) {
                  setActivityLogEndDate(toDate);
                }
              }}
              minDate={
                activityLogStartDate
                  ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
                  : ""
              }
              maxDate="" // Set any maximum date if needed
              disabled={false}
            />
          </div>
        </div>
      )}
      <div className="grid">
        <div className="pt_box">
          <DynamicTable
            headers={complianceListHeaders}
            gridData={
              compliancesListData?.length > 0 ? compliancesListData : []
            }
            gridActions={currentActions}
            displayAllStaticActions
            onRowClick={handleRowClick}
            showLoader={tableLoader}
            loaderColSpan={10}
            renderRowList={complianceRenderData}
            currentPage={currentPage}
            entriesPerPage={entriesPerPage}
            onEntriesPerPageChange={setEntriesPerPage}
            onPageChange={setCurrentPage}
            totalEntries={totalRows}
            hoverOnRowClick
            onSortChange={(sortConfig) => {
              if (compliancesListData?.length > 0) {
                setSortValues(sortConfig);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
