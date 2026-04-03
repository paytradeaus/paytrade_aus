"use client";
import BreadCrumbs from "@/components/BreadCrumbs";
import { AppRoutes } from "@/shared/constant/appRoutes";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DynamicTable from "@/components/Table";

import Link from "next/link";
import {
  integrationStatus,
  xeroSyncListHeaders,
  xeroSynListRenderData,
} from "../integration.constant";
import CustomButton from "@/components/CustomButton/CustomButton";
import { buttonType, InputType, VIEW } from "@/shared/constant/general";
import {
  autoMappingBankAccounts,
  autoMappingContact,
  autoMappingContract,
  autoMappingProject,
  createTrackingCategory,
  getTrackingCategories,
  getXeroDashboardCountForCompany,
  getXeroDetailsForCompany,
  SkipContractMapping,
  syncAllBankAccountsByCompanyId,
  syncAllContactsByCompanyId,
  syncAllContractsByCompanyId,
  syncAllProjectsByCompanyId,
  updateTrackingCategory,
  xeroSyncLogs,
} from "../integration.functions";
import BaseModal, { baseModalConstants } from "@/components/BaseModal";
import FormikControl from "@/components/FormikControl";
import { formatDate, stripHtml } from "@/utils";
import { format, formatDistanceToNow } from "date-fns";
import { showErrorToast } from "@/components/Toaster";

