"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getCookie } from "cookies-next";
import { useDispatch } from "react-redux";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import {
  PAYMENT_OPTIONS,
  tabOptions,
  PdfheaderNames,
  PAYMENT_CLAIM_OPTIONS,
  paymentRenderData,
  linkOptions,
  overviewModeType,
} from "./PaymentList.constants";
import { fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList } from "@/app/api/commonApi";
import { ListAllPaymentsInput } from "../PaymnetsToDo/paymentToDoList.functions";
import { PaymentData } from "../PaymnetsToDo/paymentToDoList.types";
import { connectWebSocket, convertPositiveDecimalTwoDigit } from "@/utils";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import DynamicTable from "@/components/Table";
import {
  buttonType,
  filterByDuration,
  InputType,
  VIEW,
  VIEW_ARCHIVE,
} from "@/shared/constant/general";
import FormikControl from "@/components/FormikControl";
import BreadCrumbs from "@/components/BreadCrumbs";
import { AppRoutes } from "@/shared/constant/appRoutes";
import GridExportActions from "@/components/GridExportActions";
import TabSwitch from "@/components/TabSwitch";
import { showErrorToast } from "@/components/Toaster";
import BaseModal from "@/components/BaseModal";
import { DeletePayments } from "../BankAccountOverview/BankAccountsOverview.function";
import { tabId } from "../ClientsAndSuppliers/ClientsAndSuppliersList/clientsAndSuppliers.constant";
import { DD_MM_YYYY } from "@/shared/constant/identificationNumbers";
import { contractOverviewTabs } from "../ContractOverview/ContractOverview.constants";
import { projectOverviewTabs } from "../Projects/ProjectOverview/ProjectOverview.constant";
import { format, isValid } from "date-fns";

interface RowData {
  id: string;
  type: string;
  amount: string;
  fromAccount: string;
  toAccountName: string;
  toAccountNumber: string;
  toAccountBSB: string;
  status: string;
}

