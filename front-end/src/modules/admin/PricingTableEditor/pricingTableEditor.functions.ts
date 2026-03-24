import { client } from "@/app/api/adminApi/adminApi";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { gql } from "@apollo/client";

export const FetchPricingTableFeatures = async () => {
  try {
    const response = await client.query({
      query: gql`
        query AdminGetAllPricingTableFeatures {
          adminGetAllPricingTableFeatures {
            status
            message
            data {
              id
              feature_name
              display_order
              basic_value
              standard_value
              advanced_value
              pro_audit_value
              status
            }
          }
        }
      `,
      fetchPolicy: "network-only",
    });

    if (response?.data?.adminGetAllPricingTableFeatures?.status === "SUCCESS") {
      return response.data.adminGetAllPricingTableFeatures.data || [];
    }
    return [];
  } catch (error: any) {
    console.error("Error fetching pricing table features:", error);
    showErrorToast("Failed to load pricing table features");
    return [];
  }
};

export const AddPricingTableFeature = async (input: any) => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation AdminAddPricingTableFeature($input: AddPricingTableFeatureInput!) {
          adminAddPricingTableFeature(input: $input) {
            status
            message
            data {
              id
              feature_name
              display_order
              basic_value
              standard_value
              advanced_value
              pro_audit_value
              status
            }
          }
        }
      `,
      variables: { input },
    });

    if (response?.data?.adminAddPricingTableFeature?.status === "SUCCESS") {
      showSuccessToast("Feature added successfully");
      return response.data.adminAddPricingTableFeature.data;
    }
    showErrorToast(response?.data?.adminAddPricingTableFeature?.message || "Failed to add feature");
    return null;
  } catch (error: any) {
    showErrorToast(error?.message || "Failed to add feature");
    return null;
  }
};

export const UpdatePricingTableFeature = async (input: any) => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation AdminUpdatePricingTableFeature($input: UpdatePricingTableFeatureInput!) {
          adminUpdatePricingTableFeature(input: $input) {
            status
            message
            data {
              id
              feature_name
              display_order
              basic_value
              standard_value
              advanced_value
              pro_audit_value
              status
            }
          }
        }
      `,
      variables: { input },
    });

    if (response?.data?.adminUpdatePricingTableFeature?.status === "SUCCESS") {
      return response.data.adminUpdatePricingTableFeature.data;
    }
    showErrorToast(response?.data?.adminUpdatePricingTableFeature?.message || "Failed to update feature");
    return null;
  } catch (error: any) {
    showErrorToast(error?.message || "Failed to update feature");
    return null;
  }
};

export const DeletePricingTableFeature = async (id: string) => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation AdminDeletePricingTableFeature($id: String!) {
          adminDeletePricingTableFeature(id: $id) {
            status
            message
          }
        }
      `,
      variables: { id },
    });

    if (response?.data?.adminDeletePricingTableFeature?.status === "SUCCESS") {
      showSuccessToast("Feature deleted successfully");
      return true;
    }
    showErrorToast("Failed to delete feature");
    return false;
  } catch (error: any) {
    showErrorToast(error?.message || "Failed to delete feature");
    return false;
  }
};

export const BulkUpdatePricingTableFeatures = async (features: any[]) => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation AdminBulkUpdatePricingTableFeatures($input: BulkUpdatePricingTableFeaturesInput!) {
          adminBulkUpdatePricingTableFeatures(input: $input) {
            status
            message
            data {
              id
              feature_name
              display_order
              basic_value
              standard_value
              advanced_value
              pro_audit_value
              status
            }
          }
        }
      `,
      variables: { input: { features } },
    });

    if (response?.data?.adminBulkUpdatePricingTableFeatures?.status === "SUCCESS") {
      showSuccessToast("All changes saved successfully");
      return response.data.adminBulkUpdatePricingTableFeatures.data || [];
    }
    showErrorToast("Failed to save changes");
    return null;
  } catch (error: any) {
    showErrorToast(error?.message || "Failed to save changes");
    return null;
  }
};
