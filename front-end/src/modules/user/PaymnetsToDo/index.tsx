"use client";
import { getCookie } from "cookies-next";
import { Fragment, useEffect, useState } from "react";
import { PaymentData } from "./paymentToDoList.types";
import {
  tabOptions,
  ExcelColumnNames,
  filter_paid_options,
  paymentRenderData,
  toDoHeaderNames,
  myActivityHeaderNames,
  abaPaymentRenderData,
} from "./paymentToDoList.constant";
import { fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList } from "@/network/apolloClient";
import {
  editDetailsOfAPayment,
  fetchABAFileHistoryList,
  fetchAllPaymentsList,
  TriggerPaymentNotices,
} from "./paymentToDoList.functions";
import {
  connectWebSocket,
  convertPositiveDecimalTwoDigit,
  formatDate,
  getCompanyIdFromStorage,
} from "@/utils";
import BreadCrumbs from "@/components/BreadCrumbs";
import GridExportActions from "@/components/GridExportActions";
import { AppRoutes } from "@/shared/constant/appRoutes";
import TabSwitch from "@/components/TabSwitch";
import FormikControl from "@/components/FormikControl";
import {
  buttonType,
  currencySymbol,
  InputType,
  PAYMENT_TYPES,
} from "@/shared/constant/general";
import DynamicTable from "@/components/Table";
import {
  downloadABAFile,
  downloadExcelFileFromAPI,
  GenerateABAfiles,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";
import BaseModal from "@/components/BaseModal";
import { useRouter } from "next/navigation";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import { useDispatch } from "react-redux";
import { useLoaderContext } from "@/context/useLoader";
import {
  SendMailForNotices,
  SendQbccMailForNotices,
} from "../AddUpdateBankAccount/AddUpdateBankAccount.function";
import CustomButton from "@/components/CustomButton/CustomButton";
import { getSubscriptionDetailsByCompanyId } from "../Subscriptions/subscriptions.function";

const AUTO_CLOSE_TIME = 30;

export default function PaymentToDoList({ overViewDetails }: any) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { setLoader, loader, setLoaderInfo }: any = useLoaderContext();

  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const [selectedValue, setSelectedValue] = useState("");
  const [loading, setLoading] = useState<boolean>(false);
  const [abaGenerationAllowed, setAbaGenerationAllowed] = useState<
    boolean | null
  >(null);
  const [sortValues, setSortValues] = useState<any>("");
  const [modalHeading, setModalHeading] = useState<string>("");
  const [modalBodyContent, setModalBodyContent] = useState<string>("");
  const [openPlanModal, setOpenPlanModal] = useState<boolean>(false);

  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [paymentsListData, setPaymentsListData] = useState<PaymentData[]>([]);
  const [singleSelectedData, setSingleSelectedData] = useState({
    label: "All",
    value: "",
  });
  const [openModal, setOpenModal] = useState(false);
  const [selectedFromAcc, setSelectedFromAcc] = useState<any>();
  const [fromAccOpt, setFromAccOpt] = useState<any>([]);
  const [actionData, setActionData] = useState<any>();
  const [popupMessage, setPopupMessage] = useState({
    headerMsg: "",
    subHeaderMsg: "",
  });
  const [printDocumentData, setPrintDocumentData] = useState<any>([]);
  const [projectOpt, setProjectOpt] = useState<any>([]);
  const [selectedProject, setSelectedProject] = useState<any>();
  const [projectId, setProjectId] = useState("");
  const [contractOpt, setContractOpt] = useState<any>([]);
  const [selectedContract, setSelectedContract] = useState<any>();
  const [contractId, setContractId] = useState("");
  const [activeTab, setActiveTab] = useState(tabOptions[0].id);
  const [fromAccId, setFromAccId] = useState("");
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);
  const [disableAbaFileBtn, setDisableAbaFileBtn] = useState(false);
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  const [abcaWarning, setAbcaWarning] = useState<any>({});
  const [abaMarkAsPaid, setAbaMarkAsPaid] = useState<null | boolean>(null);
  const [showNoticePopup, setShowNoticePopup] = useState(false);
  const [noticeFiles, setNoticeFiles] = useState<any[]>([]);
  const [noticeMailUuids, setNoticeMailUuids] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE_TIME);
  const [qbccNoticeFiles, setQbccNoticeFiles] = useState<any[]>([]);
  const [qbccNoticeUuids, setQbccNoticeUuids] = useState<string[]>([]);

  const resetFilters = () => {
    setSelectedProject(null);
    setSelectedContract(null);
    setSelectedFromAcc(null);

    setSingleSelectedData({
      label: "All",
      value: "",
    });
    setSelectedValue("");
    setProjectId("");
    setContractId("");
    setFromAccId("");
  };

  const isAnyFilterActive =
    selectedProject ||
    selectedContract ||
    selectedValue ||
    selectedFromAcc ||
    projectId ||
    contractId ||
    fromAccId;

  // 1️⃣ Fetch subscription on component mount or when needed
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const subscriptionResponse = await getSubscriptionDetailsByCompanyId();
        // ⭐ NEW: Check free plan eligibility
        const isFreePlanEligible =
          subscriptionResponse?.is_free_plan_eligible === true;
        // 🔹 Check ABA generation
        const abaItem =
          subscriptionResponse?.plan_items?.find(
            (item: any) => item.item_name === "ABA Generation"
          ) || null;

        let isAbaAllowed =
          abaItem && String(abaItem.limit_value).toLowerCase() === "true";
        // setAbaGenerationAllowed(!!isAbaAllowed);
        // ⭐ OVERRIDE: If free plan → always allow ABA
        if (isFreePlanEligible) {
          isAbaAllowed = true;
        }

        // Final apply
        setAbaGenerationAllowed(!!isAbaAllowed);
      } catch (error) {
        console.error("Error fetching subscription:", error);
        setAbaGenerationAllowed(false);
      } finally {
        setLoader(false);
        setLoaderInfo("");
      }
    };

    fetchSubscription();
  }, []);
  // Reset timer when popup opens
  useEffect(() => {
    if (
      showNoticePopup &&
      (noticeFiles?.length > 0 || qbccNoticeFiles?.length > 0)
    ) {
      setTimeLeft(AUTO_CLOSE_TIME);
    }
  }, [showNoticePopup]);

  // Countdown effect
  useEffect(() => {
    if (!showNoticePopup) return;

    // 👉 Simulate confirm (same as clicking "Send Mail")
    if (timeLeft === 0) {
      const modal = document.getElementById(
        "Generated Notices"
      ) as HTMLDialogElement;

      if (modal) {
        const confirmBtn = modal.querySelector(
          "footer button:last-child"
        ) as HTMLButtonElement; // last button = confirm
        confirmBtn?.click();
      }
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, showNoticePopup]);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      const filterPayload = {
        project_id: Number(selectedProject) || null,
        contract_id: Number(selectedContract) || null,
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
            { label: "All", value: null },
            ...filterData.projects.map((project: any) => ({
              label: project.project_name,
              value: project.project_id,
            })),
          ];
          setProjectOpt(projectOptions);
        }
        // Set Contract Options
        if (filterData?.contracts && filterData?.contracts.length > 0) {
          const contractOptions = [
            { label: "All", value: null },
            ...filterData.contracts.map((contract: any) => ({
              label: contract.contract_name,
              value: contract.contract_id,
            })),
          ];
          setContractOpt(contractOptions);
        }
        if (filterData?.fromAccounts && filterData?.fromAccounts.length > 0) {
          const accountsOptions = [
            { label: "All", value: null },
            ...filterData.fromAccounts.map((account: any) => ({
              label: account.from_account_name,
              value: account.from_account_id,
            })),
          ];
          setFromAccOpt(accountsOptions);
        } else {
          setFromAccOpt([]);
        }
      }
    };

    fetchFilterOptions();
  }, [selectedCompanyId, selectedProject, selectedContract]);

  useEffect(() => {
    setPage(1); // Reset to the first page
    setSelectedProject(""); // Reset selected project filter
    setSelectedContract(""); // Reset selected contract filter
    setSingleSelectedData({ label: "All", value: "" }); // Reset status filter
    setSelectedValue(""); // Reset other filters (e.g., Status filter)
  }, [activeTab]);

  useEffect(() => {
    if (activeTab == tabOptions[2].label) {
      getABAFileHistoryList(page, perPage);
    } else {
      getListAllAdminUsers(page, perPage);
    }
  }, [
    activeTab,
    selectedContract,
    selectedProject,
    selectedValue,
    page,
    perPage,
    fromAccId,
    sortValues,
  ]);

  const getListAllAdminUsers = async (page: number, rowsPerPage: number) => {
    setLoading(true);
    const adminUserList = await fetchAllPaymentsList(
      {
        page_size: rowsPerPage,
        page_number: page,
        company_id: selectedCompanyId || null,
        sub_payment_type: "ToDo",
        bank_account_id:
          +overViewDetails?.data?.bank_account_id || Number(fromAccId) || null,
        project_id: Number(selectedProject) || null,
        contract_id: Number(selectedContract) || null,
        status: "Unmatched",
        is_confirmed: activeTab === "Not Paid" ? false : true,
        is_late:
          selectedValue === "" ? null : selectedValue === "late" ? true : false,
        sorting_field: sortValues?.sortKey || "",
        sorting_order: sortValues?.direction || "",
      },
      setLoading
    );
    setTotalRows(adminUserList?.total_count || 0);
    setPerPage(rowsPerPage);
    let printDataObjCreation = adminUserList?.payments?.map((user: any) => {
      return {
        ...user,
        payment_id: user?.payment_id,
        payment_type: user?.payment_type || "",
        amount: user?.amount
          ? `${currencySymbol} ${convertPositiveDecimalTwoDigit(
              user?.amount,
              true
            )}`
          : `${currencySymbol} 0.00`,
        payment_from_account: user?.payment_from_account || "",
        payment_from_account_name: user?.payment_from_account_name || "",
        payment_to_account_name: user?.payment_to_account_name || "",
        payment_to_account_number: user?.payment_to_account_number || "",
        payment_to_account_bsb_number:
          user?.payment_to_account_bsb_number || "",
        showValidIcon: user?.status == "paid",
        list_status: user?.list_status,
      };
    });
    console.log(
      "🚀 ~ printDataObjCreation ~ printDataObjCreation:",
      printDataObjCreation
    );

    setPrintDocumentData(printDataObjCreation);
    setPaymentsListData(printDataObjCreation || []);
    setDisableExcelBtn(false);
  };

  async function getABAFileHistoryList(page: number, perPage: number) {
    setLoading(true);
    const payload = {
      bank_account_id:
        +overViewDetails?.data?.bank_account_id || Number(fromAccId) || null,
      company_id: selectedCompanyId,
      items_per_page: perPage,
      page_number: page,
      sorting_field: sortValues?.sortKey || "",
      sorting_order: sortValues?.direction || "",
    };
    const response = await fetchABAFileHistoryList(payload, setLoading);
    setTotalRows(response?.total_count || 0);
    setPaymentsListData(
      response?.list?.map((val: any) => {
        return {
          ...val,
          mark_paid: val?.mark_paid ? (
            <i className="fa fa-check" style={{ color: "green" }}></i>
          ) : (
            <i className="fa fa-times" style={{ color: "red" }}></i>
          ),
          created_on: val?.created_on ? formatDate(val?.created_on) : "",
        };
      }) || []
    );
  }

  const handleSelectChange = (selectedValue: any) => {
    setSingleSelectedData(selectedValue);
    setSelectedValue(selectedValue);
    // Perform any other actions based on the selected value
  };
  const handleProjectChange = (selectedValue: any) => {
    setSelectedProject(selectedValue);
    setProjectId(selectedValue.value);

    // Perform any other actions based on the selected value
  };
  const handleContractChange = (selectedValue: any) => {
    setSelectedContract(selectedValue);
    setContractId(selectedValue.value);
    // Perform any other actions based on the selected value
  };
  const handleFromAccChange = (selectedValue: any) => {
    setSelectedFromAcc(selectedValue);
    setFromAccId(selectedValue);
    // Perform any other actions based on the selected value
  };

  const handleConfirm = () => {
    setOpenPlanModal(false);

    router.push(AppRoutes.SUBSCRIPTION_PRICING);
  };

  function navigateToViewOptions(row: any) {
    if (PAYMENT_TYPES.includes(row?.payment_type)) {
      if (overViewDetails?.overviewType == "bankAccounts") {
        dispatch(
          setScreenDetails({
            fromScreen: "bankOverView",
            toScreen: "paymentsToDo",
            mainActiveTab: "To Do",
          })
        );
      }
      router.push(
        `${AppRoutes.USER_ADD_PAYMENT}?claim=${row?.payment_claim_id}&mode=view&payment=${row?.payment_id}`
      );
    } else {
      router.push(
        `${AppRoutes.USER_VIEW_INTEREST_CHARGES_OTHER_PAYMENT}/${row?.payment_id}`
      );
    }
  }
  const handleRowView = (row: any) => {
    navigateToViewOptions(row);
  };

  // Define actions dynamically
  const actions = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      style: buttonType.PRIMARY,
      onClick: (row: any) => {
        navigateToViewOptions(row);
      },
    },
    ...(activeTab !== "Paid"
      ? [
          {
            label: "Confirm paid",
            icon: "fa-light fa-memo-circle-check",
            onClick: (row: any) => {
              setActionData({
                ...row,
                option: "Confirm Paid",
                claim_type: row?.claim_type || null,
                payment_type: row?.payment_type || null,
                sub_payment_type: row?.sub_payment_type || null,
              });
              setOpenModal(!openModal);
              setPopupMessage((prev) => ({
                headerMsg: "",
                subHeaderMsg: "Do you wish to Confirm Paid this payment? ",
              }));
            },
          },
        ]
      : []),
  ];

  const ABAactions = [
    {
      label: "Download generated ABA file",
      icon: "fa-light fa-download",
      style: buttonType.PRIMARY,
      onClick: (row: any) => {
        downloadABAFile({
          file_path: row?.aba_file_path,
          file_name: row?.aba_file_name,
        });
      },
    },
  ];

  const modifiedHeaders =
    activeTab === tabOptions[2].label
      ? myActivityHeaderNames
      : toDoHeaderNames
          .filter(
            (header) => !(activeTab === "Paid" && header.title === "Status")
          )
          .map((header) => {
            if (header.title === "Actions" && activeTab === "Paid") {
              return { ...header, title: "View" };
            }
            return header;
          });

  const handleModalPopUpFunction = async () => {
    setOpenModal(!openModal);

    if (actionData.option === "Confirm Paid") {
      const { claim_type, payment_type, sub_payment_type } = actionData;
      let payload: any = {
        payment_id: actionData?.payment_id,
      };

      if (
        sub_payment_type === "Payment" &&
        ((claim_type === "Billable" &&
          ["Full", "Part", "Pay Less - Full", "Pay Less - Part"].includes(
            payment_type
          )) ||
          [
            "Interest Withdrawal",
            "Bank Charge Applied",
            "Withdrawal",
            "Overpayment to supplier",
            "Underpayment to supplier",
          ].includes(payment_type))
      ) {
        payload.is_paid_confirmed = true;
      } else if (
        sub_payment_type === "Payment" &&
        ((claim_type === "Receivable" &&
          ["Full", "Part", "Pay Less - Full", "Pay Less - Part"].includes(
            payment_type
          )) ||
          [
            "Interest Received",
            "Bank Charge Top Up",
            "Top Up",
            "Overpayment Refund",
            "Top Up Retention",
            "Overpayment from client",
            "Underpayment from client",
          ].includes(payment_type))
      ) {
        payload.is_received_confirmed = true;
      } else if (sub_payment_type === "Retention Out" || sub_payment_type === "Retention In") {
        payload.is_retention_confirmed = true;
      }

      let response = await editDetailsOfAPayment(
        payload,
        "Payment status has updated successfully"
      );
      if (response) {
        if (
          [
            "Full",
            "Part",
            "Pay Less - Full",
            "Pay Less - Part",
            "Pay - Zero",
            "3rd Party",
          ].includes(actionData?.payment_type)
        ) {
          // await TriggerPaymentNotices({
          //   payment_ids: [actionData?.payment_id],
          // });
          setLoaderInfo("Generating notice...");
          const noticeResponse = await TriggerPaymentNotices({
            payment_ids: [actionData?.payment_id],
          });
          setLoaderInfo("");

          if (noticeResponse) {
            const { notice_previews = [], qbcc_notice_previews = [] } =
              noticeResponse;

            // Set standard notices
            setNoticeFiles(notice_previews.map((n: any) => n.file_details));
            setNoticeMailUuids(notice_previews.map((n: any) => n.mail_uuid));

            // Set QBCC notices
            setQbccNoticeFiles(
              qbcc_notice_previews.map((n: any) => n.qbcc_file_details)
            );
            setQbccNoticeUuids(
              qbcc_notice_previews.map((n: any) => n.notice_uuid)
            );

            // Show popup if any notices exist
            if (notice_previews.length > 0 || qbcc_notice_previews.length > 0) {
              setShowNoticePopup(true);
              return; // stop further routing, popup handles it
            }
          }
        }
        await getListAllAdminUsers(page, perPage);
      }
    }
  };

  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "sub_payment",
        page_size: perPage,
        page_number: page,
        company_id: selectedCompanyId || null,
        sub_payment_type: "ToDo",
        bank_account_id:
          +overViewDetails?.data?.bank_account_id || Number(fromAccId) || null,
        project_id: Number(selectedProject) || null,
        contract_id: Number(selectedContract) || null,
        status: "Unmatched",
        is_confirmed: activeTab === "Not Paid" ? false : true,
        is_late:
          selectedValue === "" ? null : selectedValue === "late" ? true : false,
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
        screen_name: "sub_payment",
        page_size: perPage,
        page_number: page,
        company_id: selectedCompanyId || null,
        sub_payment_type: "ToDo",
        bank_account_id:
          +overViewDetails?.data?.bank_account_id || Number(fromAccId) || null,
        project_id: Number(selectedProject) || null,
        contract_id: Number(selectedContract) || null,
        status: "Unmatched",
        is_confirmed: activeTab === "Not Paid" ? false : true,
        is_late:
          selectedValue === "" ? null : selectedValue === "late" ? true : false,
      });
      setDisablePDFBtn(false);
    } catch {
    } finally {
      setDisablePDFBtn(false);
    }
  };

  async function handleDownloadAbaFile(markPaymentsAsPaid: any = null) {
    // 🔹 Subscription check first
    if (!abaGenerationAllowed) {
      setModalHeading("Upgrade Subscription");
      setModalBodyContent(
        `Your current subscription does not allow ABA file generation. Please upgrade your plan to enable this feature.`
      );
      setOpenPlanModal(true);
      return; // stop here
    }
    setDisableAbaFileBtn(true);
    try {
      let responseFile = await GenerateABAfiles({
        company_id: selectedCompanyId,
        sub_payment_type: "ToDo",
        bank_account_id: null,
        project_id: null,
        contract_id: null,
        status: "Unmatched",
        is_confirmed: false,
        is_late: null,
        mark_paid: markPaymentsAsPaid,
      });

      if (markPaymentsAsPaid) {
        setAbaMarkAsPaid(null);
      }
      if (responseFile?.file_path) {
        downloadABAFile(responseFile);
        if (responseFile?.notice_trigger?.length) {
          // await TriggerPaymentNotices({
          //   payment_ids: responseFile?.notice_trigger,
          // });
          setLoaderInfo("Generating notice...");
          const noticeResponse = await TriggerPaymentNotices({
            payment_ids: responseFile?.notice_trigger,
          });
          setLoaderInfo("");

          if (noticeResponse) {
            const { notice_previews = [], qbcc_notice_previews = [] } =
              noticeResponse;

            // Set standard notices
            setNoticeFiles(notice_previews.map((n: any) => n.file_details));
            setNoticeMailUuids(notice_previews.map((n: any) => n.mail_uuid));

            // Set QBCC notices
            setQbccNoticeFiles(
              qbcc_notice_previews.map((n: any) => n.qbcc_file_details)
            );
            setQbccNoticeUuids(
              qbcc_notice_previews.map((n: any) => n.notice_uuid)
            );

            // Show popup if any notices exist
            if (notice_previews.length > 0 || qbcc_notice_previews.length > 0) {
              setShowNoticePopup(true);
              return; // stop further routing, popup handles it
            }
          }
        }
        getListAllAdminUsers(page, perPage);
      } else if (responseFile?.bank_account_id || responseFile?.aba_message) {
        const isNoValidTransactions = responseFile?.aba_message?.includes('No transactions qualified') || 
                                       responseFile?.aba_message?.includes('No ABA file was generated') ||
                                       responseFile?.aba_message?.includes('No changes to save');
        
        if (isNoValidTransactions) {
          setAbaMarkAsPaid(null);
        } else if (responseFile?.aba_message && !responseFile?.bank_account_id) {
          setAbaMarkAsPaid(true);
        }
        setAbcaWarning({
          display: true,
          data: responseFile,
          isError: isNoValidTransactions,
        });
      }
    } catch {
    } finally {
      setDisableAbaFileBtn(false);
    }
  }

  function handleUpdateAbcaNumber() {
    router.push(
      `${AppRoutes.USER_EDIT_BANK_ACCOUNTS}/${abcaWarning?.data?.company_id}/${abcaWarning?.data?.bank_account_id}?routedFrom=payments-to-do`
    );
  }

  function handleViewFileFromPath(filePath: string, fileName: string) {
    const pdfWindow = window.open("");
    pdfWindow?.document.write(
      `<iframe width='100%' height='100%' src='${filePath}' title='${fileName}'></iframe>`
    );
  }

  // Send Mail
  const handleSendMail = async () => {
    const hasNoticeMails = noticeMailUuids?.length > 0;
    const hasQbccNotices = qbccNoticeUuids?.length > 0;

    if (!hasNoticeMails && !hasQbccNotices) {
      return false; // nothing to send
    }

    setLoader(true);
    setLoaderInfo("Sending mail...");

    let success = true;

    // 1️⃣ Send regular notices if present
    if (hasNoticeMails) {
      const res = await SendMailForNotices(noticeMailUuids);
      if (!res) success = false;
    }

    // 2️⃣ Send QBCC notices if present
    if (hasQbccNotices) {
      const res = await SendQbccMailForNotices(qbccNoticeUuids);
      if (!res) success = false;
    }

    setLoader(false);

    if (success) {
      cleanupNoticePopup();
      await getListAllAdminUsers(page, perPage); // ✅ refresh after send
      return true;
    }

    return false;
  };

  // Cancel
  const handleCancelSendMail = async () => {
    const hasNoticeMails = noticeMailUuids?.length > 0;
    const hasQbccNotices = qbccNoticeUuids?.length > 0;

    if (!hasNoticeMails && !hasQbccNotices) {
      return false; // nothing to send
    }

    setLoader(true);
    setLoaderInfo("Sending mail...");

    let success = true;

    // 1️⃣ Send regular notices if present
    if (hasNoticeMails) {
      const res = await SendMailForNotices(noticeMailUuids);
      if (!res) success = false;
    }

    // 2️⃣ Send QBCC notices if present
    if (hasQbccNotices) {
      const res = await SendQbccMailForNotices(qbccNoticeUuids);
      if (!res) success = false;
    }

    setLoader(false);

    if (success) {
      cleanupNoticePopup();
      await getListAllAdminUsers(page, perPage); // ✅ refresh after send
      return true;
    }

    return false;
  };

  // Common cleanup
  const cleanupNoticePopup = () => {
    setShowNoticePopup(false);
    setLoader(false);
    setLoaderInfo("");
    setNoticeFiles([]);
    setNoticeMailUuids([]);
    setQbccNoticeFiles([]);
    setQbccNoticeUuids([]);
  };

  return (
    <Fragment>
      <div className={overViewDetails?.isOverViewMode ? "" : "container-fluid"}>
        {!overViewDetails?.isOverViewMode && (
          <div className="pt_title">
            <div className="pt_breadcrumbs">
              <BreadCrumbs
                routePaths={[
                  {
                    name: "Dashboard",
                    path: AppRoutes.USER_DASHBOARD,
                  },
                ]}
                activeRoute={"Payments to do"}
              />
            </div>

            <div className="grid pt_topfilters">
              <div className="pt_pagetitle">
                <h1>Payments to do</h1>
              </div>
            </div>
          </div>
        )}

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
                {activeTab !== tabOptions[2].label && (
                  <GridExportActions
                    excelFile={{
                      sheetName: "payments-to-do list",
                      tableData: paymentsListData,
                      LabelAndValueKey: ExcelColumnNames,
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
                    disabledAbaFile={disableAbaFileBtn}
                    hideAbaFileButton={
                      paymentsListData.length == 0
                        ? true
                        : activeTab === tabOptions[1].label
                        ? true
                        : false
                    }
                    handleDownloadAbaFile={() => {
                      handleDownloadAbaFile();
                    }}
                  />
                )}
                {activeTab == tabOptions[2].label && (
                  <GridExportActions
                    resetFilterFunction={() => {
                      resetFilters();
                    }}
                    hideExcelButton={true}
                    hidePdfButton={true}
                    hideResetButton={!isAnyFilterActive}
                  />
                )}
              </div>
            </div>
          </div>
          <div className="pt_filteroptions">
            {activeTab !== tabOptions[2].label && (
              <>
                <div>
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
                </div>
                <div>
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
                </div>
              </>
            )}
            {!overViewDetails?.data?.bank_account_id && (
              <div>
                <FormikControl
                  placeholder={"Select a from account"}
                  name="Fromaccount"
                  options={fromAccOpt}
                  onChange={handleFromAccChange}
                  control={InputType.SELECT}
                  value={selectedFromAcc}
                  renderKey="label"
                  valueKey="value"
                />
              </div>
            )}
            {activeTab === "Not Paid" && (
              <div>
                <FormikControl
                  placeholder={"Select a Status"}
                  name="Status"
                  options={filter_paid_options}
                  onChange={handleSelectChange}
                  control={InputType.SELECT}
                  value={singleSelectedData}
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
              headers={modifiedHeaders}
              gridData={
                paymentsListData?.length > 0
                  ? paymentsListData.map((row) => {
                      if (activeTab === "Paid") {
                        // remove the status property
                        const { list_status, ...rest } = row;
                        return rest;
                      }
                      return row;
                    })
                  : []
              }
              gridActions={
                activeTab === tabOptions[2].label ? ABAactions : actions
              }
              displayAllStaticActions={true}
              onRowClick={(data: any) => handleRowView(data)}
              showLoader={loading}
              loaderColSpan={modifiedHeaders?.length}
              renderRowList={
                activeTab === "Paid"
                  ? paymentRenderData.filter(
                      (item) => item.key !== "list_status"
                    )
                  : activeTab === tabOptions[2].label
                  ? abaPaymentRenderData
                  : paymentRenderData
              }
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
            displayModal={openModal}
            onHeaderIconClose={() => setOpenModal(false)}
            onClose={() => setOpenModal(false)}
            firstButtonName="No"
            secondButtonName="Yes"
            title={popupMessage?.headerMsg || ""}
            onConfirm={() => {
              handleModalPopUpFunction();
              return true;
            }}
          >
            <div className="text_center">
              {popupMessage?.subHeaderMsg || ""}
            </div>
          </BaseModal>
        )}
      </div>
      {abcaWarning?.display && (
        <BaseModal
          modalId={"abca warning modal"}
          displayModal={abcaWarning?.display}
          onHeaderIconClose={() => setAbcaWarning({ display: false, data: {} })}
          restrictOncloseFunctionInHeader
          onClose={() => setAbcaWarning({ display: false, data: {} })}
          onConfirm={() => {
            if (abcaWarning?.isError) {
              setAbcaWarning({ display: false, data: {} });
              return true;
            }
            abaMarkAsPaid
              ? handleDownloadAbaFile("yes")
              : handleUpdateAbcaNumber();
            return true;
          }}
          firstButtonName={abcaWarning?.isError ? "" : (abaMarkAsPaid ? "No" : "Close")}
          secondButtonName={abcaWarning?.isError ? "OK" : (abaMarkAsPaid ? "Yes" : "Update")}
        >
          <h4 className="text_center">{abcaWarning?.data?.aba_message}</h4>
        </BaseModal>
      )}
      {showNoticePopup && (
        <BaseModal
          modalId="Generated Notices"
          displayModal={showNoticePopup}
          title="Preview generated notices"
          hideHeaderCloseIcon={true}
          onClose={(e: any) => {
            // 👈 closing modal via "X" or backdrop = just close, no API
            if (e === true) {
              setShowNoticePopup(false);
              return handleCancelSendMail();
            }
          }}
          onConfirm={() => {
            setShowNoticePopup(false);
            return handleSendMail();
          }}
          // onCancel={handleCancelSendMail}
          firstButtonName="Close"
          secondButtonName="Send Mail"
        >
          <p className="">
            <span className="pt_yellow">Note:</span> We have generated the
            documents below, and they are available to view. The system will
            send an email with these documents attached in{" "}
            <b className="pt_green">{timeLeft}</b> seconds.
            {qbccNoticeFiles?.length > 0 && (
              <>
                <br />
                <span className="pt_red">
                  QBCC documents will be verified by Paytrade admin and
                  submitted on your behalf.
                </span>
              </>
            )}
          </p>
          <br></br>
          {noticeFiles.map((file: any, idx: number) => (
            <div key={idx} className="pt_itemwithremove">
              <span>{file.file_name}</span>
              <div>
                <CustomButton
                  buttonName="View"
                  buttonType={`${buttonType.SECONDARY} ${buttonType.SMALL_BUTTON}`}
                  iconClassName="fa-light fa-eye"
                  actionType="button"
                  onClick={
                    () => handleViewFileFromPath(file.file, file.file_name) // base64 PDF
                  }
                />
              </div>
            </div>
          ))}
          {qbccNoticeFiles?.length > 0 && (
            <>
              {qbccNoticeFiles.map((file: any, idx: number) => (
                <div key={idx} className="pt_itemwithremove">
                  <span>{file?.file_name}</span>
                  <div>
                    <CustomButton
                      buttonName="View"
                      buttonType={`${buttonType.SECONDARY} ${buttonType.SMALL_BUTTON}`}
                      iconClassName="fa-light fa-eye"
                      actionType="button"
                      onClick={() =>
                        handleViewFileFromPath(
                          file.file_path || file.file, // prefer path, fallback to base64
                          file.file_name
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </>
          )}
        </BaseModal>
      )}
      {openPlanModal && (
        <BaseModal
          displayModal={openPlanModal}
          onClose={async (triggered: any) => {
            if (triggered) {
              setOpenPlanModal(false);
            }
          }}
          title={modalHeading}
          secondButtonName="Upgrade Now"
          firstButtonName="Close"
          onConfirm={() => {
            handleConfirm();
            return true;
          }}
          restrictOncloseFunctionInHeader
          onHeaderIconClose={() => {
            setOpenPlanModal(false);
          }}
        >
          <h4 className="text_center">{modalBodyContent}</h4>
        </BaseModal>
      )}
    </Fragment>
  );
}
