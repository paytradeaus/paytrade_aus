"use client";
import { fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList } from "@/app/api/commonApi";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import { getCookie } from "cookies-next";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import {
  fetchAllRetentionInPaymentsList,
  RetentionData,
} from "./retentionList.functions";
import {
  pdfDataRow,
  retentionExcelColumnNames,
  retentionGridListHeaders,
  retentionListHeaders,
  RetentionRenderData,
  tabOptions,
} from "./retentionList.constants";
import BreadCrumbs from "@/components/BreadCrumbs";
import { AppRoutes } from "@/shared/constant/appRoutes";
import GridExportActions from "@/components/GridExportActions";
import TabSwitch from "@/components/TabSwitch";
import FormikControl from "@/components/FormikControl";
import { InputType } from "@/shared/constant/general";
import DynamicTable from "@/components/Table";
import RetentionSummary from "../RetentionSummary/index";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";
import {
  convertPositiveDecimalTwoDigit,
  formatDate,
  replaceDollarSymbol,
  connectWebSocket,
  removeCommas,
} from "@/utils";
import { contractOverviewTabs } from "../ContractOverview/ContractOverview.constants";
import { overviewModeType } from "../PaymentsList/PaymentList.constants";
import { projectOverviewTabs } from "../Projects/ProjectOverview/ProjectOverview.constant";

interface RowData {
  id: string;
  type: string;
  status: string;
}

