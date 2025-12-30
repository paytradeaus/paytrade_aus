import { client } from "@/app/api/apolloClientServices";
import { toast } from "@/app/Toaster";
import { ERROR, SUCCESS } from "@/common/constants/messages";
import { gql } from "@apollo/client";

export async function fetchListOfComplianceChecks(postData: any): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query FetchActivenessOfComplianceChecks(
          $payload: FetchActivenessOfComplianceChecksInput!
        ) {
          fetchActivenessOfComplianceChecks(payload: $payload) {
            data {
              check_name
              is_active
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.fetchActivenessOfComplianceChecks?.status === SUCCESS) {
      return response?.data?.fetchActivenessOfComplianceChecks?.data;
    }
    if (response?.data?.fetchActivenessOfComplianceChecks?.status === ERROR) {
      toast.error(response?.data?.fetchActivenessOfComplianceChecks?.message);
      return {};
    }
  } catch (error: any) {
    return false;
  }
}

export async function postModifiedCompliancesList(postData: any): Promise<any> {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation SwitchComplianceChecks(
          $payload: SwitchComplianceChecksInput!
        ) {
          switchComplianceChecks(payload: $payload) {
            data
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.switchComplianceChecks?.status === SUCCESS) {
      return true;
    }
    if (response?.data?.switchComplianceChecks?.status === ERROR) {
      toast.error(response?.data?.switchComplianceChecks?.message);
      return false;
    }
  } catch (error: any) {
    return false;
  }
}

export async function FetchContractValueToCheckContractEligibilityInput(
  postData: any
): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query FetchContractValueToCheckContractEligibility(
          $payload: FetchContractValueToCheckContractEligibilityInput!
        ) {
          fetchContractValueToCheckContractEligibility(payload: $payload) {
            data {
              contract_value
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.fetchContractValueToCheckContractEligibility?.status ===
      SUCCESS
    ) {
      return response?.data?.fetchContractValueToCheckContractEligibility?.data;
    }
    if (
      response?.data?.fetchContractValueToCheckContractEligibility?.status ===
      ERROR
    ) {
      toast.error(
        response?.data?.fetchContractValueToCheckContractEligibility?.message
      );
      return null;
    }
  } catch (error: any) {
    return false;
  }
}

export async function SetContractValueToCheckContractEligibility(
  postData: any
): Promise<any> {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation SetContractValueToCheckContractEligibility(
          $payload: SetContractValueToCheckContractEligibilityInput!
        ) {
          setContractValueToCheckContractEligibility(payload: $payload) {
            data
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.setContractValueToCheckContractEligibility?.status ===
      SUCCESS
    ) {
      return true;
    }
    if (
      response?.data?.setContractValueToCheckContractEligibility?.status ===
      ERROR
    ) {
      toast.error(
        response?.data?.setContractValueToCheckContractEligibility?.message
      );
      return false;
    }
  } catch (error: any) {
    return false;
  }
}
