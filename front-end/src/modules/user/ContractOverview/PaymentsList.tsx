"use client";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCookie } from "cookies-next";
import { useDispatch } from "react-redux";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import { fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList } from "@/app/api/commonApi";
import { ListAllPaymentsInput } from "../PaymnetsToDo/paymentToDoList.functions";
import { PaymentData } from "../PaymnetsToDo/paymentToDoList.types";
import { convertPositiveDecimalTwoDigit } from "@/utils";
import { downloadExcelFileFromAPI, GenerateSignedUrl } from "@/utils/export";
import DynamicTable from "@/components/Table";
import { InputType, VIEW, VIEW_ARCHIVE } from "@/shared/constant/general";
import FormikControl from "@/components/FormikControl";
import { AppRoutes } from "@/shared/constant/appRoutes";
import GridExportActions from "@/components/GridExportActions";

import { showErrorToast } from "@/components/Toaster";
import {
  ActionItem,
  PAYMENT_CLAIM_OPTIONS,
  PAYMENT_OPTIONS,
  paymentRenderData,
  PdfheaderNames,
  tabOptions,
} from "../PaymentsList/PaymentList.constants";

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

const Payments = (props: any) => {
  const { isArchived = false, overViewDetails = {} } = props;
  const dispatch = useDispatch();
  const routePath = usePathname();
  const router = useRouter();
  const selectedCompanyId = Number(getCookie("companyId")) || 0;

  const [loading, setLoading] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [paymentsListData, setPaymentsListData] = useState<any[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [actionData, setActionData] = useState<any>();
  const [popupMessage, setPopupMessage] = useState({
    headerMsg: "",
    subHeaderMsg: "",
  });
  const [printDocumentData, setPrintDocumentData] = useState<any>([]);

  const [selectedToggle, setSelectedToggle] = useState<string | null>("All");

  const [selectedPayment, setSelectedPayment] = useState<any>();
  const [paymentType, setPaymentType] = useState("");

  const [selectedClaim, setSelectedClaim] = useState<any>();
  const [claimType, setClaimType] = useState("");

  const [projectOpt, setProjectOpt] = useState<any>([]);
  const [selectedProject, setSelectedProject] = useState<any>();
  const [projectId, setProjectId] = useState("");
  const [contractOpt, setContractOpt] = useState<any>([]);
  const [selectedContract, setSelectedContract] = useState<any>();
  const [contractId, setContractId] = useState("");
  const [clientsOpt, setClientsOpt] = useState<any>([]);
  const [selectedClient, setSelectedClient] = useState<any>();
  const [clientId, setClientId] = useState("");
  const [activeTab, setActiveTab] = useState(tabOptions[0].id);
  const [popoverActions, setPopoverActions] = useState<ActionItem[]>([]);
  const [actionLoader, setActionLoader] = useState(false);
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);

  // Constant to check if any filter is applied
  const isAnyFilterActive = Boolean(
    paymentType || claimType || projectId || contractId || clientId
  );

  const resetFilters = () => {
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
  ]);

  const truncateText = (text: any, maxLength = 25) => {
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  };

  const getPaymentsListData = async (page: number, rowsPerPage: number) => {
    setLoading(true);
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
          payment_from_account: user?.payment_from_account_name || "",
          payment_to_account: user?.payment_to_account_name || "",
          payment_amount: `$ ${
            user?.payment_amount
              ? convertPositiveDecimalTwoDigit(user?.payment_amount)
              : " 0.00"
          }`,
          status: truncateText(user?.list_status) || "",
          payment_id: user?.payment_id || "",
        };
      }
    );

    setPrintDocumentData(printDataObjCreation);
    setPaymentsListData(printDataObjCreation || []);
    setDisableExcelBtn(false);
  };

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

  const handleThreeDotsClick = async (row: PaymentData) => {
    //   setPopoverActions([]);
    //   setActionLoader(true);
    //   try {
    //     const Payload = {
    //       payment_id: row?.payment_id,
    //     };
    //     const response = await getListActionButtons(Payload);
    //     if (response && response?.payment_list_buttons) {
    //       const newPopoverActions = [
    //         { label: "View", value: "View" },
    //         ...(response.payment_list_buttons.delete
    //           ? [{ label: "Delete", value: "Delete", isDelete: true }]
    //           : []),
    //       ];
    //       // Update popoverActions state with fetched actions
    //       setPopoverActions(newPopoverActions);
    //     } else {
    //       // Handle case where response is null or does not contain expected data
    //       console.error("Failed to fetch action buttons");
    //     }
    //     setActionLoader(false);
    //   } catch (error) {
    //     setActionLoader(false);
    //   }
  };

  const actions = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      onClick: (row: RowData) => {
        console.log("Viewing row:", row);
        navigateToViewPage(row);
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

  const Archivedactions = [
    {
      label: "View",
      icon: "fa-light fa-inbox",
      onClick: (row: RowData) => {
        console.log("Viewing row:", row);
        navigateToViewPage(row);
      },
    },
    {
      label: "Delete",
      style: "contrast",
      icon: "fa-light fa-folder-xmark",
      onClick: (row: RowData) => {
        console.log("Claiming for row:", row);
      },
    },
  ];

  // Conditionally filter actions
  const modifiedActions = activeTab === "Archived" ? Archivedactions : actions;

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
      // router.push(
      //   `${dynamicRoute}&overview=${overViewDetails?.data?.id}&from=${tabId.PAYMENTS}&overview-type=${overViewDetails?.screenName}`
      // );
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

  return (
    <div className="container-fluid">
      <div className="pt_filtergroup">
        <div className="grid pt_topfilters">
          <div className="pt_filters">
            <div role="group"></div>
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
          <div>
            <FormikControl
              placeholder={"Payment Type"}
              name="Pyment Type"
              options={PAYMENT_OPTIONS}
              onChange={handlePaymentChange}
              control={InputType.SELECT}
              value={selectedPayment}
              renderKey="label"
              valueKey="value"
            />
          </div>
          <div>
            <FormikControl
              placeholder={"Payment Claim Type"}
              name="Payment Claim Type"
              options={PAYMENT_CLAIM_OPTIONS}
              onChange={handleClaimChange}
              control={InputType.SELECT}
              value={selectedClaim}
              renderKey="label"
              valueKey="value"
            />
          </div>
          <div>
            <FormikControl
              placeholder={"Select Project"}
              name="Project"
              options={projectOpt}
              onChange={handleProjectChange}
              control={InputType.SELECT}
              value={selectedProject}
              renderKey="label"
              valueKey="value"
            />
          </div>
          <div>
            <FormikControl
              placeholder={"Select Contract"}
              name="Contract"
              options={contractOpt}
              onChange={handleContractChange}
              control={InputType.SELECT}
              value={selectedContract}
              renderKey="label"
              valueKey="value"
            />
          </div>
          <div>
            <FormikControl
              placeholder={"Clients/Suppliers"}
              naem="Clients/Suppliers"
              options={clientsOpt}
              onChange={handleClientsChange}
              control={InputType.SELECT}
              value={selectedClient}
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
            headers={PdfheaderNames}
            gridData={paymentsListData.length > 0 ? paymentsListData : []}
            gridActions={modifiedActions}
            onRowClick={(data: any) => {
              navigateToViewPage(data);
            }}
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
    </div>
  );
};

export default Payments;
