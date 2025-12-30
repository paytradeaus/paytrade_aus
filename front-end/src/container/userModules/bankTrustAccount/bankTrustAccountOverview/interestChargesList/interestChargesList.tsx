"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import { RootState } from "@/redux/store";
import FormButton from "@/components/Button/button";
import { ThreeDots } from "react-bootstrap-icons";
import { useRouter } from "next/navigation";
import styles from "./interestChargesList.module.scss";
import { ApplicationURLS } from "@/common/applicationURLS";
import { DD_MM_YYYY } from "@/common/constants/general";
import ReusableDataTable from "@/components/DataTable/dataTable";
import Overlays from "@/components/Overlayes/Overlayes";
import {
  DeletePayments,
  fetchAllPayments,
} from "../../backTrustAccount.functions";
import {
  convertJsonToExcel,
  convertPositiveDecimalTwoDigit,
  formatDate,
  generateAndPrintPDF,
} from "@/common/commonFunctions";
import { getCookie } from "cookies-next";
import { PAYMENT_TYPES, tabOptions } from "../../bankTrustAccount.constant";
import { AppModal } from "@/components/model/model";
import { InterestFieldData } from "../../bankTrustAccount.types";
import TabContainer from "@/container/addGroups/tabsContainer";
import debounce from "lodash/debounce";
import CustomSubHeader from "./customSubHeader";
import { getListActionButtons } from "@/app/api/commonAPIs";
import { ActionItem } from "@/container/userModules/paymentsList/paymentsList.constant";

