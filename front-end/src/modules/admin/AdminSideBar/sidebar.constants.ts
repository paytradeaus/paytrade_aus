import { AppRoutes } from "@/shared/constant/appRoutes";
import AppRouter from "next/dist/client/components/app-router";

const adminSidebar = [
  {
    routePath: AppRoutes.ADMIN_DASHBOARD,
    icon: "fa-light fa-objects-column",
    name: "Dashboard",
  },
  {
    routePath: AppRoutes.ADMIN_NORMAL_USERS_LIST,
    icon: "fa-light fa-sharp fa-users",
    name: "Users",
  },
  {
    routePath: AppRoutes.ADMIN_BUSINESS_LIST,
    icon: "fa-light fa-thin fa-sharp fa-building",
    name: "Business profiles",
  },
  {
    routePath: "",
    icon: "fa-light fa-thin fa-credit-card",
    name: "Subscriptions",
    nestedList: [
      {
        routePath: AppRoutes.ADMIN_SUBSCRIPTION_CURRENT_PLAN,
        name: "Manage plans",
      },
      {
        routePath: AppRoutes.ADMIN_SUBSCRIPTION_CURRENT_ITEMS,
        name: "Manage items",
      },
      {
        routePath: AppRoutes.ADMIN_SUBSCRIPTION_PROFILES,
        name: "Manage profiles",
      },
      {
        routePath: AppRoutes.ADMIN_SUBSCRIPTION_CURRENT_COUPON,
        name: "Manage coupons",
      },
      {
        routePath: AppRoutes.ADMIN_SUBSCRIPTION_BILLING_AND_HISTORY,
        name: "Billing history",
      },
      {
        routePath: AppRoutes.ADMIN_SUBSCRIPTION_PRICING_TABLE,
        name: "Pricing table",
      },
    ],
  },
  {
    routePath: AppRoutes.ADMIN_JOURNALS_LIST,
    icon: "fa-light fa-journal-whills", // Represents journals or logs
    name: "Journals",
  },
  {
    routePath: AppRoutes.ADMIN_NOTICES_CURRENT,
    icon: "fa-light fa-circle-exclamation", // Represents notices or alerts
    name: "Notices",
  },
  {
    routePath: AppRoutes.ADMIN_DELEGATION,
    icon: "fa-light fa-users-cog", // Delegation or team lists
    name: "Delegation list",
  },
  {
    routePath: AppRoutes.ADMIN_COMPLIANCES_LIST,
    icon: "fa-light fa-shield-check", // Compliance-related management
    name: "Compliances",
    nestedList: [
      {
        routePath: AppRoutes.ADMIN_COMPLIANCES_LIST,
        // icon: "fa-light fa-list-check", // Checklist for compliance
        name: "All compliances",
      },
      {
        routePath: AppRoutes.ADMIN_MANAGE_COMPLIANCE,
        // icon: "fa-light fa-gear", // Manage or configure compliance
        name: "Manage compliances",
      },
    ],
  },

  {
    routePath: AppRoutes.ADMIN_COMMUNICATION_LIST,
    icon: "fa-light fa-thin fa-envelopes",
    name: "Communication",
  },

  // {
  //   routePath: "",
  //   icon: "fa-light fa-landmark", // Financial institutions or banks
  //   name: "Financial Institution",
  // },

  // {
  //   routePath: "",
  //   icon: "fa-light fa-coins", // Represents currency and money
  //   name: "Currency",
  // },
  {
    routePath: AppRoutes.ADMIN_CONTENT_MANAGEMENT,
    icon: "fa-light fa-file-lines", // Content or document management
    name: "Content management",
  },
  {
    routePath: AppRoutes.ADMIN_CONTACT_LIST,
    icon: "fa-light fa-address-book", // Contacts or directory
    name: "Contacts",
  },
  {
    routePath: AppRoutes.ADMIN_MASTERS_LIST,
    icon: "fa-light fa-database", // Represents master data or central repository
    name: "Masters",
    nestedList: [
      {
        routePath: AppRoutes.ADMIN_MASTERS_LIST,
        // icon: "fa-light fa-list", // General list or summary
        name: "All masters",
      },
      {
        routePath: AppRoutes.ADMIN_CURRENCY_LIST,
        // icon: "fa-light fa-coins", // Represents currency
        name: "Currency",
      },
      {
        routePath: AppRoutes.ADMIN_FINANCIAL_INSTITUTION,
        // icon: "fa-light fa-building-columns", // Financial institutions or banks
        name: "Financial institution",
      },
    ],
  },
  {
    routePath: AppRoutes.ADMIN_COMMUNITY_DISCUSSIONS,
    icon: "fa-light fa-user-group",
    name: "Community",
  },
  {
    routePath: AppRoutes.ADMIN_BLOG,
    icon: "fa-light fa-newspaper", // Represents articles or blogging
    name: "Blog",
  },
  {
    routePath: AppRoutes.RESOURCE_GUIDES_LIST,
    icon: "fa-light fa-book-open",
    name: "Resource guides",
  },
  {
    routePath: AppRoutes.ADMIN_GUIDES,
    icon: "fa-light fa-book-bookmark",
    name: "Admin guides",
  },
  {
    routePath: AppRoutes.ADMIN_ACTIVITY_LOG,
    icon: "fa-light fa-rectangle-history-circle-user",
    name: "Activity log",
  },

  // {
  //   routePath: "",
  //   icon: "fa-light fa-clipboard-list", // Task or management icon
  //   name: "Manage Compliances",
  // },
];

export { adminSidebar };
