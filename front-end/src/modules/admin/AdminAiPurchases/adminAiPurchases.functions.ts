import { client } from "@/app/api/adminApi/adminApi";
import { gql } from "@apollo/client";

export const fetchAdminAiPurchases = async (filter: any = {}) => {
  const res = await client.query({
    query: gql`
      query GetAdminAiPurchases($input: AdminAiPurchasesFilterInput) {
        getAdminAiPurchases(input: $input) {
          rows {
            id
            company_id
            company_name
            credits_purchased_usd
            stripe_fee_usd
            amount_charged_usd
            currency
            status
            trigger_type
            stripe_payment_intent_id
            failure_reason
            receipt_pdf_url
            created_on
          }
          total_count
          total_revenue_usd
          total_credits_sold_usd
          total_stripe_fees_usd
        }
      }
    `,
    variables: { input: filter },
    fetchPolicy: "no-cache",
  });
  return res.data?.getAdminAiPurchases;
};

export const fetchAiUserCostMultiplier = async () => {
  const res = await client.query({
    query: gql`
      query GetAiUserCostMultiplier {
        getAiUserCostMultiplier
      }
    `,
    fetchPolicy: "no-cache",
  });
  return res.data?.getAiUserCostMultiplier as number;
};

export const setAiUserCostMultiplier = async (value: number) => {
  const res = await client.mutate({
    mutation: gql`
      mutation SetAiUserCostMultiplier($value: Float!) {
        setAiUserCostMultiplier(value: $value)
      }
    `,
    variables: { value },
  });
  return res.data?.setAiUserCostMultiplier as number;
};
