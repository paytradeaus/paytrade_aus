"use client";

import React, { Fragment, useEffect, useState } from "react";
import FormButton from "@/components/Button/button";
import { FileEarmarkExcel, Printer } from "react-bootstrap-icons";
import { useParams, usePathname, useRouter } from "next/navigation";
import TabContainer from "../../../addGroups/tabsContainer";
import styles from "./bankTrustAccountOverview.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { sampleData5 } from "./adminConstantData";
import { Col, Container, Row } from "react-bootstrap";
import { ApplicationURLS } from "@/common/applicationURLS";
import MyDatePicker from "@/components/datePicker/datePicker";
import { format } from "date-fns";
import { DD_MM_YYYY, EDIT, VIEW } from "@/common/constants/general";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import ReusableDataTable from "@/components/DataTable/dataTable";
import Overlays from "@/components/Overlayes/Overlayes";
import {
  ChangeStatusOfBankAccount,
  FetchBankAccountDetails,
} from "../backTrustAccount.functions";
import { formatDate } from "@/common/commonFunctions";
import { getCookie } from "cookies-next";
import { tabs } from "../bankTrustAccount.constant";
import BankStatementOverview from "../bankStatementOverview/bankStatementOverview";
import { AppModal } from "@/components/model/model";
import { useDispatch, useSelector } from "react-redux";
import TransactionList from "./transactionsList/transactionList";
import ToDoList from "./toDoList/toDoList";
import InterestChargeList from "./interestChargesList/interestChargesList";
import { RootState, useAppSelector } from "@/redux/store";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import CheckReload from "@/components/checkReload/checkReload";
import { setComplianceOverviewData } from "@/redux/slices/complianceOverviewDetails";
import LedgerJournals from "../../trustAccounting/ledgerJournals/ledgerJournals";
import { AdminlistAllFinancialInstituion } from "@/container/adminModules/financialInstitution/financialInstitutionList/financialInstitutionList.functions";
type UserData = {
  backgroundColor: string;
  date: string;
  description: string;
  spent: string;
  received: string;
  matchedTo: string;
  status: string;
  accountJournalNo: string;
  activityId: string;
  dateText: string;
  transactionDetails: string;
  accountClient: string;
  debit: string;
  credit: string;
  money: number;
  type: string;
  payment: string;
  amount: string;
  statusCharge: string;
};
const MemoizedInterestList = React.memo(InterestChargeList);
function BankAccountsOverview() {
  const screenDetails: any = useSelector(
    (state: RootState) => state.dashBoard.screenDetails
  );
  const [activeTab, setActiveTab] = useState(
    screenDetails?.mainActiveTab || "Transactions"
  );
  const [dynamicBreadcrumb, setDynamicBreadcrumb] = useState<any>([]);

  const routePath = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const complianceOverviewData: any = useAppSelector(
    (state: any) => state?.complianceOverview?.timeLineData
  );

  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const [isCustomDate, setIsCustomDate] = useState(false);
  const params = useParams();
  const [wrongIdCheck, setWrongIdCheck] = useState(false);
  const [activityLogStartDate, setActivityLogStartDate] = useState(
    new Date(new Date().setHours(0, 0, 0, 0))
  );
  const [singleActivyDate, setSingleActivyDate] = useState<any>({
    value: "All dates",
    label: "All Dates",
  });
  const [activityLogEndDate, setActivityLogEndDate] = useState(
    new Date(new Date().setHours(23, 59, 59, 999))
  );
  const [bankDetailsData, setBankDetailsData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [financialOpt, setFinancialOpt] = useState<any>({});
  const [isDisabledBtn, setIsDisabledBtn] = useState(false);

  const [openModal, setOpenModal] = useState(false);
  const [actionData, setActionData] = useState<any>();
  const [popupMessage, setPopupMessage] = useState({
    headerMsg: "",
    subHeaderMsg: "",
  });
  const [RefreshOverviewOnAction, setRefreshOverviewOnAction] = useState(
    new Date().getTime()
  );

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      if (params?.id?.length === 2) {
        let payload = {
          company_id: Number(params?.id[0]),
          bank_account_id: Number(params?.id[1]),
        };
        let viewResData: any = await FetchBankAccountDetails(payload);

        if (viewResData?.bank_account_id) {
          let financialListData = await AdminlistAllFinancialInstituion({
            page: null,
            perPage: null,
            keyword: null,
            status: null,
          });
          if (financialListData?.institutions?.length > 0) {
            let modifiedFinancialOpt = financialListData?.institutions?.find(
              (each: any) => each?.id === viewResData?.financial_institution
            );
            if (modifiedFinancialOpt) {
              setFinancialOpt(modifiedFinancialOpt);
            }
          }
          setBankDetailsData(viewResData);
        } else {
          setWrongIdCheck(true);
        }
        setIsLoading(false);
      } else {
        setWrongIdCheck(true);
      }
      setIsLoading(false);
    })();
  }, [RefreshOverviewOnAction]);

  const handleModalPopUpFunction = async () => {
    setOpenModal(!openModal);
    setIsDisabledBtn(true);
    let payload = {
      bank_account_id: bankDetailsData?.bank_account_id,
      status: actionData.option,
    };
    let changeStatusRes = await ChangeStatusOfBankAccount(payload);
    if (changeStatusRes) {
      router.push(ApplicationURLS.USER_BANK_ACCOUNTS_LIST_CURRENT);
    }
    setIsDisabledBtn(false);
  };

  const handleOptionClick = async (data: {
    id: string;
    option: string;
    status: string;
    name: string;
  }) => {
    const { id, option, status, name } = data;
    setActionData(data);
    if (option === "Transfered") {
      setOpenModal(!openModal);
      setPopupMessage((prev) => ({
        headerMsg: "",
        subHeaderMsg: "Are you sure you wish to Transfer this account?",
      }));
    }
    if (option === "Closed") {
      setOpenModal(!openModal);
      setPopupMessage((prev) => ({
        headerMsg: "",
        subHeaderMsg: `Are you sure you wish to Close this account?`,
      }));
    }
  };

  const handleActivityChange = (selectedValue: any) => {
    setSingleActivyDate(selectedValue);
    if (selectedValue.value === "Custom") {
      setIsCustomDate(true);
    } else {
      setIsCustomDate(false);
    }
  };

  const handleTabClick = (tabId: string) => {
    if (activeTab !== tabId) {
      dispatch(setScreenDetails({}));
      setActiveTab(tabId);
    }
  };
  const tech = [
    {
      name: "Account Journal Number",
      selector: (row: UserData) => row.accountJournalNo,
      maxWidth: "150px",
      style: (row: UserData) => ({
        backgroundColor: row.money > 500 ? "red" : "lightgreen",
        color: "black",
        "&:hover": {
          cursor: "pointer",
        },
      }),
    },
    {
      name: "Activity Id",
      selector: (row: UserData) => row.activityId,
      maxWidth: "100px",
      style: (row: UserData) => ({
        backgroundColor: row.money > 500 ? "red" : "lightgreen",
        color: "black",
      }),
    },
    {
      name: "Date",
      selector: (row: UserData) => row.dateText,
      maxWidth: "100px",
      style: (row: UserData) => ({
        backgroundColor: row.money > 500 ? "red" : "lightgreen",
      }),
    },
    {
      name: "Transaction Details",
      selector: (row: UserData) => row.transactionDetails,
      maxWidth: "350px",
      style: (row: UserData) => ({
        backgroundColor: row.money > 500 ? "red" : "lightgreen",
      }),
    },
    {
      name: "Account (Client/Supplier/Trustee)",
      selector: (row: UserData) => row.accountClient,
      maxWidth: "250px",
      style: (row: UserData) => ({
        backgroundColor: row.money > 500 ? "red" : "lightgreen",
      }),
    },
    {
      name: "Debit",
      selector: (row: UserData) => row.debit,
      maxWidth: "100px",
    },

    {
      name: "Credit",
      selector: (row: UserData) => row.credit,
      maxWidth: "100px",
    },
  ];

  return (
    <div className={styles.mainCon}>
      {!isLoading && (
        <Container fluid>
          <ReusableBreadcrumb
            items={[
              {
                href: ApplicationURLS.USER_DASHBOARD,
                label: "Home",
                active: routePath === ApplicationURLS.USER_DASHBOARD,
              },
              complianceOverviewData?.matchTransactionFromCompliance
                ? {
                    href: `${ApplicationURLS.USER_COMPLIANCE_OVERVIEW}?project=${complianceOverviewData?.projectId}&tab=${complianceOverviewData?.typeOfTrustAccount}`,
                    label: "Compliance Overview",
                    active: false,
                  }
                : {
                    href: ApplicationURLS.USER_BANK_ACCOUNTS_LIST_CURRENT,
                    label: "Bank Accounts",
                    active:
                      routePath ===
                      ApplicationURLS.USER_BANK_ACCOUNTS_LIST_CURRENT,
                  },

              {
                href: "",
                label: "Overview",
                active: true,
              },
            ]}
            separator={<span className={styles.separatorStyle}>&gt;</span>}
          />
          {wrongIdCheck ? (
            <div className={styles.noDataStyle}>
              No data available on this id
            </div>
          ) : (
            <>
              <div className={styles.containerBox}>
                <div className={styles.headerAndButtonCon}>
                  <Row>
                    <Col lg={6} md={6}>
                      <div className={styles.headerText}>
                        {bankDetailsData?.account_name} -{" "}
                        {bankDetailsData?.bank_account_id}
                      </div>
                    </Col>
                    <Col lg={6} md={6}>
                      <div className={styles.buttonsContainers}>
                        {bankDetailsData?.status === "Transferred" ||
                        bankDetailsData?.status === "Closed" ? (
                          <></>
                        ) : (
                          <Overlays
                            trigger="click"
                            placement={"bottom"}
                            overlay={<span></span>}
                            popoverTypes={"tableActions"}
                            popoverActions={[
                              {
                                label: "Transfer Account",
                                value: "Transfered",
                                disable: true,
                              },
                              {
                                label: "Close Account",
                                value: "Closed",
                                disable: true,
                              },
                            ]}
                            optionClick={(data) => handleOptionClick(data)}
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
                            <FormButton
                              className={styles.buttonStylesOne}
                              disabled={isDisabledBtn}
                            >
                              Transfer/Close Account
                            </FormButton>
                          </Overlays>
                        )}
                        <FormButton
                          className={styles.buttonStylesThree}
                          disabled={isDisabledBtn}
                          onClick={() =>
                            router.push(
                              `${ApplicationURLS.USER_BANK_ACCOUNTS_EDIT}/${selectedCompanyId}/${bankDetailsData?.bank_account_id}`
                            )
                          }
                        >
                          Edit
                        </FormButton>
                      </div>
                    </Col>
                  </Row>
                </div>
                <div className="row">
                  <div className="col-lg-8 col-md-6">
                    <div className={`${styles.customSubHeaderCon2}`}>
                      <div className={styles.test}>
                        <div className={styles.discriptionsubHeader}>
                          <span> Opening Date</span>
                          <span>-</span>
                        </div>
                        <div className={styles.description}>
                          {bankDetailsData?.opening_date
                            ? formatDate(
                                bankDetailsData?.opening_date,
                                DD_MM_YYYY
                              )
                            : ""}
                        </div>
                      </div>
                      <div className={styles.test}>
                        <div className={styles.discriptionsubHeader}>
                          <span> Date Added</span>
                          <span>-</span>
                        </div>
                        <div className={styles.description}>
                          {bankDetailsData?.created_on
                            ? formatDate(
                                bankDetailsData?.created_on,
                                DD_MM_YYYY
                              )
                            : ""}
                        </div>
                      </div>
                      <div className={styles.test}>
                        <div className={styles.discriptionsubHeader}>
                          <span> Account Number</span>
                          <span>-</span>
                        </div>
                        <div className={styles.description}>
                          {bankDetailsData?.account_number}
                        </div>
                      </div>
                      <div className={styles.test}>
                        <div className={styles.discriptionsubHeader}>
                          <span> BSB Number</span>
                          <span>-</span>
                        </div>
                        <div className={styles.description}>
                          {bankDetailsData?.bsb_number}
                        </div>
                      </div>
                      <div className={styles.test}>
                        <div className={styles.discriptionsubHeader}>
                          <span> Account Type</span>
                          <span>-</span>
                        </div>
                        <div className={styles.description}>
                          {bankDetailsData?.account_type}
                        </div>
                      </div>
                      <div className={styles.test}>
                        <div className={styles.discriptionsubHeader}>
                          <span> Financial Institution</span>
                          <span>-</span>
                        </div>
                        <div className={styles.description}>
                          {financialOpt?.institution_name ||
                            bankDetailsData?.financial_institution}
                        </div>
                      </div>
                      <div className={styles.test}>
                        <div className={styles.discriptionsubHeader}>
                          <span> Status</span>
                          <span>-</span>
                        </div>
                        <div className={styles.description}>
                          {bankDetailsData?.status}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-4 col-md-6">
                    <div className={styles.smallCardTags}>
                      <div className={`${styles.dualCards}`}>
                        <div className={`${styles.status1} ${styles.tagCards}`}>
                          <div className={styles.textHead}>{`$ ${
                            bankDetailsData?.current_balance
                              ?.toFixed(2)
                              .replace(/\B(?=(\d{3})+(?!\d))/g, ",") || `00.00`
                          }`}</div>
                          <div className={styles.subText}>Current Balance</div>
                        </div>
                        <div className={`${styles.status2} ${styles.tagCards}`}>
                          <div className={styles.textHead}>
                            {"$ " +
                              bankDetailsData?.interest_charges_sum
                                ?.toFixed(2)
                                .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                          </div>
                          <div className={styles.subText}>
                            Account Interest/Charges
                          </div>
                        </div>
                      </div>
                      <div className={`${styles.dualCards}`}>
                        <div className={`${styles.status5} ${styles.tagCards}`}>
                          <div className={styles.textHead}>
                            {bankDetailsData?.created_on
                              ? formatDate(
                                  bankDetailsData?.updated_on,
                                  DD_MM_YYYY
                                )
                              : ""}
                          </div>
                          <div className={styles.subText}>Last Update</div>
                        </div>
                        <div className={`${styles.status6} ${styles.tagCards}`}>
                          <div className={styles.textHead}>
                            {bankDetailsData?.created_on
                              ? formatDate(
                                  bankDetailsData?.updated_on,
                                  DD_MM_YYYY
                                )
                              : ""}
                          </div>
                          <div className={styles.subText}>Last Update</div>
                        </div>
                      </div>

                      <div className={styles.status3}>
                        <div className={styles.textHead}>
                          {bankDetailsData?.last_updated_type}
                        </div>
                        <div className={styles.subText}>Update Type</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <span className={styles.textAndSelectCon}>
                <TabContainer
                  tabs={tabs}
                  activeTab={activeTab}
                  onTabClick={handleTabClick}
                />
              </span>

              {/* Conditional rendering based on activeTab */}

              {activeTab === "Transactions" && (
                <Fragment>
                  {complianceOverviewData && (
                    <CheckReload
                      persistData={complianceOverviewData}
                      afterReload={(data: any) => {
                        dispatch(setComplianceOverviewData(data));
                      }}
                    />
                  )}
                  <></>
                  <TransactionList
                    bankAccountId={Number(params?.id[1])}
                    setRefreshOverviewOnAction={setRefreshOverviewOnAction}
                  />
                </Fragment>
              )}
              {activeTab === "bank-statements" && (
                <BankStatementOverview bankDetailsData={bankDetailsData} />
              )}

              {activeTab === "Interest and Charges" && (
                <MemoizedInterestList
                  bankAccountId={Number(params?.id[1])}
                  setRefreshOverviewOnAction={setRefreshOverviewOnAction}
                />
              )}

              {activeTab === "To Do" && (
                <ToDoList bankAccountId={Number(params?.id[1])} />
              )}

              {activeTab === "Journals" && (
                <div>
                  <LedgerJournals
                    isFromBankOverView
                    bankOverViewAcc={params?.id[1]}
                  />
                </div>
              )}
            </>
          )}
        </Container>
      )}
      <AppModal
        show={openModal}
        onHide={() => setOpenModal(false)}
        secondButtonLabel="No"
        firstButtonLabel="Yes"
        modalHeading={popupMessage?.headerMsg || ""}
        modalBodyContent={popupMessage?.subHeaderMsg || ""}
        onConfirm={() => {
          handleModalPopUpFunction();
        }}
      />
    </div>
  );
}

export default BankAccountsOverview;
