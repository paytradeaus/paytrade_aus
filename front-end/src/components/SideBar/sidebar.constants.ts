import { AppRoutes } from "@/shared/constant/appRoutes";

const userSidebar = [
  {
    routePath: AppRoutes.USER_DASHBOARD,
    icon: "fa-light fa-objects-column",
    name: "Dashboard",
  },
  {
    routePath: AppRoutes.USER_PROJECTS,
    icon: "fa-light fa-rectangle-history",
    name: "Projects",
  },
  {
    routePath: AppRoutes.USER_BANK_ACCOUNTS_CURRENT,
    icon: "fa-light fa-building-columns",
    name: "Bank/trust accounts",
  },
  {
    routePath: AppRoutes.USER_CLIENTS_AND_SUPPLIERS,
    icon: "fa-light fa-users",
    name: "Clients & suppliers",
  },
  {
    routePath: "",
    icon: "fa-light fa-memo-circle-check",
    name: "Contracts",
    nestedList: [
      {
        routePath: AppRoutes.USER_CONTRACTS_LIST,
        name: "View all",
      },
      {
        routePath: AppRoutes.USER_VARIATIONS_LIST,
        name: "Variations",
      },
    ],
  },
  {
    routePath: AppRoutes.USER_PAY_APPS,
    icon: "fa-light fa-file-invoice",
    name: "Claims",
  },
  {
    routePath: AppRoutes.USER_RETENTION_LIST,
    icon: "fa-light fa-users-viewfinder",
    name: "Retentions",
  },

  {
    routePath: "",
    icon: "fa-light fa-credit-card",
    name: "Payments",
    nestedList: [
      {
        routePath: AppRoutes.USER_PAYMENTS_LIST,
        name: "Payments list",
      },
      {
        routePath: AppRoutes.USER_PAYMENTS_TO_DO,
        name: "Payments to do",
      },
    ],
  },
  {
    routePath: AppRoutes.USER_BOOKKEEPING,
    icon: "fa-light fa-book",
    name: "Bookkeeping",
  },
  {
    routePath: AppRoutes.USER_NOTICES,
    icon: "fa-light fa-circle-exclamation",
    name: "Notices",
  },

  {
    routePath: "",
    icon: "fa-light fa-money-check",
    name: "Trust accounting",
    nestedList: [
      {
        routePath: AppRoutes.USER_TRUST_ACCOUNTING_JOURNALS,
        name: "Journals",
      },
      {
        routePath: AppRoutes.USER_TRUST_ACCOUNTING_JOURNALS_ACCOUNT_LEDGER,
        name: "Account ledger",
      },
      {
        routePath: AppRoutes.USER_TRUST_ACCOUNTING_TRIAL,
        name: "Trial balance",
      },
      {
        routePath: AppRoutes.USER_TRUST_ACCOUNTING_DEPOSITS,
        name: "Deposits & withdrawals",
      },
      {
        routePath: AppRoutes.USER_TRUST_ACCOUNTING_RECONCIALIATION_RECORD,
        name: "Reconciliation",
      },
      {
        routePath: AppRoutes.USER_TRUST_ACCOUNTING_AUDIT,
        name: "Audit",
      },
    ],
  },

  {
    routePath: AppRoutes.USER_COMPLIANCE,
    icon: "fa-light fa-shield-check",
    name: "Compliance",
  },
  {
    routePath: AppRoutes.USER_INTEGRATION,
    icon: "fa-light fa-plus",
    name: "Integrations",
  },
  {
    routePath: AppRoutes.USER_ACTIVITY_LOG,
    icon: "fa-light fa-rectangle-history-circle-user",
    name: "Activity log",
  },
];

export { userSidebar };
