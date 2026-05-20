"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { deleteCookie, getCookie, setCookie } from "cookies-next";
import {
  fetchFiltersForAdminNotices,
  getNoticesListServices,
  NoticesListType,
  RegenerateNotice,
} from "./notices.functions";
import GridExportActions from "@/components/GridExportActions";
import { AppRoutes } from "@/shared/constant/appRoutes";
import BreadCrumbs from "@/components/BreadCrumbs";
import {
  bankAccountShortTypes,
  NoticesexcelColumnNames,
  noticeSourceType,
  NoticespdfDataRow,
  NoticespdfheaderNames,
  Noticespdfheaders,
  NoticesRenderData,
  tabOptions,
} from "./notices.constants";
import TabSwitch from "@/components/TabSwitch";
import FormikControl from "@/components/FormikControl";
import { buttonType, InputType } from "@/shared/constant/general";
import DynamicTable from "@/components/Table";
import { format } from "date-fns";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";
import { connectWebSocket, getCompanyIdFromStorage } from "@/utils";
import { contractOverviewTabs } from "../ContractOverview/ContractOverview.constants";
import { useDispatch } from "react-redux";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import _ from "lodash";
import { overviewModeType } from "../PaymentsList/PaymentList.constants";
import { projectOverviewTabs } from "../Projects/ProjectOverview/ProjectOverview.constant";
import { tabTypes } from "../AddUpdatePayments/Payments.constants";
import Link from "next/link";
import { useLoaderContext } from "@/context/useLoader";
import BaseModal from "@/components/BaseModal";
import { useTokenDetails } from "@/hooks";
import { SUBSCRIPTION_UPGRADE } from "@/shared/constant/general";
import { AppRoutes as RoutesConst } from "@/shared/constant/appRoutes";
import {
  fetchBusinessDetails,
  updateNoticesAutoSend,
} from "../BusinessProfile/BusinessProfile.function";
import { showSuccessToast } from "@/components/Toaster";