export default function XeroDashboard() {
  const router = useRouter();

  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [emptySearchField, setEmptySearchField] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [tableLoader, setTableLoader] = useState(false);
  const [xeroData, setXeroData] = useState<any>();
  const [disableStepButton, setDisableStepButton] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [xeroDetailsLoading, setXeroDetailsLoading] = useState(false);
  const [dashboardCount, setDashboardCount] = useState<any>();

  const [manualMappingModal, setManualMappingModal] = useState<boolean>(false);
  const [currentMappingData, setCurrentMappingData] = useState<{
    from: "bank account" | "contact" | "contract" | "project" | "settings";
    total?: number;
    mapped?: number;
    unmapped?: number;
  } | null>(null);

  const [showXeroCategoryModal, setShowXeroCategoryModal] =
    useState<boolean>(false);
  const [trackingCategories, setTrackingCategories] = useState([]);
  const [selectedTrackingCategoryProject, setTrackingCategoryProject] =
    useState("");
  const [selectedTrackingCategoryContract, setTrackingCategoryContract] =
    useState("");
  const [trackingCategoriesLoading, setTrackingCategoriesLoading] =
    useState(false);
  const [sortValues, setSortValues] = useState<any>("");
  const [syncLogData, setSyncLogData] = useState<any>({
    succeeded: 0,
    warning: 0,
    failed: 0,
    tableData: [],
  });
  const [categoryTrackingError, setCategoryTrackingError] =
    useState<string>("");

  const handleRowClick = (rowData: any) => {
    router.push("/user/integrations/xero/syncLogDetails/" + rowData?.id);
  };
  const actions = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      style: "primary",
      onClick: (rowData: any) => handleRowClick(rowData),
      displayByDefault: true,
    },
  ];
  const companyId = +(localStorage.getItem("companyId") || 0);
  const steps = [
    {
      number: "01",
      title: "Connected - pending settings/mapping",
      buttonName: "Map",
      iconClassName: "fa-light fa-map",
      from: "settings",
    },
    {
      number: "02",
      title: "Pending bank account mapping",
      buttonName: "Import",
      iconClassName: "fa-light fa-file-import",
      from: "bank account",
    },
    {
      number: "03",
      title: "Pending contact mapping",
      buttonName: "Import",
      iconClassName: "fa-light fa-file-import",
      from: "contact",
    },
    {
      number: "04",
      title: "Pending project tracking category mapping",
      buttonName: "Import",
      iconClassName: "fa-light fa-file-import",
      from: "project",
    },
    {
      number: "05",
      title: "Pending contract tracking category mapping",
      buttonName: "Import",
      iconClassName: "fa-light fa-file-import",
      secondButtonName: "Skip",
      secondIconClassName: "fa-light fa-forward",
      twoButtons: true,
      from: "contract",
    },
    {
      number: "06",
      title: "Connected - active",
      from: "",
    },
  ];

  useEffect(() => {
    fetchGetXeroDetailsForCompany();
  }, []);

  const fetchGetXeroDetailsForCompany = async () => {
    setDisableStepButton(true);
    const data = await getXeroDetailsForCompany();
    console.log(data);
    setXeroData(data);
    setCurrentStep(
      integrationStatus[
        data?.integration_status as keyof typeof integrationStatus
      ] == undefined
        ? 7
        : integrationStatus[
            data?.integration_status as keyof typeof integrationStatus
          ]
    );
    // setCurrentStep(7);
    handleXeroDashboardCountForCompany();
    setDisableStepButton(false);
    if (
      integrationStatus[
        data?.integration_status as keyof typeof integrationStatus
      ] == 6
    ) {
      fetchXeroSyncLogs();
    }
  };

  const syncAndAuthMap = async (index: number) => {
    if (index === 0) {
      setCurrentMappingData({
        from: "settings",
      });
      setTrackingCategoryProject(xeroData.project_category_id);
      setTrackingCategoryContract(xeroData.contract_category_id);
      fetchGetTrackingCategories();
      setShowXeroCategoryModal(true);
      return;
    }
    setDisableStepButton(true);
    if (index === 1) {
      const data = await syncAllBankAccountsByCompanyId({
        companyId,
      });
      // const data = await autoMappingBankAccounts({
      //   companyId,
      // });
      if (data.unmapped > 0) {
        setCurrentMappingData({
          ...data,
          from: "bank account",
        });
        setTimeout(() => {
          setManualMappingModal(true);
        }, 1000);
      }
    } else if (index === 2) {
      const data = await syncAllContactsByCompanyId({
        companyId,
      });
      // const data = await autoMappingContact({
      //   companyId,
      // });
      if (data.unmapped > 0) {
        setCurrentMappingData({
          ...data,
          from: "contact",
        });
        setTimeout(() => {
          setManualMappingModal(true);
        }, 1000);
      }
    } else if (index === 3) {
      const data = await syncAllProjectsByCompanyId({
        companyId,
      });
      // const data = await autoMappingProject({
      //   companyId,
      // });
      if (data.unmapped > 0) {
        setCurrentMappingData({
          ...data,
          from: "project",
        });
        setTimeout(() => {
          setManualMappingModal(true);
        }, 1000);
      }
    } else if (index === 4) {
      const data = await syncAllContractsByCompanyId({
        companyId,
      });
      // const data = await autoMappingContract({
      //   companyId,
      // });
      if (data.unmapped > 0) {
        setCurrentMappingData({
          ...data,
          from: "contract",
        });
        setTimeout(() => {
          setManualMappingModal(true);
        }, 1000);
      }
    }
    fetchGetXeroDetailsForCompany();
  };

  async function handleSkipContractMapping() {
    await SkipContractMapping({
      companyId,
    });
    fetchGetXeroDetailsForCompany();
  }

  function fetchGetTrackingCategories(showToast = false) {
    setTrackingCategoriesLoading(true);
    getTrackingCategories(
      {
        companyId: +(localStorage.getItem("companyId") || 0),
      },
      showToast
    ).then((data) => {
      setTrackingCategories(data.tracking_category_list);
      setTrackingCategoriesLoading(false);
    });
  }

  async function handleCategoryTracking() {
    try {
      let api = [];
      if (trackingCategories.length == 0) {
        await createTrackingCategory({
          categoryName: "Project",
          companyId: +(localStorage.getItem("companyId") || 0),
        });
        await createTrackingCategory({
          categoryName: "Contract",
          companyId: +(localStorage.getItem("companyId") || 0),
        });
        const trackingList = await getTrackingCategories(
          {
            companyId: +(localStorage.getItem("companyId") || 0),
          },
          false
        );
        await updateTrackingCategory({
          categoryId: trackingList.tracking_category_list.find(
            (val: { name: string }) => val.name == "Contract"
          )?.id,
          categoryType: "contract",
          id: localStorage.getItem("xeroIntegrationId"),
        });
        await updateTrackingCategory({
          categoryId: trackingList.tracking_category_list.find(
            (val: { name: string }) => val.name == "Project"
          )?.id,
          categoryType: "project",
          id: localStorage.getItem("xeroIntegrationId"),
        });
      }
      if (
        selectedTrackingCategoryProject &&
        selectedTrackingCategoryContract &&
        selectedTrackingCategoryProject == selectedTrackingCategoryContract
      ) {
        setCategoryTrackingError(
          "The Project and Contract tracking categories must not be identical."
        );
        return false;
      }

      if (selectedTrackingCategoryProject) {
        api.push(
          updateTrackingCategory({
            categoryId: selectedTrackingCategoryProject,
            categoryType: "project",
            id: localStorage.getItem("xeroIntegrationId"),
          })
        );
      }
      if (selectedTrackingCategoryContract) {
        api.push(
          updateTrackingCategory({
            categoryId: selectedTrackingCategoryContract,
            categoryType: "contract",
            id: localStorage.getItem("xeroIntegrationId"),
          })
        );
      }
      await Promise.all(api);
      // setTimeout(async () => {
      // await fetchGetXeroDetailsForCompany();
      router.push("/user/integrations/xero/settings");
      // }, 2000);
      return true;
    } catch (error) {
      console.error("Error updating tracking categories:", error);
    }
  }

  const handleMappingNavigation = (from?: any) => {
    const routerUrl: any = {
      "bank account": "/user/integrations/xero/bankAccounts?navigateTo=2",
      contact: "/user/integrations/xero/contacts?navigateTo=2",
      contract: "/user/integrations/xero/contracts?navigateTo=2",
      project: "/user/integrations/xero/projects?navigateTo=2",
      settings: "/user/integrations/xero/settings?navigateTo=2",
    };
    if (from) {
      router.push(routerUrl[from]);
    }
    if (currentMappingData) {
      router.push(routerUrl[currentMappingData.from]);
    }
  };
  function handleXeroDashboardCountForCompany() {
    getXeroDashboardCountForCompany({
      companyId,
    }).then((data) => {
      setDashboardCount({
        bankSynced: data.find(
          (val: { type: string; status: string }) =>
            val.type == "bank" && val.status == "synced"
        )?.status_count,
        bankPending: data.find(
          (val: { type: string; status: string }) =>
            val.type == "bank" && val.status == "pending"
        )?.status_count,
        contactSynced: data.find(
          (val: { type: string; status: string }) =>
            val.type == "contact" && val.status == "synced"
        )?.status_count,
        contactPending: data.find(
          (val: { type: string; status: string }) =>
            val.type == "contact" && val.status == "pending"
        )?.status_count,
        projectSynced: data.find(
          (val: { type: string; status: string }) =>
            val.type == "project" && val.status == "synced"
        )?.status_count,
        projectPending: data.find(
          (val: { type: string; status: string }) =>
            val.type == "project" && val.status == "pending"
        )?.status_count,
        contractSynced: data.find(
          (val: { type: string; status: string }) =>
            val.type == "contract" && val.status == "synced"
        )?.status_count,
        contractPending: data.find(
          (val: { type: string; status: string }) =>
            val.type == "contract" && val.status == "pending"
        )?.status_count,
        billSynced: data.find(
          (val: { type: string; status: string }) =>
            val.type == "bill" && val.status == "synced"
        )?.status_count,
        billPending: data.find(
          (val: { type: string; status: string }) =>
            val.type == "bill" && val.status == "pending"
        )?.status_count,
        invoiceSynced: data.find(
          (val: { type: string; status: string }) =>
            val.type == "invoice" && val.status == "synced"
        )?.status_count,
        invoicePending: data.find(
          (val: { type: string; status: string }) =>
            val.type == "invoice" && val.status == "pending"
        )?.status_count,
      });
    });
  }

  useEffect(() => {
    fetchXeroSyncLogs();
  }, [currentPage, entriesPerPage, sortValues]);

  async function fetchXeroSyncLogs() {
    setTableLoader(true);
    const logs = await xeroSyncLogs({
      getXeroSyncLogsInput: {
        id: localStorage.getItem("xeroIntegrationId"),
        date_filter: null,
        end_date: null,
        page_number: currentPage,
        page_size: entriesPerPage,
        sorting_order: sortValues?.direction || "",
        sorting_field: sortValues?.sortKey || "",
        start_date: null,
      },
    });
    const sync_status_style: any = {
      Succeeded: <span style={{ color: "green" }}>Succeeded</span>,
      Failed: <span style={{ color: "red" }}>Failed</span>,
    };
    setSyncLogData({
      succeeded: logs.count.find(
        (val: { sync_status: string }) => val.sync_status == "Succeeded"
      ).status_count,
      warning: logs.count.find(
        (val: { sync_status: string }) => val.sync_status == "Warning"
      ).status_count,
      failed: logs.count.find(
        (val: { sync_status: string }) => val.sync_status == "Failed"
      ).status_count,
      tableData: logs.xero_logs.map((val: any) => {
        const distanceAgo = formatDistanceToNow(new Date(val.created_on), {
          addSuffix: true,
        });
        const createdDate = format(
          new Date(val.created_on),
          "EEE dd MMM yyyy hh:mm a"
        );
        // Decide process direction
        const isXeroToPaytrade = val.process?.split(">")[0].trim() === "Xero";
        return {
          ...val,
          created_on: val.created_on ? formatDate(val.created_on) : "",
          description: val.description ? stripHtml(val.description) : "",
          process:
            val.process?.split(">")[0].trim() == "Xero" ? (
              <span style={{ color: "#12afe4" }}>Xero ➤ Pay Trade</span>
            ) : (
              <span style={{ color: "#f04e43" }}>Pay Trade ➤ Xero</span>
            ),
          sync_status: sync_status_style[val.sync_status] || val.sync_status,
          reference: isXeroToPaytrade
            ? val.reference?.xeroId || ""
            : val.reference?.paytradeId || "",
          started: (
            <>
              <span>{createdDate}</span>
              <span
                style={{ color: "gray", display: "block", marginTop: "-22px" }}
              >
                {distanceAgo}
              </span>
            </>
          ),
        };
      }),
    });
    setTotalRows(logs.total_count);
    setTableLoader(false);
  }

  function closeModal() {
    setTimeout(() => {
      const { documentElement: html } = document;
      html.classList.add(baseModalConstants.closingClass);
      html.classList.remove(
        baseModalConstants.closingClass,
        baseModalConstants.isOpenClass
      );
      html.style.removeProperty(baseModalConstants.scrollbarWidthCssVar);
    }, baseModalConstants.animationDuration);
  }

  return (
    <div className="container-fluid">
      <div className="pt_title">
        <div className="pt_breadcrumbs">
          <BreadCrumbs
            routePaths={[
              {
                name: "Dashboard",
                path: AppRoutes.USER_DASHBOARD,
              },
              {
                name: "Integrations",
                path: AppRoutes.USER_INTEGRATION,
              },
            ]}
            activeRoute={"Xero"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Xero</h1>
            <p
              style={{
                color:
                  xeroData?.integration_status == "Connected - active"
                    ? "green"
                    : "red",
              }}
            >
              {xeroData?.integration_status}
            </p>
          </div>
        </div>
      </div>
      {disableStepButton && (
        <div
          className="skeleton"
          style={{ width: "100%", height: "100vh" }}
        ></div>
      )}

      {currentStep < 6 && !disableStepButton && (
        <div className="stepper-container">
          <div className="stepper-track-vertical">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`stepper-item-vertical ${
                  index % 2 === 0 ? "left-side" : "right-side"
                }`}
              >
                <div className="stepper-central-line"></div>
                <div
                  className={`stepper-circle ${
                    index + 1 <= currentStep ? "active" : ""
                  }`}
                >
                  {index + 1 === currentStep ? (
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path
                        fill="white"
                        d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
                      />
                    </svg>
                  ) : (
                    <span>{String(index + 1).padStart(2, "0")}</span>
                  )}
                </div>
                <div className="step-card">
                  <div className="step-label">
                    <h6>STEP {index + 1}</h6>
                  </div>
                  <div className="step-title">{step.title}</div>
                  <div className="step-buttons">
                    {index + 1 < currentStep ||
                      (index == currentStep && step.buttonName && (
                        <CustomButton
                          buttonName={step.buttonName}
                          iconClassName={step.iconClassName}
                          buttonType={buttonType.CONTRAST_SMALL}
                          actionType="button"
                          styles={{ margin: "10px 10px 10px 10px" }}
                          onClick={() => {
                            syncAndAuthMap(index);
                          }}
                          disabled={disableStepButton}
                        />
                      ))}
                    {index + 1 < currentStep ||
                      (index == currentStep && step.twoButtons && (
                        <CustomButton
                          buttonName={step.secondButtonName}
                          iconClassName={step.secondIconClassName}
                          buttonType={buttonType.CONTRAST_SMALL}
                          actionType="button"
                          styles={{ margin: "10px 10px 10px 10px" }}
                          disabled={disableStepButton}
                          onClick={() => {
                            handleSkipContractMapping();
                          }}
                        />
                      ))}
                    {index + 1 <= currentStep && (
                      <CustomButton
                        buttonName="View"
                        iconClassName="fa-light fa-eye"
                        buttonType={buttonType.CONTRAST_SMALL}
                        actionType="button"
                        styles={{ margin: "10px 10px 10px 10px" }}
                        onClick={() => handleMappingNavigation(step.from)}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {currentStep >= 6 && !disableStepButton && (
        <>
          <div className="grid">
            <div className="pt_box">
              <h4>SETTINGS </h4>
              <Link
                className="pt_dashbutton"
                href="/user/integrations/xero/settings"
              >
                <button className="contrast">View all</button>
              </Link>
              <div className="xero_dashboard">
                <div className="stats">
                  <div>
                    <span>issues</span>
                    <p className="failed">0</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="pt_box">
              <h4>BANK ACCOUNTS</h4>
              <Link
                className="pt_dashbutton"
                href="/user/integrations/xero/bankAccounts"
              >
                <button className="contrast">View all</button>
              </Link>
              <div className="xero_dashboard">
                <div className="stats">
                  <div className="stats">
                    <div>
                      <span>Synced</span>
                      <p className="success">{dashboardCount?.bankSynced}</p>
                    </div>

                    <div>
                      <span>Pending</span>
                      <p className="warning">{dashboardCount?.bankPending}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>{" "}
            <div className="pt_box">
              <h4>CONTACTS</h4>
              <Link
                className="pt_dashbutton"
                href="/user/integrations/xero/contacts"
              >
                <button className="contrast">View all</button>
              </Link>
              <div className="xero_dashboard">
                <div className="stats">
                  <div className="stats">
                    <div>
                      <span>Synced</span>
                      <p className="success">{dashboardCount?.contactSynced}</p>
                    </div>

                    <div>
                      <span>Pending</span>
                      <p className="warning">
                        {dashboardCount?.contactPending}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="pt_box">
              <h4>CONTRACTS </h4>
              <Link
                className="pt_dashbutton"
                href="/user/integrations/xero/contracts"
              >
                <button className="contrast">View all</button>
              </Link>
              <div className="xero_dashboard">
                <div className="stats">
                  <div className="stats">
                    <div>
                      <span>Synced</span>
                      <p className="success">
                        {dashboardCount?.contractSynced}
                      </p>
                    </div>

                    <div>
                      <span>Pending</span>
                      <p className="warning">
                        {dashboardCount?.contractPending}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid">
            <div className="pt_box">
              <h4>PROJECTS </h4>
              <Link
                className="pt_dashbutton"
                href="/user/integrations/xero/projects"
              >
                <button className="contrast">View all</button>
              </Link>
              <div className="xero_dashboard">
                <div className="stats">
                  <div>
                    <span>Synced</span>
                    <p className="success">{dashboardCount?.projectSynced}</p>
                  </div>

                  <div>
                    <span>Pending</span>
                    <p className="warning">{dashboardCount?.projectPending}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="pt_box">
              <h4>INVOICES </h4>
              <Link
                className="pt_dashbutton"
                href="/user/integrations/xero/invoices"
              >
                <button className="contrast">View all</button>
              </Link>
              <div className="xero_dashboard">
                <div className="stats">
                  <div>
                    <span>Synced</span>
                    <p className="success">{dashboardCount?.invoiceSynced}</p>
                  </div>
                  <div>
                    <span>Pending</span>
                    <p className="warning">{dashboardCount?.invoicePending}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="pt_box">
              <h4>BILLS </h4>
              <Link
                className="pt_dashbutton"
                href="/user/integrations/xero/bills"
              >
                <button className="contrast">View all</button>
              </Link>
              <div className="xero_dashboard">
                <div className="stats">
                  <div>
                    <span>Synced</span>
                    <p className="success">{dashboardCount?.billSynced}</p>
                  </div>
                  <div>
                    <span>Pending</span>
                    <p className="warning">{dashboardCount?.billPending}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="pt_box">
              <h4>PAYMENTS </h4>
              <Link
                className="pt_dashbutton"
                href="/user/integrations/xero/payments"
              >
                <button className="contrast">View all</button>
              </Link>
              <div className="xero_dashboard">
                <div className="stats">
                  <div>
                    <span>Synced</span>
                    <p className="success">0</p>
                  </div>
                  <div>
                    <span>Warning</span>
                    <p className="warning">0</p>
                  </div>
                  <div>
                    <span>issues</span>
                    <p className="failed">0</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid">
            <div className="pt_box">
              <h4>Sync Log</h4>
              <div style={{ display: "flex" }}>
                <CustomButton
                  buttonName="Refresh"
                  iconClassName="fa-light fa-refresh"
                  buttonType={buttonType.CONTRAST_SMALL}
                  actionType="button"
                  onClick={() => {
                    fetchXeroSyncLogs();
                  }}
                  styles={{ margin: "0 10px 10px 10px" }}
                />
                <div
                  style={{
                    marginRight: "10px",
                    textTransform: "uppercase",
                    lineHeight: "18px",
                    fontSize: "11px",
                  }}
                >
                  <span>Synced</span>
                  <p
                    className="success"
                    style={{ textAlign: "right", color: "green" }}
                  >
                    {syncLogData?.succeeded}
                  </p>
                </div>
                <div
                  style={{
                    marginRight: "10px",
                    textTransform: "uppercase",
                    lineHeight: "18px",
                    fontSize: "11px",
                  }}
                >
                  <span>Warning</span>
                  <p
                    className="warning"
                    style={{ textAlign: "right", color: "orange" }}
                  >
                    {syncLogData?.warning}
                  </p>
                </div>
                <div
                  style={{
                    marginRight: "10px",
                    textTransform: "uppercase",
                    lineHeight: "18px",
                    fontSize: "11px",
                  }}
                >
                  <span>issues</span>
                  <p
                    className="failed"
                    style={{ textAlign: "right", color: "red" }}
                  >
                    {syncLogData?.failed}
                  </p>
                </div>
              </div>
              <DynamicTable
                headers={xeroSyncListHeaders}
                gridData={syncLogData?.tableData}
                gridActions={actions}
                onRowClick={handleRowClick}
                hoverOnRowClick
                showLoader={tableLoader}
                loaderColSpan={xeroSyncListHeaders.length}
                renderRowList={xeroSynListRenderData}
                currentPage={currentPage}
                entriesPerPage={entriesPerPage}
                onEntriesPerPageChange={setEntriesPerPage}
                onPageChange={setCurrentPage}
                totalEntries={totalRows}
                onSortChange={(sortConfig) => {
                  if (syncLogData?.tableData?.length > 0) {
                    setSortValues(sortConfig);
                  }
                }}
              />
            </div>
          </div>
        </>
      )}
      {showXeroCategoryModal && (
        <BaseModal
          modalId="confirmation"
          displayModal={showXeroCategoryModal}
          onClose={() => {
            if (trackingCategories.length == 0 && !trackingCategoriesLoading) {
              showErrorToast("Unable to map as no tracking category was found");
            }
            setShowXeroCategoryModal(false);
          }}
          title={"Map Xero tracking category "}
          secondButtonName={
            trackingCategories.length == 0 && !trackingCategoriesLoading
              ? "Yes, Create"
              : "Submit"
          }
          firstButtonName="Cancel"
          onConfirm={async () => {
            const response = await handleCategoryTracking();
            if (response) {
              return true;
            }
          }}
          disableSecondButton={
            trackingCategories.length == 0
              ? false
              : !selectedTrackingCategoryProject
          }
        >
          {trackingCategoriesLoading && (
            <div
              className="skeleton"
              style={{ width: "100%", height: "50vh" }}
            ></div>
          )}
          {trackingCategories.length == 0 && !trackingCategoriesLoading && (
            <>
              <p>
                We couldn't find any tracking category for a project or a
                contract in your Xero account. Do you want us to create one now?
              </p>
            </>
          )}
          {trackingCategories.length > 0 && !trackingCategoriesLoading && (
            <>
              <h5>
                Project<span className="required">*</span>
              </h5>
              <FormikControl
                placeholder="Select tracking category from xero"
                name="projectTracking"
                options={trackingCategories}
                control={InputType.SELECT}
                value={selectedTrackingCategoryProject}
                renderKey="name"
                valueKey="id"
                onChange={(data: any) => {
                  setTrackingCategoryProject(data);
                  setCategoryTrackingError("");
                }}
              />
              <div>
                <h5>Contract</h5>
                <div style={{ display: "flex" }}>
                  <FormikControl
                    placeholder="Select tracking category from xero"
                    name="projectTracking"
                    options={trackingCategories}
                    control={InputType.SELECT}
                    value={selectedTrackingCategoryContract}
                    renderKey="name"
                    valueKey="id"
                    onChange={(data: any) => {
                      setTrackingCategoryContract(data);
                      setCategoryTrackingError("");
                    }}
                  />
                  {selectedTrackingCategoryContract && (
                    <CustomButton
                      styles={{ height: "45px", marginLeft: "15px" }}
                      buttonName="Clear"
                      iconClassName="fa-light fa-close"
                      buttonType={buttonType.CONTRAST_SMALL}
                      actionType="button"
                      onClick={() => {
                        setTrackingCategoryContract("");
                      }}
                    />
                  )}
                </div>
              </div>
              <p>
                If the categories available is not the ones you want to use then
                create new from &nbsp;
                <Link
                  onClick={() => closeModal()}
                  href="/user/integrations/xero/settings"
                >
                  Xero Settings
                </Link>
              </p>
              {categoryTrackingError && (
                <div style={{ color: "red" }}>{categoryTrackingError}</div>
              )}
            </>
          )}
        </BaseModal>
      )}

      {manualMappingModal && (
        <BaseModal
          modalId="Manual_Mapping"
          displayModal={manualMappingModal}
          onClose={() => {
            fetchGetXeroDetailsForCompany();
            setDisableStepButton(false);
            setManualMappingModal(false);
          }}
          title={"Manual Mapping"}
          secondButtonName="Yes, allow mapping"
          firstButtonName="Cancel"
          onConfirm={() => {
            handleMappingNavigation();
            return true;
          }}
        >
          <p>
            Sync complete. Some {currentMappingData?.from} were mapped
            automatically, but others could not be matched. Would you like to
            map the remaining {currentMappingData?.from} manually?
          </p>
          <div className="mapping_result">
            <div className="stats">
              <div>
                <span>Total</span>
                <p className="success">{currentMappingData?.total}</p>
              </div>
              <div>
                <span>Mapped</span>
                <p className="success">{currentMappingData?.mapped}</p>
              </div>
              <div>
                <span>Unmapped</span>
                <p className="failed">{currentMappingData?.unmapped}</p>
              </div>
            </div>
          </div>
        </BaseModal>
      )}
    </div>
  );
}
