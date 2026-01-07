"use client";
import React, { useCallback, useEffect, useState } from "react";
import Overlays from "@/components/Overlayes/Overlayes";
import { ThreeDots } from "react-bootstrap-icons";
import styles from "./subscriptionList.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { usePathname, useRouter } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";

import { ApplicationURLS } from "@/common/applicationURLS";
import { RowsPerPageInTable } from "@/common/constants";
import { AppModal } from "@/components/model/model";
import { useTokenDetails } from "@/common/commonHooks";
import { SUPER_ADMIN_ROLE } from "@/common/constants/roles";
import {
  convertJsonToExcel,
  generateAndPrintPDF,
  upperCaseFirstLetter,
} from "@/common/commonFunctions";
import { AdminListSubscriptionPlans } from "../subscriptions.functions";
import { SubscriptionPlan } from "../subscriptions.types";
import { AdminArchiveSubscription } from "../../addAdminUser/addAdminUser.functions";
import FormButton from "@/components/Button/button";
import debounce from "lodash/debounce";
import CustomHeader from "./customHeader";
import { DELETE, EDIT, VIEW } from "@/common/constants/general";
import { useLoaderContext } from "@/context/useLoader";
import TabContainer from "@/container/addGroups/tabsContainer";
import { tabOptions } from "@/container/userModules/clientsAndSuppliers/clientSuppliers.constant";
import {
  AllActionOptions,
  freeActionOptions,
  planTypes,
  statusOptions,
} from "./subscription.constant";
import { planType } from "@/container/userModules/manageSubscriptions/manageSubscriptions.constant";

