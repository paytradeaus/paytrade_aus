"use client";

import { getCompanyIdFromStorage, slugifyString } from "@/utils";
import { useEffect, useState } from "react";

import DashboardBox from "./DashboardBox";
import {
  FetchAllComplianceResultsInDashboard,
  FetchAllUnmatchedPaymentsOfACompany,
  FetchAllUnsentNoticesOfACompany,
  FetchIntegrationIssuesForDashboard,
  getProjectListsForCompany,
  ListAllSubPayments,
  setDontShowAgain,
} from "./userDashboardPage.function";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { FetchAllBankAccounts } from "../BankAccounts/bankAccount.functions";
import { AccountType } from "@/shared/constant/data";
import { RootState, useAppSelector } from "@/redux/store";
import { useTokenDetails } from "@/hooks";
import CustomButton from "@/components/CustomButton/CustomButton";
import { ADD, buttonType, PAYMENT_TYPES } from "@/shared/constant/general";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { queryParamsData } from "../BankAccounts/bankAccount.constant";
import BaseModal from "@/components/BaseModal";
import Image from "next/image";
import { listAllPublishedBlogResources } from "@/modules/general/Blogs/Blogs.functions";
import BlogBox from "@/components/BlogBox";
import withBlogBox from "@/components/BlogBox";
import DefaultImage from "../../../../public/images/blogimage1.png";

