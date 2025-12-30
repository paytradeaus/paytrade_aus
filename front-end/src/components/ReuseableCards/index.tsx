import React from "react";
import FeatureCard from "../NavPageCards";

export default function ReuseableCards() {
  React.useEffect(() => {
    import("@lottiefiles/lottie-player");
  });

  return (
    <div className="container-fluid pt_features">
      <div className="grid pt_featuregrid pt_featureicongrid">
        <FeatureCard
          lottieSrc="/json/rbicons/rocket.json"
          title="Fast set-up"
          description="PayTrade is easy and fast to integrate, so you can ensure you are compliant and automate their trust accounts in minutes."
        />
        <FeatureCard
          lottieSrc="/json/rbicons/users.json"
          title="Unlimited users and multiple businesses"
          description="Manage multiple businesses, projects, trusts, contracts and contacts all from a single account."
        />

        <FeatureCard
          lottieSrc="/json/rbicons/supportrequest.json"
          title="Professional support"
          description="Share access with your accountant, bookkeeper, auditor and legal practitioners to get the support your business needs."
        />
        <FeatureCard
          lottieSrc="/json/rbicons/recommended.json"
          title="Eligibility checks"
          description="Carry out initial eligibility checks and monitor ongoing with contract size and variation automated monitoring."
        />
        <FeatureCard
          lottieSrc="/json/rbicons/cardverification.json"
          title="Account opening"
          description="Onboard new and existing trust and cash accounts, with compliance checks and linked notice processing."
        />

        <FeatureCard
          lottieSrc="/json/rbicons/complaint.json"
          title="Process claims"
          description="Record billable claims from head contractors with import functionality from other PayTrade users."
        />
        <FeatureCard
          lottieSrc="/json/rbicons/cardexchange.json"
          title="Process payments"
          description="Record and match payments and payment schedules to your head contractors. Automate payment to do lists with ABA file exports."
        />
        <FeatureCard
          lottieSrc="/json/rbicons/mailnotification.json"
          title="Submit notices"
          description="Automatically submit notices to the QBCC and your head contractors."
        />
        <FeatureCard
          lottieSrc="/json/rbicons/partner.json"
          title="Compliance review"
          description="Stay on top of your legal compliance with auto compliance monitoring and alerts."
        />

        <FeatureCard
          lottieSrc="/json/rbicons/finance.json"
          title="Bank connections"
          description="Save time with linked bank feeds and reconciliation automations."
        />
        <FeatureCard
          lottieSrc="/json/rbicons/planning.json"
          title="Process retentions"
          description="Simplify retention management and retention trust accounting with automatic retention list recording."
        />
        <FeatureCard
          lottieSrc="/json/rbicons/contract.json"
          title="Trust account records"
          description="Automatically create and manage retention trust account records."
        />

        <FeatureCard
          lottieSrc="/json/rbicons/explore.json"
          title="Reconciliations and audit"
          description="Efficiently and easily carry out monthly reconciliations, gather and submit audit documentation."
        />
        <FeatureCard
          lottieSrc="/json/rbicons/smartphone.json"
          title="Integrate apps"
          description="Integrate with your existing software providers."
        />
        <FeatureCard
          lottieSrc="/json/rbicons/news.json"
          title="Reporting"
          description="Automate your reporting requirements to the QBCC and head contractors."
        />
        <FeatureCard
          lottieSrc="/json/rbicons/organization.json"
          title="Delegate authority"
          description="Delegate your trust accounting processing to PayTrade so we can submit your notices for you."
        />
        <FeatureCard
          lottieSrc="/json/rbicons/suppliers.json"
          title="Manage suppliers"
          description="See details of your head contractors in one place."
        />
        <FeatureCard
          lottieSrc="/json/rbicons/notification.json"
          title="Dashboard"
          description="Keep an eye on your compliance, notices, payments, to do list and accounts all at a glance."
        />
      </div>
    </div>
  );
}
