//default imports
"use client";
import React, { useEffect, useState } from "react";
//import from reactstrap components
import Accordion from "react-bootstrap/Accordion";
import { Navbar } from "react-bootstrap";
//import from customized components
import Footer from "@/components/footer/footer";
import NavbarLinks from "@/components/header/navLinks";
import DropdownLoginSignup from "@/components/header/navUserSection";
import NavbarComponent from "@/components/header/navbar";
//import customized styles
import customStyles from "./footerFaq.module.scss";
import { getFAQList } from "./footerFaq.functions";
//import from external libraries
//import from constants, interfaces ,functions and services
//module level constants and interfaces
const accordionData = [
  {
    id: "1",
    question: "Is this online, or do I download software?",
    answer:
      "You can sign in to QuickBooks from your web browser. Or download the iPhone or Android app and run your business from anywhere.",
  },
  {
    id: "2",
    question:
      "What is the renewal price for QuickBooks Online Plus subscription after the 1st year?",
    answer:
      "You can sign in to QuickBooks from your web browser. Or download the iPhone or Android app and run your business from anywhere.",
  },
  {
    id: "3",
    question: "Do I have to pay extra for mobile apps?",
    answer:
      "You can sign in to QuickBooks from your web browser. Or download the iPhone or Android app and run your business from anywhere.",
  },
  {
    id: "4",
    question: "Is it easy to get started?",
    answer:
      "You can sign in to QuickBooks from your web browser. Or download the iPhone or Android app and run your business from anywhere.",
  },
  {
    id: "5",
    question: "How can I start my free trial?",
    answer:
      "You can sign in to QuickBooks from your web browser. Or download the iPhone or Android app and run your business from anywhere.",
  },
];
const NO_FAQ_DATA = "No FAQ's to display!";

export default function FooterFAQ() {
  //useState and useEffect Management

  const [faqData, setFaqData] = useState([]);
  const [displayNoDataMsg, setDisplayNoDataMsg] = useState("");

  useEffect(() => {
    fetchUserFAQ();
  }, []);

  //other Hooks

  //Formik Handling

  //functions
  async function fetchUserFAQ() {
    await getFAQList()
      .then((response: any) => {
        setFaqData(response);
        setDisplayNoDataMsg(response?.length > 0 ? "" : NO_FAQ_DATA);
      })
      .catch((err: any) => setDisplayNoDataMsg(NO_FAQ_DATA));
  }

  //render Template
  return (
    <div className={customStyles.mainContainer}>
      <NavbarComponent navlinkClass={""}>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav" className="collapseNav">
          <NavbarLinks />
          <DropdownLoginSignup />
        </Navbar.Collapse>
      </NavbarComponent>
      <div className="container my-5 footer-faq">
        <h3 className={customStyles.header}>Frequently Asked Questions</h3>
        <Accordion defaultActiveKey="0">
          {faqData?.length > 0 ? (
            faqData.map((data: any) => (
              <Accordion.Item
                eventKey={data?.id}
                key={data?.id}
                className={customStyles.accordionItem}
              >
                <Accordion.Header>{data?.question}</Accordion.Header>
                <Accordion.Body className={customStyles.answer}>
                  {data?.answer}
                </Accordion.Body>
              </Accordion.Item>
            ))
          ) : (
            <div className={customStyles?.noData}>{displayNoDataMsg}</div>
          )}
        </Accordion>
      </div>
      <Footer />
    </div>
  );
}