const SubscriptionsList = ({ isArchive = false }) => {
  const routePath = usePathname();
  const { decodeTokenData } = useTokenDetails();
  const router = useRouter();
  const [selectedValue, setSelectedValue] = useState("");
  const [loading, setLoading] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);
  const [userData, setUserData] = useState<SubscriptionPlan[]>([]);

  const [search, setSearch] = useState("");
  const [selectedData, setSingleSelectedData] = useState();
  const [openModal, setOpenModal] = useState(false);
  const [actionData, setActionData] = useState<any>();
  const [popupMessage, setPopupMessage] = useState({
    headerMsg: "",
    subHeaderMsg: "",
  });
  const [selectedPlanData, setSelectedPlanData] = useState<string | null>(null);
  const [planTypeValue, setPlanTypeValue] = useState<string | null>(null);
  const [printDocumentData, setPrintDocumentData] = useState<any>([]);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTab, setSelectedTab] = useState(
    isArchive ? tabOptions[1]?.id : tabOptions[0]?.id
  );
  const resetFilters = () => {
    setSearch(""); // Reset search input
    setSelectedPlanData(null); // Reset status filter
    setPlanTypeValue(null);
  };

  // Check if either the search input or the selected filter has been changed
  const isAnyFilterActive =
    search !== "" || selectedPlanData !== null || planTypeValue !== null;
  const { setLoader }: any = useLoaderContext();

  useEffect(() => {
    const delayedSearch = debounce(() => {
      setDebouncedSearch(search);
    }, 500);

    delayedSearch();
    return delayedSearch.cancel; // Cleanup
  }, [search]);

  useEffect(() => {
    getAllSubscriptionPlans(page, perPage);
  }, [debouncedSearch, selectedValue, planTypeValue]);

  async function getAllSubscriptionPlans(page: number, rowsPerPage: number) {
    setLoading(true);
    const postData = {
      getAllSubscriptionPlanInput: {
        plan_type: planTypeValue ?? "",
        search: search ?? "",
        status: isArchive ? "Inactive" : "Active",
        page_number: page,
        page_size: rowsPerPage,
      },
    };
    const subscriptionListResponse = await AdminListSubscriptionPlans(
      postData,
      setLoading
    );
    setUserData(subscriptionListResponse?.plan_list || []);
    setTotalRows(subscriptionListResponse?.total_count || 0);
    setPerPage(rowsPerPage);

    let printDataObjCreation = subscriptionListResponse?.plan_list?.map(
      (each: SubscriptionPlan) => {
        return {
          plan_name: each?.plan_name,
          plan_type: each?.plan_type,
          description: each?.description,
          yearly_price: each?.yearly_price,
          monthly_price: each?.monthly_price,
          trial_period: each?.trial_period,
          plan_status: each?.plan_status,
          subscription_status: each?.subscription_status,
          plan_items: each?.plan_items
            ?.map((each: any) => each?.item_name)
            .toLocaleString(),
        };
      }
    );
    setPrintDocumentData(printDataObjCreation);
  }

  function handleSelectChange(selectedValue: any) {
    setSingleSelectedData(selectedValue);
    setSelectedValue(selectedValue.value);
  }
  function handlePlanChange(selectedValue: any) {
    setSelectedPlanData(selectedValue);
    setPlanTypeValue(selectedValue.value);
  }
  async function handleOptionClick(data: { id: string; option: string }) {
    const { id, option } = data;

    setActionData(data);
    if (option === DELETE) {
      setOpenModal(!openModal);
      setPopupMessage((prev) => ({
        headerMsg: "",
        subHeaderMsg: "Are you sure you wish to delete this Subscription?",
      }));
    } else if (option === EDIT) {
      router.push(`${ApplicationURLS.ADMIN_SUBSCRIPTION_EDIT}/${id}`);
    } else if (option === VIEW) {
      router.push(`${ApplicationURLS.ADMIN_SUBSCRIPTION_VIEW}/${id}`);
    }
  }

  const handleRowView = (id: any) => {
    router.push(`${ApplicationURLS.ADMIN_SUBSCRIPTION_VIEW}/${id}`);
  };

  async function handleDeleteSubscription() {
    try {
      setOpenModal(!openModal);
      if (actionData.option === "Delete") {
        let payload = {
          id: actionData?.id,
        };

        setLoader(true);

        let response = await AdminArchiveSubscription(payload);
        if (response) {
          await getAllSubscriptionPlans(page, perPage);
        }
      }
      setLoader(false);
    } catch (err: any) {
      setLoader(false);
    }
  }
  async function handlePageChange(page: number) {
    setPage(page);
    await getAllSubscriptionPlans(page, perPage);
  }

  async function handlePerRowsChange(newPerPage: number, page: number) {
    setPerPage(newPerPage);
    await getAllSubscriptionPlans(page, newPerPage);
  }

  function downloadExcel() {
    const columnNames = [
      { value: "plan_name", label: "Plan Name" },
      { value: "plan_type", label: "Plan Type" },
      { value: "monthly_price", label: "Monthly Price" },
      { value: "yearly_price", label: "Yearly Price" },
      { value: "description", label: "Description" },
      { value: "trial_period", label: "Trial Period" },
      { value: "plan_status", label: "Status" },
      { value: "plan_items", label: "Items" },
    ];
    convertJsonToExcel(printDocumentData, "Subscription list", columnNames);
  }
  const handlePrintPDF = () => {
    let formatedTableData: any[] = printDocumentData?.map((user: any) => [
      user?.plan_name,
      user?.plan_type,
      user?.monthly_price,
      user?.yearly_price,
      user?.description,
      user?.trial_period,
      user?.plan_status,
      user?.plan_items,
    ]);
    let headerNames: string[] = [
      "Plan Name",
      "Plan Type",
      "Monthly Price",
      "Yearly Cycle",
      "Description",
      "Trial Period",
      "Status",
      "Items",
    ];
    generateAndPrintPDF(formatedTableData, headerNames, "subscription", true);
  };

  function dynamicActions(row: any) {
    if (row?.plan_type !== planType.FREE) {
      return AllActionOptions;
    } else if (row?.plan_type === planType.FREE) {
      return freeActionOptions;
    } else {
      return [AllActionOptions[0]];
    }
  }
  const columns = [
    {
      name: "Plan Name",
      grow: true,
      wrap: true,
      minWidth: "200px",
      selector: (row: SubscriptionPlan) => row?.plan_name || "",
    },
    {
      name: "Plan Type",
      grow: true,
      wrap: true,
      minWidth: "200px",
      selector: (row: SubscriptionPlan) =>
        row?.plan_type ? upperCaseFirstLetter(row?.plan_type) : "",
    },
    {
      name: "Stripe Id",
      grow: true,
      fixed: "right",
      // wrap: true,
      minWidth: "200px",
      selector: (row: SubscriptionPlan) => row?.stripe_product_id || "",
    },
    {
      name: "Monthly Price",
      fixed: "right",
      // grow: true,
      wrap: true,
      minWidth: "200px",
      selector: (row: SubscriptionPlan) => row?.monthly_price || "",
    },
    {
      name: "Yearly Price",
      fixed: "right",
      // grow: true,
      wrap: true,
      minWidth: "200px",
      selector: (row: SubscriptionPlan) => row?.yearly_price || "",
    },

    {
      name: "Status",
      fixed: "right",
      grow: true,
      selector: (row: SubscriptionPlan) => row?.plan_status || "",
    },

    ...(decodeTokenData?.role === SUPER_ADMIN_ROLE
      ? [
          {
            name: "Action",
            fixed: "right",
            grow: true,
            center: true,
            cell: (row: SubscriptionPlan, index: number) => (
              <Overlays
                trigger="click"
                placement={
                  userData?.length > 3 && userData?.length == index + 1
                    ? "top-end"
                    : "bottom-end"
                }
                overlay={<span></span>}
                popoverTypes={"tableActions"}
                popoverActions={dynamicActions(row)}
                customPopupstyles={styles.customPopupstyles}
                optionClick={(data) => handleOptionClick(data)}
                cellData={{
                  id: row.id,
                }}
                popperConfig={{
                  modifiers: [
                    {
                      name: "offset",
                      options: {
                        offset: [20, 10], // Adjust the offset as needed
                      },
                    },
                  ],
                }}
              >
                <div style={{ cursor: "pointer" }}>
                  <ThreeDots />
                </div>
              </Overlays>
            ),
          },
        ]
      : []),
  ];

  const onInputChange = useCallback((e: { target: { value: string } }) => {
    const inputvalue = e?.target?.value?.trim()
      ? e?.target?.value
      : e?.target?.value?.trim();
    setSearch(inputvalue);
  }, []);

  function handleTabClick(tab: any) {
    if (tab === selectedTab) {
      return;
    } else if (tab === tabOptions[0]?.id) {
      setSelectedTab(tab);
      router.push(ApplicationURLS.ADMIN_SUBSCRIPTION);
    } else if (tab === tabOptions[1]?.id) {
      setSelectedTab(tab);
      router.push(ApplicationURLS.ADMIN_SUBSCRIPTION_ARCHIVE);
    }
  }

  return (
    <div className={styles.dataContainer}>
      <ReusableBreadcrumb
        items={[
          {
            href: ApplicationURLS.ADMIN_DASHBOARD,
            label: "Home",
            active: false,
          },
          {
            href: ApplicationURLS.ADMIN_SUBSCRIPTION,
            label: "Subscription",
            active: false,
          },
          {
            href: "",
            label: "Manage Plans",
            active: true,
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      <div className={styles.headerAndButtonCon}>
        <span className={styles.headerText}>Manage Plans</span>

        <FormButton
          className={styles.buttonStyles}
          onClick={() => router.push(ApplicationURLS.ADMIN_SUBSCRIPTION_ADD)}
        >
          + Add Subscription
        </FormButton>
      </div>
      <div>
        <TabContainer
          tabs={tabOptions}
          activeTab={selectedTab}
          onTabClick={handleTabClick}
        />
      </div>
      <ReusableDataTable
        columns={columns}
        data={userData}
        subHeader
        subHeaderComponent={
          <CustomHeader
            search={search}
            onInputChange={onInputChange}
            planTypes={planTypes}
            handlePlanChange={handlePlanChange}
            selectedPlanData={selectedPlanData}
            options={statusOptions}
            handleSelectChange={handleSelectChange}
            selectedData={singleSelectedData}
            printDocumentData={printDocumentData}
            handlePrintPDF={handlePrintPDF}
            downloadExcel={downloadExcel}
            resetFilters={resetFilters} // Pass reset function to child
            isAnyFilterActive={isAnyFilterActive} // Pass filter active state to child
          />
        }
        pagination
        progressPending={loading}
        paginationServer
        paginationTotalRows={totalRows}
        onChangeRowsPerPage={handlePerRowsChange}
        onChangePage={handlePageChange}
        onRowClicked={(data: any) => handleRowView(data?.id)}
      />
      <AppModal
        show={openModal}
        onHide={() => setOpenModal(false)}
        secondButtonLabel="No"
        firstButtonLabel="Yes"
        modalHeading={popupMessage?.headerMsg || ""}
        modalBodyContent={popupMessage?.subHeaderMsg || ""}
        onConfirm={() => {
          handleDeleteSubscription();
        }}
      />
    </div>
  );
};

export default SubscriptionsList;
