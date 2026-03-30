import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";

export const AdminGetCompanyDependencies = async (
  companyId: number
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query AdminGetCompanyDependencies($company_id: Float!) {
          adminGetCompanyDependencies(company_id: $company_id) {
            status
            message
          }
        }
      `,
      variables: { company_id: companyId },
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.adminGetCompanyDependencies?.status === ApiResponse.SUCCESS
    ) {
      return JSON.parse(response.data.adminGetCompanyDependencies.message);
    }
    return null;
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return null;
  }
};

export const AdminDeleteCompany = async (
  companyId: number
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation AdminDeleteCompany($company_id: Float!) {
          adminDeleteCompany(company_id: $company_id) {
            status
            message
          }
        }
      `,
      variables: { company_id: companyId },
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.adminDeleteCompany?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(response.data.adminDeleteCompany.message);
      return true;
    }
    if (
      response?.data?.adminDeleteCompany?.status === ApiResponse.ERROR
    ) {
      showErrorToast(response.data.adminDeleteCompany.message);
      return false;
    }
    return false;
  } catch (error: any) {
    showErrorToast(error.message || "Failed to delete company");
    console.error("GraphQL Error:", error);
    return false;
  }
};

export const AdminListAllCompanies = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query AdminlistAllCompanies(
          $blocked: Boolean
          $keyword: String
          $page: Int
          $perPage: Int
          $plan: String
          $sortingField: String
          $sortingOrder: String
        ) {
          adminlistAllCompanies(
            blocked: $blocked
            keyword: $keyword
            page: $page
            perPage: $perPage
            plan: $plan
            sortingField: $sortingField
            sortingOrder: $sortingOrder
          ) {
            data {
              companies {
                abn_number
                acn_number
                company_address
                company_email_id
                company_id
                company_name
                company_phone_no
                country
                entity_type
                expiry_date
                free_plan_reason
                icon_base64
                icon_file_path
                icon_file_type
                id
                is_admin_blocked
                is_demo
                is_free_plan_eligible
                is_verified
                latitude
                legal_company_name
                longitude
                place_id
                plan_id
                plan_name
                primary_admin_id
                primary_admin_name
                qbcc_number
                region
                subscription_id
                subscription_status
                tfn_number
                utr_number
                vat_number
              }
              totalCount
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (
      response &&
      response?.data?.adminlistAllCompanies?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.adminlistAllCompanies?.data;
    }
    if (
      response &&
      response?.data?.adminlistAllCompanies?.status === ApiResponse.ERROR
    ) {
      console.error(response && response?.data?.adminlistAllCompanies?.message);
      return null;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export interface SubscriptionUpdateByAdminInput {
  companyId: number | any;
}

export const subscriptionUpdateByAdmin = async (
  data: SubscriptionUpdateByAdminInput,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation SubscriptionUpdateByAdmin($company_id: Float!) {
          subscriptionUpdateByAdmin(company_id: $company_id) {
            data {
              company_id
              id
              plan_id
              status
              subscription_id
            }
            message
            status
          }
        }
      `,
      variables: {
        company_id: data.companyId,
      },
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.subscriptionUpdateByAdmin?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.subscriptionUpdateByAdmin?.message);
      return true;
    }
    if (
      response?.data?.subscriptionUpdateByAdmin?.status === ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.subscriptionUpdateByAdmin?.message);
      return false;
    }
    return false;
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const AdminListSubscriptionPlans = async (
  data: any,
  setLoading?: Function
): Promise<{ subscriptionPlans: []; totalCount: number } | any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetAllSubscriptionPlanList(
          $getAllSubscriptionPlanInput: GetAllSubscriptionPlanInput!
        ) {
          getAllSubscriptionPlanList(
            getAllSubscriptionPlanInput: $getAllSubscriptionPlanInput
          ) {
            data {
              plan_list {
                description
                id
                monthly_bill_cycle
                monthly_is_active
                monthly_is_deleted
                monthly_price
                monthly_price_id
                monthly_price_name
                monthly_stripe_price_id
                plan_id

                plan_name
                plan_status
                plan_type
                is_sandbox
                stripe_product_id
                trial_period
                unformatted_monthly_price
                unformatted_yearly_price
                yearly_bill_cycle
                yearly_is_active
                yearly_is_deleted
                yearly_price
                yearly_price_id
                yearly_price_name
                yearly_stripe_price_id
                plan_items {
                  description
                  dropdown_type
                  id
                  item_id
                  item_name
                  item_status
                  limit_type
                  plan_item_id
                  unit_type
                  is_unlimited
                  limit_value
                }
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });

    if (
      response &&
      response?.data?.getAllSubscriptionPlanList?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.getAllSubscriptionPlanList?.data;
    }
    if (
      response &&
      response?.data?.getAllSubscriptionPlanList?.status === ApiResponse.ERROR
    ) {
      return null;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return [];
  } finally {
    setLoading && setLoading(false);
  }
};
