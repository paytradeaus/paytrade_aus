//default imports
"use client";
import React, { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
//import from external libraries
//import from constants, interfaces ,functions and services
import { deleteCookie, getCookie, setCookie } from "cookies-next";
import { fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList } from "@/app/api/commonApi";
import { formatDate } from "@/utils";
import DynamicTable from "@/components/Table";
import { AppRoutes } from "@/shared/constant/appRoutes";
import BreadCrumbs from "@/components/BreadCrumbs";
import GridExportActions from "@/components/GridExportActions";
import FormikControl from "@/components/FormikControl";
import TabSwitch from "@/components/TabSwitch";
import BaseModal from "@/components/BaseModal";

import { InputType, tabOptions } from "@/shared/constant/general";
import Link from "next/link";
import PageLoader from "@/components/PageLoader/PageLoader";
import { downloadExcelFileFromAPI, GenerateSignedUrl } from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";
import {
  ExcelColumnNames,
  payAppsheaderNames,
  paymentRenderData,
  pdfDataRow,
  PdfheaderNames,
  receivableOptions,
  statusOptions,
} from "../PayApps/payApps.constant";
import {
  fetchAllPaymentClaims,
  PaymentClaim,
} from "../PayApps/payApps.functions";

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

const PayApps = (props: any) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const { isArchived = false } = props;
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
  const [actionData, setActionData] = useState<any>();

  const [selectedStatus, setSelectedStatus] = useState(
    isArchived ? "Archived" : ""
  );

  const [selectedStatusName, setSelectedStatusName] = useState<any>(null);
  const [paymentclaimGridData, setPaymentClaimGridData] = useState<any>([]);

  const [openModal, setOpenModal] = useState(false);
  const [openAddPaymentModal, setOpenAddPaymentModal] = useState(false);
  const [selectedClaimType, setSelectedClaimType] = useState<string>(
    retentionType || "Claim"
  );

  const [disableExcelBtn, setDisableExcelBtn] = useState(false);

  const [selectedPaymentType, setSelectedPaymentType] = useState<string>(
    claimType || "Billable"
  );
  const [selectedProjectId, setSelectedProjectId] = useState<
    number | null | any
  >(null);

  const [selectedContractId, setSelectedContractId] = useState<
    number | null | any
  >(null);

  const [screenName, setScreenName] = useState<string>("payment_claims");
  const [selectedType, setSelectedType] = useState<string>("undefined");

  // const [selectedContractName, setSelectedContractName] = useState<
  //   number | null
  // >(null);

  const [selectedProjectName, setSelectedProjectName] = useState<number | null>(
    null
  );

  const [paymentClaimsData, setPaymentClaimsData] = useState<PaymentClaim[]>(
    []
  );

  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const [availablePayments, setAvailablePayments] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState("");

  const [actionButtons, setActionButtons] = useState<any>([
    {
      label: "View",
      value: "View",
    },
  ]);

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
          { label: "All", value: null },
          ...(response.projects?.map((project: any) => ({
            label: project?.project_name,
            value: project?.project_id,
          })) || []),
        ];
        setProjectList(projectOptions);

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
  }, [selectedCompanyId, page, perPage]);

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

  const fetchData = async (page: number, rowsPerPage: number) => {
    if (!selectedCompanyId) {
      return; // Early return if selectedCompanyId is not present
    }
    setLoading(true);
    const response = await fetchAllPaymentClaims({
      cash_retention_type: selectedClaimType || null,
      claim_type: selectedPaymentType || null,
      contract_id: Number(selectedContractId) || null,
      company_id: selectedCompanyId || null,
      items_per_page: rowsPerPage,
      page: page,
      project_id: Number(selectedProjectId) || null,
      status:
        activeTab === "Archived" ? "Archived" : selectedStatusName || null,
    });

    if (response) {
      const responseData = JSON.parse(JSON.stringify(response));
      setTotalRows(response.total_count || 0);
      setPerPage(rowsPerPage);

      let printDataObjCreation = responseData?.payment_claims?.map(
        (paymentClaim: PaymentClaim) => {
          return {
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

  function navigateToViewMode(data: any) {
    let paymentObj: any = 0;

    router.push(
      `${"AppRoutes.USER_PAYMENT_CLAIMS_VIEW"}/${data?.payment_claim_id}?type=${
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
      }&ctype=${data?.claim_type}`
    );
  }

  const actions = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      onClick: (row: RowData) => {
        console.log("Viewing row:", row);
      },
    },
    {
      label: "Add Payment",
      icon: "fa-light fa-money-bill-simple",
      onClick: (row: RowData) => {
        console.log("Viewing row:", row);
        setDisplayPaymentModel(true);
        setActionData(row);
      },
    },
    {
      label: "Edit",
      icon: "fa-light fa-pen-to-square",
      onClick: (row: any) => {
        router.push(`${AppRoutes.USER_EDIT_CLAIMS}/${row?.payment_claim_id}`);
      },
    },
    {
      label: "Delete",
      style: "contrast",
      icon: "fa-light fa-trash",
      onClick: (row: RowData) => {
        console.log("Claiming for row:", row);
      },
    },
  ];

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

  const handleModelClose = () => {
    setDisplayPaymentModel(false);
    return true;
  };

  const handleNavigation = () => {
    router.push(AppRoutes.USER_ADD_PAYMENT);
  };

  return (
    <div className="container-fluid">
      <div className="pt_title">
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle"></div>
          <div className="pt_pageactions">
            <Link
              href={`${
                AppRoutes.USER_ADD_CLAIMS
              }?pid=${selectedProjectId}&&cid=${selectedContractId}&overtype=${screenName}&screenname=${"overview"}&client-supplier-type=${selectedType}`}
              passHref
              legacyBehavior
            >
              <a className="pt_addnewbutton">
                <button className="secondary">
                  <i className="fa-light fa-hexagon-plus"></i>Add Claims
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
                  sheetName: "payments-list",
                  tableData: paymentclaimGridData,
                  LabelAndValueKey: ExcelColumnNames,
                }}
                pdfFile={{
                  fileName: "payments-list",
                  headerRow: PdfheaderNames(selectedPaymentType),
                  tableData: paymentclaimGridData,
                  dataRow: pdfDataRow,
                }}
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
              />
            </div>
          </div>
        </div>
        <div className="pt_filters pt_toggles">
          <fieldset>
            <input
              type="radio"
              id="claims"
              name="claimsType"
              value="Claim"
              checked={selectedClaimType === "Claim"}
              onChange={(e: any) => setSelectedClaimType(e.target.value)}
            />
            <label htmlFor="claims">Claim</label>
            <input
              type="radio"
              id="claims"
              name="claimsType"
              value="Retention claim"
              checked={selectedClaimType === "Retention claim"}
              onChange={(e: any) => setSelectedClaimType(e.target.value)}
            />
            <label htmlFor="claims">Retention claim</label>
          </fieldset>
          <fieldset>
            <input
              type="radio"
              id="receivable"
              name="paymentstype"
              value="Receivable"
              checked={selectedPaymentType === "Receivable"}
              onChange={(e: any) => setSelectedPaymentType(e.target.value)}
            />
            <label htmlFor="Receivable">Receivable</label>

            <input
              type="radio"
              id="billable"
              name="paymentstype"
              value="Billable"
              checked={selectedPaymentType === "Billable"}
              onChange={(e: any) => setSelectedPaymentType(e.target.value)}
            />
            <label htmlFor="Billable">Billable</label>
          </fieldset>
        </div>
        <div className="pt_filteroptions">
          <div>
            <FormikControl
              placeholder={"Select Project"}
              name="Project"
              options={projectList}
              onChange={(selectedOption: any) => {
                if (selectedOption) {
                  setSelectedProjectId(selectedOption);
                  setSelectedProjectName(selectedOption);
                }
              }}
              control={InputType.SELECT}
              value={selectedProjectName}
              renderKey="label"
              valueKey="value"
            />
          </div>
          <div>
            <FormikControl
              placeholder={"Select Contract"}
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
              placeholder={"Select Status"}
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
            gridActions={actions}
            onRowClick={(data: any) => navigateToViewMode(data)}
            showLoader={loading}
            loaderColSpan={10}
            renderRowList={paymentRenderData}
            currentPage={page}
            entriesPerPage={perPage}
            onEntriesPerPageChange={setPerPage}
            onPageChange={setPage}
            totalEntries={totalRows}
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
            </div>
          </article>
        </dialog>
      )}
    </div>
  );
};

export default PayApps;
