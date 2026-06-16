export const AppRoutes = {
  HOME: "/",
  USER_LOGIN: "/user/login",
  USER_SIGNUP: "/user/login",
  USER_DASHBOARD: "/user/dashboard",
  USER_REGISTRATION: "/user/registration/details",
  USER_PROFILE_UPLOAD: "/user/registration/profile-upload",
  USER_VERIFICATION: "/user/registration/verification",
  REGISTRATION_ADD_BUSINESS_PROFILE: "/user/registration/business-profile",
  USER_CONTACT_BUSINESS: "/user/registration/contact-business",
  USER_TAX: "/user/registration/tax",
  USER_COMPANY_VERIFICATION: "/user/registration/company-verification",
  USER_BUSINESS_VERIFICATION: "/user/business-verification",
  USER_SELECT_PROFILE: "/user/select-profile",
  USER_REGISTRATION_SELECT_PROFILE: "/user/registration/select-profile",
  USER_FORGOT_PASSWORD: "/user/forgot-password",
  USER_UPDATE_PASSWORD: "/user/update-password",
  USER_BANK_ACCOUNTS_CURRENT: "/user/bank-accounts/current",
  USER_BANK_ACCOUNTS_ARCHIVED: "/user/bank-accounts/archived",
  USER_ADD_BANK_ACCOUNTS: "/user/bank-accounts/add",
  USER_BANK_ACCOUNTS_OVERVIEW: "/user/bank-accounts/overview",
  USER_BANK_OVERVIEW_BANK_STATEMENT:
    "/user/bank-accounts/overview/bank-statement",
  USER_EDIT_BANK_ACCOUNTS: "/user/bank-accounts/edit",
  USER_CLIENTS_AND_SUPPLIERS: "/user/clients-suppliers",
  USER_ADD_CLIENTS_AND_SUPPLIERS: "/user/clients-suppliers/add",
  USER_VIEW_CLIENTS_AND_SUPPLIERS: "/user/clients-suppliers/view",
  USER_EDIT_CLIENTS_AND_SUPPLIERS: "/user/clients-suppliers/edit",
  USER_PROJECTS: "/user/projects",
  USER_PROJECT_OVERVIEW: "/user/projects/view",
  USER_ADD_PROJECTS: "/user/projects/add",
  USER_EDIT_PROJECTS: "/user/projects/edit",
  USER_PROJECTS_OVERVIEW: "/user/projects/overview",
  USER_VERIFY_CODE: "/user/verify-code",
  USER_PAYMENTS_TO_DO: "/user/payments-to-do",
  USER_PAYMENTS_LIST: "/user/payments-list",
  USER_PAY_APPS: "/user/claims",
  USER_ADD_CLAIMS: "/user/claims/add",
  USER_EDIT_CLAIMS: "/user/claims/edit",
  USER_VIEW_CLAIMS: "/user/claims/view",
  USER_ADD_PAYMENT: "/user/claims/payments/add",
  USER_RETENTION_LIST: "/user/retention-list",
  USER_ACTIVITY_LOG: "/user/activity-log",
  SUBSCRIPTION_PRICING: "/pricing",

  USER_BOOKKEEPING: "/user/book-keeping",
  USER_COMPLIANCE_OVERVIEW: "/user/compliances/overview",
  USER_UPLOAD_TRANSACTIONS: "/user/bank-accounts/update-transactions",
  USER_MATCH_TRANSACTIONS: "/user/bank-accounts/match-transactions",
  USER_UNMATCH_TRANSACTIONS: "/user/bank-accounts/unmatch-transactions",

  USER_NOTICES: "/user/notices",
  USER_NOTICES_ADD: "/user/notices/add",
  USER_NOTICES_RECEIVEDVIEW: "/user/notices/receivedview",
  USER_NOTICES_VIEW: "/user/notices/view",
  USER_SEND_NOTICES: "/user/notices/send-notices",
  USER_CONTRACTS_LIST: "/user/contracts",
  USER_CONTRACTS_OVERVIEW: "/user/contracts/overview",

  USER_VARIATIONS_LIST: "/user/variations",
  USER_ADD_VARIATIONS: "/user/variations/add",
  USER_EDIT_VARIATIONS: "/user/variations/edit",
  USER_VIEW_VARIATIONS: "/user/variations/view",

  USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT:
    "/user/bank-accounts/overview/interest-charges/add",
  USER_VIEW_INTEREST_CHARGES_OTHER_PAYMENT:
    "/user/bank-accounts/overview/interest-charges/view",
  USER_EDIT_INTEREST_CHARGES_OTHER_PAYMENT:
    "/user/bank-accounts/overview/interest-charges/edit",

  USER_MATCH_BUSINESS_PROFILE: "/user/matching-business",
  USER_ADD_BUSINESS_PROFILE: "/user/add-business-profile",
  USER_EDIT_BUSINESS_PROFILE: "/user/edit-business-profile",
  USER_COMPLIANCE: "/user/compliances",
  USER_TRUST_ACCOUNTING: "/user/trust-accounting",
  USER_TRUST_ACCOUNTING_JOURNALS: "/user/trust-accounting/journals",
  USER_TRUST_ACCOUNTING_JOURNALS_ACCOUNT_LEDGER:
    "/user/trust-accounting/account-ledger",
  USER_TRUST_ACCOUNTING_TRIAL: "/user/trust-accounting/trial",
  USER_TRUST_ACCOUNTING_DEPOSITS: "/user/trust-accounting/deposits",
  USER_TRUST_ACCOUNTING_AUDIT: "/user/trust-accounting/audit",

  USER_TRUST_ACCOUNTING_AUDIT_ADD: "/user/trust-accounting/audit/add",
  USER_TRUST_ACCOUNTING_AUDIT_EDIT: "/user/trust-accounting/audit/edit",
  USER_TRUST_ACCOUNTING_AUDIT_VIEW: "/user/trust-accounting/audit/view",

  USER_TRUST_ACCOUNTING_RECONCIALIATION_RECORD:
    "/user/trust-accounting/reconciliation-record",

  USER_TRUST_ACCOUNTING_RECONCIALIATION_RECORD_ADD:
    "/user/trust-accounting/reconciliation-record/add",
  USER_TRUST_ACCOUNTING_RECONCIALIATION_RECORD_EDIT:
    "/user/trust-accounting/reconciliation-record/edit",
  USER_TRUST_ACCOUNTING_RECONCIALIATION_RECORD_VIEW:
    "/user/trust-accounting/reconciliation-record/view",

  USER_ADD_CONTRACTS: "/user/contracts/add",
  USER_EDIT_CONTRACTS: "/user/contracts/edit",

  USER_COMPLIANCE_VIEW: "/user/compliances/overview",

  USER_SYNC_LOG: "/user/integrations/xero/syncLogDetails/",

  ADMIN_LOGIN: "/admin/login",
  ADMIN_DASHBOARD: "/admin/dashboard",
  ADMIN_COMPLIANCE_VIEW: "/admin/compliances/overview",

  ADMIN_NORMAL_USERS_LIST: "/admin/users",
  ADMIN_NORMAL_USERS_ADD: "/admin/users/add",
  ADMIN_NORMAL_USERS_EDIT: "/admin/users/edit",

  GROUPS: "/admin/groups",
  GROUPS_ADD: "/admin/groups/add",
  GROUPS_EDIT: "/admin/groups/edit",

  ADMIN_USERS_LIST: "/admin/admin-users",
  ADMIN_USER_ADD: "/admin/admin-users/add",
  ADMIN_USER_EDIT: "/admin/admin-users/edit",
  //changed company to business ADMIN_COMPANY_LIST
  ADMIN_BUSINESS_LIST: "/admin/business",
  ADMIN_BUSINESS_ADD: "/admin/business/add",
  ADMIN_BUSINESS_EDIT: "/admin/business/edit",

  ADMIN_CONTENT_MANAGEMENT: "/admin/content-management",
  ADMIN_CONTENT_MANAGEMENT_ADD: "/admin/content-management/faq/add",
  ADMIN_CONTENT_MANAGEMENT_EDIT: "/admin/content-management/faq/edit",
  ADMIN_CONTENT_MANAGEMENT_FAQ: "/admin/content-management/faq",
  ADMIN_CONTENT_MANAGEMENT_EMAIL: "/admin/content-management/email",

  ADMIN_MASTERS_LIST: "/admin/masters",
  ADMIN_CURRENCY_LIST: "/admin/currency",
  ADMIN_MASTERS_EDIT: "/admin/masters/edit",
  ADMIN_CURRENCY_EDIT: "/admin/currency/edit",
  ADMIN_FINANCIAL_INSTITUTION: "/admin/financial-institution",
  ADMIN_FINANCIAL_INSTITUTION_EDIT: "/admin/financial-institution/edit",

  ADMIN_JOURNALS_LIST: "/admin/journals",
  ADMIN_CONTACT: "/admin/contact",

  ADMIN_TRUST_ACCOUNTING: "/admin/journals/trust-accounting",

  ADMIN_COMPLIANCES_LIST: "/admin/compliances",
  ADMIN_MANAGE_COMPLIANCE: "/admin/manage-compliances",

  ADMIN_NOTICES_CURRENT: "/admin/notices/current",
  ADMIN_NOTICES_ARCHIVE: "/admin/notices/archive",
  ADMIN_NOTICES_VIEW: "/admin/notices/view",

  ADMIN_COMMUNICATION_LIST: "/admin/communication",
  ADMIN_COMMUNICATION_ADD: "/admin/communication/add",
  ADMIN_COMMUNICATION_VIEW: "/admin/communication/view",

  ADMIN_CONTACT_LIST: "/admin/contact",
  ADMIN_DELEGATION: "/admin/delegation",

  ADMIN_DASHBOARD_CONTACT: "/admin/dashboard/contact",
  ADMIN_ACTIVITY_LOG: "/admin/activity-log",

  ADMIN_HOLIDAYS_LIST: "/admin/holidays",
  ADMIN_HOLIDAYS_ADD: "/admin/holidays/add",
  ADMIN_HOLIDAYS_EDIT: "/admin/holidays/edit",
  ADMIN_HOLIDAYS_VIEW: "/admin/holidays/view",

  ADMIN_SUBSCRIPTION_CURRENT_PLAN: "/admin/subscriptions/current",
  ADMIN_SUBSCRIPTION_ARCHIVED_PLAN: "/admin/subscriptions/archived",
  ADMIN_ADD_SUBSCRIPTION_PLAN: "/admin/subscriptions/add",
  ADMIN_VIEW_SUBSCRIPTION_PLAN: "/admin/subscriptions/view",
  ADMIN_EDIT_SUBSCRIPTION_PLAN: "/admin/subscriptions/edit",

  ADMIN_SUBSCRIPTION_CURRENT_ITEMS: "/admin/subscriptions/manage-items/current",
  ADMIN_SUBSCRIPTION_ARCHIVED_ITEMS:
    "/admin/subscriptions/manage-items/archived",
  ADMIN_ADD_SUBSCRIPTION_ITEMS: "/admin/subscriptions/manage-items/add",
  ADMIN_VIEW_SUBSCRIPTION_ITEMS: "/admin/subscriptions/manage-items/view",
  ADMIN_EDIT_SUBSCRIPTION_ITEMS: "/admin/subscriptions/manage-items/edit",
  ADMIN_SUBSCRIPTION_PROFILES: "/admin/subscriptions/manage-profiles",
  ADMIN_SUBSCRIPTION_CURRENT_COUPON:
    "/admin/subscriptions/manage-coupons/current",
  ADMIN_SUBSCRIPTION_ARCHIVED_COUPON:
    "/admin/subscriptions/manage-coupons/archived",
  ADMIN_SUBSCRIPTION_ADD_COUPON: "/admin/subscriptions/manage-coupons/add",
  ADMIN_SUBSCRIPTION_VIEW_COUPON: "/admin/subscriptions/manage-coupons/view",
  ADMIN_SUBSCRIPTION_EDIT_COUPON: "/admin/subscriptions/manage-coupons/edit",

  ADMIN_SUBSCRIPTION_BILLING_AND_HISTORY:
    "/admin/subscriptions/billing-history",

  ADMIN_BLOG: "/admin/blog",
  ADMIN_BLOG_EDIT: "/admin/blog/edit/",
  ADMIN_MARKETING_IMAGES: "/admin/marketing-images",
  USER_BLOG_RECOMMENDED: "/blog/",

  ADMIN_COMMUNITY_DISCUSSIONS: "/admin/community/discussions",
  ADMIN_COMMUNITY_PRODUCT_IDEAS: "/admin/community/product-ideas",

  RESOURCE_GUIDES_LIST: "/admin/resource",
  RESOURCE_GUIDES_ADD: "/admin/resource/add",
  RESOURCE_GUIDES_EDIT: "/admin/resource/edit/",
  RESOURCE_GUIDES_VIEWS: "/articles/",

  HOW_TO_GUIDES_LIST: "/admin/how-to-guides",
  HOW_TO_GUIDES_ADD: "/admin/how-to-guides/add",
  HOW_TO_GUIDES_EDIT: "/admin/how-to-guides/edit/",
  HOW_TO_GUIDES_VIEWS: "/how-to-guides/",

  ADMIN_GUIDES: "/admin/admin-guides",
  ADMIN_MENU_MANAGEMENT: "/admin/admin-menus",

  ADMIN_SUBSCRIPTION_PRICING_TABLE: "/admin/subscriptions/pricing-table",

  USER_ACCESS: "/user/company/user-access",
  INVITATION: "/user/company/invitations",
  RECEIVED_REQUESTS: "/user/company/received-requests",
  COMPANY_EDIT_USER: "/user/company/user-access/edit",
  COMPANY_ADD_USER: "/user/company/user-access/add",

  USER_SUBSCRIPTION_UPGRADE: "/user/manage-subscriptions/upgrade-plan",

  ADMIN_PROFILE: "/admin/personal-info",
  USER_PROFILE: "/user/personal-info",

  USER_SECURITY: "/user/sign-in-security",
  ADMIN_SECURITY: "/admin/sign-in-security",

  COMMUNITY: "/community",
  COMMUNITY_DISCUSSION: "/community/discussions",
  PRODUCT_IDEAS: "/community/product-ideas",
  COMMUNITY_START_DISCUSSION: "/community/start-discussion",
  CREATE_PRODUCT_IDEAS: "/community/create-product-idea",
  SUPPORT: "/get-support",
  AI_SUPPORT: "/support",

  USER_INTEGRATION: "/user/integrations",
  USER_INTEGRATION_ARCHIVED: "/user/integrations/archived",

  USER_XERO: "/user/integrations/xero",
};

export const UN_AUTHORIZED_URLS = [
  //common paths
  AppRoutes.ADMIN_LOGIN,
  AppRoutes.USER_LOGIN,
  AppRoutes.USER_SIGNUP,
  AppRoutes.USER_REGISTRATION,
  AppRoutes.USER_PROFILE_UPLOAD,
  AppRoutes.USER_VERIFICATION,
  AppRoutes.REGISTRATION_ADD_BUSINESS_PROFILE,
  AppRoutes.USER_CONTACT_BUSINESS,
  AppRoutes.USER_COMPANY_VERIFICATION,
  AppRoutes.USER_FORGOT_PASSWORD,
  AppRoutes.USER_UPDATE_PASSWORD,
  AppRoutes.USER_VERIFY_CODE,
  AppRoutes.USER_EDIT_BANK_ACCOUNTS,
  // AppRoutes.USER_ADD_CLAIMS,
  "/user/test",
];
