import { client } from "@/app/api/adminApi/adminApi";
import { gql } from "@apollo/client";

export const fetchAiBillingOverview = async (companyId: number) => {
  const res = await client.query({
    query: gql`
      query GetAiBillingOverview($company_id: Int!) {
        getAiBillingOverview(company_id: $company_id) {
          company_id
          balance_usd
          plan_monthly_credit_usd
          plan_name
          low_balance_trigger_usd
          is_below_trigger
          settings {
            company_id
            auto_topup_enabled
            low_balance_trigger_usd
            topup_amount_usd
            monthly_topup_cap_usd
            stripe_payment_method_id
            billing_email
            last_topup_failure_reason
            is_sandbox
          }
          saved_card {
            brand
            last4
            exp_month
            exp_year
          }
        }
      }
    `,
    variables: { company_id: companyId },
    fetchPolicy: "no-cache",
  });
  return res.data?.getAiBillingOverview;
};

export const fetchAiCreditLedger = async (companyId: number, limit = 50) => {
  const res = await client.query({
    query: gql`
      query GetAiCreditLedger($company_id: Int!, $limit: Int) {
        getAiCreditLedger(company_id: $company_id, limit: $limit) {
          id
          event_type
          amount_usd
          balance_after
          notes
          created_on
        }
      }
    `,
    variables: { company_id: companyId, limit },
    fetchPolicy: "no-cache",
  });
  return res.data?.getAiCreditLedger ?? [];
};

export const fetchAiCreditPurchases = async (companyId: number) => {
  const res = await client.query({
    query: gql`
      query GetAiCreditPurchases($company_id: Int!) {
        getAiCreditPurchases(company_id: $company_id) {
          id
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
      }
    `,
    variables: { company_id: companyId },
    fetchPolicy: "no-cache",
  });
  return res.data?.getAiCreditPurchases ?? [];
};

export const updateAiBillingSettings = async (
  companyId: number,
  input: any
) => {
  const res = await client.mutate({
    mutation: gql`
      mutation UpdateAiBillingSettings(
        $company_id: Int!
        $input: UpdateAiBillingSettingsInput!
      ) {
        updateAiBillingSettings(company_id: $company_id, input: $input) {
          company_id
          auto_topup_enabled
          low_balance_trigger_usd
          topup_amount_usd
          monthly_topup_cap_usd
          billing_email
        }
      }
    `,
    variables: { company_id: companyId, input },
  });
  return res.data?.updateAiBillingSettings;
};

export const createAiBillingSetupIntent = async (
  companyId: number,
  isSandbox = false
) => {
  const res = await client.mutate({
    mutation: gql`
      mutation CreateAiBillingSetupIntent(
        $company_id: Int!
        $is_sandbox: Boolean
      ) {
        createAiBillingSetupIntent(
          company_id: $company_id
          is_sandbox: $is_sandbox
        ) {
          client_secret
          customer_id
        }
      }
    `,
    variables: { company_id: companyId, is_sandbox: isSandbox },
  });
  return res.data?.createAiBillingSetupIntent;
};

export const attachAiBillingPaymentMethod = async (
  companyId: number,
  paymentMethodId: string,
  isSandbox = false
) => {
  const res = await client.mutate({
    mutation: gql`
      mutation AttachAiBillingPaymentMethod(
        $company_id: Int!
        $input: AttachPaymentMethodInput!
      ) {
        attachAiBillingPaymentMethod(company_id: $company_id, input: $input) {
          stripe_payment_method_id
        }
      }
    `,
    variables: {
      company_id: companyId,
      input: { payment_method_id: paymentMethodId, is_sandbox: isSandbox },
    },
  });
  return res.data?.attachAiBillingPaymentMethod;
};

export const detachAiBillingPaymentMethod = async (companyId: number) => {
  const res = await client.mutate({
    mutation: gql`
      mutation DetachAiBillingPaymentMethod($company_id: Int!) {
        detachAiBillingPaymentMethod(company_id: $company_id) {
          company_id
          stripe_payment_method_id
          auto_topup_enabled
        }
      }
    `,
    variables: { company_id: companyId },
  });
  return res.data?.detachAiBillingPaymentMethod;
};

export const triggerManualTopup = async (
  companyId: number,
  creditsUsd: number,
  isSandbox = false
) => {
  const res = await client.mutate({
    mutation: gql`
      mutation ManualAiCreditTopup(
        $company_id: Int!
        $input: ManualTopupInput!
      ) {
        manualAiCreditTopup(company_id: $company_id, input: $input) {
          purchase_id
          status
          credits_purchased_usd
          amount_charged_usd
          stripe_fee_usd
          balance_after
          client_secret
          failure_reason
        }
      }
    `,
    variables: {
      company_id: companyId,
      input: { credits_usd: creditsUsd, is_sandbox: isSandbox },
    },
  });
  return res.data?.manualAiCreditTopup;
};