export default function UserDashboard() {
  const [paymentsTodoList, setPaymentsTodoList] = useState([]);
  const [paymentsToDoLoader, setPaymentsToDoLoader] = useState(false);
  const [noticesLoader, setNoticesLoader] = useState(false);
  const [compliancesLoader, setCompliancesLoader] = useState(false);
  const [noticesList, setNoticesList] = useState([]);
  const [showProductGuide, setShowProductGuide] = useState(true);
  const [compliancesList, setCompliancesList] = useState([]);
  const [howToGuidesList, setHowToGuidesList] = useState<any>();
  const router = useRouter();
  // Create a placeholder component to wrap with the HOC
  const BlogContent = () => null;

  // Wrap the placeholder component with the HOC
  const BlogBox = withBlogBox(BlogContent);
  const updatedCompany: any = useAppSelector(
    (state: RootState) => state.companyStore.updatedcompany
  );

  const { decodeTokenData } = useTokenDetails();

  const [bankAccountCard, setBankAccountCard] = useState<any>({
    data: [],
    loader: false,
    totalCount: 0,
  });
  const [ptaAccountCard, setPtaAccountCard] = useState<any>({
    data: [],
    loader: false,
    totalCount: 0,
  });
  const [rtaAccountCard, setRtaAccountCard] = useState<any>({
    data: [],
    loader: false,
    totalCount: 0,
  });
  const [projectsList, setProjectsList] = useState<any>({
    data: [],
    loader: false,
    totalCount: 0,
  });
  const [unmatchedList, setUnmatchedList] = useState<any>({
    data: [],
    loader: false,
  });
  const [integrationIssues, setIntegrationIssues] = useState<any>({
    data: [],
    loader: false,
    totalCount: 0,
  });

  useEffect(() => {
    initialInvoke();
  }, [updatedCompany?.company_id]);

  useEffect(() => {
    fetchHowToGuidesList();
    setShowProductGuide(
      localStorage?.getItem("dontShowPopup") === "true" ? false : true
    );
  }, []);

  const fetchHowToGuidesList = async () => {
    const data = await listAllPublishedBlogResources({
      listBlogResourceInput: {
        contentType: "howToGuide",
        category: "",
        featured: true,
        page: 1,
        perPage: 6,
      },
    });
    setHowToGuidesList(data || []);
  };

  const updateDontShowAgain = async () => {
    const response = await setDontShowAgain();
    localStorage.setItem("accessToken", response?.access_token);
  };

  async function initialInvoke() {
    getPaymentsToDoList();
    getUnsentNoticesList();
    getCompliancesList();
    getProjectsLists();
    getUnmatchedTransactionsList();
    getIntegrationIssuesList();
    getFetchBankAccountsLists(AccountType.CASH_ACCOUNT);
    getFetchBankAccountsLists(AccountType.PROJECT_TRUST_ACCOUNT);
    getFetchBankAccountsLists(AccountType.RETENTION_TRUST_ACCOUNT);
  }

  async function getPaymentsToDoList() {
    try {
      setPaymentsToDoLoader(true);
      const postData = {
        payload: {
          page_size: null,
          page_number: null,
          company_id: getCompanyIdFromStorage() || null,
          sub_payment_type: "ToDo",
          project_id: null,
          contract_id: null,
          status: "Unmatched",
          is_confirmed: false,
          is_late: null,
        },
      };

      const response = await ListAllSubPayments(postData);

      if (response) {
        setPaymentsTodoList(response?.payments);
      }
      setPaymentsToDoLoader(false);
    } catch (err: any) {
      setPaymentsToDoLoader(false);
    }
  }

  async function getUnsentNoticesList() {
    try {
      setNoticesLoader(true);
      const postData = {
        payload: {
          company_id: getCompanyIdFromStorage(),
        },
      };

      const response = await FetchAllUnsentNoticesOfACompany(postData);

      if (response) {
        setNoticesList(response);
      }
      setNoticesLoader(false);
    } catch (err: any) {
      setNoticesLoader(false);
    }
  }

  async function getCompliancesList() {
    try {
      setCompliancesLoader(true);

      const postData = {
        payload: {
          company_id: getCompanyIdFromStorage(),
        },
      };

      const response = await FetchAllComplianceResultsInDashboard(postData);

      if (response) {
        setCompliancesList(response);
      }
      setCompliancesLoader(false);
    } catch (err: any) {
      setCompliancesLoader(false);
    }
  }

  function setDynamicAccounts(
    accType: string,
    loader: boolean = false,
    data: any = [],
    totalCount: number = 0
  ) {
    if (accType === AccountType.CASH_ACCOUNT) {
      setBankAccountCard({
        data: data,
        loader: loader,
        totalCount: totalCount,
      });
    } else if (accType === AccountType.PROJECT_TRUST_ACCOUNT) {
      setPtaAccountCard({
        data: data,
        loader: loader,
        totalCount: totalCount,
      });
    } else if (accType === AccountType.RETENTION_TRUST_ACCOUNT) {
      setRtaAccountCard({
        data: data,
        loader: loader,
        totalCount: totalCount,
      });
    }
  }

  async function getFetchBankAccountsLists(accType: string) {
    setDynamicAccounts(accType, true);
    try {
      const postData = {
        payload: {
          account_type: accType,
          company_id: getCompanyIdFromStorage(),
          items_per_page: null,
          page: null,
          search: null,
          status: null,
        },
      };

      const bankAccountListResponse = await FetchAllBankAccounts(postData);

      setDynamicAccounts(
        accType,
        false,
        bankAccountListResponse?.extendedBankAccounts ?? [],

        bankAccountListResponse?.total_count
      );
    } catch (err: any) {
      setDynamicAccounts(
        accType,

        false
      );
    }
  }

  async function getProjectsLists() {
    try {
      setProjectsList({
        data: [],
        loader: true,
        totalCount: 0,
      });
      const postData = {
        getProjectListsInput: {
          company_id: getCompanyIdFromStorage(), // Change companyId as per your requirement
          page_number: null,
          page_size: null,
          project_name_or_id: null,
          project_role: null,
        },
      };
      const response = await getProjectListsForCompany(postData);

      setProjectsList({
        data: response?.project_list ?? [],
        loader: false,
        totalCount: response?.total_count,
      });
    } catch (error) {
      setProjectsList({
        data: [],
        loader: false,
        totalCount: 0,
      });
    }
  }

  async function getUnmatchedTransactionsList() {
    try {
      setUnmatchedList({
        data: [],
        loader: true,
      });
      const postData = {
        company_id: getCompanyIdFromStorage(),
      };

      const response = await FetchAllUnmatchedPaymentsOfACompany(postData);

      setUnmatchedList({
        data: response ?? [],
        loader: false,
      });
    } catch (err: any) {
      setUnmatchedList({
        data: [],
        loader: false,
      });
    }
  }

  async function getIntegrationIssuesList() {
    try {
      const companyId = getCompanyIdFromStorage();
      if (!companyId) return;
      setIntegrationIssues({ data: [], loader: true, totalCount: 0 });

      const response = await FetchIntegrationIssuesForDashboard(
        Number(companyId)
      );

      setIntegrationIssues({
        data: response?.issues ?? [],
        loader: false,
        totalCount: response?.total_count ?? 0,
      });
    } catch (err: any) {
      setIntegrationIssues({ data: [], loader: false, totalCount: 0 });
    }
  }

  const quickLinks = [
    {
      name: "Add client or supplier",
      iconName: "fa-light fa-user-plus",
      link: AppRoutes.USER_ADD_CLIENTS_AND_SUPPLIERS,
    },

    {
      name: "Add project",
      iconName: "fa-light fa-rectangle-history",
      link: AppRoutes.USER_ADD_PROJECTS,
    },

    {
      name: "Add contract",
      iconName: "fa-light fa-memo-circle-check",
      link: AppRoutes.USER_ADD_CONTRACTS,
    },
    {
      name: "Add trust account",
      iconName: "fa-light fa-building-columns",
      link: AppRoutes.USER_ADD_BANK_ACCOUNTS,
    },
    {
      name: "Add payment app",
      iconName: "fa-light fa-file-invoice",
      link: `${AppRoutes.USER_ADD_CLAIMS}?mode=${ADD}`,
    },

    {
      name: "Audit accounts",
      iconName: "fa-light fa-money-check",
      link: AppRoutes.USER_TRUST_ACCOUNTING_AUDIT_ADD,
    },
    {
      name: "Eligibility checker",
      iconName: "fa-light fa-thumbs-up",
      link: "https://my.qbcc.qld.gov.au/myQBCC/s/trust-accounts-tool",
      externalLink: true,
    },
    {
      name: "Reconciliation",
      iconName: "fa-light fa-scale-balanced",
      link: AppRoutes.USER_TRUST_ACCOUNTING_RECONCIALIATION_RECORD_ADD,
    },
  ];

  function navigateOnPaymentsTodoSelection(row: any) {
    if (PAYMENT_TYPES.includes(row?.payment_type)) {
      router.push(
        `${AppRoutes.USER_ADD_PAYMENT}?claim=${row?.payment_claim_id}&mode=view&payment=${row?.payment_id}`
      );
    } else {
      router.push(
        `${AppRoutes.USER_VIEW_INTEREST_CHARGES_OTHER_PAYMENT}/${row?.payment_id}`
      );
    }
  }

  return (
    <div className="container-fluid">
      <div className="pt_title">
        <div className="grid">
          <div className="pt_pagetitle">
            <div className="pt_breadcrumbs">
              <span>Dashboard</span>
            </div>
            <h1>{`${
              decodeTokenData?.firstTimeLoggedIn > 0
                ? "Welcome back"
                : "Welcome"
            }, ${decodeTokenData?.userName ?? ""}`}</h1>
          </div>
          <div className="pt_search align_view_activity">
            <div>
              <CustomButton
                buttonType={buttonType.CONTRAST}
                buttonName="View all activity"
                actionType="button"
                onClick={() => router.push(AppRoutes.USER_ACTIVITY_LOG)}
              />
            </div>
            {/* <input
              type="search"
              id="search"
              name="search"
              placeholder="Search"
            /> */}
          </div>
        </div>
      </div>

      <div className="pt_quicklinks">
        <details>
          <summary>Quick Links</summary>
          <div className="grid">
            {quickLinks.map((data: any) => (
              <div className="pt_box pt_ql" key={data?.name}>
                {!data?.externalLink ? (
                  <Link href={data?.link} passHref>
                    <i className={data?.iconName}></i>
                    <span>{data?.name}</span>
                    <i className={"fa-light fa-arrow-right arrow"} />
                  </Link>
                ) : (
                  <a
                    href={data?.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className={data?.iconName}></i>
                    <span>{data?.name}</span>
                    <i
                      className={"fa-light fa-arrow-up-right-from-square arrow"}
                    />
                  </a>
                )}
              </div>
            ))}
          </div>
        </details>
      </div>

      <div className="grid dashgrid">
        <DashboardBox
          title={"Payments to do"}
          boxButtonLink={AppRoutes.USER_PAYMENTS_TO_DO}
          cardData={paymentsTodoList}
          enableLoader={paymentsToDoLoader}
          mappingKeys={{
            HeaderRightContent: "contract_name",
            leftMainContentOne: "project_name",
            rightMainContentOneWithCurrency: "formatted_amount",
            dateRightMainContentTwo: "due_date",
          }}
          enableInvalidForRightMainContentOne
          enableWithOverLink
          onCardClick={(cardObj) => navigateOnPaymentsTodoSelection(cardObj)}
        />

        <DashboardBox
          title={"Notices to do"}
          boxButtonLink={AppRoutes.USER_NOTICES}
          cardData={noticesList}
          enableLoader={noticesLoader}
          mappingKeys={{
            HeaderRightContent: "bank_account_name",
            leftMainContentOne: "notice_type",
            statusRightMainContentOne: "status",
            accountType: "bank_account_type",
          }}
          enableInvalidForRightMainContentOne
          enableWithOverLink
          onCardClick={(cardObj) => {
            router.push(`${AppRoutes.USER_NOTICES_VIEW}/${cardObj?.id}`);
          }}
        />

        <DashboardBox
          title={"Compliance to do"}
          boxButtonLink={AppRoutes.USER_COMPLIANCE}
          cardData={compliancesList}
          enableLoader={compliancesLoader}
          mappingKeys={{
            HeaderRightContent: "project_name",
            leftMainContentOne: "bank_account_name",
            issueRightMainContentOne: "number_of_issues",
            accountType: "bank_account_type",
          }}
          enableWithOverLink
          onCardClick={(cardObj) => {
            router.push(
              `${AppRoutes?.USER_COMPLIANCE_OVERVIEW}?project=${cardObj?.project_id}&st=${cardObj?.project_status}`
            );
          }}
          enableInvalidForRightMainContentOne
        />

        <DashboardBox
          title={"Bank accounts"}
          boxButtonLink={`${AppRoutes.USER_BANK_ACCOUNTS_CURRENT}?account_type=${queryParamsData.cash}`}
          cardData={bankAccountCard.data ?? []}
          boxTotalCount={bankAccountCard?.totalCount}
          enableLoader={bankAccountCard?.loader}
          boxButtonName={"View"}
          mappingKeys={{
            leftMainContentOne: "account_name",
            dateLeftMainContentTwo: "updated_on",
            rightMainContentOneWithCurrency: "formatted_bank_account_balance",
            isBank: true,
          }}
          enableWithOverLink
          onCardClick={(cardObj) =>
            router.push(
              `${AppRoutes?.USER_BANK_ACCOUNTS_OVERVIEW}/${
                cardObj?.bank_account_id
              }/${getCompanyIdFromStorage()}`
            )
          }
        />

        <DashboardBox
          title={"Project trust accounts"}
          boxButtonName={"View"}
          boxButtonLink={`${AppRoutes.USER_BANK_ACCOUNTS_CURRENT}?account_type=${queryParamsData.PTA}`}
          cardData={ptaAccountCard.data ?? []}
          boxTotalCount={ptaAccountCard?.totalCount}
          enableLoader={ptaAccountCard?.loader}
          mappingKeys={{
            leftMainContentOne: "account_name",
            dateLeftMainContentTwo: "updated_on",
            rightMainContentOneWithCurrency: "formatted_bank_account_balance",
            isBank: true,
          }}
          displayDaysToMatch
          HeaderLeftContent={"PTA"}
          enableWithOverLink
          onCardClick={(cardObj) =>
            router.push(
              `${AppRoutes?.USER_BANK_ACCOUNTS_OVERVIEW}/${
                cardObj?.bank_account_id
              }/${getCompanyIdFromStorage()}`
            )
          }
        />
        <DashboardBox
          title={"Retention trust accounts"}
          boxButtonName={"View"}
          boxButtonLink={`${AppRoutes.USER_BANK_ACCOUNTS_CURRENT}?account_type=${queryParamsData.RTA}`}
          cardData={rtaAccountCard.data ?? []}
          boxTotalCount={rtaAccountCard?.totalCount}
          enableLoader={rtaAccountCard?.loader}
          mappingKeys={{
            leftMainContentOne: "account_name",
            dateLeftMainContentTwo: "updated_on",
            rightMainContentOneWithCurrency: "formatted_bank_account_balance",
            isBank: true,
          }}
          displayDaysToMatch
          HeaderLeftContent={"RTA"}
          enableWithOverLink
          onCardClick={(cardObj) =>
            router.push(
              `${AppRoutes?.USER_BANK_ACCOUNTS_OVERVIEW}/${
                cardObj?.bank_account_id
              }/${getCompanyIdFromStorage()}`
            )
          }
        />
      </div>

      <div className="grid">
        <DashboardBox
          title={"Projects"}
          boxButtonName={"View projects"}
          boxButtonLink={AppRoutes.USER_PROJECTS}
          cardData={projectsList.data ?? []}
          boxTotalCount={projectsList?.totalCount}
          enableLoader={projectsList?.loader}
          mappingKeys={{
            leftMainContentOne: "project_name",
            eligibilityLeftMainContentOne: "pta_eligibility",
            projectsRightMainContentOne: "formatted_head_contract_sum",
          }}
          enableWithOverLink
          onCardClick={(cardObj) =>
            router.push(`${AppRoutes?.USER_PROJECTS_OVERVIEW}/${cardObj?.id}`)
          }
        />

        <DashboardBox
          title={"Unmatched transactions"}
          hideBoxButton
          cardData={unmatchedList.data ?? []}
          boxTotalCount={unmatchedList?.data?.length || ""}
          enableLoader={unmatchedList?.loader}
          onCardClick={(cardObj) => {
            router.push(
              `${AppRoutes.USER_ADD_PAYMENT}?claim=${cardObj?.payment_claim_id}&mode=view&payment=${cardObj?.payment_id}`
            );
          }}
          mappingKeys={{
            leftMainContentOne: "account_name",
            rightMainContentOne: "formatted_amount",
            transactionsRightMainContentTwo: "status",
            accountType: "account_type",
          }}
        />
      </div>

      <div className="grid">
        <DashboardBox
          title={"Integration issues"}
          boxButtonName={"View sync log"}
          boxButtonLink={AppRoutes.USER_XERO}
          cardData={integrationIssues.data ?? []}
          boxTotalCount={integrationIssues?.totalCount || ""}
          enableLoader={integrationIssues?.loader}
          enableWithOverLink
          onCardClick={(cardObj) => {
            router.push(
              `${AppRoutes.USER_SYNC_LOG}${cardObj?.id}`
            );
          }}
          mappingKeys={{
            HeaderRightContent: "sync_type",
            leftMainContentOne: "description",
            statusRightMainContentOne: "sync_status",
          }}
          enableInvalidForRightMainContentOne
        />
      </div>

      {decodeTokenData?.showPopup &&
        showProductGuide &&
        howToGuidesList?.totalCount > 0 && (
          <BaseModal
            modalId="product_guide"
            displayModal={showProductGuide}
            onClose={() => {
              localStorage.setItem("dontShowPopup", "true");
              setShowProductGuide(false);
            }}
            title={`${
              decodeTokenData?.firstTimeLoggedIn > 0
                ? "Welcome back"
                : "Welcome"
            }, ${decodeTokenData?.userName ?? ""}`}
            secondButtonName="Don't show again"
            firstButtonName="Close"
            onConfirm={() => {
              updateDontShowAgain();
              setShowProductGuide(false);
              return true;
            }}
          >
            <>
              <h4>Below are some guides that can help you get started.</h4>
              <div className="guide-container">
                <div className="guide-grid">
                  {howToGuidesList?.blogResources
                    ?.slice(0, 6)
                    .map((val: any) => (
                      <div
                        className="guide-card"
                        key={val?.id}
                        onClick={() => {
                          router.push(
                            "/how-to-guides/" +
                              slugifyString(val?.category?.value) +
                              "/" +
                              slugifyString(val?.title) +
                              "/" +
                              val?.id
                          );
                        }}
                      >
                        <div className="image-wrapper">
                          <Image
                            src={val?.banner?.file_path ? (val.banner.file_path.startsWith('/') ? val.banner.file_path : `/${val.banner.file_path}`) : DefaultImage}
                            alt={val?.title}
                            layout="fill"
                            objectFit="cover"
                          />
                        </div>
                        <h3>{val?.title}</h3>
                        <p>{val?.category?.value || "No description"}</p>
                      </div>
                    ))}
                </div>
                {howToGuidesList?.blogResources?.length > 6 && (
                  <a
                    className="view-more-link"
                    onClick={() => {
                      router.push("/how-to-guides");
                    }}
                  >
                    View more...
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </a>
                )}
              </div>
            </>
          </BaseModal>
        )}
    </div>
  );
}