const InterestChargeList = (props: any) => {
  const router = useRouter();
  const { bankAccountId, setRefreshOverviewOnAction } = props;
  const dispatch = useDispatch();
  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const screenDetails: any = useSelector(
    (state: RootState) => state.dashBoard.screenDetails
  );
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [singleSelectedData, setSingleSelectedData] = useState<any>();

  const [activityLogStartDate, setActivityLogStartDate] = useState(
    new Date(new Date().setHours(0, 0, 0, 0))
  );
  const [singleActivyDate, setSingleActivyDate] = useState<any>({
    value: "All dates",
    label: "All Dates",
  });
  const [activityDate, setActivityDate] = useState("All dates");
  const [activityLogEndDate, setActivityLogEndDate] = useState(
    new Date(new Date().setHours(23, 59, 59, 999))
  );
  const [interestPaymentData, setInterestPaymentData] = useState<any>();
  const [totalRows, setTotalRows] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchValue, setSearchValue] = useState<any>();
  const [interestStatusValue, setInterestStatusValue] = useState<any>();
  const [printDocumentData, setPrintDocumentData] = useState<any>([]);
  const [interestOpenModal, setInterestOpenModal] = useState(false);
  const [interestDeleteId, setInterestDeleteId] = useState<any>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [activeInterestTab, setActiveInterestTab] = useState<any>(
    screenDetails?.selectTab || "currentAccounts"
  );

  const [deleteDisabled, setDeleteDisabled] = useState<boolean>(true);

  const [popupMessage, setPopupMessage] = useState({
    headerMsg: "",
    subHeaderMsg: "",
  });
  const [popoverActions, setPopoverActions] = useState<ActionItem[]>([
    { label: "View", value: "View" },
  ]);

  useEffect(() => {
    const delayedSearch = debounce(() => {
      setDebouncedSearch(searchValue);
    }, 500);

    delayedSearch();
    return delayedSearch.cancel; // Cleanup
  }, [searchValue]);

  useEffect(() => {
    handleGetAllPaymentList(page, rowsPerPage);
  }, [
    interestStatusValue,
    debouncedSearch,
    activityDate,
    activityLogEndDate,
    activityLogStartDate,
    activeInterestTab,
  ]);

  const handleGetAllPaymentList = async (newPage: any, newPerPage: any) => {
    setLoading(true);
    const payload = {
      payment_type: PAYMENT_TYPES,
      bank_account_id: bankAccountId || null,
      page_number: newPage,
      page_size: newPerPage,
      company_id: selectedCompanyId || null,
      keyword: searchValue ?? null,
      status:
        activeInterestTab === "archivedAccounts"
          ? "Void"
          : interestStatusValue?.value ?? null,
      start_date: isCustomDate ? activityLogStartDate : null,
      end_date: isCustomDate ? activityLogEndDate : null,
      date_filter: activityDate === "All dates" ? "" : activityDate,
    };
    let response = await fetchAllPayments(payload);
    setInterestPaymentData(response?.payments);
    setTotalRows(response?.total_count);
    setLoading(false);

    let printDataObjCreation = response?.payments?.map((item: any) => {
      return {
        payment_type: item?.payment_type,
        payment_date: item?.payment_date
          ? formatDate(item?.payment_date, DD_MM_YYYY)
          : "N/A",
        payment_amount:
          `$ ${Math.abs(item.payment_amount).toFixed(2)}` || "$0.00",
        status: item?.status,
      };
    });

    setPrintDocumentData(printDataObjCreation);
  };
  const handleChangePage = (newPage: number) => {
    setPage(newPage);
    handleGetAllPaymentList(newPage, rowsPerPage);
  };
  const handleChangeRowPerPage = (newPerPage: any, page: any) => {
    setRowsPerPage(newPerPage);
    handleGetAllPaymentList(page, newPerPage);
  };

  const handleInterestStatusChange = (selectedValue: any) => {
    setInterestStatusValue(selectedValue);
  };

  const handlePrintPDF = () => {
    let formatedTableData: any[] = printDocumentData?.map((item: any) => [
      item?.payment_type,
      item?.payment_date ?? "N/A",
      item?.payment_amount,
      item?.status,
    ]);
    let headerNames: string[] = [
      "Payment Type",
      "Payment Date",
      "Payment Amount",
      "Status",
    ];
    generateAndPrintPDF(formatedTableData, headerNames, "bank-accounts");
  };
  function downloadExcel() {
    const columnNames = [
      { value: "payment_type", label: "Payment Type" },
      { value: "payment_date", label: "Payment Date" },
      { value: "payment_amount", label: "Payment Amount" },
      { value: "status", label: "Status" },
    ];
    convertJsonToExcel(printDocumentData, "bank accounts list", columnNames);
  }

  const handleActivityChange = (selectedValue: any) => {
    setSingleActivyDate(selectedValue);
    if (selectedValue.value === "Custom") {
      setIsCustomDate(true);
    } else {
      setIsCustomDate(false);
    }
    setActivityDate(selectedValue.value); // Perform any other actions based on the selected value
  };

  const handleInterestChargesOptions = async (data: {
    id: string;
    option: string;
    user_id: string;
    email: string; // Add email to the data type
    name: string;
  }) => {
    const { id, option } = data;

    if (option === "Edit") {
      dispatch(
        setScreenDetails({
          fromScreen: "bankOverView",
          toScreen: "Interest and Charges",
          mainActiveTab: "",
          selectTab: activeInterestTab,
          subSelectTab: "",
        })
      );
      router.push(
        `${ApplicationURLS.USER_EDIT_INTEREST_CHARGES_OTHER_PAYMENT}/${id}`
      );
    } else if (option === "View") {
      dispatch(
        setScreenDetails({
          fromScreen: "bankOverView",
          toScreen: "Interest and Charges",
          mainActiveTab: "",
          selectTab: activeInterestTab,
          subSelectTab: "",
        })
      );
      router.push(
        `${ApplicationURLS.USER_EDIT_INTEREST_CHARGES_OTHER_PAYMENT}/${id}`
      );
    } else if (option === "Deleted") {
      setDeleteDisabled(false);
      setInterestOpenModal(!interestOpenModal);
      setPopupMessage((prev) => ({
        headerMsg: "",
        subHeaderMsg: "Are you sure you wish to delete this payment?",
      }));
      setInterestDeleteId(id);
    }
  };

  const handleRowView = (id: any) => {
    dispatch(
      setScreenDetails({
        fromScreen: "bankOverView",
        toScreen: "Interest and Charges",
        mainActiveTab: "",
        selectTab: activeInterestTab,
        subSelectTab: "",
      })
    );
    router.push(
      `${ApplicationURLS.USER_EDIT_INTEREST_CHARGES_OTHER_PAYMENT}/${id}`
    );
  };

  const handleDeleteInterestCharges = async (id: any) => {
    try {
      setDeleteDisabled(true);
      const payload = {
        payment_id: id,
        status: "Deleted",
      };
      const response = await DeletePayments(payload);
      if (response) {
        setRefreshOverviewOnAction &&
          setRefreshOverviewOnAction(new Date().getTime());
        setActiveInterestTab("archivedAccounts");
      }
      setInterestOpenModal(false);
    } catch (error: any) {
      console.log(error);
    }
  };

  const handleArchivedClick = (tabId: string) => {
    if (activeInterestTab === tabId) {
      return;
    } else {
      setActiveInterestTab(tabId);
    }
  };
  function handleAddBankStatement() {
    dispatch(
      setScreenDetails({
        fromScreen: "bankOverView",
        toScreen: "Interest and Charges",
        mainActiveTab: "",
        selectTab: activeInterestTab,
        subSelectTab: "",
      })
    );
    router.push(
      `${ApplicationURLS.USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT}?bid=${Number(
        bankAccountId
      )}`
    );
  }

  const handleThreeDotsClick = async (row: InterestFieldData) => {
    setPopoverActions([{ label: "View", value: "View" }]);
    try {
      const Payload = {
        payment_id: row?.payment_id,
      };

      const response = await getListActionButtons(Payload);

      if (response && response?.payment_list_buttons) {
        const newPopoverActions = [
          { label: "View", value: "View" },
          ...(response.payment_list_buttons.delete
            ? [{ label: "Delete", value: "Deleted", isDelete: true }]
            : []),
        ];

        // Update popoverActions state with fetched actions
        setPopoverActions(newPopoverActions);
      } else {
        // Handle case where response is null or does not contain expected data
        console.error("Failed to fetch action buttons");
      }
    } catch (error) {
      console.error("Error fetching action buttons:", error);
    }
  };

  const onInputChange = useCallback((e: { target: { value: string } }) => {
    const inputvalue = e.target.value?.trim()
      ? e.target.value
      : e.target.value?.trim();
    setSearchValue(inputvalue);
  }, []);

  const charges = [
    {
      name: "Type",
      maxWidth: "260px",
      wrap: true,
      selector: (row: InterestFieldData) => row.payment_type,
    },
    {
      name: "Payment Date",
      selector: (row: InterestFieldData) =>
        row.payment_date ? formatDate(row.payment_date, DD_MM_YYYY) : "N/A",
    },
    {
      name: "Amount",
      right: true,
      selector: (row: InterestFieldData) =>
        row.payment_amount
          ? `$ ${convertPositiveDecimalTwoDigit(row.payment_amount, true)}`
          : null,
    },
    {
      name: "Status",
      selector: (row: InterestFieldData) => row.list_status,
    },
    {
      name: "Actions",
      grow: true,
      fixed: "right",
      center: true,
      cell: (row: InterestFieldData, index: number) => (
        <Overlays
          trigger="click"
          placement={"auto"}
          overlay={<span></span>}
          // popoverActions={
          //   activeInterestTab === "currentAccounts"
          //     ? [
          //         { label: "Edit", value: "Edit" },
          //         { label: "View", value: "View" },
          //         ...(row?.status.endsWith("Matched")
          //           ? []
          //           : [{ label: "Delete", value: "Deleted", isDelete: true }]),
          //       ]
          //     : [{ label: "View", value: "View" }]
          // }
          popoverActions={popoverActions}
          cellData={{
            id: row.payment_id,
          }}
          optionClick={(data) => handleInterestChargesOptions({ ...data })}
          popoverTypes={"tableActions"}
        >
          <div className={styles.dotsContainer}>
            <ThreeDots onClick={() => handleThreeDotsClick(row)} />
          </div>
        </Overlays>
      ),
    },
  ];
  return (
    <div className={styles.gridMainContainer}>
      <div className={styles.tabBtnCon}>
        <TabContainer
          tabs={tabOptions}
          activeTab={activeInterestTab}
          onTabClick={handleArchivedClick}
        />

        {activeInterestTab === "currentAccounts" && (
          <div className={styles.headerAndButtonCon}>
            <FormButton
              className={styles.buttonStyles}
              onClick={() => handleAddBankStatement()}
            >
              + Add
            </FormButton>
          </div>
        )}
      </div>
      <ReusableDataTable
        columns={charges}
        data={interestPaymentData}
        subHeader
        pagination
        subHeaderComponent={
          <CustomSubHeader
            searchValue={searchValue}
            onInputChange={onInputChange}
            activeInterestTab={activeInterestTab}
            handleInterestStatusChange={handleInterestStatusChange}
            singleSelectedData={singleSelectedData}
            handleActivityChange={handleActivityChange}
            singleActivyDate={singleActivyDate}
            isCustomDate={isCustomDate}
            activityLogStartDate={activityLogStartDate}
            setActivityLogStartDate={setActivityLogStartDate}
            activityLogEndDate={activityLogEndDate}
            setActivityLogEndDate={setActivityLogEndDate}
            handlePrintPDF={handlePrintPDF}
            downloadExcel={downloadExcel}
            printDocumentData={printDocumentData}
          />
        }
        onRowClicked={(data: any) => handleRowView(data?.payment_id)}
        paginationServer
        progressPending={loading}
        onChangePage={handleChangePage}
        paginationTotalRows={totalRows}
        onChangeRowsPerPage={handleChangeRowPerPage}
      />
      <AppModal
        show={interestOpenModal}
        onHide={() => setInterestOpenModal(false)}
        secondButtonLabel="No"
        firstButtonLabel="Yes"
        disabled={deleteDisabled}
        modalHeading={popupMessage?.headerMsg || ""}
        modalBodyContent={popupMessage?.subHeaderMsg || ""}
        onConfirm={() => {
          handleDeleteInterestCharges(interestDeleteId);
        }}
      />
    </div>
  );
};

export default InterestChargeList;
