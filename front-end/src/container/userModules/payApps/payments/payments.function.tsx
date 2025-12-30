import { client } from "@/app/api/apolloClientServices";
import { toast } from "@/app/Toaster";
import {
  ERROR,
  SOMETHING_WENT_WRONG,
  SUCCESS,
} from "@/common/constants/messages";
import { gql } from "@apollo/client";

export async function fetchPayments(postData: any): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query FetchAutoPopulatableFieldsWhileAddingAPayment(
          $payload: FetchAutoPopulatableFieldsWhileAddingAPaymentInput!
        ) {
          fetchAutoPopulatableFieldsWhileAddingAPayment(payload: $payload) {
            data {
              beneficiary_type
              cash_retention
              cash_retention_type
              claim_amount
              claim_type
              client_supplier_id
              client_supplier_name
              client_supplier_type
              client_supplier_role
              contract_id
              contract_name
              due_date
              formatted_claim_amount
              formatted_gst_summary
              formatted_outstanding_amount
              formatted_payless_amount
              gst_summary
              outstanding_amount
              payless_amount
              payment_amount
              payment_claim_id
              payment_date
              payment_from_account
              payment_from_account_name
              payment_overview_buttons
              payment_to_account
              payment_to_account_bsb_number
              payment_to_account_name
              payment_to_account_number
              payment_type
              project_id
              project_name
              received_date
              retention_amount
              retention_from_account
              retention_id
              retention_list_id
              retention_release_date
              retention_type
              sent_date
              status
              status_in_ui
              total_amount
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
      response?.data?.fetchAutoPopulatableFieldsWhileAddingAPayment?.status ===
      SUCCESS
    ) {
      return response?.data?.fetchAutoPopulatableFieldsWhileAddingAPayment
        ?.data;
    } else {
      return {};
    }
  } catch (error: any) {
    return {};
  }
}

export async function fetchRetentionBankAccounts(postData: any): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query Data($payload: FetchAllBankAccountsInput!) {
          fetchAllBankAccounts(payload: $payload) {
            data {
              extendedBankAccounts {
                bank_account_id
                account_name
                account_number
                account_type
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.fetchAllBankAccounts?.status === SUCCESS) {
      return response?.data?.fetchAllBankAccounts?.data?.extendedBankAccounts;
    } else {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

export async function addPayments(postData: any): Promise<any> {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation AddPayment($payload: AddPaymentInput!) {
          addPayment(payload: $payload) {
            data {
              payment_id
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.addPayment?.status === SUCCESS) {
      toast.success(response?.data?.addPayment?.message);
      return {
        data: response?.data?.addPayment?.data,
        status: true,
      };
    } else {
      toast.error(response?.data?.addPayment?.message);
      return {
        data: null,
        status: false,
      };
    }
  } catch (error: any) {
    toast.error(error);

    return false;
  }
}

export async function fetchViewPayments(postData: any): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query FetchDetailsOfAPayment($payload: FetchDetailsOfAPaymentInput!) {
          fetchDetailsOfAPayment(payload: $payload) {
            data {
              beneficiary_type
              cash_retention
              list_status
              input_date
              cash_retention_type
              claim_amount
              claim_type
              client_supplier_id
              client_supplier_name
              client_supplier_type
              client_supplier_role
              compulsory_attachment_ids
              contract_date
              contract_id
              contract_name
              due_date
              formatted_claim_amount
              formatted_payless_amount
              formatted_payment_amount
              formatted_retention_amount
              formatted_total_amount
              gst_summary
              is_paid_confirmed
              is_received_confirmed
              is_retention_confirmed
              matched_transactions
              memo
              optional_attachment_ids
              outstanding_amount
              payless_amount
              payment_amount
              payment_claim_id
              payment_date
              payment_from_account
              payment_from_account_name
              payment_from_account_type
              payment_id
              payment_overview_buttons
              payment_to_account
              payment_to_account_bsb_number
              payment_to_account_name
              payment_to_account_number
              payment_type
              project_date
              project_id
              project_name
              retention_account
              retention_account_name
              retention_account_number
              retention_amount
              retention_type
              retention_id
              retention_list_id
              retention_release_date

              status
              status_in_ui
              third_party_payment_reason
              total_amount
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.fetchDetailsOfAPayment?.status === SUCCESS) {
      return response?.data?.fetchDetailsOfAPayment?.data;
    } else {
      return {};
    }
  } catch (error: any) {
    return {};
  }
}

export async function fetchPaymentsTransactions(postData: any): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query FetchAllSubPaymentsOfAPayment(
          $payload: FetchAllSubPaymentsOfAPaymentInput!
        ) {
          fetchAllSubPaymentsOfAPayment(payload: $payload) {
            data {
              payment_amount
              payment_to_account_id
              payment_to_account_name
              payment_transaction_id
              status
              sub_payment_type
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.fetchAllSubPaymentsOfAPayment?.status === SUCCESS) {
      return response?.data?.fetchAllSubPaymentsOfAPayment?.data;
    } else {
      return {};
    }
  } catch (error: any) {
    return {};
  }
}

export async function fetchMatchedTransactions(postData: any): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query FetchAllTheMatchedTransactionsOfAPayment(
          $payload: FetchAllTheMatchedTransactionsOfAPaymentInput!
        ) {
          fetchAllTheMatchedTransactionsOfAPayment(payload: $payload) {
            data {
              description
              transaction_date
              txn_amount
              unique_txn_id
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
      response?.data?.fetchAllTheMatchedTransactionsOfAPayment?.status ===
      SUCCESS
    ) {
      return response?.data?.fetchAllTheMatchedTransactionsOfAPayment?.data;
    } else {
      return {};
    }
  } catch (error: any) {
    return {};
  }
}

export async function updatePayments(postData: any): Promise<any> {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation Mutation($payload: EditDetailsOfAPaymentInput!) {
          editDetailsOfAPayment(payload: $payload) {
            data
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.editDetailsOfAPayment?.status === SUCCESS) {
      toast.success(response?.data?.editDetailsOfAPayment?.message);
      return true;
    } else {
      toast.error(response?.data?.editDetailsOfAPayment?.message);
      return false;
    }
  } catch (error: any) {
    toast.error(error);

    return false;
  }
}
export const deletePayment = async (data: any): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation ChangeStatusOfAPayment(
          $payload: ChangeStatusOfAPaymentInput!
        ) {
          changeStatusOfAPayment(payload: $payload) {
            data
            message
            status
          }
        }
      `,
      variables: {
        payload: data,
      },
      fetchPolicy: "no-cache",
    });
    if (
      response &&
      response?.data?.changeStatusOfAPayment?.status === SUCCESS
    ) {
      toast.success("Payment has been Deleted.");
      return true;
    }
    if (response && response?.data?.changeStatusOfAPayment?.status === ERROR) {
      return false;
    }
  } catch (error: any) {
    toast.error(error || SOMETHING_WENT_WRONG);

    return false;
  }
};

export const TriggerPaymentNotices = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation TriggerPaymentNotices($payload: triggerPaymentNoticesInput!) {
          triggerPaymentNotices(payload: $payload) {
            message
            status
          }
        }
      `,
      variables: {
        payload: data,
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.triggerPaymentNotices?.status === "SUCCESS") {
      toast.success(response?.data?.triggerPaymentNotices?.message);
      return true;
    }
    if (response?.data?.triggerPaymentNotices?.status === "ERROR") {
      toast.error(response?.data?.triggerPaymentNotices?.message);
      console.error(response?.data);
      return false;
    }
  } catch (error: any) {
    toast.error(error.message || "Something went wrong in API");
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};
