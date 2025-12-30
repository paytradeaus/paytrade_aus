const subscriptionStatus = {
  CANCELLED: "Cancelled",
  UNSUBSCRIBED: "Unsubscribed",
};

const durationType = {
  MONTHLY: "Month",
  YEARLY: "Year",
};

const availableCountries = [
  {
    value: "Australia",
    label: "Australia",
  },
  {
    value: "UK",
    label: "UK",
  },
];

const paymentType = [
  {
    label: "Debit/Credit card",
    value: "Debit/Credit card",
  },
  {
    label: "Bank transfer",
    value: "Bank transfer",
  },
];

const paymentMethodSuccess = "Payment method added successfully";

const confirmationModalMessage = {
  CHANGE_DEFAULT_CARD: "Are you sure you want to make this card your default?",
  UPDATE_PAYMENT_CARD: "Are you sure you want to update your payment method?",
  DELETE_PAYMENT_CARD: "Are you sure you want to delete this card?",
};
const urlQueries = {
  UPDATE_PAYMENT: "update-payment",
};

const billingStatus = {
  PAID: "paid",
  DUE: "due",
};

const billingStatusOptions = [
  { label: "All", value: "All" },
  { label: "Paid", value: "paid" },
  { label: "Failed", value: "failed" },
];

export {
  subscriptionStatus,
  durationType,
  availableCountries,
  paymentType,
  paymentMethodSuccess,
  confirmationModalMessage,
  urlQueries,
  billingStatus,
  billingStatusOptions,
};
