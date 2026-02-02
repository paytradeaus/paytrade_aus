import React, { useEffect, useRef, useState } from "react";
import {
  BUTTON_DEMO_TEXT,
  BUTTON_EXPLORE_FEATURES_TEXT,
  BUTTON_SIGNUP_TEXT,
  BUTTON_TRUST_TOOL_TEXT,
  BUTTON_TUTORIALS_TEXT,
  BUTTON_VIEWFAQ_TEXT,
  FAQ_HEAD,
  FAQ_SUB_HEAD,
  FEATURE_ACCOUNT_OPENING,
  FEATURE_ACCOUNT_OPENING_DESC,
  FEATURE_COMMUNITY,
  FEATURE_COMMUNITY_DESC,
  FEATURE_COMPLIANCE_REVIEW,
  FEATURE_COMPLIANCE_REVIEW_DESC,
  FEATURE_ELIGIBILITY_CHECKS,
  FEATURE_ELIGIBILITY_CHECKS_DESC,
  FEATURE_INTEGRATIONS,
  FEATURE_INTEGRATIONS_DESC,
  FEATURE_MATCH_PAYMENTS,
  FEATURE_MATCH_PAYMENTS_DESC,
  FEATURE_ONBOARDING_SUPPORT,
  FEATURE_ONBOARDING_SUPPORT_DESC,
  FEATURE_PROCESS_PAYMENT,
  FEATURE_PROCESS_PAYMENT_DESC,
  FEATURE_RECONCILE_AUDIT,
  FEATURE_RECONCILE_AUDIT_DESC,
  FEATURE_SUPPORT_CENTRE,
  FEATURE_SUPPORT_CENTRE_DESC,
  FEATURES_TITLE,
  HIGHLIGHTS_SUBTITLE,
  HIGHLIGHTS_TITLE,
  HOME_DESCRIPTION,
  HOME_LAST_DESC,
  HOME_LAST_HEADING,
  HOME_LAST_SUBHEAD,
  HOME_SUBHEADER,
  MAIN_HOME_TEXT,
  TOOL_DESCRIPTION,
  TOOL_HEADER,
} from "./homeScreen.constants";
import { setCurentHomePage } from "@/redux/slices/homePage";
import { useAppDispatch } from "@/redux/store";
import Accordion from "../Accordion";
import { showErrorToast } from "../Toaster";
import { FAQ, fetchFaqList } from "@/modules/general/FAQS/Faq.functions";
import Link from "next/link";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { usePathname, useRouter } from "next/navigation";
export default function HomeScreenPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  // Correctly type the dialogRef as HTMLDialogElement
  const dialogRef = useRef<HTMLDialogElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null); // Ref to the iframe element
  const [isOpen, setIsOpen] = useState(false); // Modal open state
  const videoSrc = "https://www.youtube.com/embed/KJwYBJMSbPI";

  const toggleModal = (event: React.MouseEvent) => {
    event.preventDefault();
    if (dialogRef.current) {
      if (dialogRef.current.open) {
        // Close the modal and stop video
        stopVideo();
        dialogRef.current.close();
      } else {
        // Open the modal
        dialogRef.current.showModal();
        // Set the video source again to start playing
        startVideo();
      }
    }
  };

  // Function to stop the video by resetting the iframe's src
  const stopVideo = () => {
    if (iframeRef.current) {
      iframeRef.current.src = ""; // This stops the video playback
    }
  };

  // Function to start the video by setting the iframe's src
  const startVideo = () => {
    if (iframeRef.current) {
      iframeRef.current.src = videoSrc; // Set the video URL to start playback
    }
  };

  // Fetch FAQs on component mount
  useEffect(() => {
    async function getFaqs() {
      setLoading(true);
      try {
        const data = await fetchFaqList({
          category: null, // Replace with desired category value
          keyword: "", // Replace with desired keyword
          page: null, // Replace with desired page number
          perPage: null, // Replace with desired per-page count
          status: "Active", // Replace with desired status value
          showInHome: true,
        });
        setFaqs(data?.FAQs || []);
      } catch (error) {
        showErrorToast("Failed to load FAQs");
      } finally {
        setLoading(false);
      }
    }

    getFaqs();
  }, []);
  const dispatch = useAppDispatch();

  const ref = useRef(null);
  React.useEffect(() => {
    import("@lottiefiles/lottie-player");
  });

  useEffect(() => {
    dispatch(setCurentHomePage("HOME"));
  }, []);

  const cardsRef = useRef<NodeListOf<Element> | null>(null);

  useEffect(() => {
    const handleMouseMove = (ev: MouseEvent) => {
      const all = cardsRef.current;
      if (all) {
        all.forEach((e) => {
          const blob = e.querySelector(".blob") as HTMLElement;
          const fblob = e.querySelector(".fakeblob") as HTMLElement;

          if (blob && fblob) {
            const rec = fblob.getBoundingClientRect();
            blob.style.opacity = "1";

            blob.animate(
              [
                {
                  transform: `translate(${
                    ev.clientX - rec.left - rec.width / 2
                  }px, ${ev.clientY - rec.top - rec.height / 2}px)`,
                },
              ],
              {
                duration: 300,
                fill: "forwards",
              }
            );
          }
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <main ref={(el: any) => (cardsRef.current = el?.querySelectorAll(".card"))}>
      <div className="pt_hometop">
        <div className="container-fluid">
          <div className="grid">
            <div className="pt_hometoptext">
              <div className="pt_hometoptextinner">
                <h1 className="oceantext">{MAIN_HOME_TEXT}</h1>
                <h2>{HOME_SUBHEADER}</h2>
                <p>{HOME_DESCRIPTION}</p>
                <button
                  className="secondary"
                  data-target="demovideo"
                  onClick={toggleModal}
                >
                  <i className="fa-light fa-film"></i>
                  {BUTTON_DEMO_TEXT}
                </button>
                <Link href={AppRoutes.USER_SIGNUP}>
                  <button>
                    <i className="fa-light fa-user-plus"></i>
                    {BUTTON_SIGNUP_TEXT}
                  </button>
                </Link>
              </div>
              <div className="blurblobtheme"></div>
            </div>
            <div className="pt_hometopimage">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Dashboard mockup"
                src="/images/mockupshots.png?v=3"
                className="mockupshots"
                loading="eager"
                decoding="async"
              />
              <div className="blurblobriver"></div>
              <div className="blurblobcoral"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog Component */}
      <dialog id="demovideo" className="pt_largedialog" ref={dialogRef}>
        <article>
          <header>
            <button
              aria-label="Close"
              rel="prev"
              data-target="demovideo"
              onClick={toggleModal}
            ></button>
            <h4>Demo video</h4>
          </header>
          {/* Embedded Video */}
          <style>
            {`
              .embed-container {
                position: relative;
                padding-bottom: 56.25%;
                height: 0;
                overflow: hidden;
                max-width: 100%;
              }
              .embed-container iframe,
              .embed-container object,
              .embed-container embed {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
              }
            `}
          </style>
          <div className="embed-container">
            <iframe
              ref={iframeRef}
              src={videoSrc}
              frameBorder="0"
              allowFullScreen
              title="Demo Video"
            ></iframe>
          </div>
        </article>
      </dialog>

      <div className="container-fluid pt_toolwrap">
        <div className="pt_box">
          <div className="pt_tool">
            <div className="pt_tooltext">
              <h4>{TOOL_HEADER}</h4>
              <p>{TOOL_DESCRIPTION}</p>
            </div>
            <div className="pt_toolbutton">
              <a
                href="https://my.qbcc.qld.gov.au/myQBCC/s/trust-accounts-tool"
                target="_blank"
              >
                <button className="contrast">
                  {BUTTON_TRUST_TOOL_TEXT}
                  <i className="fa-light fa-arrow-up-right-from-square right"></i>
                </button>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="container-fluid pt_features">
        <h2>{FEATURES_TITLE}</h2>
        <div className="grid pt_featuregrid">
          <div className="pt_glow">
            <div className="card">
              <div className="inner">
                <div className="pt_feature">
                  <div className="pt_featureimage">
                    <lottie-player
                      autoplay
                      loop
                      mode="normal"
                      src="/json/gettingloan.json?v=1"
                    ></lottie-player>
                  </div>
                  <div className="pt_featuretext">
                    <h4>{FEATURE_ACCOUNT_OPENING}</h4>
                    <p>{FEATURE_ACCOUNT_OPENING_DESC}</p>
                  </div>
                </div>
              </div>
              <div className="blob"></div>
              <div className="fakeblob"></div>
            </div>
          </div>
          <div className="pt_glow">
            <div className="card">
              <div className="inner">
                <div className="pt_feature">
                  <div className="pt_featureimage">
                    <lottie-player
                      autoplay
                      loop
                      mode="normal"
                      src="/json/balancetransfer.json?v=1"
                    ></lottie-player>
                  </div>
                  <div className="pt_featuretext">
                    <h4>{FEATURE_PROCESS_PAYMENT}</h4>
                    <p>{FEATURE_PROCESS_PAYMENT_DESC}</p>
                  </div>
                </div>
              </div>
              <div className="blob"></div>
              <div className="fakeblob"></div>
            </div>
          </div>
          <div className="pt_glow">
            <div className="card">
              <div className="inner">
                <div className="pt_feature">
                  <div className="pt_featureimage">
                    <lottie-player
                      autoplay
                      loop
                      mode="normal"
                      src="/json/banksafe.json?v=1"
                    ></lottie-player>
                  </div>
                  <div className="pt_featuretext">
                    <h4>{FEATURE_MATCH_PAYMENTS}</h4>
                    <p>{FEATURE_MATCH_PAYMENTS_DESC}</p>
                  </div>
                </div>
              </div>
              <div className="blob"></div>
              <div className="fakeblob"></div>
            </div>
          </div>
          <div className="pt_glow">
            <div className="card">
              <div className="inner">
                <div className="pt_feature">
                  <div className="pt_featureimage">
                    <lottie-player
                      autoplay
                      loop
                      mode="normal"
                      src="/json/cardholder.json?v=1"
                    ></lottie-player>
                  </div>
                  <div className="pt_featuretext">
                    <h4>{FEATURE_RECONCILE_AUDIT}</h4>
                    <p>{FEATURE_RECONCILE_AUDIT_DESC}</p>
                  </div>
                </div>
              </div>
              <div className="blob"></div>
              <div className="fakeblob"></div>
            </div>
          </div>
          <div className="pt_glow">
            <div className="card">
              <div className="inner">
                <div className="pt_feature">
                  <div className="pt_featureimage">
                    <lottie-player
                      autoplay
                      loop
                      mode="normal"
                      src="/json/cashwithdrawal.json?v=1"
                    ></lottie-player>
                  </div>
                  <div className="pt_featuretext">
                    <h4>{FEATURE_COMPLIANCE_REVIEW}</h4>
                    <p>{FEATURE_COMPLIANCE_REVIEW_DESC}</p>
                  </div>
                </div>
              </div>
              <div className="blob"></div>
              <div className="fakeblob"></div>
            </div>
          </div>
          <div className="pt_glow">
            <div className="card">
              <div className="inner">
                <div className="pt_feature">
                  <div className="pt_featureimage">
                    <lottie-player
                      autoplay
                      loop
                      mode="normal"
                      src="/json/banksupport.json?v=1"
                    ></lottie-player>
                  </div>
                  <div className="pt_featuretext">
                    <h4>{FEATURE_ONBOARDING_SUPPORT}</h4>
                    <p>{FEATURE_ONBOARDING_SUPPORT_DESC}</p>
                  </div>
                </div>
              </div>
              <div className="blob"></div>
              <div className="fakeblob"></div>
            </div>
          </div>
          <div className="pt_glow">
            <div className="card">
              <div className="inner">
                <div className="pt_feature">
                  <div className="pt_featureimage">
                    <lottie-player
                      autoplay
                      loop
                      mode="normal"
                      src="/json/bankdeposit.json?v=1"
                    ></lottie-player>
                  </div>
                  <div className="pt_featuretext">
                    <h4>{FEATURE_ELIGIBILITY_CHECKS}</h4>
                    <p>{FEATURE_ELIGIBILITY_CHECKS_DESC}</p>
                  </div>
                </div>
              </div>
              <div className="blob"></div>
              <div className="fakeblob"></div>
            </div>
          </div>
          <div className="pt_glow">
            <div className="card">
              <div className="inner">
                <div className="pt_feature">
                  <div className="pt_featureimage">
                    <lottie-player
                      autoplay
                      loop
                      mode="normal"
                      src="/json/amountcalculation.json?v=1"
                    ></lottie-player>
                  </div>
                  <div className="pt_featuretext">
                    <h4>{FEATURE_INTEGRATIONS}</h4>
                    <p>{FEATURE_INTEGRATIONS_DESC}</p>
                  </div>
                </div>
              </div>
              <div className="blob"></div>
              <div className="fakeblob"></div>
            </div>
          </div>
          <div className="pt_glow">
            <div className="card">
              <div className="inner">
                <div className="pt_feature">
                  <div className="pt_featureimage">
                    <lottie-player
                      autoplay
                      loop
                      mode="normal"
                      src="/json/bankservice.json?v=1"
                    ></lottie-player>
                  </div>
                  <div className="pt_featuretext">
                    <h4>{FEATURE_SUPPORT_CENTRE}</h4>
                    <p>{FEATURE_SUPPORT_CENTRE_DESC}</p>
                  </div>
                </div>
              </div>
              <div className="blob"></div>
              <div className="fakeblob"></div>
            </div>
          </div>
          <div className="pt_glow">
            <div className="card">
              <div className="inner">
                <div className="pt_feature">
                  <div className="pt_featureimage">
                    <lottie-player
                      autoplay
                      loop
                      mode="normal"
                      src="/json/bankofficer.json?v=1"
                    ></lottie-player>
                  </div>
                  <div className="pt_featuretext">
                    <h4>{FEATURE_COMMUNITY}</h4>
                    <p>{FEATURE_COMMUNITY_DESC}</p>
                  </div>
                </div>
              </div>
              <div className="blob"></div>
              <div className="fakeblob"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt_highlights">
        <div className="pt_highlightsinner">
          <div className="container-fluid">
            <div className="center">
              <h3>{HIGHLIGHTS_TITLE}</h3>
              <p>{HIGHLIGHTS_SUBTITLE}</p>
            </div>
            <div className="grid">
              <div className="pt_highlightbox">
                <lottie-player
                  autoplay
                  loop
                  mode="normal"
                  src="/json/rbicons/coins.json"
                ></lottie-player>
                <h4>Pay or get paid</h4>
                <p>
                  Send and receive payment claims, process payments and issue
                  notices all whilst ensuring compliance with the project trust
                  framework.
                </p>
              </div>
              <div className="pt_highlightbox">
                <lottie-player
                  autoplay
                  loop
                  mode="normal"
                  src="/json/rbicons/finance.json"
                ></lottie-player>
                <h4>Connected bank data</h4>
                <p>
                  Connect your bank cash account, project and retention trust
                  accounts for real-time data.
                </p>
              </div>
              <div className="pt_highlightbox">
                <lottie-player
                  autoplay
                  loop
                  mode="normal"
                  src="/json/rbicons/planning.json"
                ></lottie-player>
                <h4>Smart transaction matching</h4>
                <p>
                  Our smart software can find the closest matches for your
                  transactions speeding up your audit process.
                </p>
              </div>
              <div className="pt_highlightbox">
                <lottie-player
                  autoplay
                  loop
                  mode="normal"
                  src="/json/rbicons/success.json"
                ></lottie-player>
                <h4>Trust account</h4>
                <p>
                  Automate your trust accounts and reconciliation processes.
                </p>
              </div>
            </div>
            <div className="pt_highlightscta">
              <div className="pt_highlightsctatext">
                <h4>Explore all our features</h4>
                <p>
                  Everything you need to ensure you are fully compliant with the
                  project trust framework
                </p>
              </div>
              <div className="pt_highlightsctabutton">
                <Link href={"/features"}>
                  <button className="contrast">
                    {BUTTON_EXPLORE_FEATURES_TEXT}
                    <i className="fa-light fa-arrow-right right"></i>
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-fluid">
        <div className="pt_split">
          <div className="grid">
            <div className="pt_splitimage">
              <lottie-player
                autoplay
                loop
                mode="normal"
                src="/json/bankservice.json?v=1"
              ></lottie-player>
            </div>
            <div className="pt_splittext">
              <h2>Free onboarding session</h2>
              <h4>Get up and running easily with free support</h4>
              <p>
                Check out our video tutorials and guides or contact our support
                team who can schedule a free support call to help your
                onboarding.
              </p>
              <p>
                <b>New to PayTrade?</b> Once you've signed up, raise a support
                ticket and book a free 45-minute onboarding session with our
                experts. They will walk you through the setup and everything you
                need to get setup and where needed, onboard your existing data.
              </p>
              <br />
              <Link href={"/how-to-guides"}>
                <button className="secondary">
                  <i className="fa-light fa-film"></i>
                  {BUTTON_TUTORIALS_TEXT}
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="pt_links">
        <div className="pt_linksinner">
          <div className="container-fluid">
            <div className="center">
              <h3>User Guides</h3>
              <p>
                Let us take you step by step through our process to keep you
                compliant and produce your trust accounts with ease
              </p>
            </div>
            <div className="grid">
              <Link className="pt_linksbox" href="/how-to-guides">
                <lottie-player
                  autoplay
                  loop
                  mode="normal"
                  src="/json/rbicons/graduationhat.json"
                ></lottie-player>
                <h4 className="oceantext">Get setup with PayTrade</h4>
                <p>
                  Learn how to setup your account and get started with PayTrade
                </p>
              </Link>
              <Link href={"/community"} className="pt_linksbox">
                <lottie-player
                  autoplay
                  loop
                  mode="normal"
                  src="/json/rbicons/users.json"
                ></lottie-player>
                <h4 className="oceantext">Our community</h4>
                <p>Ask questions and share product and industry insights</p>
              </Link>
              <Link href={"/blog"} className="pt_linksbox">
                <lottie-player
                  autoplay
                  loop
                  mode="normal"
                  src="/json/rbicons/book.json"
                ></lottie-player>
                <h4 className="oceantext">Project trust blog</h4>
                <p>
                  Keep track of industry updates related to project trusts on
                  our blog
                </p>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="container-fluid">
          <div className="center">
            <h3>{FAQ_HEAD}</h3>
            <p>{FAQ_SUB_HEAD}</p>
          </div>
          <Accordion
            faqs={faqs?.slice(0, 4)}
            loading={loading}
            fullPage={false}
          >
            <div>
              <details>
                <summary>No FAQs available</summary>
                <p>
                  It seems there are no FAQs at the moment. Please check back
                  later.
                </p>
              </details>
            </div>
          </Accordion>
          <div className="center">
            <Link href={"/faq"}>
              <button className="contrast">{BUTTON_VIEWFAQ_TEXT}</button>
            </Link>
          </div>
          <br />
          <br />
        </div>
      </div>

      <div>
        <div className="container-fluid">
          <div className="finalcta center">
            <div className="logolarge"></div>
            <br />
            <br />
            <h5>{HOME_LAST_HEADING}</h5>
            <div className="pt_highlightscta">
              <div className="pt_highlightsctatext">
                <h3 className="crabtext">{HOME_LAST_SUBHEAD}</h3>
                <p>{HOME_LAST_DESC}</p>
              </div>
              <div className="pt_highlightsctabutton">
                <Link href={AppRoutes.USER_LOGIN} className="cta">
                  <button>
                    {BUTTON_SIGNUP_TEXT}
                    <i className="fa-light fa-arrow-right right"></i>
                  </button>
                </Link>
              </div>
            </div>
            <div className="blurblobthemecta"></div>
          </div>
        </div>
      </div>
    </main>
  );
}
