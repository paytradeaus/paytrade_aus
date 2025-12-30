//default imports
"use client";
import React, { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
//import from external libraries
//import from constants, interfaces ,functions and services
import { deleteCookie, getCookie, setCookie } from "cookies-next";
import {
  changeStatusOfAPaymentClaim,
  fetchAllPaymentClaims,
  PaymentClaim,
} from "../../PayApps/payApps.functions";
import {
  fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList,
  getListActionButtons,
} from "@/app/api/commonApi";
import { connectWebSocket, formatDate } from "@/utils";
import DynamicTable from "@/components/Table";
import { AppRoutes } from "@/shared/constant/appRoutes";
import BreadCrumbs from "@/components/BreadCrumbs";
import GridExportActions from "@/components/GridExportActions";
import FormikControl from "@/components/FormikControl";
import TabSwitch from "@/components/TabSwitch";
import BaseModal from "@/components/BaseModal";
import {
  ExcelColumnNames,
  payAppsheaderNames,
  paymentRenderData,
  pdfDataRow,
  PdfheaderNames,
  receivableOptions,
  statusOptions,
  tabOptions,
  toggleOptions,
} from "../../PayApps/payApps.constant";
import {
  buttonType,
  InputType,
  OVERVIEW_TABS,
} from "@/shared/constant/general";
import Link from "next/link";
import PageLoader from "@/components/PageLoader/PageLoader";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";
import { useLoaderContext } from "@/context/useLoader";
import { tabTypes } from "../../AddUpdatePayments/Payments.constants";
import {
  getContractListsForCompany,
  getProjectsLists,
} from "../../Contracts/contracts.functions";
import { ProjectOptions } from "next/dist/build/swc";
import ProjectOverview from "./ProjectOverview";
import { projectOverviewTabs } from "./ProjectOverview.constant";

interface RowData {
  id: string;
  type: string;
  status: string;
}

interface ContractOption {
  value: string;
  label: string;
  contract_id: number;
}

export default function OverviewClaims({ overViewDetails = {} }: any) {
  const {
    overViewMode,
    isArchived = false,
    data: overviewData,
    screenName: overviewScreenName,
  } = overViewDetails;

  const dialogRef = useRef<HTMLDialogElement | null>(null);
  // const { isArchived = false } = props;
  const claimType = useSearchParams().get("claim-type");
  const retentionType = useSearchParams().get("retention-type");
  const [loading, setLoading] = useState<boolean>(false);
  const [actionMenuLoader, setActionMenuLoader] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [projectList, setProjectList] = useState<[]>([]);
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [displayPaymentModel, setDisplayPaymentModel] = useState(false);

  const [contractOptions, setContractOptions] = useState<ContractOption[]>([]);
  const [projectOptions, setProjectOptions] = useState<ProjectOptions[]>([]);
  const [actionData, setActionData] = useState<any>();

  const [selectedStatus, setSelectedStatus] = useState(
    isArchived ? "Archived" : ""
  );

  const [selectedStatusName, setSelectedStatusName] = useState<any>(null);
  const [paymentclaimGridData, setPaymentClaimGridData] = useState<any>([]);

  const [openModal, setOpenModal] = useState(false);
  const [openAddPaymentModal, setOpenAddPaymentModal] = useState(false);
  const [selectedClaimType, setSelectedClaimType] = useState<string>(
    retentionType || ""
  );
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);

  const { setLoader }: any = useLoaderContext();

  const [disableExcelBtn, setDisableExcelBtn] = useState(false);

  const [selectedPaymentType, setSelectedPaymentType] = useState<string>(
    claimType || ""
  );
  const [selectedProjectId, setSelectedProjectId] = useState<
    number | null | any
  >(null);

  const [selectedContractId, setSelectedContractId] = useState<
    number | null | any
  >(null);

  const [selectedProjectName, setSelectedProjectName] = useState<number | null>(
    null
  );
  const [sortValues, setSortValues] = useState<any>("");
  const [paymentClaimsData, setPaymentClaimsData] = useState<PaymentClaim[]>(
    []
  );

  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const [availablePayments, setAvailablePayments] = useState<any[]>([]);

  const [displayDeleteConfirmationModal, setDisplayDeleteConfirmationModal] =
    useState(false);

  const [activeTab, setActiveTab] = useState("");
  // const SelectedProjectId =
  //   overviewScreenName === "Project" || overviewScreenName === "Contracts"
  //     ? selectedProject
  //     : selectedProjectId || null;
  // const SelectedContractId =
  //   overviewScreenName === "Contracts"
  //     ? selectedContract
  //     : Number(selectedContractId) || null;
  const resetFilters = () => {
    setSelectedStatus("");
    setSelectedStatusName(null);
    setSelectedContractId(null);
    setSelectedProjectId(null);
    setSelectedProjectName(null);
  };

  const isAnyFilterActive =
    selectedStatusName !== null ||
    selectedContractId !== null ||
    selectedProjectId !== null ||
    selectedProjectName !== null;

  useEffect(() => {
    if (displayPaymentModel && dialogRef.current) {
      dialogRef.current.showModal(); // Open the dialog
    } else if (dialogRef.current) {
      dialogRef.current.close(); // Close the dialog if needed
    }
  }, [displayPaymentModel]);
  useEffect(() => {
    (async () => {
      const response = await getProjectsLists({ companyId: selectedCompanyId });

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
    // Delete the 'redirectAfterLogin' cookie when the component renders
    const isCookiePresent = getCookie("redirectAfterLogin");
    if (isCookiePresent) {
      deleteCookie("redirectAfterLogin");
    }
  }, []);

  const truncateText = (text: any, maxLength = 25) => {
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  };

  useEffect(() => {
    (async () => {
      const data = {
        company_id: selectedCompanyId || null,
        project_id: Number(selectedProjectId) || null,
        contract_id: Number(selectedContractId) || null,
      };

      const response =
        await fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList(data);
      if (response) {
        // Set Project List
        const projectOptions: any = [
          { label: "All", value: null, project_id: "" },
          ...(response.projects?.map((project: any) => ({
            label: project?.project_name,
            value: project?.project_id.toString(),
            project_id: project?.project_id.toString(),
          })) || []),
        ];
        setProjectOptions(projectOptions);

        // Set Contract List
        const contractOptions = [
          { label: "All", value: null, contract_id: "" }, // Add this line
          ...(response.contracts?.map((contract: any) => ({
            label: contract?.contract_name,
            value: contract?.contract_id.toString(),
            contract_id: contract?.contract_id.toString(),
          })) || []),
        ];
        setContractOptions(contractOptions);
      }
    })();
  }, [selectedCompanyId, selectedProjectId]); // Add necessary dependencies

  useEffect(() => {
    if (selectedCompanyId !== null) {
      fetchData(page, perPage);
    }
  }, [selectedCompanyId, selectedProjectId, page, perPage, sortValues]);

  useEffect(() => {
    setPage(1); // Reset to the first page
  }, [
    selectedClaimType,
    selectedStatusName,
    selectedPaymentType,
    selectedProjectId,
    selectedContractId,
    activeTab,
  ]);
  useEffect(() => {
    if (selectedContractId || selectedProjectId) {
      fetchData(page, perPage);
    }
  }, [selectedContractId, selectedProjectId]);

  useEffect(() => {
    fetchData(page, perPage);
  }, [
    selectedClaimType,
    selectedStatusName,
    selectedPaymentType,
    selectedProjectId,
    selectedContractId,
    activeTab,
    page,
    perPage,
  ]);
  const fetchContractsForProject = async (overviewProjectId: string) => {
    const data = {
      company_id: selectedCompanyId,
      project_id: selectedProjectId,
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
      cash_retention_type: selectedClaimType || null,
      claim_type: selectedPaymentType || null,
      contract_id:
        overviewData?.contract_id || Number(selectedContractId) || null,
      company_id: selectedCompanyId || null,
      items_per_page: rowsPerPage,
      page: page,
      project_id: overviewData?.project_id || Number(selectedProjectId) || null,
      status:
        activeTab === "Archived" ? "Archived" : selectedStatusName || null,
      sorting_field: sortValues?.sortKey || "",
      sorting_order: sortValues?.direction || "",
    });

    if (response) {
      const responseData = JSON.parse(JSON.stringify(response));
      setTotalRows(response.total_count || 0);
      setPerPage(rowsPerPage);

      let printDataObjCreation = responseData?.payment_claims?.map(
        (paymentClaim: PaymentClaim) => {
          return {
            ...paymentClaim,
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
            status: truncateText(paymentClaim?.list_status),
            payment_claim_id: paymentClaim?.payment_claim_id,
          };
        }
      );
      setPaymentClaimGridData(printDataObjCreation || []);
      setPaymentClaimsData(printDataObjCreation || []);
    }
    setLoading(false);
    setDisableExcelBtn(false);
  };

  const handleStatusChange = (selectedValue: any) => {
    setSelectedStatus(selectedValue);
    setSelectedStatusName(selectedValue);
    // Perform any other actions based on the selected valuef
  };
  //Other Hooks
  const routePath = usePathname();
  const router = useRouter();

  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "payment_claims",
        cash_retention_type: selectedClaimType || null,
        claim_type: selectedPaymentType || null,
        contract_id: Number(selectedContractId) || null,
        company_id: selectedCompanyId || null,
        project_id: Number(selectedProjectId) || null,
        status:
          activeTab === "Archived" ? "Archived" : selectedStatusName || null,
        items_per_page: perPage,
        page: page,
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

  const gridActions: any = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      style: buttonType.PRIMARY,
      onClick: (row: any, index: number) => {
        navigateToViewMode(row);
      },
      displayByDefault: true,
    },
    {
      label: "Add next Payment",
      icon: "fa-light fa-money-bill-transfer",
      style: buttonType.SECONDARY,
      onClick: (row: any) => {
        const getPaymentType = row?.payments.find(
          (x: any) =>
            x?.payment_type === tabTypes.PART ||
            x?.payment_type === tabTypes.PAY_LESS_PART
        );
        setCookie("PaymentType", getPaymentType?.payment_type);
        router.push(
          `${AppRoutes.USER_ADD_PAYMENT}?claim=${row?.payment_claim_id}&tab=${
            selectedClaimType === toggleOptions[1]?.value
              ? "retention-claim"
              : ""
          }&next-payment=true`
        );
        setActionData(row);
      },
      conditionalApiDisplayKey: "add_next_payment",
    },

    {
      label: "Edit",
      icon: "fa-light fa-pen-to-square",
      style: buttonType.SECONDARY,
      onClick: (row: any) => {
        router.push(
          `${AppRoutes.USER_EDIT_CLAIMS}/${row?.payment_claim_id}?overviewType=${OVERVIEW_TABS.project}&overviewProjectId=${overviewData?.id}&active_tab=${projectOverviewTabs.CLAIMS}`
        );
      },
      conditionalApiDisplayKey: "edit",
    },
    {
      label: "Add payment",
      icon: "a-light fa-money-bill-simple",
      style: buttonType.SECONDARY,
      onClick: (row: any) => {
        setDisplayPaymentModel(true);
        setActionData(row);
      },
      conditionalApiDisplayKey: "add_payment",
    },

    {
      label: "View all payments",
      icon: "fa-light fa-file-invoice-dollar",
      style: buttonType.SECONDARY,
      // onClick: (row: any) => {},
      onClick: (row: any) => {
        router.push(AppRoutes.USER_PAYMENTS_LIST);
      },

      conditionalApiDisplayKey: "view_all_payment",
    },

    {
      label: "View payments",
      icon: "fa-light fa-file-invoice-dollar",
      style: buttonType.SECONDARY,
      // onClick: (row: any) => {},
      onClick: (row: any) => {
        setCookie("from_page", AppRoutes.USER_PAY_APPS);

        router.push(
          `${AppRoutes.USER_ADD_PAYMENT}?claim=${
            row?.payment_claim_id
          }&mode=view&payment=${row?.payments[0]?.payment_id}&crt=${
            selectedClaimType === toggleOptions[1]?.value
              ? "RetentionClaim"
              : ""
          }&overviewType=${OVERVIEW_TABS.project}&overviewProjectId=${
            overviewData?.id
          }`
        );
      },

      conditionalApiDisplayKey: "view_payment",
    },

    {
      label: "View notices",
      icon: "fa-light fa-message-dollar",
      style: buttonType.SECONDARY,
      onClick: (row: any) => {
        router.push(
          `${AppRoutes.USER_NOTICES}?payment-claim=${row?.payment_claim_id}`
        );
      },
      conditionalApiDisplayKey: "view_notice",
    },

    {
      label: "Delete",
      icon: "fa-light fa-trash",
      style: buttonType.CONTRAST,
      onClick: (row: any) => {
        setDisplayDeleteConfirmationModal(true);
        setActionData(row);
      },
      conditionalApiDisplayKey: "delete",
    },
  ];

  async function handleDeleteFunction() {
    try {
      setLoader(true);
      const response = await changeStatusOfAPaymentClaim({
        payment_claim_id: actionData?.payment_claim_id,
        status: "Deleted",
      });
      if (response) {
        // Refresh the contract list after deletion
        fetchData(page, perPage);
      }
      setOpenModal(false);
      setLoader(false);
    } catch (error) {
      setOpenModal(false);
      setLoader(false);
    }
  }

  function navigateToViewMode(data: any) {
    let paymentObj: any = 0;

    if (data?.payments?.length > 0) {
      const isPartPayment = data?.payments.some(
        (x: any) =>
          x?.payment_type === tabTypes.PART ||
          x?.payment_type === tabTypes.PAY_LESS_PART
      );

      if (isPartPayment) {
        paymentObj = data?.payments.findLast(
          (x: any) =>
            x?.payment_type === tabTypes.PART ||
            x?.payment_type === tabTypes.PAY_LESS_PART
        );
      }
    }

    router.push(
      `${AppRoutes.USER_VIEW_CLAIMS}/${data?.payment_claim_id}?type=${
        data?.cash_retention_type
      }&cash-retention-type=${
        data?.cash_retention_type === "Claim" ? "" : "RetentionClaim"
      }&beneficiary=${data?.beneficiary_type || ""}&payment-type=${
        paymentObj
          ? paymentObj?.payment_type
          : data?.payments?.length > 0
          ? data?.payments[0]?.payment_type
          : ""
      }&payment=${
        paymentObj
          ? paymentObj?.payment_id
          : data?.payments?.length > 0
          ? data?.payments[0]?.payment_id
          : ""
      }&ctype=${data?.claim_type}&overviewType=${
        OVERVIEW_TABS.project
      }&overviewProjectId=${overviewData?.id}&active_tab=${
        projectOverviewTabs.CLAIMS
      }`
    );
  }

  const handleDownloadPdfFile = async () => {
    setDisablePDFBtn(true);

    try {
      const clientId = await connectWebSocket();
      await getPDFUrl(clientId, {
        screen_name: "payment_claims",
        cash_retention_type: selectedClaimType || null,
        claim_type: selectedPaymentType || null,
        contract_id: Number(selectedContractId) || null,
        company_id: selectedCompanyId || null,
        project_id: Number(selectedProjectId) || null,
        status:
          activeTab === "Archived" ? "Archived" : selectedStatusName || null,
        items_per_page: perPage,
        page: page,
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
        <div className="pt_breadcrumbs">
          {/* <BreadCrumbs
            routePaths={[
              {
                name: "Dashboard",
                path: AppRoutes.USER_DASHBOARD,
              },
            ]}
            activeRoute={"Claims"}
          /> */}
        </div>
        <div className="grid pt_topfilters">
          {/* <div className="pt_pagetitle">
            <h1>Claims</h1>
          </div> */}
          <div className="pt_pageactions">
            <Link
              href={`${AppRoutes.USER_ADD_CLAIMS}?mode=add&overviewType=${OVERVIEW_TABS.project}&overviewProjectId=${overviewData?.id}&active_tab=${projectOverviewTabs.CLAIMS}`}
              passHref
              legacyBehavior
            >
              <a className="pt_addnewbutton">
                <button className="secondary">
                  <i className="fa-light fa-hexagon-plus"></i>Add claim
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
                onChange={(value: any) => setActiveTab(value)}
              />
            </div> */}
          </div>
          <div className="pt_pageactions">
            <div className="actionbuttons">
              <GridExportActions
                resetFilterFunction={() => {
                  resetFilters();
                }}
                hideExcelButton={paymentclaimGridData.length > 0 ? false : true}
                hidePdfButton={paymentclaimGridData.length > 0 ? false : true}
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
        <div className="pt_filters pt_toggles">
          <fieldset>
            <input
              type="radio"
              id="allClaimRetentionClaim"
              name="claims"
              value={""}
              checked={selectedClaimType === ""}
              onChange={(e: any) => setSelectedClaimType(e.target.value)}
            />
            <label htmlFor="allClaimRetentionClaim">All</label>
            <input
              type="radio"
              id="claims"
              name="claimsType"
              value="Claim"
              checked={selectedClaimType === "Claim"}
              onChange={(e: any) => setSelectedClaimType(e.target.value)}
            />
            <label htmlFor="claims">Payment Claims</label>
            <input
              type="radio"
              id="claims"
              name="claimsType"
              value="Retention claim"
              checked={selectedClaimType === "Retention claim"}
              onChange={(e: any) => setSelectedClaimType(e.target.value)}
            />
            <label htmlFor="claims">Retention claims</label>
          </fieldset>
          <fieldset>
            <input
              type="radio"
              id="AllBillableReceivable"
              name="paymentstype"
              value={""}
              checked={selectedPaymentType === ""}
              onChange={(e: any) => setSelectedPaymentType(e.target.value)}
            />
            <label htmlFor="AllBillableReceivable">All</label>
            <input
              type="radio"
              id="billable"
              name="paymentstype"
              value="Billable"
              checked={selectedPaymentType === "Billable"}
              onChange={(e: any) => setSelectedPaymentType(e.target.value)}
            />
            <label htmlFor="Billable">Billables</label>
            <input
              type="radio"
              id="receivable"
              name="paymentstype"
              value="Receivable"
              checked={selectedPaymentType === "Receivable"}
              onChange={(e: any) => setSelectedPaymentType(e.target.value)}
            />
            <label htmlFor="Receivable">Receivables</label>
          </fieldset>
        </div>
        <div className="pt_filteroptions">
          {/* <div>
            <FormikControl
              placeholder={"Select a project"}
              name="Project"
              options={projectList}
              selectedData={selectedProjectName}
              onChange={(selectedOption: any) => {
                if (selectedOption) {
                  setSelectedProjectId(selectedOption?.value);
                  setSelectedProjectName(selectedOption);
                }
              }}
              control={InputType.SELECT}
              value={selectedProjectName}
              renderKey="label"
              valueKey="value"
            />
          </div> */}
          <div>
            <FormikControl
              placeholder={"Select a contract"}
              name="Contract"
              options={contractOptions}
              onChange={(selectedOption: any) => {
                if (selectedOption) {
                  setSelectedContractId(selectedOption);
                }
              }}
              control={InputType.SELECT}
              value={selectedContractId}
              renderKey="label"
              valueKey="value"
            />
          </div>

          <div>
            <FormikControl
              placeholder={"Select a status"}
              name="Status"
              options={
                selectedPaymentType === "Billable"
                  ? statusOptions
                  : receivableOptions
              }
              onChange={handleStatusChange}
              control={InputType.SELECT}
              value={selectedStatusName}
              renderKey="label"
              valueKey="value"
            />
          </div>
        </div>
      </div>

      <div className="grid">
        <div className="pt_box">
          <div className="grid">
            <h4>{activeTab || "Current"}</h4>
          </div>

          <DynamicTable
            headers={payAppsheaderNames(selectedPaymentType)}
            gridData={
              paymentclaimGridData.length > 0 ? paymentclaimGridData : []
            }
            gridActions={gridActions}
            dynamicApiGridIconsKey={"claim_list_buttons"}
            onRowClick={(data: any) => navigateToViewMode(data)}
            hoverOnRowClick
            showLoader={loading}
            loaderColSpan={10}
            renderRowList={paymentRenderData}
            currentPage={page}
            entriesPerPage={perPage}
            onEntriesPerPageChange={setPerPage}
            onPageChange={setPage}
            totalEntries={totalRows}
            onSortChange={(sortConfig) => {
              if (paymentclaimGridData?.length > 0) {
                setSortValues(sortConfig);
              }
            }}
          />
        </div>
      </div>
      {displayPaymentModel && (
        <dialog id="paytype" ref={dialogRef}>
          <article>
            <header>
              <button
                aria-label="Close"
                rel="prev"
                data-target="paytype"
                onClick={() => setDisplayPaymentModel(false)}
              ></button>
              <p>
                <strong>Select payment type</strong>
              </p>
            </header>
            {/* <div className="grid" style={{ columnGap: "var(--space-s)" }}>
              <Link
                href={`${AppRoutes.USER_ADD_PAYMENT}?claim=${actionData?.payment_claim_id}`}
                onClick={() => setCookie("PaymentType", "Full")}
                className="pt_selectbox"
              >
                <h4>Full payment</h4>
                <p>Where you intend to pay the full claim in full.</p>
              </Link>
              <Link
                href={`${AppRoutes.USER_ADD_PAYMENT}?claim=${actionData?.payment_claim_id}`}
                onClick={() => setCookie("PaymentType", "Part")}
                className="pt_selectbox"
              >
                <h4>Part payment</h4>
                <p>
                  Where you intend to pay the claim in full, but due to
                  available funds, will need to pay part now and part later. You
                  will be required to notify the QBCC where this is the case.
                </p>
              </Link>
              <Link
                href={`${AppRoutes.USER_ADD_PAYMENT}?claim=${actionData?.payment_claim_id}`}
                onClick={() => setCookie("PaymentType", "Pay Less - Full")}
                className="pt_selectbox"
              >
                <h4>Pay Less - Full</h4>
                <p>
                  Where you intend to pay less due to part completed work or
                  other reduced payment reason. You will be required to confirm
                  the reasons why and input the reduced payment amount.
                </p>
              </Link>
            </div>
            <div className="grid" style={{ columnGap: "var(--space-s)" }}>
              <Link
                href={`${AppRoutes.USER_ADD_PAYMENT}?claim=${actionData?.payment_claim_id}`}
                onClick={() => setCookie("PaymentType", "Pay Less - Part")}
                className="pt_selectbox"
              >
                <h4>Pay Less - Part</h4>
                <p>
                  Where you intend to pay less due to part completed work or
                  other reduced payment reason and due to available funds, will
                  need to pay part now and part later. You will be required to
                  notify the QBCC where this is the case.
                </p>
              </Link>
              <Link
                href={`${AppRoutes.USER_ADD_PAYMENT}?claim=${actionData?.payment_claim_id}`}
                onClick={() => setCookie("PaymentType", "Pay - Zero")}
                className="pt_selectbox"
              >
                <h4>Pay Less - Zero</h4>
                <p>
                  Where you don’t intend to pay anything to settle the claim.
                  This may be due to a claim error. You will be required to
                  confirm to the sub-contractor the reason why.
                </p>
              </Link>
              <Link
                href={`${AppRoutes.USER_ADD_PAYMENT}?claim=${actionData?.payment_claim_id}`}
                onClick={() => setCookie("PaymentType", "3rd Party")}
                className="pt_selectbox"
              >
                <h4>3rd Party</h4>
                <p>Where you intend to pay a third party.</p>
              </Link>
            </div> */}
            {actionData?.beneficiary_type === "Self" ? (
              <div className="grid" style={{ columnGap: "var(--space-s)" }}>
                <Link
                  href={`${AppRoutes.USER_ADD_PAYMENT}?claim=${actionData?.payment_claim_id}`}
                  onClick={() => setCookie("PaymentType", "Full")}
                  className="pt_selectbox"
                >
                  <h4>Full payment</h4>
                  <p>Where you intend to pay the full claim in full.</p>
                </Link>
                <Link
                  href={`${AppRoutes.USER_ADD_PAYMENT}?claim=${actionData?.payment_claim_id}`}
                  onClick={() => setCookie("PaymentType", "Part")}
                  className="pt_selectbox"
                >
                  <h4>Part payment</h4>
                  <p>
                    Where you intend to pay the claim in full, but due to
                    available funds, will need to pay part now and part later.
                    You will be required to notify the QBCC where this is the
                    case.
                  </p>
                </Link>
              </div>
            ) : (
              <>
                <div className="grid" style={{ columnGap: "var(--space-s)" }}>
                  <Link
                    href={`${AppRoutes.USER_ADD_PAYMENT}?claim=${
                      actionData?.payment_claim_id
                    }&tab=${
                      selectedClaimType === toggleOptions[1]?.value
                        ? "retention-claim"
                        : ""
                    }&beneficiary=${actionData?.beneficiary_type || ""}`}
                    onClick={() => {
                      setCookie("PaymentType", "Full");
                      setCookie("from_page", AppRoutes.USER_PAY_APPS);
                    }}
                    className="pt_selectbox"
                  >
                    <h4>Full payment</h4>
                    <p>Where you intend to pay the full claim in full.</p>
                  </Link>
                  <Link
                    href={`${AppRoutes.USER_ADD_PAYMENT}?claim=${
                      actionData?.payment_claim_id
                    }&tab=${
                      selectedClaimType === toggleOptions[1]?.value
                        ? "retention-claim"
                        : ""
                    }&beneficiary=${actionData?.beneficiary_type || ""}`}
                    onClick={() => {
                      setCookie("PaymentType", "Part");
                      setCookie("from_page", AppRoutes.USER_PAY_APPS);
                    }}
                    className="pt_selectbox"
                  >
                    <h4>Part payment</h4>
                    <p>
                      Where you intend to pay the claim in full, but due to
                      available funds, will need to pay part now and part later.
                      You will be required to notify the QBCC where this is the
                      case.
                    </p>
                  </Link>
                  <Link
                    href={`${AppRoutes.USER_ADD_PAYMENT}?claim=${
                      actionData?.payment_claim_id
                    }&tab=${
                      selectedClaimType === toggleOptions[1]?.value
                        ? "retention-claim"
                        : ""
                    }&beneficiary=${actionData?.beneficiary_type || ""}`}
                    onClick={() => {
                      setCookie("PaymentType", "Pay Less - Full");
                      setCookie("from_page", AppRoutes.USER_PAY_APPS);
                    }}
                    className="pt_selectbox"
                  >
                    <h4>Pay Less - Full</h4>
                    <p>
                      Where you intend to pay less due to part completed work or
                      other reduced payment reason. You will be required to
                      confirm the reasons why and input the reduced payment
                      amount.
                    </p>
                  </Link>
                </div>
                <div className="grid" style={{ columnGap: "var(--space-s)" }}>
                  <Link
                    href={`${AppRoutes.USER_ADD_PAYMENT}?claim=${
                      actionData?.payment_claim_id
                    }&tab=${
                      selectedClaimType === toggleOptions[1]?.value
                        ? "retention-claim"
                        : ""
                    }&beneficiary=${actionData?.beneficiary_type || ""}`}
                    onClick={() => {
                      setCookie("PaymentType", "Pay Less - Part");
                      setCookie("from_page", AppRoutes.USER_PAY_APPS);
                    }}
                    className="pt_selectbox"
                  >
                    <h4>Pay Less - Part</h4>
                    <p>
                      Where you intend to pay less due to part completed work or
                      other reduced payment reason and due to available funds,
                      will need to pay part now and part later. You will be
                      required to notify the QBCC where this is the case.
                    </p>
                  </Link>
                  <Link
                    href={`${AppRoutes.USER_ADD_PAYMENT}?claim=${
                      actionData?.payment_claim_id
                    }&tab=${
                      selectedClaimType === toggleOptions[1]?.value
                        ? "retention-claim"
                        : ""
                    }&beneficiary=${actionData?.beneficiary_type || ""}`}
                    onClick={() => {
                      setCookie("PaymentType", "Pay - Zero");
                      setCookie("from_page", AppRoutes.USER_PAY_APPS);
                    }}
                    className="pt_selectbox"
                  >
                    <h4>Pay - Zero</h4>
                    <p>
                      Where you don’t intend to pay anything to settle the
                      claim. This may be due to a claim error. You will be
                      required to confirm to the sub-contractor the reason why.
                    </p>
                  </Link>
                  <Link
                    href={`${AppRoutes.USER_ADD_PAYMENT}?claim=${
                      actionData?.payment_claim_id
                    }&tab=${
                      selectedClaimType === toggleOptions[1]?.value
                        ? "retention-claim"
                        : ""
                    }&beneficiary=${actionData?.beneficiary_type || ""}`}
                    onClick={() => {
                      setCookie("PaymentType", "3rd Party");
                      setCookie("from_page", AppRoutes.USER_PAY_APPS);
                    }}
                    className="pt_selectbox"
                  >
                    <h4>3rd Party</h4>
                    <p>Where you intend to pay a third party.</p>
                  </Link>
                </div>
              </>
            )}
          </article>
        </dialog>
      )}
      {displayDeleteConfirmationModal && (
        <BaseModal
          modalId={"claims delete modal"}
          displayModal={displayDeleteConfirmationModal}
          onHeaderIconClose={() => setDisplayDeleteConfirmationModal(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setDisplayDeleteConfirmationModal(false)}
          onConfirm={() => {
            handleDeleteFunction();
            return true;
          }}
          firstButtonName="No"
          secondButtonName="Yes"
        >
          <h4 className="text_center">
            {
              "Are you sure you wish to move this claim to the archive list with status set to Deleted?"
            }
          </h4>
        </BaseModal>
      )}
    </div>
  );
}

// export default OverviewClaims;
