"use client";

import { Fragment, useEffect } from "react";
import GuestNavbar from "../../../components/GuestNavbar";
import HomeSidebar from "../../../components/HomeSidebar";
import GuestFooter from "../../../components/GuestFooter";

import { useAppSelector } from "@/redux/store";

export default function AuthLayout({ children }: any) {
  const responsiveSidebar = useAppSelector(
    (state: { memberSidebar: { displayResponsiveSidebar: boolean } }) =>
      state?.memberSidebar?.displayResponsiveSidebar
  );

  // useEffect(() => {
  //   // Create the viewport meta element
  //   const viewport = document?.createElement("meta");
  //   viewport.setAttribute("name", "viewport");

  //   // Set the viewport content based on screen width
  //   if (window.screen.width < 480) {
  //     viewport?.setAttribute("content", "width=480");
  //   } else {
  //     viewport?.setAttribute("content", "width=device-width, initial-scale=1");
  //   }

  //   // Append the viewport meta tag to the document head
  //   document?.head?.appendChild(viewport);
  // }, []);

  return (
    <Fragment>
      <div className="pt_backdropdot"></div>
      <div
        className={` ${
          responsiveSidebar ? "close_left close_left_show" : "close_left"
        } `}
      ></div>

      <div className="pt_wrap">
        <div className="pt_page">
          <HomeSidebar />
          <GuestNavbar />
          <main>
            <div className="pt_centered">
              <div className="pt_centeredinner">{children}</div>
            </div>

            <dialog id="terms">
              <article>
                <header>
                  <button
                    aria-label="Close"
                    rel="prev"
                    data-target="terms"
                  ></button>
                  <h4>Terms and Conditions</h4>
                </header>
                <p>
                  Effective Date: [Insert Date]
                  <br />
                  Please read these terms and conditions carefully before using
                  our website, products, or services.
                  <br />
                  1. Acceptance of Terms
                  <br />
                  By accessing or using our website, products, or services, you
                  agree to be bound by these terms and conditions and our
                  privacy policy.
                  <br />
                  2. Use License
                  <br />
                  Permission is granted to temporarily download one copy of the
                  materials on our website htmlFor personal, non-commercial
                  transitory viewing only.
                  <br />
                  3. User Accounts
                  <br />
                  You may need to create a user account to access certain
                  features of our website or services. You are responsible
                  htmlFor maintaining the confidentiality of your account
                  information and htmlFor any activities that occur under your
                  account.
                  <br />
                  4. Intellectual Property Rights
                  <br />
                  All content on our website, products, and services, including
                  text, graphics, logos, and images, is the property of PT and
                  is protected by copyright and other intellectual property
                  laws.
                  <br />
                  5. Limitations
                  <br />
                  In no event shall PT or its suppliers be liable htmlFor any
                  damages arising out of the use or inability to use our
                  website, products, or services.
                  <br />
                  6. Governing Law
                  <br />
                  These terms and conditions shall be governed by and construed
                  in accordance with the laws of [Your Jurisdiction], without
                  regard to its conflict of law provisions.
                  <br />
                  7. Changes to Terms and Conditions
                  <br />
                  We reserve the right to update or modify these terms and
                  conditions at any time without prior notice. Your continued
                  use of our website, products, or services after any such
                  changes constitutes your acceptance of the new terms and
                  conditions.
                  <br />
                  8. Contact Us If you have any questions about these terms and
                  conditions, please contact us at [Insert Contact Information].
                </p>
                <footer>
                  <button
                    role="button"
                    className="secondary"
                    data-target="terms"
                  >
                    Close
                  </button>
                </footer>
              </article>
            </dialog>

            <dialog id="privacy">
              <article>
                <header>
                  <button
                    aria-label="Close"
                    rel="prev"
                    data-target="privacy"
                  ></button>
                  <h4>Privacy Policy</h4>
                </header>
                <div>
                  <p>
                    Effective Date: [Insert Date]
                    <br />
                    PT is committed to protecting the privacy and security of your
                    personal information. This Privacy Policy describes how PT
                    collects, uses, and discloses information we receive from
                    users of our website, products, and services.
                  </p>
                  <p>
                    <b>Information We Collect</b> - We may collect the following types of
                    information:
                  </p>
                  <ul>
                    <li>
                      Personal Information: When you interact with our website,
                      products, or services, we may collect personal information
                      such as your name, email address, mailing address, and
                      phone number.
                    </li>
                    <li>
                      Usage Information: We may collect information about how
                      you interact with our website, products, or services,
                      including your IP address, browser type, device type,
                      pages visited, and the dates and times of your visits.
                    </li>
                    <li>
                      Cookies: We use cookies and similar tracking technologies
                      to collect information about your preferences and browsing
                      activities. You can control cookies through your browser
                      settings.
                    </li>
                  </ul>
                  <p>
                    <b>How We Use Your Information</b>
                    <br />
                    We may use the information we collect for the following
                    purposes:
                  </p>
                  <ul>
                    <li>
                      To provide and improve our website, products, and
                      services.
                    </li>
                    <li>
                      To communicate with you about your account or
                      transactions.
                    </li>
                    <li>
                      To personalize your experience and tailor content and
                      advertisements to your interests.
                    </li>
                    <li>
                      To respond to your inquiries and provide customer support.
                    </li>
                    <li>
                      To detect, investigate, and prevent fraud and other
                      illegal activities.
                    </li>
                  </ul>
                  <p>
                    <b>How We Share Your Information</b>
                    <br />
                    We may share your information with third parties for the
                    following purposes:
                  </p>
                  <ul>
                    <li>
                      With service providers who help us operate our website,
                      products, and services.
                    </li>
                    <li>
                      With third parties for marketing, advertising, or
                      analytics purposes.
                    </li>
                    <li>
                      With law enforcement or government agencies in response to
                      lawful requests or legal process.
                    </li>
                    <li>
                      In connection with a merger, acquisition, or sale of
                      assets.
                    </li>
                  </ul>
                  <p>
                    <b>Your Choices</b>
                    <br />
                    You may choose not to provide certain information, but this
                    may limit your ability to use certain features of our website,
                    products, or services. You can opt out of receiving marketing
                    communications from us by following the instructions provided
                    in those communications.
                  </p>
                  <p>
                    <b>Data Security</b>
                    <br />
                    We take reasonable measures to protect your personal
                    information from unauthorized access, use, or disclosure.
                    However, no method of transmission over the internet or
                    electronic storage is 100% secure.
                  </p>
                  <p>
                    <b>Changes to This Privacy Policy</b>
                    <br />
                    We may update this Privacy Policy from time to time. We will
                    notify you of any changes by posting the new Privacy Policy on
                    this page.
                  </p>
                  <p>
                    <b>Contact Us</b>
                    <br />
                    If you have any questions about this Privacy Policy, please
                    contact us at [Insert Contact Information].
                  </p>
                </div>
                <footer>
                  <button
                    role="button"
                    className="secondary"
                    data-target="privacy"
                  >
                    Close
                  </button>
                </footer>
              </article>
            </dialog>
            {/* <!-- privacy --> */}

            {/* <!-- cookie --> */}
            <dialog id="cookie">
              <article>
                <header>
                  <button
                    aria-label="Close"
                    rel="prev"
                    data-target="cookie"
                  ></button>
                  <h4>Cookie Policy</h4>
                </header>
                <div>
                  <p>
                    Effective Date: [Insert Date]
                    <br />
                    This Cookie Policy explains how PT (&quot;we&quot;,
                    &quot;us&quot;, or &quot;our&quot;) uses cookies and similar
                    technologies to recognize you when you visit our website.
                  </p>
                  <p>
                    <b>What Are Cookies</b>
                    <br />
                    Cookies are small text files that are stored on your computer
                    or mobile device when you visit a website. They allow the
                    website to recognize your device and store information about
                    your preferences or past actions.
                  </p>
                  <p>
                    <b>How We Use Cookies</b>
                    <br />
                    We use cookies for the following purposes:
                  </p>
                  <ul>
                    <li>
                      Essential Cookies: These cookies are necessary for the
                      operation of our website. They enable basic functions like
                      page navigation and access to secure areas of the website.
                    </li>
                    <li>
                      Analytics Cookies: These cookies allow us to collect
                      information about how visitors use our website, such as
                      the number of visitors and the pages they visit. We use
                      this information to improve our website and user
                      experience.
                    </li>
                    <li>
                      Advertising Cookies: These cookies are used to deliver
                      relevant advertisements to you based on your interests.
                      They may also be used to track the effectiveness of
                      advertising campaigns.
                    </li>
                  </ul>
                  <p>
                    <b>Your Choice</b>
                    <br />
                    You can choose to accept or decline cookies. Most web browsers
                    automatically accept cookies, but you can usually modify your
                    browser settings to decline cookies if you prefer. However,
                    this may prevent you from taking full advantage of the
                    website.
                  </p>
                  <p>
                    <b>Third-Party Cookies</b>
                    <br />
                    We may also use third-party services that use cookies to help
                    us analyze how our website is used and to provide advertising.
                    These third parties may also place cookies on your device when
                    you visit our website.
                  </p>
                  <p>
                    <b>Changes to This Cookie Policy</b>
                    <br />
                    We may update this Cookie Policy from time to time. We will
                    notify you of any changes by posting the new Cookie Policy on
                    this page.
                  </p>
                  <p>
                    <b>Contact Us</b>
                    <br />
                    If you have any questions about this Cookie Policy, please
                    contact us at [Insert Contact Information].
                  </p>
                </div>
                <footer>
                  <button
                    role="button"
                    className="secondary"
                    data-target="cookie"
                  >
                    Close
                  </button>
                </footer>
              </article>
            </dialog>
            {/* <!-- cookie --> */}
          </main>
        </div>
        <GuestFooter />
      </div>
    </Fragment>
  );
}
