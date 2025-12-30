import { client } from "@/app/api/apolloClientServices";
import { toast } from "@/app/Toaster";
import { ERROR, SUCCESS } from "@/common/constants/messages";
import { gql } from "@apollo/client";

export const insertAdminDetails = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation Mutation($addPtAdminInput: AddPTAdminInput!) {
          insertAdminDetails(addPTAdminInput: $addPtAdminInput) {
            message
            status
            data {
              admin_role
              admin_status
              created_on
              email_id
              first_name
              id
              last_logged_in
              last_name
            }
          }
        }
      `,
      variables: {
        addPtAdminInput: data,
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.insertAdminDetails?.status === SUCCESS) {
      toast.success(successMsg || "user added successfully");
      return true;
    }
    if (response?.data?.insertAdminDetails?.status === ERROR) {
      console.error(response?.data?.insertAdminDetails?.message);
      toast.error(response?.data?.insertAdminDetails?.message);
      return false;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};
export const UpdateAdminDetails = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation UpdateAdminDetails($updateAdminInput: UpdateAdminInput!) {
          updateAdminDetails(updateAdminInput: $updateAdminInput) {
            message
            status
            data {
              id
              first_name
              last_name
              email_id
              admin_status
              admin_role
              last_logged_in
              created_on
            }
          }
        }
      `,
      variables: {
        updateAdminInput: data,
      },
      // fetchPolicy: "no-cache",
    });
    if (response?.data?.updateAdminDetails?.status === SUCCESS) {
      toast.success(
        response?.data?.updateAdminDetails?.message ||
          successMsg ||
          "user updated successfully"
      );
      return true;
    }
    if (response?.data?.updateAdminDetails?.status === ERROR) {
      console.error(response?.data?.updateAdminDetails?.message);
      toast.error(response?.data?.updateAdminDetails?.message);
      return false;
    }
  } catch (error: any) {
    // toast.error(error?.message || "something went wrong in API");
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};

export const GetAdminDetailsById = async (
  data: { id: string },
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query GetAdminDetailsById($id: String!) {
          getAdminDetailsById(Id: $id) {
            data {
              admin_role
              admin_status
              created_on
              email_id
              file
              file_path
              file_type
              first_name
              groupIds
              id
              last_logged_in
              last_name
              profile_id
              signature
              signature_type
            }
            message
            status
          }
        }
      `,
      variables: {
        ...data,
      },
      fetchPolicy: "no-cache",
    });

    if (response?.data?.getAdminDetailsById?.status === SUCCESS) {
      return response?.data?.getAdminDetailsById?.data;
    }
    if (response?.data?.getAdminDetailsById?.status === ERROR) {
      console.error(response?.data?.getAdminDetailsById?.message);
      toast.error(response?.data?.getAdminDetailsById?.message);
      return {};
    }
  } catch (error: any) {
    // toast.error(error.message || "somehting went wrong in API");
    console.error("GraphQL Error:", error);
    return {};
  } finally {
    setLoading && setLoading(false);
  }
};

export const AdminArchiveSubscription = async (data: any): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation AdminArchiveSubscriptionAndPricing($id: String!) {
          adminArchiveSubscriptionAndPricing(id: $id) {
            data {
              description
              id
              plan_id
              plan_name
              plan_status
              plan_type
              stripe_product_id
            }
            message
            status
          }
        }
      `,
      variables: data,
      // fetchPolicy: "no-cache",
    });
    if (
      response?.data?.adminArchiveSubscriptionAndPricing?.status === SUCCESS
    ) {
      toast.success(
        response?.data?.adminArchiveSubscriptionAndPricing?.message
      );
      return true;
    }
    if (response?.data?.adminArchiveSubscriptionAndPricing?.status === ERROR) {
      toast.error(response?.data?.adminArchiveSubscriptionAndPricing?.message);
      return false;
    }
  } catch (error: any) {
    return false;
  }
};
