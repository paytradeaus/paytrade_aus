import { gql } from "@apollo/client";
import { toast } from "@/app/Toaster";
import { client } from "@/app/api/adminAPIs/adminAPIs";
import { ERROR, SUCCESS } from "@/common/constants/messages";

export const AdminlistAllCompanies = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query AdminlistAllCompanies(
          $blocked: Boolean
          $keyword: String
          $page: Int
          $perPage: Int
          $plan: String
        ) {
          adminlistAllCompanies(
            blocked: $blocked
            keyword: $keyword
            page: $page
            perPage: $perPage
            plan: $plan
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
                icon_base64
                icon_file_path
                icon_file_type
                id
                is_admin_blocked
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
      variables: {
        blocked: data?.blocked,
        page: data?.page,
        keyword: data?.keyWord,
        perPage: data?.perPage,
        plan: data?.plan,
      },
      fetchPolicy: "no-cache",
    });
    if (response && response?.data?.adminlistAllCompanies?.status === SUCCESS) {
      return response?.data?.adminlistAllCompanies?.data;
    }
    if (response && response?.data?.adminlistAllCompanies?.status === ERROR) {
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
    const response = await client.mutate({
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

    if (response?.data?.subscriptionUpdateByAdmin?.status === "SUCCESS") {
      toast.success(response?.data?.subscriptionUpdateByAdmin?.message);
      return true;
    }
    if (response?.data?.subscriptionUpdateByAdmin?.status === "ERROR") {
      toast.error(response?.data?.subscriptionUpdateByAdmin?.message);
      return false;
    }
    return false;
  } catch (error: any) {
    toast.error(error.message || "Something went wrong in API");
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
