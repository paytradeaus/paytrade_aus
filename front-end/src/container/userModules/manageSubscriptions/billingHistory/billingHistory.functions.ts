import { client } from "@/app/api/apolloClientServices";
import { toast } from "@/app/Toaster";
import { ERROR, SUCCESS } from "@/common/constants/messages";
import { gql } from "@apollo/client";

export interface PaymentHistoryType {
  amount_paid: string;
  attempt_count: number;
  attempted: boolean;
  company_id: string;
  company_name: string;
  customer_id: string;
  effective_at: string;
  expiry_date: string;
  hosted_invoice_url: string;
  id: string;
  invoice_id: string;
  invoice_number: string;
  invoice_pdf: string;
  next_payment_attempt: string;
  paid_at: string;
  payment_intent: string;
  payment_method: string;
  start_date: string;
  status: string;
  stripe_subscription_id: string;
  subscription_id: string;
}

export interface PaymentHistoryResponseType {
  payment_history: PaymentHistoryType[];
  total_count: number;
}

export async function getPaymentHistoryByCompanyId(
  getPaymentHistoryInput: any,
  setLoading?: Function
): Promise<PaymentHistoryResponseType | null | undefined> {
  try {
    if (setLoading) setLoading(true);

    const response = await client.query({
      query: gql`
        query GetPaymentHistoryByCompanyId(
          $getPaymentHistoryInput: GetPaymentHistoryInput!
        ) {
          getPaymentHistoryByCompanyId(
            getPaymentHistoryInput: $getPaymentHistoryInput
          ) {
            data {
              payment_history {
                amount_paid
                attempt_count
                attempted
                company_id
                company_name
                customer_id
                effective_at
                expiry_date
                hosted_invoice_url
                id
                invoice_id
                invoice_number
                invoice_pdf
                next_payment_attempt
                paid_at
                payment_intent
                payment_method
                start_date
                status
                stripe_subscription_id
                subscription_id
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: { getPaymentHistoryInput },
      fetchPolicy: "no-cache",
    });

    // console.log("🚀 ~ getPaymentHistoryByCompanyId ~ response:", response);

    if (response?.data?.getPaymentHistoryByCompanyId?.status === "SUCCESS") {
      return response?.data?.getPaymentHistoryByCompanyId?.data;
    } else if (
      response?.data?.getPaymentHistoryByCompanyId?.status === "ERROR"
    ) {
      toast.error(response?.data?.getPaymentHistoryByCompanyId?.message);
      return null;
    }
  } catch (error: any) {
    console.error("Error fetching payment history:", error);
    toast.error("Something went wrong in the API");
    return null;
  } finally {
    if (setLoading) setLoading(false);
  }
}