export default function PaymentLists({ overViewDetails = {} }: any) {
  const {
    isArchived = false,

    overViewType,
  } = overViewDetails;
  const dispatch = useDispatch();
  const router = useRouter();
  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const searchParams = useSearchParams();
  const claimId = searchParams?.get("partclaimid");
  const [loading, setLoading] = useState<boolean>(false);
  // State to track if user has manually typed something
  const [userTypedSearch, setUserTypedSearch] = useState(false);
  const [tempselectedDate, setTempSelectedDate] = useState<any>();
  const [displayDatePopup, setDisplayDatePopup] = useState(false); // State to control the popup
  const [searchValue, setSearchValue] = useState("");
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [paymentsListData, setPaymentsListData] = useState<any[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [openDeleteModal, setDeleteOpenModal] = useState(false);
  const [sortValues, setSortValues] = useState<any>("");

  const [actionData, setActionData] = useState<any>();
  const [emptySearchField, setEmptySearchField] = useState(false);
  const [printDocumentData, setPrintDocumentData] = useState<any>([]);
  const [activityDate, setActivityDate] = useState("");
  const [singleActivyDate, setSingleActivyDate] = useState<any>({
    value: "All",
    label: "All dates",
  });
  const [activityLogStartDate, setActivityLogStartDate] = useState<
    Date | null | any
  >(new Date().toISOString().split("T")[0]);
  const [activityLogEndDate, setActivityLogEndDate] = useState<
    Date | null | any
  >(new Date().toISOString().split("T")[0]);
  const [isCustomDate, setIsCustomDate] = useState(false);

  const [selectedToggle, setSelectedToggle] = useState<string | null>("All");

  const [selectedPayment, setSelectedPayment] = useState<any>();
  const [paymentType, setPaymentType] = useState("");

  const [selectedClaim, setSelectedClaim] = useState<any>();
  const [claimType, setClaimType] = useState("");
  const [datePopupAcknowledged, setDatePopupAcknowledged] = useState(false);

  const [projectOpt, setProjectOpt] = useState<any>([]);
  const [selectedProject, setSelectedProject] = useState<any>();
  const [projectId, setProjectId] = useState("");
  const [contractOpt, setContractOpt] = useState<any>([]);
  const [selectedContract, setSelectedContract] = useState<any>();
  const [contractId, setContractId] = useState("");
  const [clientsOpt, setClientsOpt] = useState<any>([]);
  const [selectedClient, setSelectedClient] = useState<any>();
  const [clientId, setClientId] = useState("");
  const [activeTab, setActiveTab] = useState(tabOptions[0].label);
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);

  // Constant to check if any filter is applied
  const isAnyFilterActive = Boolean(
    paymentType ||
      claimType ||
      projectId ||
      contractId ||
      clientId ||
      searchValue !== "" ||
      activityDate !== ""
  );

  const resetFilters = () => {
    setEmptySearchField(true);
    setSelectedPayment(null);
    setPaymentType("");
    setSelectedClaim(null);
    setClaimType("");
    setSelectedProject(null);
    setProjectId("");
    setSelectedContract(null);
    setContractId("");
    setSelectedClient(null);
    setClientId("");
    setSingleActivyDate({ value: "All", label: "All" }); // Reset Activity Range filter
    setActivityDate(""); // Reset activityDate state
    setIsCustomDate(false); // Reset custom date state
    const today = new Date().toISOString().split("T")[0];
    setActivityLogStartDate(today); // Reset start date to today
    setActivityLogEndDate(today); // Reset end date to today
  };

  useEffect(() => {
    dispatch(setScreenDetails({}));

    const fetchFilterOptions = async () => {
      const filterPayload = {
        project_id:
          Number(projectId) || overViewDetails?.data?.project_id || null,
        contract_id:
          Number(contractId) || overViewDetails?.data?.contract_id || null,
        client_supplier_id: clientId ? +clientId : null,
        company_id: selectedCompanyId || null,
      };

      // Fetch the filter options for projects, contracts, and client suppliers
      const filterData =
        await fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList(
          filterPayload
        );

      if (filterData) {
        // Set Project Options
        if (filterData?.projects && filterData?.projects.length > 0) {
          const projectOptions = [
            { label: "All", value: "" },
            ...filterData.projects.map((project: any) => ({
              label: project.project_name,
              value: project.project_id,
            })),
          ];
          setProjectOpt(projectOptions);
        }

        // Set Client Supplier Options
        if (
          filterData?.clientSuppliers &&
          filterData?.clientSuppliers.length > 0
        ) {
          const clientSupplierOptions = [
            { label: "All", value: "" },
            ...filterData.clientSuppliers.map((client: any) => ({
              label: client.client_supplier_name,
              value: client.client_supplier_id,
            })),
          ];
          setClientsOpt(clientSupplierOptions);
        }

        // Set Contract Options
        if (filterData?.contracts && filterData?.contracts.length > 0) {
          const contractOptions = [
            { label: "All", value: "" },
            ...filterData.contracts.map((contract: any) => ({
              label: contract.contract_name,
              value: contract.contract_id,
            })),
          ];
          setContractOpt(contractOptions);
        }
      }
    };

    fetchFilterOptions();
  }, [selectedCompanyId, projectId, contractId, clientId]);

  useEffect(() => {
    setPage(1); // Reset to the first page
  }, [
    activeTab,
    selectedToggle,
    paymentType,
    projectId,
    contractId,
    claimType,
    clientId,
    activityDate,
    activityLogEndDate,
    activityLogStartDate,
  ]);

  useEffect(() => {
    getPaymentsListData(page, perPage);
  }, [
    activeTab,
    selectedToggle,
    paymentType,
    projectId,
    contractId,
    claimType,
    clientId,
    page,
    perPage,
    sortValues,
    searchValue,
    activityDate,
    activityLogEndDate,
    activityLogStartDate,
  ]);

  const truncateText = (text: any, maxLength = 25) => {
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  };

  async function getPaymentsListData(page: number, rowsPerPage: number) {
    setLoading(true);
    if (emptySearchField) {
      setEmptySearchField(false);
    }
    setPaymentsListData([]);

    const searchParam = userTypedSearch
      ? searchValue // user typed something, override claimId
      : claimId ?? searchValue ?? "";

    const adminUserList = await ListAllPaymentsInput(
      {
        payment_type: paymentType === "All" ? "" : paymentType || "",
        company_id: selectedCompanyId,
        page_number: page,
        page_size: rowsPerPage,
        status: activeTab === "Archived" ? "Void" : null,
        // is_paid_confirmed: false,
        project_id:
          Number(projectId) || overViewDetails?.data?.project_id || null,
        contract_id:
          Number(contractId) || overViewDetails?.data?.contract_id || null,
        cash_retention_type: claimType || null,
        claim_type: selectedToggle === "All" ? "" : selectedToggle,
        client_supplier_id: clientId ? +clientId : null,
        search: searchParam ?? "",
        sorting_field: sortValues?.sortKey || "",
        sorting_order: sortValues?.direction || "",
        date_filter: activityDate === "All dates" ? null : activityDate,
        start_date: isCustomDate ? activityLogStartDate : null,
        end_date: isCustomDate ? activityLogEndDate : null,
      },
      setLoading
    );
    setTotalRows(adminUserList?.total_count || 0);
    setPerPage(rowsPerPage);
    let printDataObjCreation = adminUserList?.payments?.map(
      (user: PaymentData) => {
        return {
          ...user,
          payment_type: user?.payment_type || "",
          project_name: user?.project_name || "",
          contract_name: user?.contract_name || "",
          payment_from_account_name: user?.payment_from_account_name || "",
          payment_to_account_name: user?.payment_to_account_name || "",
          payment_amount: `$ ${
            user?.payment_amount
              ? convertPositiveDecimalTwoDigit(user?.payment_amount, true)
              : "0.00"
          }`,
          list_status: truncateText(user?.list_status) || "",
          payment_id: user?.payment_id || "",
        };
      }
    );

    setPrintDocumentData(printDataObjCreation);
    setPaymentsListData(printDataObjCreation || []);
    setDisableExcelBtn(false);
  }

  const handlePaymentTypeChage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setSelectedToggle(event.target.value);
  };

  const handlePaymentChange = (selectedValue: any) => {
    setPaymentType(selectedValue);
    setSelectedPayment(selectedValue);
  };

  const handleClaimChange = (selectedValue: any) => {
    setClaimType(selectedValue);
    setSelectedClaim(selectedValue);
  };

  const handleProjectChange = (selectedValue: any) => {
    setProjectId(selectedValue);
    setSelectedProject(selectedValue);
  };

  const handleContractChange = (selectedValue: any) => {
    setContractId(selectedValue);
    setSelectedContract(selectedValue);
  };

  const handleClientsChange = (selectedValue: any) => {
    setClientId(selectedValue);
    setSelectedClient(selectedValue);
  };

  function onProjectOverview() {
    if (overViewType == overviewModeType.PROJECTS) {
      dispatch(
        setScreenDetails({
          fromScreen: "projectOverview",
          toScreen: "payments",
          mainActiveTab: projectOverviewTabs.PAYMENTS,
        })
      );
    }
  }

  const actions = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      style: buttonType.PRIMARY,
      onClick: (row: RowData) => {
        onProjectOverview();
        navigateToViewPage(row);
      },
      conditionalApiDisplayKey: "view",
    },
    {
      label: "Delete",
      style: "contrast",
      icon: "fa-light fa-trash",
      onClick: (row: RowData) => {
        setActionData({ ...row, option: "Deleted" });
        setDeleteOpenModal(true);
      },
      conditionalApiDisplayKey: "delete",
    },
  ];

  function navigateToViewPage(rowData: any) {
    const dynamicRoute = `${AppRoutes.USER_ADD_PAYMENT}?claim=${
      rowData?.payment_claim_id
    }&mode=${isArchived ? VIEW_ARCHIVE : VIEW}&payment=${rowData?.payment_id}`;

    const isNormalPaymentType = [
      "Full",
      "Part",
      "Pay Less - Full",
      "Pay Less - Part",
      "Pay - Zero",
      "3rd Party",
    ].includes(rowData?.payment_type);

    if (overViewDetails?.overViewMode) {
      if (overViewDetails?.screenName == "contracts") {
        dispatch(
          setScreenDetails({
            fromScreen: "contractsOverview",
            toScreen: "payments",
            mainActiveTab: contractOverviewTabs.PAYMENTS,
          })
        );
      }
      router.push(
        `${dynamicRoute}&overview=${overViewDetails?.data?.id}&from=${tabId.PAYMENTS}&overview-type=${overViewDetails?.screenName}`
      );
      isNormalPaymentType
        ? ""
        : router.push(
            `${AppRoutes.USER_VIEW_INTEREST_CHARGES_OTHER_PAYMENT}/${rowData?.payment_id}`
          );
    } else
      isNormalPaymentType
        ? router.push(dynamicRoute)
        : router.push(
            `${AppRoutes.USER_VIEW_INTEREST_CHARGES_OTHER_PAYMENT}/${rowData?.payment_id}`
          );
  }

  const deletePayment = async (paymentId: string | undefined) => {
    if (!paymentId) return;

    const payload = {
      payment_id: paymentId,
      status: "Deleted",
      input_date: tempselectedDate ? new Date(tempselectedDate) : null,
    };

    const response = await DeletePayments(payload);

    if (response) {
      // After deletion, fetch updated data
      await getPaymentsListData(page, perPage);
    }
  };

  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "payment",
        payment_type: paymentType === "All" ? null : paymentType || null,
        company_id: selectedCompanyId,
        status: activeTab === "Archived" ? "Void" : null,
        project_id:
          Number(projectId) || overViewDetails?.data?.project_id || null,
        contract_id:
          Number(contractId) || overViewDetails?.data?.contract_id || null,
        cash_retention_type: claimType || null,
        claim_type: selectedToggle === "All" ? null : selectedToggle,
        client_supplier_id: clientId ? +clientId : null,
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
        screen_name: "payment",
        payment_type: paymentType === "All" ? null : paymentType || null,
        company_id: selectedCompanyId,
        status: activeTab === "Archived" ? "Void" : null,
        project_id:
          Number(projectId) || overViewDetails?.data?.project_id || null,
        contract_id:
          Number(contractId) || overViewDetails?.data?.contract_id || null,
        cash_retention_type: claimType || null,
        claim_type: selectedToggle === "All" ? null : selectedToggle,
        client_supplier_id: clientId ? +clientId : null,
      });
      setDisablePDFBtn(false);
    } catch (error) {
      console.error(error, "outside loop");
    } finally {
      setDisablePDFBtn(false);
    }
  };

  function handleDatePopupConfirm() {
    if (!tempselectedDate) {
      console.warn("Please select a date before confirming."); // Handle missing date
      return;
    }

    setDatePopupAcknowledged(true); // Mark popup as acknowledged
    setDisplayDatePopup(false); // Close the popup
    deletePayment(actionData?.payment_id); // Proceed with deletion
  }

  const handleModalPopUpFunction = async () => {
    setDeleteOpenModal(!openDeleteModal);

    if (actionData?.option === "Deleted") {
      const paymentType = actionData?.payment_type;

      // List of payment types that require a date input popup
      const paymentTypesRequiringPopup = [
        "Pay Less - Full",
        "Pay Less - Part",
        "Pay - Zero",
        "pay 3rd party only",
        "3rd Party",
        null,
      ];

      const userMode = localStorage.getItem("userMode");

      // If popup conditions are met, show the date input popup
      if (
        !datePopupAcknowledged &&
        userMode !== "Normal" &&
        paymentTypesRequiringPopup.includes(paymentType)
      ) {
        setDisplayDatePopup(true);
      } else {
        // Call the new function to handle deletion
        await deletePayment(actionData?.payment_id);
      }
    }
  };

  function handleSearch(searchedValue: any) {
    setUserTypedSearch(true);
    if (page != 1) {
      setPerPage(1);
    }
    if (perPage != 10) {
      setPerPage(10);
    }
    setSearchValue(searchedValue);
  }

  function handleActivityChange(selectedValue: any) {
    setSingleActivyDate(selectedValue);
    if (selectedValue === "Custom") {
      setIsCustomDate(true);
    } else {
      setIsCustomDate(false);
    }
    setActivityDate(selectedValue); // Perform any other actions based on the selected value
  }

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
              activeRoute={"Payments List"}
            />
          </div>
        )}
        <div className="grid pt_topfilters">
          {!overViewDetails?.overViewMode && (
            <div className="pt_pagetitle">
              <h1>Payments list</h1>
            </div>
          )}

          <div className="pt_pageactions">
            <button className="secondary" onClick={() => setOpenModal(true)}>
              <i className="fa-light fa-hexagon-plus"></i>Add payment
            </button>
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
                  onChange={(value: any) => setActiveTab(value)}
                />
              </div>
            )}
          </div>
          <div className="pt_pageactions">
            <div className="actionbuttons">
              <GridExportActions
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
        <div className="pt_toggles pt_filters">
          <fieldset>
            <input
              type="radio"
              id="payments"
              name="paymentstype"
              value="All"
              checked={selectedToggle === "All"}
              onChange={handlePaymentTypeChage}
            />
            <label htmlFor="claims">All</label>

            <input
              type="radio"
              id="receivable"
              name="paymentstype"
              value="Receivable"
              checked={selectedToggle === "Receivable"}
              onChange={handlePaymentTypeChage}
            />
            <label htmlFor="Receivable">Receivable</label>

            <input
              type="radio"
              id="billable"
              name="paymenttype"
              value="Billable"
              checked={selectedToggle === "Billable"}
              onChange={handlePaymentTypeChage}
            />
            <label htmlFor="Billable">Billable</label>
          </fieldset>
        </div>
        <div className="pt_filteroptions">
          <FormikControl
            control={InputType.SEARCH}
            onChange={(value: any) => handleSearch(value)}
            placeholder="Search"
            clearSearch={emptySearchField}
            value={
              userTypedSearch
                ? searchValue // user typed something, override claimId
                : claimId ?? searchValue ?? ""
            }
          />

          <FormikControl
            placeholder={"Select a payment type"}
            name="Pyment Type"
            options={PAYMENT_OPTIONS}
            onChange={handlePaymentChange}
            control={InputType.SELECT}
            value={selectedPayment}
            renderKey="label"
            valueKey="value"
          />

          <FormikControl
            placeholder={"Select a  payment claim type"}
            name="Payment Claim Type"
            options={PAYMENT_CLAIM_OPTIONS}
            onChange={handleClaimChange}
            control={InputType.SELECT}
            value={selectedClaim}
            renderKey="label"
            valueKey="value"
          />

          {!overViewDetails?.overViewMode && (
            <FormikControl
              placeholder={"Select a project"}
              name="Project"
              options={projectOpt}
              onChange={handleProjectChange}
              control={InputType.SELECT}
              value={selectedProject}
              renderKey="label"
              valueKey="value"
            />
          )}
        </div>
        <div className="pt_filteroptions">
          {!overViewDetails?.overViewMode && (
            <FormikControl
              placeholder={"Select a contract"}
              name="Contract"
              options={contractOpt}
              onChange={handleContractChange}
              control={InputType.SELECT}
              value={selectedContract}
              renderKey="label"
              valueKey="value"
            />
          )}

          <FormikControl
            placeholder={"Select a client/supplier"}
            naem="Clients/Suppliers"
            options={clientsOpt}
            onChange={handleClientsChange}
            control={InputType.SELECT}
            value={selectedClient}
            renderKey="label"
            valueKey="value"
          />
          <FormikControl
            placeholder={"Activity Range"}
            name="Activity Range"
            options={filterByDuration}
            onChange={handleActivityChange}
            control={InputType.SELECT}
            value={singleActivyDate}
            renderKey="label"
            valueKey="value"
          />
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
                  activityLogStartDate &&
                  isValid(new Date(activityLogStartDate))
                    ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
                    : ""
                }
                onChange={(selectedDate: any) => {
                  if (!selectedDate) {
                    setActivityLogStartDate(null);
                    return;
                  }

                  if (selectedDate > activityLogEndDate) {
                    setActivityLogStartDate(selectedDate);
                    // setActivityLogEndDate(selectedDate);
                    setActivityLogEndDate(new Date(selectedDate));
                  } else {
                    setActivityLogStartDate(selectedDate);
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

                  // Ensure end date is not before start date
                  if (selectedDate >= activityLogStartDate) {
                    setActivityLogEndDate(selectedDate);
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
      </div>
      <div className="grid">
        <div className="pt_box">
          <div className="grid">
            <h4>{activeTab || "Current"}</h4>
          </div>

          <DynamicTable
            headers={PdfheaderNames}
            gridData={paymentsListData.length > 0 ? paymentsListData : []}
            gridActions={actions}
            onRowClick={(data: any) => {
              navigateToViewPage(data);
            }}
            showLoader={loading}
            dynamicApiGridIconsKey={"payment_list_buttons"}
            loaderColSpan={10}
            renderRowList={paymentRenderData}
            currentPage={page}
            entriesPerPage={perPage}
            onEntriesPerPageChange={setPerPage}
            onPageChange={setPage}
            totalEntries={totalRows}
            hoverOnRowClick
            onSortChange={(sortConfig) => {
              setSortValues(sortConfig);
            }}
          />
        </div>
      </div>

      {openModal && (
        <BaseModal
          modalId={"selectPaymentTypes"}
          displayModal={openModal}
          title="Select payment type"
          onHeaderIconClose={() => setOpenModal(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setOpenModal(false)}
          onConfirm={() => {
            return true;
          }}
          hideFooter
          customOptionsForModal={linkOptions}
          isPaymentType
        />
      )}
      {openDeleteModal && (
        <BaseModal
          displayModal={openDeleteModal}
          onClose={() => setDeleteOpenModal(false)}
          firstButtonName="No"
          secondButtonName="Yes"
          onConfirm={() => {
            handleModalPopUpFunction();
            return true;
          }}
        >
          <p className="text_center">
            Are you sure you wish to move this Payment to the archive?
          </p>
        </BaseModal>
      )}
      {displayDatePopup && (
        <dialog id="date-input-popup" open>
          <article>
            <header>
              <div className="mb_1">
                <button
                  rel="prev"
                  aria-label="Close"
                  onClick={() => setDisplayDatePopup(false)}
                ></button>
              </div>
            </header>

            <p>
              Only for onboarding mode for related transactions requiring the
              input date. Please input the required input date which will be
              input into your journal records if different from today.
            </p>

            <div style={{ marginTop: "1rem" }}>
              <FormikControl
                control={InputType.DATE_PICKER}
                required
                label={"Select input date"}
                // showError={
                //   formik.touched.input_date && formik.errors.input_date
                // }
                selected={tempselectedDate}
                onChange={(selectedDate: string) => {
                  setTempSelectedDate(selectedDate);
                }}
                // error={formik.touched.input_date && formik.errors.input_date}
                format={DD_MM_YYYY}
                value={tempselectedDate}
                minDate={
                  actionData?.Inputdate ? new Date(actionData.Inputdate) : null
                }
                // disabled={isViewMode}
              />
            </div>

            <footer>
              <button
                className="secondary"
                type="button"
                onClick={() => setDisplayDatePopup(false)}
              >
                Close
              </button>
              <button
                className="primary"
                type="button"
                onClick={() => {
                  if (tempselectedDate) {
                    handleDatePopupConfirm(); // Save action only if a date is selected
                  } else {
                    console.warn("Please select a date before saving.");
                  }
                }}
              >
                Save
              </button>
            </footer>
          </article>
        </dialog>
      )}
    </div>
  );
}
