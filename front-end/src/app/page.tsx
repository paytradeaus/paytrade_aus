"use client";
import AccountantsPage from "@/modules/general/Accountants";
import AuditorsPage from "@/components/Auditors";
import GuestFooter from "@/components/GuestFooter";
import GuestNavbar from "@/components/GuestNavbar";
import HeadContractorsPage from "@/modules/general/HeadContractors";
import HomeScreenPage from "@/components/HomeScreen";
import LegalPractitionersPage from "@/modules/general/LegalPractitioners";
import PrincipalsClientsPage from "@/modules/general/PrincipalsClients";
import { useIsClient } from "@/hooks";
import { Suspense, useEffect, useState } from "react";
import SubContractorsPage from "@/modules/general/SubContractors";
import BookKeepersPage from "@/modules/general/BookKeepers";
import FeaturesPage from "@/modules/general/Features";
import FaqsPage from "@/modules/general/FAQS";
import SupportPage from "@/modules/general/GetSupport";
import HowToGuidesPage from "@/modules/general/HowToGuides";
import BlogsPage from "@/modules/general/Blogs";
import PricingPage from "@/modules/general/Pricing";
import Subscriptions from "@/modules/user/Subscriptions";
import ContentDetailPage from "@/modules/general/ContentDetails";
import HomeMobileSidebar from "@/components/HomeMobileSidebar";
import { useLoaderContext } from "@/context/useLoader";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { clearBrowserStorage } from "@/utils";
import { useRouter } from "next/navigation";
import { InactivityDetector } from "@/components/InactivityDetector/InactivityDetector";
import Community from "@/modules/general/Community";
import StartDiscussion from "@/modules/general/StartDiscussion";
import Discussion from "@/modules/general/Discussion";
import Topic from "@/modules/general/Topic";
import { useAppDispatch } from "@/redux/store";
import { updateUserMode } from "@/redux/slices/userModeSlice";
import { setAppUserDetails } from "@/redux/slices/userRegistrationSlice";
import { getCookie } from "cookies-next";
import { JSON_LD } from "@/utils/JSON-LD";
import SeoLandingPage from "@/modules/general/SeoLandingPage";
import AiSupportPage from "@/modules/general/AiSupport";

export default function Home(props: any) {
  const { screen } = props;
  const { isClient }: any = useIsClient();
  const { tabId }: any = useLoaderContext(); // Move this hook before the conditional return
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const JSON_LDData = JSON_LD.default;

  useEffect(() => {
    // Check if accessVerification cookie exists
    const accessVerification = getCookie("accessVerification");
    setIsLoggedIn(!!accessVerification);

    const broadcast = new BroadcastChannel("auth-channel");
    const handleLogoutEvent = (event: any) => {
      const { type, tabId: senderTabId } = event?.data || {};
      if (type === "LOGOUT" && senderTabId !== tabId) {
        router.push(AppRoutes.HOME);
        clearBrowserStorage();
        dispatch(updateUserMode(null));
        dispatch(setAppUserDetails({}));
        // toast.success(SIGN_OUT_IN_OTHER_TABS_MSG);
      }
    };

    broadcast.addEventListener("message", handleLogoutEvent);

    return () => broadcast.removeEventListener("message", handleLogoutEvent);
  }, []);

  // Ensure all hooks are called before any conditional returns
  if (!isClient) return null; // Avoid mismatches during hydration

  // Render components based on currentPage
  const renderPage = () => {
    switch (screen) {
      case "HOME":
        return (
          <>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify(JSON_LDData),
              }}
            />
            <HomeScreenPage />
          </>
        );
      case "PRINCIPALS":
        return <PrincipalsClientsPage />;
      case "HEADCONTRACTOR":
        return <HeadContractorsPage />;
      case "SUBCONTRACTOR":
        return <SubContractorsPage />;
      case "ACCOUNTANTS":
        return <AccountantsPage />;
      case "BOOKKEEPERS":
        return <BookKeepersPage />;
      case "AUDITORS":
        return <AuditorsPage />;
      case "LEGAL":
        return <LegalPractitionersPage />;
      case "FEATURES":
        return <FeaturesPage />;
      case "FAQS":
        return <FaqsPage />;
      case "SUPPORT":
        return <SupportPage />;
      case "AI_SUPPORT":
        return <AiSupportPage />;
      case "HOW-TO-GUIDES":
        return (
          <BlogsPage
            route="how-to-guides"
            contentType="howToGuide"
            title="How to guides"
            subtitle="Learn how to use PayTrade to its full potential"
          />
        );
      case "HOW-TO-GUIDES-DETAIL":
        return (
          <ContentDetailPage
            route="how-to-guides"
            contentType="howToGuide"
            title="How to guides"
          />
        );
      case "BLOGS":
        return (
          <BlogsPage
            route="blog"
            contentType="Blog"
            title="Blogs"
            subtitle="Read about the latest news and updates from PayTrade and the industry"
          />
        );
      case "BLOG-DETAIL":
        return (
          <ContentDetailPage route="blog" contentType="Blog" title="Blog" />
        );
      case "ARTICLES":
        return (
          <BlogsPage
            route="articles"
            contentType="Resource"
            title="Resources"
            subtitle="Read about the latest news and updates from PayTrade and the industry"
          />
        );
      case "ARTICLE-DETAIL":
        return (
          <ContentDetailPage
            route="articles"
            contentType="Resource"
            title="Resource"
            downloadResource={true}
          />
        );
      case "PRICING":
        return <PricingPage />;
      case "SUBSCRIPTIONS":
        return <Subscriptions />;
      case "COMMUNITY":
        return <Community />;
      case "START-DISCUSSION":
        return <StartDiscussion from={"start discussion"} edit={false} />;
      case "CREATE-PRODUCT-IDEAS":
        return <StartDiscussion from={"create product idea"} edit={false} />;
      case "EDIT-DISCUSSION":
        return <StartDiscussion from={"start discussion"} edit={true} />;
      case "EDIT-PRODUCT-IDEAS":
        return <StartDiscussion from={"create product idea"} edit={true} />;
      case "DISCUSSION":
        return <Discussion />;
      case "TOPIC":
        return <Topic />;
      case "SEO-LANDING":
        return <SeoLandingPage />;
      default:
        return (
          <>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify(JSON_LDData),
              }}
            />
            <HomeScreenPage />
          </>
        ); // Default fallback
    }
  };

  return (
    <Suspense>
      <div className="pt_wrap">
        <div className="pt_page">
          <HomeMobileSidebar />
          <GuestNavbar />
          {renderPage()}
          {/* Render only if logged in */}
          {isLoggedIn && <InactivityDetector />}
          <GuestFooter />
        </div>
      </div>
      <div className="paytradeffectwrap" style={{ zIndex: "-1" }}>
        <div className="paytradeffect">
          <div className="themeshade"></div>
          <div className="oceanshade"></div>
          <div className="crabshade"></div>
        </div>
      </div>
      <div className="noise" style={{ zIndex: "-1" }}></div>
    </Suspense>
  );
}
