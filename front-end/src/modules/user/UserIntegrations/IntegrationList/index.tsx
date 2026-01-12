"use client";

import BreadCrumbs from "@/components/BreadCrumbs";
import FormikControl from "@/components/FormikControl";
import GridExportActions from "@/components/GridExportActions";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import DynamicTable from "@/components/Table";
import TabSwitch from "@/components/TabSwitch";
import { AppRoutes } from "@/shared/constant/appRoutes";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";

import { InputType } from "@/shared/constant/general";
import { useRouter, useSearchParams } from "next/navigation";
import BaseModal from "@/components/BaseModal";
import {
  disconnectFromXero,
  getIntegrationListsForCompany,
  getXeroAuthURL,
  integrateAdatree,
  pauseOrUnpauseXero,
} from "../integration.functions";
import { showErrorToast } from "@/components/Toaster";
import {
  listTabOptions,
  integrationListHeaders,
  integrationListRenderData,
} from "../integration.constant";
import { formatDate } from "@/utils";
import { getSubscriptionDetailsByCompanyId } from "../../Subscriptions/subscriptions.function";

interface IntegrationListProps {
  archiveMode?: boolean;
}

export default function IntegrationList({
  archiveMode = false,
}: IntegrationListProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [tabStatus] = useState(archiveMode ? "Archived" : "Current");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [emptySearchField, setEmptySearchField] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [tableLoader, setTableLoader] = useState(false);
  const [integrationData, setIntegrationData] = useState<any[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [openPlanModal, setOpenPlanModal] = useState<boolean>(false);

  const [xeroConsentModal, setXeroConsentModal] = useState(false);
  const [xeroDeleteModal, setXeroDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any>("");
  const [sortValues, setSortValues] = useState<any>("");
  const companyId = +(localStorage.getItem("companyId") || 0);
  const [xeroAllowed, setXeroAllowed] = useState<boolean | null>(null);
  const [adatreeAllowed, setAdatreeAllowed] = useState<boolean | null>(null);
  const [modalHeading, setModalHeading] = useState<string>("");
  const [modalBodyContent, setModalBodyContent] = useState<string>("");

  // 1️⃣ Fetch subscription on mount
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const subscriptionResponse = await getSubscriptionDetailsByCompanyId();
        // 🔹 FREE PLAN CHECK
        const isFreePlanEligible =
          subscriptionResponse?.is_free_plan_eligible === true;
        // 🔹 Check Xero integration
        const xeroItem =
          subscriptionResponse?.plan_items?.find(
            (item: any) => item.item_name === "Xero Integration"
          ) || null;

        let isXeroAllowed =
          xeroItem && String(xeroItem.limit_value).toLowerCase() === "true";
        // setXeroAllowed(!!isXeroAllowed);

        // 🔹 Check Bank feeds (Adatree)
        const adatreeItem =
          subscriptionResponse?.plan_items?.find(
            (item: any) => item.item_name === "Bank Feeds"
          ) || null;

        let isAdatreeAllowed =
          adatreeItem &&
          String(adatreeItem.limit_value).toLowerCase() === "true";
        // setAdatreeAllowed(!!isAdatreeAllowed);
        // 🔥 FREE PLAN OVERRIDE → ALWAYS ALLOW
        if (isFreePlanEligible) {
          isXeroAllowed = true;
          isAdatreeAllowed = true;
        }

        // 🔹 Set final allowed states
        setXeroAllowed(!!isXeroAllowed);
        setAdatreeAllowed(!!isAdatreeAllowed);
      } catch (error) {
        console.error("Error fetching subscription:", error);
        setXeroAllowed(false); // fail-safe
        setAdatreeAllowed(false); // fail-safe
      }
    };

    fetchSubscription();
  }, []);

  useEffect(() => {
    const error = params.get("error");
    if (!error) return;
    const timeoutId = setTimeout(() => {
      showErrorToast(error);
      router.replace(window.location.pathname);
    }, 1);
    return () => clearTimeout(timeoutId);
  }, [params]);

  useEffect(() => {
    getIntegrationLists();
  }, [currentPage, entriesPerPage, sortValues]);

  async function getIntegrationLists() {
    setTableLoader(true);
    const integrationList = await getIntegrationListsForCompany({
      getIntegrationListsInput: {
        company_id: +(localStorage.getItem("companyId") || 0),
        integration_status: archiveMode ? "Archived" : "",
        page_number: currentPage,
        page_size: entriesPerPage,
        sorting_field: sortValues?.sortKey || "",
        sorting_order: sortValues?.direction || "",
      },
    });
    setIntegrationData(
      integrationList.integration_list.map((val: any) => {
        return {
          ...val,
          integration_date: formatDate(val.integration_date),
          actionIcons: actionIconCondition(val),
        };
      })
    );
    setTotalRows(integrationList.total_count);
    setTableLoader(false);
  }

  function actionIconCondition(val: any) {
    if (val.integration_name == "Xero") {
      return {
        view: !["Disconnected", "Connected - paused", "Inactive"].includes(
          val.integration_status
        ),
        disconnect: ![
          "Disconnected",
          "Connected - paused",
          "Inactive",
        ].includes(val.integration_status),
        connect: ["Disconnected", "Inactive"].includes(val.integration_status),
        pause: !["Connected - paused", "Disconnected", "Inactive"].includes(
          val.integration_status
        ),
        unpause: val.integration_status === "Connected - paused",
        settings: !["Disconnected", "Inactive"].includes(
          val.integration_status
        ),
        delete: !["Connected - paused", "Disconnected"].includes(
          val.integration_status
        ),
      };
    } else {
      return {
        disconnect: false,
        pause: false,
        unpause: false,
        delete: false,
      };
    }
  }

  const handleRowClick = (row: any) => {
    if (
      row.integration_name == "Xero" &&
      !["Disconnected", "Connected - paused"].includes(
        row.integration_status
      ) &&
      !archiveMode
    ) {
      localStorage.setItem("xeroIntegrationId", row.id);
      router.push(`/user/integrations/xero`);
    }
  };

  function handleTabChange(value: string) {
    router.push(
      value === "Archived"
        ? AppRoutes.USER_INTEGRATION_ARCHIVED
        : AppRoutes.USER_INTEGRATION
    );
  }

  // async function clickedIntegration(data: any) {
  //   if (data.label == "Xero") {
  //     setTimeout(() => {
  //       setXeroConsentModal(true);
  //     }, 2000);
  //   } else if (data.label == "Adatree") {
  //     setTableLoader(true);
  //     await integrateAdatree(
  //       {
  //         integrateAdatreeInput: {
  //           company_id: companyId,
  //         },
  //       },
  //       setTableLoader
  //     );
  //     getIntegrationLists();
  //   }
  // }

  // 2️⃣ Click handler
  async function clickedIntegration(data: any) {
    if (data.label === "Xero") {
      if (!xeroAllowed) {
        setModalHeading("Upgrade Subscription");
        setModalBodyContent(
          "Your current subscription does not allow Xero integration. Please upgrade your plan to enable this feature."
        );
        setOpenPlanModal(true);
        return;
      }

      // ✅ Allowed → proceed
      setTimeout(() => {
        setXeroConsentModal(true);
      }, 2000);
    }

    if (data.label === "Adatree") {
      if (!adatreeAllowed) {
        setModalHeading("Upgrade Subscription");
        setModalBodyContent(
          "Your current subscription does not allow Adatree integration. Please upgrade your plan to enable this feature."
        );
        setOpenPlanModal(true);
        return;
      }

      // ✅ Allowed → proceed
      setTableLoader(true);
      await integrateAdatree(
        {
          integrateAdatreeInput: {
            company_id: companyId,
          },
        },
        setTableLoader
      );
      getIntegrationLists();
    }
  }

  async function getXeroAuthorizationLink() {
    const url = await getXeroAuthURL({
      companyId: +(localStorage.getItem("companyId") || 0),
    });
    window.open(url, "_self");
  }

  const handleOptionClick = async (data: any) => {
    if (data.option == "disconnect") {
      setTableLoader(true);
      await disconnectFromXero({
        disconnectFromXeroId: data.id,
        type: "disconnect",
      });
      getIntegrationLists();
    } else if (data.option == "connect") {
      setTableLoader(true);
      getXeroAuthorizationLink();
    } else if (data.option == "pause") {
      setTableLoader(true);
      await pauseOrUnpauseXero({
        pauseOrUnpauseXeroId: data.id,
        isPaused: true,
      });
      getIntegrationLists();
    } else if (data.option == "unpause") {
      setTableLoader(true);
      await pauseOrUnpauseXero({
        pauseOrUnpauseXeroId: data.id,
        isPaused: false,
      });
      getIntegrationLists();
    }
  };

  async function deleteXero() {
    setTableLoader(true);
    console.log(selectedRow);
    await disconnectFromXero({
      disconnectFromXeroId: selectedRow.id,
      type: "delete",
    });
    getIntegrationLists();
  }

  const actions = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      style: "primary",
      onClick: (row: any) => {
        handleRowClick(row);
      },
      conditionalApiDisplayKey: "view",
    },
    {
      label: "Disconnect",
      icon: "fa-light fa-unlink",
      onClick: (row: any) => {
        handleOptionClick({
          ...row,
          option: "disconnect",
        });
      },
      conditionalApiDisplayKey: "disconnect",
    },
    {
      label: "Reconnect",
      icon: "fa-light fa-link",
      onClick: (row: any) => {
        handleOptionClick({
          ...row,
          option: "connect",
        });
      },
      conditionalApiDisplayKey: "connect",
    },
    {
      label: "Pause",
      icon: "fa-light fa-pause",
      onClick: (row: any) => {
        handleOptionClick({
          ...row,
          option: "pause",
        });
      },
      conditionalApiDisplayKey: "pause",
    },
    {
      label: "Unpause",
      icon: "fa-light fa-play",
      onClick: (row: any) => {
        handleOptionClick({
          ...row,
          option: "unpause",
        });
      },
      conditionalApiDisplayKey: "unpause",
    },
    {
      label: "Settings",
      icon: "fa-light fa-cog",
      onClick: (row: any) => {
        localStorage.setItem("xeroIntegrationId", row.id);
        router.push(`/user/integrations/xero/settings`);
      },
      conditionalApiDisplayKey: "settings",
    },
    {
      label: "Delete",
      icon: "fa-light fa-trash",
      style: "contrast",
      onClick: (row: any) => {
        setSelectedRow(row);
        setXeroDeleteModal(true);
      },
      conditionalApiDisplayKey: "delete",
    },
  ];
  const addIntegrationCondition = () => {
    const adatree = {
      routeLink: "",
      label: "Adatree",
      logo: "/images/adaTree.png",
      width: "30",
      height: "30",
      description:
        "Adatree's modular Open Banking platform provides all technical components necessary for Data Recipients to securely receive consumer data in an efficient, legislation-conformant way. The Open Banking API solution is specifically built to the Australian CDR standard.",
    };

    const xero = {
      routeLink: "",
      label: "Xero",
      logo: "/images/xero-logo.png",
      width: "60",
      height: "60",
      description:
        "Xero’s online accounting software connects small business owners with their numbers, their bank, and advisors at anytime.",
    };

    const hasXero = integrationData.some(
      (val) => val.integration_name === "Xero"
    );
    const hasAdatree = integrationData.some(
      (val) => val.integration_name === "Adatree"
    );

    if (hasXero && hasAdatree) return [[]];
    if (hasXero) return [[adatree]];
    if (hasAdatree) return [[xero]];

    return [[xero, adatree]];
  };

  const addIntegrationList = useMemo(addIntegrationCondition, [
    integrationData,
  ]);

  const handleConfirm = () => {
    setOpenPlanModal(false);

    router.push(AppRoutes.SUBSCRIPTION_PRICING);
  };

  return (
    <div className="container-fluid">
      <div className="pt_title">
        <div className="pt_breadcrumbs">
          <BreadCrumbs
            routePaths={
              archiveMode
                ? [
                    {
                      name: "Dashboard",
                      path: AppRoutes.USER_DASHBOARD,
                    },
                  ]
                : [
                    {
                      name: "Dashboard",
                      path: AppRoutes.USER_DASHBOARD,
                    },
                  ]
            }
            activeRoute={"Integrations"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Integrations</h1>
          </div>
          {!archiveMode && addIntegrationList?.[0].length > 0 && (
            <div className="pt_pageactions">
              <a className="pt_addnewbutton" onClick={() => setOpenModal(true)}>
                <button className="secondary">
                  <i className="fa-light fa-hexagon-plus"></i>Add integration
                </button>
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="pt_filtergroup">
        <div className="grid pt_topfilters">
          <div className="pt_filters ">
            <TabSwitch
              tabOptions={listTabOptions}
              tabValue={tabStatus}
              onChange={(value: any) => handleTabChange(value)}
            />
          </div>
          <GridExportActions
            resetFilterFunction={() => {}}
            hideExcelButton={true}
            hidePdfButton={true}
            hideResetButton={true}
          />
        </div>
      </div>

      <div className="grid">
        <div className="pt_box">
          <div className="grid">
            <h4>{tabStatus || "Current"}</h4>
          </div>
          <DynamicTable
            headers={
              !archiveMode
                ? integrationListHeaders
                : integrationListHeaders.slice(0, -1)
            }
            gridData={integrationData}
            gridActions={!archiveMode ? actions : []}
            onRowClick={handleRowClick}
            hoverOnRowClick
            showLoader={tableLoader}
            loaderColSpan={integrationListHeaders.length}
            renderRowList={integrationListRenderData}
            currentPage={currentPage}
            entriesPerPage={entriesPerPage}
            onEntriesPerPageChange={setEntriesPerPage}
            onPageChange={setCurrentPage}
            totalEntries={totalRows}
            dynamicApiGridIconsKey={"actionIcons"}
            onSortChange={(sortConfig) => {
              if (integrationData?.length > 0) {
                setSortValues(sortConfig);
              }
            }}
          />
        </div>
      </div>
      {openModal && (
        <BaseModal
          modalId={"selectPaymentTypes"}
          displayModal={openModal}
          title="Select Integration"
          onHeaderIconClose={() => setOpenModal(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setOpenModal(false)}
          onConfirm={() => {
            return true;
          }}
          hideFooter
          isPaymentType
          customOptionsForModal={addIntegrationList}
          childrenClicked={(data) => {
            clickedIntegration(data);
            setOpenModal(false);
          }}
        />
      )}
      {xeroConsentModal && (
        <BaseModal
          modalId={"selectPaymentTypes"}
          displayModal={xeroConsentModal}
          title="Attention"
          onHeaderIconClose={() => setXeroConsentModal(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setXeroConsentModal(false)}
          onConfirm={() => {
            getXeroAuthorizationLink();
            return true;
          }}
          firstButtonName="No"
          secondButtonName="Yes"
        >
          To continue, you will be redirected to Xero for authorization. Once
          completed, you will be returned to PayTrade. Do you agree to proceed?
        </BaseModal>
      )}
      {xeroDeleteModal && (
        <BaseModal
          modalId={"xerDelete"}
          title={" "}
          displayModal={xeroDeleteModal}
          onHeaderIconClose={() => setXeroDeleteModal(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setXeroDeleteModal(false)}
          onConfirm={() => {
            deleteXero();
            return true;
          }}
          firstButtonName="No"
          secondButtonName="Yes"
        >
          <h4 className="text_center">
            Are you sure you wish to delete xero integration?
          </h4>
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
    </div>
  );
}