export default function NoticesList({ overViewDetails = {} }: any) {
  const { data: overviewData, isArchived = false } = overViewDetails;
  const searchParams = useSearchParams();

  const isFromArchived = searchParams.get("archived") === "true";
  const routedFrom = searchParams.get("routedFrom");

  const router = useRouter();
  const { setLoader, setLoaderInfo }: any = useLoaderContext();
  const [selectedValue, setSelectedValue] = useState("");
  const [page, setPage] = useState(1);
  const [projectOpt, setProjectOpt] = useState<any>([]);
  const [loading, setLoading] = useState<boolean>(false);
  // Task #97 — per-company auto-send settings dialog state.
  const [noticeSettingsOpen, setNoticeSettingsOpen] = useState(false);
  const [noticeSettingsCompany, setNoticeSettingsCompany] = useState<any>(null);
  const [noticeSettingsAutoSend, setNoticeSettingsAutoSend] =
    useState<boolean>(true);
  const [noticeSettingsSaving, setNoticeSettingsSaving] =
    useState<boolean>(false);
  // Basic-plan upgrade dialog (mirrors AddEditAuditDetails pattern).
  const [displaySubscriptionModal, setDisplaySubscriptionModal] =
    useState<boolean>(false);
  // Visibility gate for the gear icon mirrors the server-side authorisation
  // in `updateNoticesAutoSend` (signup.resolver.ts): the role on the active
  // company must be a real (non-system-added) PRIMARY ADMIN / ADMIN, or a
  // STANDARD USER with `manageCompany === 'Yes'`. The server check remains
  // the source of truth — this just hides a control the user can't use.
  const { decodeTokenData } = useTokenDetails();
  const canManageNoticeSettings = (() => {
    const cid = getCompanyIdFromStorage();
    const roles = (decodeTokenData as { companySpecificRoles?: Array<{
      companyId?: number;
      role?: string;
      manageCompany?: string;
      isSystemAdded?: boolean;
    }> })?.companySpecificRoles;
    if (!Array.isArray(roles) || cid == null) return false;
    const role = roles.find((r) => r?.companyId === Number(cid));
    if (!role || role.isSystemAdded) return false;
    return (
      role.role === "PRIMARY ADMIN" ||
      role.role === "ADMIN" ||
      (role.role === "STANDARD USER" && role.manageCompany === "Yes")
    );
  })();
  const [accountList, setAccountList] = useState<any>();
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState(() => {
    if (routedFrom === "received") return tabOptions[2].id;
    if (isFromArchived) return tabOptions[1].id;
    return tabOptions[0].id;
  });

  const [selectedNoticesType, setSelectedNoticesType] = useState<any>("");
  const [selectedProjectName, setSelectedProjectName] = useState<any>("");

  const [selectedAccountName, setSelectedAccountName] = useState<any>("");
  const [selectedStatus, setSelectedStatus] = useState<any>("");
  const [selectedAccountTypeObj, setSelectedAccountTypeObj] = useState("");
  const [selectedProjectObj, setSelectedProjectObj] = useState("");
  const [selectedNoticeTypeObj, setSelectedNoticeTypeObj] = useState("");

  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const [printDocumentData, setPrintDocumentData] = useState<any>([]);
  const [noticesListData, setNoticesListData] = useState<NoticesListType[]>([]);
  const queryParams: any = useSearchParams();
  const paymentClaimId = queryParams.get("payment-claim");
  const [noticesTypeOptions, setNoticesTypeOptions] = useState<any>([]);
  const [sortValues, setSortValues] = useState<any>("");

  const [disablePDFBtn, setDisablePDFBtn] = useState(false);
  const dispatch = useDispatch();
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  const [displayResendNoticeModal, setDisplayResendNoticeModal] =
    useState<boolean>(false);
  const [actionData, setActionData] = useState<any>();

  const shouldHideExport =
    noticesListData.length === 0 || activeTab === "Received";

  const statusNotices = [
    { value: "All", label: "All" },
    { value: "Draft", label: "Draft" },
    { value: "Not Sent", label: "Not Sent" },
    { value: "Sending", label: "Sending" },
    { value: "Sent", label: "Sent" },
    { value: "Sent - Onboarded", label: "Sent - Onboarded" },
  ];

  useEffect(() => {
    deleteCookie("noticeListPath");
    fetchFilters();
  }, [selectedAccountName, selectedNoticesType, selectedProjectName]);

  useEffect(() => {
    if (
      !overViewDetails?.overViewMode ||
      (overViewDetails?.overViewMode && !_.isEmpty(overViewDetails?.data))
    )
      fetchData(page, perPage);
  }, [
    selectedValue,
    page,
    perPage,
    activeTab,
    selectedStatus,
    sortValues,
    overViewDetails?.data,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    selectedValue,
    selectedAccountName,
    selectedNoticesType,
    selectedProjectName,
    activeTab,
  ]);

  useEffect(() => {
    resetFilters();
  }, [activeTab]);

  const fetchFilters = async () => {
    const result = await fetchFiltersForAdminNotices({
      company_id: selectedCompanyId || null,
      bank_account_id: Number(selectedAccountName) || null,
      account_type: "",
      notice_type: selectedNoticesType || null,

      project_id: overViewDetails?.overViewMode
        ? overViewDetails?.project_id
          ? Number(overViewDetails?.project_id)
          : null
        : selectedProjectName
        ? Number(selectedProjectName)
        : null,
      status: isArchived ? "Deleted" : "",
    });
    let account_list = result?.account_list ?? [];
    let project_list = result?.project_list ?? [];
    let notice_type_list = result?.notice_type_list ?? [];

    if (result) {
      setAccountList([
        { label: "All", value: "" },
        ...account_list?.map(({ name, value }: any) => {
          return {
            label: name,
            value: Number(value),
          };
        }),
      ]);

      setNoticesTypeOptions([
        { label: "All", value: "" },
        ...notice_type_list?.map(({ name, value }: any) => ({
          label: name,
          value: value,
        })),
      ]);
      setProjectOpt([
        { label: "All", value: "" },
        ...project_list?.map(({ name, value }: any) => ({
          label: name,
          value: value,
        })),
      ]);
    }
  };

  const resetFilters = () => {
    setSelectedNoticesType("");
    setSelectedProjectName("");
    setSelectedAccountName("");
    setSelectedStatus("");
    setSelectedValue("");
    setSelectedAccountTypeObj("");
    setSelectedProjectObj("");
    setSelectedNoticeTypeObj("");
  };

  const isAnyFilterActive =
    selectedNoticesType !== "" ||
    selectedProjectName !== "" ||
    selectedAccountName !== "" ||
    selectedValue !== "" ||
    selectedStatus !== "";

  const handleSelectChange = (
    selectedValue: any,
    field?:
      | "project_name"
      | "account_name"
      | "notice_type"
      | "notice_source"
      | "status"
  ) => {
    if (field === "notice_type") {
      setSelectedNoticesType(selectedValue?.value);
    }
    if (field === "project_name") {
      setSelectedProjectName(selectedValue?.value);
    }
    if (field === "account_name") {
      setSelectedAccountName(selectedValue?.value);
    }
    if (field === "status") {
      setSelectedStatus(selectedValue);
    }
    setSelectedValue(selectedValue);
    // Perform any other actions based on the selected value
  };

  const fetchData = async (page: number, rowsPerPage: number) => {
    setLoading(true);
    try {
      const payloadData = {
        company_id: selectedCompanyId,
        page: page,
        items_per_page: rowsPerPage,
        notice_type: selectedNoticesType ? selectedNoticesType : "",
        bank_account_id: selectedAccountName
          ? Number(selectedAccountName)
          : null,
        status:
          activeTab === "Archived"
            ? "Deleted"
            : activeTab === "Received"
            ? "Received"
            : selectedStatus === "All"
            ? null
            : selectedStatus || "",

        project_id: overviewData
          ? overviewData?.project_id
            ? Number(overviewData?.project_id)
            : null
          : selectedProjectName
          ? Number(selectedProjectName)
          : null,
        contract_id: overviewData
          ? overviewData?.contract_id
            ? Number(overviewData?.contract_id)
            : null
          : null,
        payment_claim_id: paymentClaimId ? +paymentClaimId : null,
        sorting_field: sortValues?.sortKey || "",
        sorting_order: sortValues?.direction || "",
      };
      const response = await getNoticesListServices(payloadData);

      setTotalRows(response?.total_count || 0);
      setPerPage(rowsPerPage);
      let printDataObjCreation = response?.notices_list?.map(
        (notices: NoticesListType) => {
          return {
            ...notices,
            notice_date: notices?.notice_date
              ? format(new Date(notices?.notice_date), "dd MMM yyyy h:mm a")
              : "",
            notice_id: notices?.notice_id,
            notice_type: notices?.notice_type,
            account_name: notices?.account_name,
            bank_account_type: notices?.bank_account_type
              ? bankAccountShortTypes[
                  notices.bank_account_type as keyof typeof bankAccountShortTypes
                ]
              : "",

            notice_source: notices?.notice_source,
            project_id: notices?.project_id,
            project_name: notices?.project_name,
            // status: (
            //   <span
            //     style={{
            //       color: notices?.status === "Not Sent" ? "red" : "",
            //     }}
            //   >
            //     {notices?.status}
            //   </span>
            // ),
            // 👇 Modify this part
            status: (
              <span
                style={{
                  color:
                    notices?.status === "Not Sent" ||
                    notices?.notice_document_gen_failed === true
                      ? "red"
                      : "",
                }}
              >
                {notices?.notice_document_gen_failed === true
                  ? `${notices?.status || ""} – Notice Attachment Failed`
                  : notices?.status}
              </span>
            ),
            notice_list_icons: {
              regenerate_notice: true,
            },
          };
        }
      );
      setNoticesListData(printDataObjCreation || []);

      setPrintDocumentData(printDataObjCreation);
    } catch {
    } finally {
      setLoading(false);
      setDisableExcelBtn(false);
    }
  };

  const regenerateNotice = async () => {
    setLoader(true);
    setLoaderInfo("Regenerate notice...");
    try {
      const response = await RegenerateNotice(actionData?.notice_id);

      if (response) {
        fetchData(page, perPage);
      }

      setLoader(false);
      setLoaderInfo("");
    } catch (error) {
      setLoader(false);
      setLoaderInfo("");
    }
  };

  const handleRowView = (row: any) => {
    setCookie("noticeListPath", AppRoutes.USER_NOTICES_VIEW); // Keep this if required globally

    const isReceived = activeTab === "Received";
    const routePath = isReceived
      ? `${AppRoutes.USER_NOTICES_RECEIVEDVIEW}/${row?.id}`
      : `${AppRoutes.USER_NOTICES_VIEW}/${row?.id}?prevTab=${activeTab}`;

    router.push(routePath);
  };

  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "notices",
        company_id: selectedCompanyId,

        notice_type: selectedNoticesType ? selectedNoticesType : "",
        bank_account_id: selectedAccountName
          ? Number(selectedAccountName)
          : null,

        status:
          activeTab === "Archived"
            ? "Deleted"
            : selectedStatus?.value
            ? selectedStatus.value
            : "",

        project_id: overViewDetails?.overViewMode
          ? overViewDetails?.project_id
            ? Number(overViewDetails?.project_id)
            : null
          : selectedProjectName
          ? Number(selectedProjectName)
          : null,
        contract_id: overViewDetails?.overViewMode
          ? overViewDetails?.contract_id
            ? Number(overViewDetails?.contract_id)
            : null
          : null,
        payment_claim_id: paymentClaimId ? +paymentClaimId : null,
      });

      if (responseFileURL) {
        await downloadExcelFileFromAPI(responseFileURL);
      } else {
        showErrorToast("Failed to generate Excel file URL");
      }
    } catch {
    } finally {
      setDisableExcelBtn(false);
    }
  };

  const actions = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      style: buttonType.PRIMARY,
      onClick: (row: any) => {
        if (
          overViewDetails?.screenName == "contracts" ||
          overViewDetails?.screenName == overviewModeType.PROJECTS
        ) {
          dispatch(
            setScreenDetails({
              fromScreen:
                overViewDetails?.screenName == overviewModeType.PROJECTS
                  ? "projectOverview"
                  : "contractsOverview",
              toScreen: "notices",
              mainActiveTab:
                overViewDetails?.screenName == overviewModeType.PROJECTS
                  ? projectOverviewTabs.NOTICES
                  : contractOverviewTabs.NOTICES,
            })
          );
        }

        const isReceived = activeTab === "Received";
        const routePath = isReceived
          ? `${AppRoutes.USER_NOTICES_RECEIVEDVIEW}/${row?.id}`
          : `${AppRoutes.USER_NOTICES_VIEW}/${row?.id}?prevTab=${activeTab}`;

        router.push(routePath);
      },
      displayByDefault: true,
    },
    {
      label: "Regenerate notice",
      icon: "fa-solid fa-repeat",
      style: buttonType.SECONDARY,
      onClick: (row: any) => {
        setActionData(row);
        setDisplayResendNoticeModal(true);
      },
      conditionalApiDisplayKey: "regenerate_notice",
    },
  ];

  const handleDownloadPdfFile = async () => {
    setDisablePDFBtn(true);
    try {
      const clientId = await connectWebSocket();
      await getPDFUrl(clientId, {
        screen_name: "notices",
        company_id: selectedCompanyId,

        notice_type: selectedNoticesType ? selectedNoticesType : "",
        bank_account_id: selectedAccountName
          ? Number(selectedAccountName)
          : null,

        status:
          activeTab === "Archived"
            ? "Deleted"
            : selectedStatus?.value
            ? selectedStatus.value
            : "",

        project_id: overViewDetails?.overViewMode
          ? overViewDetails?.project_id
            ? Number(overViewDetails?.project_id)
            : null
          : selectedProjectName
          ? Number(selectedProjectName)
          : null,
        contract_id: overViewDetails?.overViewMode
          ? overViewDetails?.contract_id
            ? Number(overViewDetails?.contract_id)
            : null
          : null,
        payment_claim_id: paymentClaimId ? +paymentClaimId : null,
      });
      setDisablePDFBtn(false);
    } catch (error) {
      console.error(error, "outside loop");
    } finally {
      setDisablePDFBtn(false);
    }
  };

  function routeToNoticesSource(rowData: any) {
    if (rowData?.source_type == noticeSourceType.CLAIM) {
      navigateToClaimViewMode(rowData);
    } else if (rowData?.source_type == noticeSourceType.PAYMENT) {
      router.push(
        `${AppRoutes.USER_ADD_PAYMENT}?claim=${rowData?.payment_claim_id}&mode=view&payment=${rowData?.payment_id}`
      );
    } else if (
      rowData?.source_type == noticeSourceType.BANK_ACCOUNT ||
      rowData?.source_type == noticeSourceType.AUDIT
    ) {
      router.push(
        `${AppRoutes.USER_BANK_ACCOUNTS_OVERVIEW}/${
          rowData?.bank_account_id
        }/${getCompanyIdFromStorage()}`
      );
    } else if (rowData?.source_type == noticeSourceType.CONTRACT) {
      router.push(
        `${AppRoutes.USER_CONTRACTS_OVERVIEW}/${rowData.contract_uuid}`
      );
    }
  }

  function navigateToClaimViewMode(data: any) {
    let paymentObj: any = 0;

    if (data?.source_claim_details?.payments?.length > 0) {
      const isPartPayment = data?.source_claim_details?.payments.some(
        (x: any) =>
          x?.payment_type === tabTypes.PART ||
          x?.payment_type === tabTypes.PAY_LESS_PART
      );

      if (isPartPayment) {
        paymentObj = data?.source_claim_details?.payments.findLast(
          (x: any) =>
            x?.payment_type === tabTypes.PART ||
            x?.payment_type === tabTypes.PAY_LESS_PART
        );
      }
    }

    router.push(
      `${AppRoutes.USER_VIEW_CLAIMS}/${data?.payment_claim_id}?type=${
        data?.source_claim_details?.cash_retention_type
      }&cash-retention-type=${
        data?.source_claim_details?.cash_retention_type === "Claim"
          ? ""
          : "RetentionClaim"
      }&beneficiary=${
        data?.source_claim_details?.beneficiary_type ?? ""
      }&payment-type=${
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
      }&ctype=${data?.source_claim_details?.claim_type}`
    );
  }

  //Render Template
  return (
    <div className="container-fluid">
      {!overViewDetails?.overViewMode && (
        <div className="pt_title">
          <div className="pt_breadcrumbs">
            <BreadCrumbs
              routePaths={[
                {
                  name: "Dashboard",
                  path: AppRoutes.USER_DASHBOARD,
                },
              ]}
              activeRoute={"Notices"}
            />
          </div>

          <div className="grid pt_topfilters">
            <div className="pt_pagetitle">
              <h1>Notices</h1>
            </div>
            {activeTab === "Received" && (
              <div className="pt_pageactions">
                <Link
                  href={`${AppRoutes.USER_NOTICES_ADD}`}
                  passHref
                  legacyBehavior
                >
                  <a className="pt_addnewbutton">
                    <button className="secondary">
                      <i className="fa-light fa-hexagon-plus"></i>Add received
                      notice
                    </button>
                  </a>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="pt_filtergroup">
        <div className="grid pt_topfilters">
          <div className="pt_filters">
            {!overViewDetails?.overViewMode && (
              <div role="group">
                <TabSwitch
                  tabOptions={tabOptions}
                  tabValue={activeTab}
                  onChange={(value: any) => setActiveTab(value)}
                />
              </div>
            )}
          </div>
          <div className="pt_pageactions">
            <div className="actionbuttons">
              <GridExportActions
                leadingActions={
                  canManageNoticeSettings ? (
                    <button
                      type="button"
                      className="secondary outline"
                      data-tooltip="Notices settings"
                      onClick={async () => {
                        const cid = getCompanyIdFromStorage();
                        if (!cid) return;
                        setLoader(true);
                        try {
                          const details = await fetchBusinessDetails(+cid);
                          setNoticeSettingsCompany(details || null);
                          setNoticeSettingsAutoSend(
                            details?.notices_auto_send !== false,
                          );
                          setNoticeSettingsOpen(true);
                        } finally {
                          setLoader(false);
                        }
                      }}
                    >
                      <i className="fa-light fa-gear"></i>
                    </button>
                  ) : null
                }
                excelFile={{
                  sheetName: "transaction List",
                  tableData: noticesListData,
                  LabelAndValueKey: NoticesexcelColumnNames,
                }}
                pdfFile={{
                  fileName: "transaction List",
                  headerRow: Noticespdfheaders,
                  tableData: noticesListData,
                  dataRow: NoticespdfDataRow,
                }}
                resetFilterFunction={() => {
                  resetFilters();
                }}
                // hideExcelButton={noticesListData.length > 0 ? false : true}
                // hidePdfButton={noticesListData.length > 0 ? false : true}
                hideExcelButton={shouldHideExport}
                hidePdfButton={shouldHideExport}
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
          <FormikControl
            control={InputType.SELECT}
            placeholder="Select an account name"
            name="Account Name"
            options={accountList}
            value={selectedAccountTypeObj?.value || ""}
            renderKey="label"
            valueKey="value"
            returnSelectedObject
            onChange={(name: any) => {
              handleSelectChange(name, "account_name");
              setSelectedAccountTypeObj(name);
            }}
          />

          {!(
            overViewDetails?.screenName === "contracts" ||
            overViewDetails?.screenName === "projects"
          ) && (
            <FormikControl
              control={InputType.SELECT}
              placeholder={"Select a project name"}
              name="Project Name"
              options={projectOpt}
              value={selectedProjectObj?.value || ""}
              renderKey="label"
              valueKey="value"
              returnSelectedObject
              onChange={(project: any) => {
                handleSelectChange(project, "project_name");
                setSelectedProjectObj(project);
              }}
            />
          )}

          <FormikControl
            control={InputType.SELECT}
            placeholder={"Select a notices type"}
            name="Notices Type"
            options={noticesTypeOptions}
            value={selectedNoticeTypeObj?.value || ""}
            renderKey="label"
            valueKey="value"
            returnSelectedObject
            onChange={(v: any) => {
              handleSelectChange(v, "notice_type");
              setSelectedNoticeTypeObj(v);
            }}
          />

          {activeTab !== "Archived" && activeTab !== "Received" && (
            <FormikControl
              placeholder={"Select a status"}
              name="Status"
              options={statusNotices}
              onChange={(status: any) => {
                handleSelectChange(status, "status");
              }}
              control={InputType.SELECT}
              value={selectedStatus}
              renderKey="label"
              valueKey="value"
            />
          )}
        </div>
      </div>

      <div className="grid">
        <div className="pt_box">
          <div className="grid">
            <h4>{activeTab || "Current"}</h4>
          </div>

          <DynamicTable
            headers={
              activeTab === "Archived"
                ? NoticespdfheaderNames.filter(
                    (header) => header.title !== "View"
                  )
                : activeTab === "Received"
                ? NoticespdfheaderNames.filter(
                    (header) => header.title !== "Notice Source"
                  )
                : NoticespdfheaderNames?.map((mapHeader) => ({
                    ...mapHeader,
                    title:
                      mapHeader?.title === "View"
                        ? "Actions"
                        : mapHeader?.title,
                  }))
            }
            gridData={noticesListData.length > 0 ? noticesListData : []}
            gridActions={
              activeTab === "Archived"
                ? []
                : activeTab === "Received"
                ? actions?.filter(
                    (action) => action?.label !== "Regenerate notice"
                  )
                : actions
            }
            dynamicApiGridIconsKey="notice_list_icons"
            // displayAllStaticActions
            onRowClick={(data: any) => handleRowView(data)}
            onTableDataClick={(rowData: any) => routeToNoticesSource(rowData)}
            showLoader={loading}
            loaderColSpan={10}
            renderRowList={
              activeTab === "Received"
                ? NoticesRenderData.filter((col) => col.key !== "notice_source")
                : NoticesRenderData
            }
            currentPage={page}
            hoverOnRowClick
            entriesPerPage={perPage}
            onEntriesPerPageChange={setPerPage}
            onPageChange={setPage}
            totalEntries={totalRows}
            onSortChange={(sortConfig) => {
              if (noticesListData?.length > 0) {
                setSortValues(sortConfig);
              }
            }}
          />
        </div>
      </div>
      {displayResendNoticeModal && (
        <BaseModal
          modalId={"resend notice"}
          displayModal={displayResendNoticeModal}
          onHeaderIconClose={() => setDisplayResendNoticeModal(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setDisplayResendNoticeModal(false)}
          onConfirm={() => {
            regenerateNotice();
            return true;
          }}
          firstButtonName="No"
          secondButtonName="Yes"
        >
          <h4 className="text_center">
            Are you sure you want to regenerate the notice document?
          </h4>
        </BaseModal>
      )}
      {/* Task #97 — per-company auto-send settings dialog. Gated by plan_type:
          Basic plans cannot auto-send (delegated send is paid-only) so the
          toggle is disabled with an upgrade hint. */}
      {noticeSettingsOpen && (
        <BaseModal
          modalId={"notice-settings"}
          title="Notice auto-send"
          displayModal={noticeSettingsOpen}
          onHeaderIconClose={() => setNoticeSettingsOpen(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setNoticeSettingsOpen(false)}
          onConfirm={async () => {
            if (noticeSettingsSaving) return false;
            const isBasic =
              (noticeSettingsCompany?.plan_type || "Basic") === "Basic";
            if (isBasic) {
              // Task #97 — surface the upgrade dialog instead of silently
              // closing so the user has a clear path to enable auto-send.
              setNoticeSettingsOpen(false);
              setDisplaySubscriptionModal(true);
              return true;
            }
            try {
              setNoticeSettingsSaving(true);
              setLoader(true);
              // Task #97 — use the dedicated lightweight mutation so we
              // don't have to resubmit the full Business Profile payload
              // (which has many required fields and would 400 here).
              const ok = await updateNoticesAutoSend(
                Number(noticeSettingsCompany?.company_id),
                !!noticeSettingsAutoSend,
              );
              if (!ok) {
                return false;
              }
              showSuccessToast("Notices settings updated.");
              setNoticeSettingsOpen(false);
              // Task #97 — refresh notices list so any status changes from
              // toggling auto-send are reflected immediately.
              try {
                await fetchData(page, perPage);
              } catch {
                // ignore — list will refresh on next interaction
              }
            } finally {
              setNoticeSettingsSaving(false);
              setLoader(false);
            }
            return true;
          }}
          firstButtonName="Cancel"
          secondButtonName={noticeSettingsSaving ? "Saving…" : "Save"}
        >
          <div>
            <p style={{ fontSize: 13, color: "#555" }}>
              When enabled, PayTrade will automatically email compliance
              notices on your behalf where your subscription supports
              delegated sending. When disabled, notices and mail files are
              still generated so you can review and send them manually.
            </p>
            {(noticeSettingsCompany?.plan_type || "Basic") === "Basic" ? (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  background: "#fff5f5",
                  border: "1px solid #f5c6cb",
                  borderRadius: 6,
                  fontSize: 13,
                }}
              >
                Auto-send is a paid-plan feature. Upgrade your subscription
                to enable automatic delivery of compliance notices.
              </div>
            ) : (
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 12,
                }}
              >
                <input
                  type="checkbox"
                  checked={noticeSettingsAutoSend}
                  onChange={(e) =>
                    setNoticeSettingsAutoSend(e.target.checked)
                  }
                />
                <span>Automatically send compliance notices</span>
              </label>
            )}
          </div>
        </BaseModal>
      )}
      {/* Task #97 — Basic-plan upgrade dialog. Mirrors the pattern used in
          TrustAccounting/AddEditAuditDetails.tsx so users see a consistent
          upgrade prompt across the product. */}
      {displaySubscriptionModal && (
        <BaseModal
          modalId={"Upgrade Subscription"}
          title={"Upgrade Subscription"}
          displayModal={displaySubscriptionModal}
          onClose={() => setDisplaySubscriptionModal(false)}
          onHeaderIconClose={() => setDisplaySubscriptionModal(false)}
          onConfirm={() => {
            setDisplaySubscriptionModal(false);
            try {
              router.push(RoutesConst.USER_SUBSCRIPTION_UPGRADE);
            } catch {
              // ignore routing errors — modal will close
            }
            return true;
          }}
          firstButtonName="Not now"
          secondButtonName="Upgrade now"
          restrictOncloseFunctionInHeader
        >
          <h4 className="text_center width_100">{SUBSCRIPTION_UPGRADE}</h4>
        </BaseModal>
      )}
    </div>
  );
}
