import { gql } from "@apollo/client";
import { toast } from "@/app/Toaster";
import { client } from "@/app/api/apolloClientServices";
import { PaymentData } from "./paymentToDoList.types";
import {
  ERROR,
  SOMETHING_WENT_WRONG,
  SUCCESS,
} from "@/common/constants/messages";
export const ListAllPaymentsInput = async (
  data: any,
  setLoading?: Function
): Promise<{ payments: PaymentData[]; total_count: number } | any> => {
  try {
    const response = await client.query({
      query: gql`
        query Data($payload: ListAllPaymentsInput!) {
          listAllPayments(payload: $payload) {
            data {
              payments {
                cash_retention
                cash_retention_type
                claim_amount
                claim_type
                input_date
                client_supplier_id
                client_supplier_name
                client_supplier_type
                compulsory_attachment_ids
                contract_date
                contract_id
                contract_name
                due_date
                gst_summary
                is_paid_confirmed
                list_status
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
                retention_release_date
                status
                third_party_payment_reason
                total_amount
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: { payload: data },
      fetchPolicy: "no-cache",
    });
    if (response && response?.data?.listAllPayments?.status === SUCCESS) {
      return response?.data?.listAllPayments?.data;
    }
    if (response && response?.data?.listAllPayments?.status === ERROR) {
      return null;
    }
  } catch (error: any) {
    // toast.error(error?.message || SOMETHING_WENT_WRONG);

    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const editDetailsOfAPayment = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
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
      variables: {
        payload: data,
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.editDetailsOfAPayment?.status === SUCCESS) {
      toast.success(successMsg || "Payment status updated successfully");
      return true;
    }
    if (response?.data?.editDetailsOfAPayment?.status === ERROR) {
      toast.error(response?.data?.editDetailsOfAPayment?.message);
      return false;
    }
  } catch (error: any) {
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};

export const fetchAllPaymentsList = async (
  data: any,
  setLoading?: Function
): Promise<{ payments: PaymentData[]; total_count: number } | any> => {
  try {
    const response = await client.query({
      query: gql`
        query ListAllSubPayments($payload: ListSubPaymentsInput!) {
          listAllSubPayments(payload: $payload) {
            data {
              total_count
              payments {
                amount
                id
                payment_date
                payment_from_account
                payment_from_account_name
                payment_id
                payment_to_account
                payment_to_account_bsb_number
                payment_to_account_name
                payment_to_account_number
                status
                sub_payment_id
                sub_payment_type
                is_late
                payment_type
                claim_type
              }
            }
            message
            status
          }
        }
      `,
      variables: { payload: data },
      fetchPolicy: "no-cache",
    });

    if (response && response?.data?.listAllSubPayments?.status === SUCCESS) {
      return response?.data?.listAllSubPayments?.data;
    }
    if (response && response?.data?.listAllSubPayments?.status === ERROR) {
      return null;
    }
  } catch (error: any) {
    // toast.error(error?.message || SOMETHING_WENT_WRONG);

    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
