import { ERROR, SUCCESS } from "@/app/message";
import { showErrorToast } from "@/components/Toaster";
import apolloClient from "@/network/apolloClient";
import { gql } from "@apollo/client";

export async function fetchListOfComplianceChecks(postData: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query FetchActivenessOfComplianceChecks(
          $payload: FetchActivenessOfComplianceChecksInput!
        ) {
          fetchActivenessOfComplianceChecks(payload: $payload) {
            data {
              check_active
              check_name
              check_number
              rules {
                content
                is_active
                rule_number
              }
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
      showErrorToast(
        response?.data?.fetchActivenessOfComplianceChecks?.message
      );
      return {};
    }
  } catch {
    return false;
  }
}

export async function postModifiedCompliancesList(postData: any): Promise<any> {
  try {
    const response = await apolloClient.mutate({
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
      showErrorToast(response?.data?.switchComplianceChecks?.message);
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
    const response = await apolloClient.query({
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
      showErrorToast(
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
    const response = await apolloClient.mutate({
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
      showErrorToast(
        response?.data?.setContractValueToCheckContractEligibility?.message
      );
      return false;
    }
  } catch (error: any) {
    return false;
  }
}

export async function ActivateInactivateComplianceRules(
  postData: any
): Promise<any> {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation ActivateInactivateComplianceRules(
          $activateInactivateComplianceRulesPayload2: activateComplianceRulesInput!
        ) {
          activateInactivateComplianceRules(
            payload: $activateInactivateComplianceRulesPayload2
          ) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.activateInactivateComplianceRules?.status === SUCCESS) {
      return true;
    }
    if (response?.data?.activateInactivateComplianceRules?.status === ERROR) {
      showErrorToast(
        response?.data?.activateInactivateComplianceRules?.message
      );
      return false;
    }
  } catch {
    return false;
  }
}
