interface PlanProps {
  planType: "basic" | "premium" | "platinum";
  isCurrentPlan?: boolean;
  title: string;
  description: string;
  price: string;
  buttonText: string;
  href?: string;
  offerText?: string;
  OfferMonths?: string;
}

export const plans: PlanProps[] = [
  {
    planType: "basic", // Must match the literal type
    isCurrentPlan: true,
    title: "Basic",
    description:
      "Gilla lacus eu tempor eleifend. Suspendisse potenti. Nunc eu tortor hendrerit, porta arcu non, scelerisque quam. Donec porttitor orci ligula",
    price: "$0.00 +VAT",
    buttonText: "Current plan",
  },
  {
    planType: "premium", // Must match the literal type
    title: "Premium",
    description:
      "Gilla lacus eu tempor eleifend. Suspendisse potenti. Nunc eu tortor hendrerit, porta arcu non, scelerisque quam. Donec porttitor orci ligula",
    price: "$275.00/yr +VAT",
    buttonText: "Choose plan",
    href: "#",
  },
  {
    planType: "platinum", // Must match the literal type
    title: "Platinum",
    description:
      "Gilla lacus eu tempor eleifend. Suspendisse potenti. Nunc eu tortor hendrerit, porta arcu non, scelerisque quam. Donec porttitor orci ligula",
    price: "$500.00/yr +VAT",
    buttonText: "Choose plan",
    href: "#",
    offerText: "months free trial",
    OfferMonths: "3",
  },
];

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