const RetentionLists = (props: any) => {
  const {
    isArchived = false,
    UniqueProject,
    UniqueContract,
    screenName,
  } = props;

  const dispatch = useDispatch();
  const router = useRouter();
  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const [sortValues, setSortValues] = useState<any>("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedStatusName, setSelectedStatusName] = useState("");
  const [loading, setLoading] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [paymentsListData, setPaymentsListData] = useState<any[]>([]);
  const [actionData, setActionData] = useState<any>();
  const [printDocumentData, setPrintDocumentData] = useState<any>([]);
  const [projectOpt, setProjectOpt] = useState<any>([]);
  const [selectedProject, setSelectedProject] = useState<any>();
  const [projectId, setProjectId] = useState("");
  const [contractOpt, setContractOpt] = useState<any>([]);
  const [selectedContract, setSelectedContract] = useState<any>();
  const [contractId, setContractId] = useState("");
  const [clientId, setClientId] = useState("");
  const [activeTab, setActiveTab] = useState("");
  const [displayViewSummary, setDisplayViewSummary] = useState(false);
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);

  useEffect(() => {
    const fetchFilters = async () => {
      setLoading(true);
      const filtersResponse =
        await fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList({
          client_supplier_id: null,
          project_id: UniqueProject ? UniqueProject : Number(projectId) || null,
          contract_id: UniqueContract
            ? UniqueContract
            : Number(contractId) || null,
          company_id: selectedCompanyId || null,
        });

      if (filtersResponse) {
        // Update project options
        const projectListData = filtersResponse?.projects || [];
        if (projectListData.length > 0) {
          const modifiedOpt = projectListData.map((each: any) => ({
            label: each?.project_name,
            value: each?.project_id,
          }));
          setProjectOpt([{ label: "All", value: null }, ...modifiedOpt]);
        }

        // Update contract options
        const contractListData = filtersResponse?.contracts || [];
        if (contractListData.length > 0) {
          const modifiedContracts = contractListData.map((contract: any) => ({
            label: contract?.contract_name,
            value: contract?.contract_id,
          }));
          setContractOpt([{ label: "All", value: null }, ...modifiedContracts]);
        }
      }
      setLoading(false);
    };

    // Only fetch filters if either projectId or contractId is set
    fetchFilters();
  }, [projectId, contractId]);

  useEffect(() => {
    getPaymentsListData(page, perPage);
  }, [
    projectId,
    contractId,
    selectedStatus,
    selectedStatusName,
    page,
    perPage,
    activeTab,
    sortValues,
  ]);

  useEffect(() => {
    setPage(1);
  }, [projectId, contractId, selectedStatus, selectedStatusName, activeTab]);

  const resetFilters = () => {
    setSelectedProject(null);
    setSelectedContract(null);
    setSelectedStatusName("");
    setSelectedStatus("");
    setProjectId("");
    setContractId("");
    setClientId("");
  };

  const isAnyFilterActive =
    selectedProject?.value ||
    selectedContract?.value ||
    selectedStatus ||
    projectId ||
    contractId;

  const getPaymentsListData = async (page: number, rowsPerPage: number) => {
    setLoading(true);
    const adminUserList = await fetchAllRetentionInPaymentsList({
      company_id: selectedCompanyId,
      page_number: page,
      items_per_page: rowsPerPage,
      status: activeTab === "Completed" ? "Archived" : selectedStatus || null,
      project_id: UniqueProject ? UniqueProject : projectId || null,
      contract_id: Number(contractId) || null,
      sorting_field: sortValues?.sortKey || "",
      sorting_order: sortValues?.direction || "",
    });
    setTotalRows(adminUserList?.total_count || 0);
    setPerPage(rowsPerPage);
    let printDataObjCreation = adminUserList?.data?.map(
      (user: RetentionData) => {
        const RtentionFEactions =
          user?.status !== "Deleted" &&
          user?.status !== "Claim generated" &&
          user?.status !== "Payment generated" &&
          user?.beneficiary_type === "Self" &&
          user?.retained_amount > 0 &&
          activeTab !== "Completed";
        return {
          ...user,
          retention_list_id: user?.retention_list_id || "",
          project_name: user?.project_name || "",
          contract_name: user?.contract_name || "",
          claim_type: user?.claim_type || "",
          retention_trust_account_name:
            user?.retention_trust_account_name || "",
          retained_amount: user?.retained_amount
            ? `$ ${convertPositiveDecimalTwoDigit(user?.retained_amount, true)}`
            : "$ 0.00",
          beneficiary_name: user?.beneficiary_name || "",
          status: user?.status || "",
          retenion_list_icons: {
            withdraw: RtentionFEactions,
            crete3rdparty: RtentionFEactions,
            retentionclaim:
              user?.status !== "Void" &&
              user?.status !== "Claim generated" &&
              user?.status !== "Payment generated" &&
              user?.beneficiary_type !== "Self" &&
              user?.retained_amount > 0 &&
              activeTab !== "Completed",
          },
        };
      }
    );

    setPaymentsListData(printDataObjCreation || []);

    setPrintDocumentData(printDataObjCreation);
    setDisableExcelBtn(false);
    setLoading(false);
  };

  const handleProjectChange = (selectedValue: any) => {
    setProjectId(selectedValue);
    setSelectedProject(selectedValue);
  };

  const handleContractChange = (selectedValue: any) => {
    setContractId(selectedValue);
    setSelectedContract(selectedValue);
  };

  const handleStatusChange = (selectedValue: any) => {
    setSelectedStatus(selectedValue);
    setSelectedStatusName(selectedValue);
    // Perform any other actions based on the selected valuef
  };

  const statusOptions = [
    { label: "All", value: "" },
    { label: "Claim completed", value: "Claim completed" },
    { label: "Claim generated", value: "Claim generated" },
    { label: "Void", value: "Deleted" },
    { label: "Payment generated", value: "Payment generated" },
    { label: "Retained", value: "Retained" },
  ];

  const handleRowView = (data: any) => {
    console.log("data:", data);
    setActionData({ rowData: data });
    setDisplayViewSummary(true);
  };

  function onRouteFromOverview() {
    if (screenName == "contracts") {
      dispatch(
        setScreenDetails({
          fromScreen: "contractsOverview",
          toScreen: "retentions",
          mainActiveTab: contractOverviewTabs.RETENTIONS,
        })
      );
    } else if (screenName === overviewModeType.PROJECTS) {
      dispatch(
        setScreenDetails({
          fromScreen: "projectOverview",
          toScreen: "retentions",
          mainActiveTab: projectOverviewTabs.RETENTIONS,
        })
      );
    }
  }

  const actions = [
    {
      label: "View original payment",
      icon: "fa-light fa-money-check-dollar",
      onClick: (row: any) => {
        onRouteFromOverview();
        router.push(
          `${AppRoutes.USER_ADD_PAYMENT}?mode=view&payment=${
            row?.payment_id
          }&claim=${row?.payment_claim_id}&crt=${"RetentionClaim"}`
        );
      },
      displayByDefault: true,
    },
    {
      label: "View summary",
      icon: "fa-light fa-square-list",
      onClick: (row: RowData) => {
        onRouteFromOverview();
        setActionData(row);
        setDisplayViewSummary(true);
      },
      displayByDefault: true,
    },
    {
      label: "Withdraw",
      icon: "fa-light fa-money-from-bracket",
      onClick: (row: any) => {
        onRouteFromOverview();
        const formattedDueDate = formatDate(new Date(row?.due_date));
        const formattedCreateDate = formatDate(new Date(row?.claim_created_on));
        const amountString = row?.retained_amount;
        const amountNumber = parseFloat(amountString.replace(/[^0-9.-]+/g, ""));
        router.push(
          `${
            AppRoutes.USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT
          }?type=Withdrawal&claim=${"RetentionClaim"}&due=${formattedDueDate}&create=${formattedCreateDate}&amount=${amountNumber}&bid=${
            row?.retention_account_id
          }&rid=${row?.retention_list_id}`
        );
      },
      conditionalApiDisplayKey: "withdraw",
    },
    {
      label: "Create retention claim",
      icon: "fa-light fa-octagon-plus",
      onClick: (row: any) => {
        onRouteFromOverview();
        router.push(
          `${
            AppRoutes.USER_ADD_CLAIMS
          }?cash-retention-type=${"RetentionClaim"}&claim-type=${
            row?.claim_type
          }&cid=${row?.contract_id}&pid=${row?.project_id}&type=${
            row?.cash_retention_type
          }&sid=${row?.sub_payment_id}&rid=${
            row?.retention_list_id
          }&rpaymentid=${row?.payment_id}&ra=${
            row?.retained_amount
              ? removeCommas(replaceDollarSymbol(row?.retained_amount))
              : 0
          }&overviewType=${screenName}&overviewContractId=${UniqueContract}`
        );
      },
      conditionalApiDisplayKey: "retentionclaim",
    },
    {
      label: "Create 3rd party claim",
      icon: "fa-light fa-person-circle-plus",
      onClick: (row: any) => {
        onRouteFromOverview();
        router.push(
          `${
            AppRoutes.USER_ADD_CLAIMS
          }?cash-retention-type=${"RetentionClaim"}&claim-type=${
            row?.claim_type
          }&cid=${row?.contract_id}&pid=${row?.project_id}&type=${
            row?.cash_retention_type
          }&sid=${row?.sub_payment_id}&rid=${
            row?.retention_list_id
          }&rpaymentid=${row?.payment_id}&ra=${
            row?.retained_amount
              ? removeCommas(replaceDollarSymbol(row?.retained_amount))
              : 0
          }&third_party=${row?.beneficiary_type === "Self"}`
        );
      },
      conditionalApiDisplayKey: "crete3rdparty",
    },
  ];

  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "retention",
        company_id: selectedCompanyId,
        status:
          activeTab === "Completed" ? "Completed" : selectedStatus || null,
        project_id: Number(projectId) || null,
        contract_id: Number(contractId) || null,
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
        screen_name: "retention",
        company_id: selectedCompanyId,
        status:
          activeTab === "Completed" ? "Completed" : selectedStatus || null,
        project_id: Number(projectId) || null,
        contract_id: Number(contractId) || null,
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
        {!(UniqueProject || screenName === "Contracts") && (
          <div className="pt_breadcrumbs">
            <BreadCrumbs
              routePaths={[
                {
                  name: "Dashboard",
                  path: AppRoutes.USER_DASHBOARD,
                },
              ]}
              activeRoute={"Retention List"}
            />
          </div>
        )}

        <div className="grid pt_topfilters">
          {!(UniqueProject || screenName === "Contracts") && (
            <div className="pt_pagetitle">
              <h1>Retention list</h1>
            </div>
          )}
        </div>
      </div>

      <div className="pt_filtergroup">
        <div className="grid pt_topfilters">
          <div className="pt_filters">
            <div role="group">
              <TabSwitch
                tabOptions={tabOptions}
                onChange={(value: any) => setActiveTab(value)}
              />
            </div>
          </div>
          <div className="pt_pageactions">
            <div className="actionbuttons">
              <GridExportActions
                excelFile={{
                  sheetName: "Retention list",
                  tableData: paymentsListData,
                  LabelAndValueKey: retentionExcelColumnNames,
                }}
                pdfFile={{
                  fileName: "Retention List",
                  headerRow: retentionListHeaders,
                  tableData: paymentsListData,
                  dataRow: pdfDataRow,
                }}
                resetFilterFunction={() => {
                  resetFilters();
                }}
                hideExcelButton={paymentsListData.length > 0 ? false : true}
                hidePdfButton={paymentsListData.length > 0 ? false : true}
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
          {screenName != "Contracts" && (
            <div>
              <FormikControl
                placeholder={"Select a project"}
                name="Select Project"
                options={projectOpt}
                onChange={handleProjectChange}
                control={InputType.SELECT}
                value={selectedProject}
                renderKey="label"
                valueKey="value"
              />
            </div>
          )}

          {!UniqueContract && (
            <div>
              <FormikControl
                placeholder={"Select a contract"}
                name="Select Contract"
                options={contractOpt}
                onChange={handleContractChange}
                control={InputType.SELECT}
                value={selectedContract}
                renderKey="label"
                valueKey="value"
              />
            </div>
          )}
          {activeTab !== "Completed" && (
            <div>
              <FormikControl
                placeholder={"Select a status"}
                name="Select Status"
                options={statusOptions}
                onChange={handleStatusChange}
                control={InputType.SELECT}
                value={selectedStatusName}
                renderKey="label"
                valueKey="value"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid">
        <div className="pt_box">
          <div className="grid">
            <h4>{activeTab || "Current"}</h4>
          </div>
          <DynamicTable
            headers={retentionGridListHeaders}
            gridData={paymentsListData?.length > 0 ? paymentsListData : []}
            gridActions={actions}
            onRowClick={(data: any) => handleRowView(data)}
            showLoader={loading}
            hoverOnRowClick
            loaderColSpan={8}
            dynamicApiGridIconsKey={"retenion_list_icons"}
            renderRowList={RetentionRenderData}
            currentPage={page}
            entriesPerPage={perPage}
            onEntriesPerPageChange={setPerPage}
            onPageChange={setPage}
            totalEntries={totalRows}
            onSortChange={(sortConfig) => {
              setSortValues(sortConfig);
            }}
          />
        </div>
      </div>

      {displayViewSummary && (
        <RetentionSummary
          openModal={displayViewSummary}
          onClose={() => setDisplayViewSummary(false)}
          retentionsClaimData={actionData}
        />
      )}
    </div>
  );
};

export default RetentionLists;
