import React, { useEffect, useRef, useState } from "react";
import {
  BUTTON_DEMO_TEXT,
  BUTTON_SIGNUP_TEXT,
  BUTTON_TRUST_TOOL_TEXT,
  BUTTON_VIEWFAQ_TEXT,
  FAQ_HEAD,
  FAQ_SUB_HEAD,
  HOME_DESCRIPTION,
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
import BusinessHighlights from "./sections/BusinessHighlights";
import OnboardingSupport from "./sections/OnboardingSupport";
import UserGuidesLinks from "./sections/UserGuidesLinks";
import FinalCta from "./sections/FinalCta";
import FeaturesSection from "./sections/FeaturesSection";
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

      <FeaturesSection />

      <BusinessHighlights />

      <OnboardingSupport />

      <UserGuidesLinks />

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

      <FinalCta />
    </main>
  );
}
