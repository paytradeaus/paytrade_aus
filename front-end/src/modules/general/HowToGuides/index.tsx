import React from "react";
import TitleSection from "../../../components/TitleSection";
import GuidesCTA from "@/components/GuidesCard";
import { buttonType } from "@/shared/constant/general";

export default function HowToGuidesPage() {
  React.useEffect(() => {
    import("@lottiefiles/lottie-player");
  });

  return (
    <main>
      <TitleSection
        title="How to guides"
        subtitle="Learn how to use PayTrade to its full potential"
        description=""
      />
      <div className="container-fluid">
        <br />
        <br />
        <div className="grid guidesgrid">
          <GuidesCTA
            title="Getting Started"
            description="Setting Up Your PayTrade Account"
            buttonText="Watch video guide"
            buttonLink="#"
            lottieSrc="/json/rbicons/cardexchange.json"
          />
          <GuidesCTA
            title="Project Trust Accounts"
            description="Creating Your First Project Trust Account"
            buttonText="Watch video guide"
            buttonLink="#"
            lottieSrc="/json/rbicons/finance.json"
          />
          <GuidesCTA
            title="Retention Trust Accounts"
            description="Setting Up a Retention Trust Account"
            buttonText="Watch video guide"
            buttonLink="#"
            lottieSrc="/json/rbicons/success.json"
          />
          <GuidesCTA
            title="Compliance and Reporting"
            description="QBCC Compliance Checklist"
            buttonText="Watch video guide"
            buttonLink="#"
            lottieSrc="/json/cashwithdrawal.json"
          />
          <GuidesCTA
            title="Payment Processing"
            description="Processing Payment Applications"
            buttonText="Watch video guide"
            buttonLink="#"
            lottieSrc="/json/balancetransfer.json"
          />
        </div>
      </div>
    </main>
  );
}
