//default imports
import React from "react";
//import from reactstrap components
import { Container, Row, Col } from "react-bootstrap";
//import customized styles
import styles from "./footer.module.scss";
import Link from "next/link";
import { ApplicationURLS } from "@/common/applicationURLS";
//import from customized components
// import Resources from "@/container/Resources/resources";
//import customized styles
//import from external libraries
//import from constants, interfaces ,functions and services
//module level constants and interfaces

function Footer() {
  //useState and useEffect Management

  //functions

  //render Template

  return (
    <div className={styles.footerPositionStyle}>
      <Container fluid className={styles.footerStyle}>
        <Row className={styles.footerRow}>
          <Col className={styles.footerRight} lg={6} md={5}>
            <div title="Version 12.1.8">
              © All rights reserved by <span></span>
              <a href="#">Pay-Trade ({"Version 12.1.8"})</a>
            </div>
          </Col>
          <Col className={""} lg={6} md={7}>
            {/* <div className="d-flex">
              <div>Resources &nbsp;</div>
              <div className={styles.footerPart}>
                &nbsp;&nbsp;Terms & conditions &nbsp;
              </div>
              <div className={styles.footerPart}>
                &nbsp;&nbsp;Privacy Policy &nbsp;|
              </div>
              <div>&nbsp;&nbsp;FAQ &nbsp;|</div>
              <div>&nbsp;&nbsp;Contact Us</div>
            </div> */}
            <ul className={styles.footerUlStyle}>
              <li>
                <Link
                  href={ApplicationURLS.RESOURCES}
                  className={styles.footerSections}
                >
                  Resources
                </Link>
                <Link
                  href={ApplicationURLS.RESOURCES}
                  className={styles.footerSections1}
                >
                  Resources
                </Link>
              </li>
              |
              <li>
                <Link
                  href={ApplicationURLS.TERMS_AND_CONDITIONS}
                  className={styles.footerSections}
                >
                  Terms & conditions
                </Link>
                <Link
                  href={ApplicationURLS.TERMS_AND_CONDITIONS}
                  className={styles.footerSections1}
                >
                  T & C&apos;s
                </Link>
              </li>{" "}
              |
              <li>
                <Link
                  href={ApplicationURLS.PRIVACY_POLICY}
                  className={styles.footerSections}
                >
                  Privacy Policy
                </Link>
                <Link
                  href={ApplicationURLS.PRIVACY_POLICY}
                  className={styles.footerSections1}
                >
                  Privacy
                </Link>
              </li>{" "}
              |
              <li>
                <Link
                  href={ApplicationURLS.FAQ}
                  className={styles.footerSections}
                >
                  FAQ
                </Link>
                <Link
                  href={ApplicationURLS.FAQ}
                  className={styles.footerSections1}
                >
                  FAQ
                </Link>
              </li>{" "}
              |
              <li>
                <Link
                  href={ApplicationURLS.CONTACT_US}
                  className={styles.footerSections}
                >
                  Contact Us
                </Link>
                <Link
                  href={ApplicationURLS.CONTACT_US}
                  className={styles.footerSections1}
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default Footer;
