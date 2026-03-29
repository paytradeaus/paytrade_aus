interface PlanProps {
  planType: string;
  isCurrentPlan?: boolean;
  title: string;
  description: string;
  price: string;
  buttonText: string;
  href?: string;
  offerText?: string;
  OfferMonths?: string;
}

export const plans: PlanProps[] = [];

export const features = [
  {
    name: "Automated Notice Triggers",
    basic: false,
    premium: true,
    platinum: true,
  },
  { name: "Multiple user access", basic: false, premium: true, platinum: true },
  {
    name: "Onboarding of Business Profiles",
    basic: true,
    premium: true,
    platinum: true,
  },
];
