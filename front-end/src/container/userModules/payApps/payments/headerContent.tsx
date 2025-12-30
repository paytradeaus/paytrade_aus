import RadioSwitchToggle from "@/components/RadioSwitch/RadioSwitch";
import { Row, Col } from "react-bootstrap";
import customStyles from "./payments.module.scss";
import Image from "next/image";
import Money from "../../../../../public/assets/Money.png";
import { usePaymentsContext } from "./paymentsContext";
import { claimType } from "./payments.constant";
import { formatDate } from "@/common/commonFunctions";

export default function HeaderContent() {
  const { formik, setOptionalFiles, setCompulsoryFiles, patchData }: any =
    usePaymentsContext() || {};

  function handleClaimChange(value: any) {
    formik.setFieldValue("claim_type", value);
    //emptying file states, to ensure old tab selected files cleared
    setOptionalFiles([]), setCompulsoryFiles([]);
  }

  return (
    <Row className={customStyles.firstPart}>
      <Col>
        <Row>
          <Col lg={8} md={7} sm={12} xs={12}>
            <div className="d-flex">
              <Image
                src={Money.src}
                alt="offer details"
                layout="responsive"
                className={customStyles.imgStyle}
                width={210}
                height={220}
              />
              <div className="ms-1">
                <h6>{`Payment - Id ${formik?.values?.payment_id ?? ""}`}</h6>
                <div className="d-flex">
                  <div className={customStyles.statusName}>
                    Status -&thinsp;
                  </div>
                  <div className={customStyles.paid}>
                    {formik?.values?.status_in_ui || formik?.values?.status}
                  </div>
                </div>
              </div>
            </div>
            <div className={customStyles.typeStyle}>
              <div className="mb-2">Claim Type</div>
              <RadioSwitchToggle
                radioOptions={claimType}
                selected={formik?.values?.claim_type}
                handleToggleChange={handleClaimChange}
                disabled={true}
              />
            </div>
          </Col>
          <Col lg={4} md={5} sm={12} xs={12} className={customStyles.partEnd}>
            <div className={customStyles.claimAmt}>
              <div className={customStyles.amountName}>Payment Claim</div>
              <div className="d-flex align-items-center">
                <h3>{`$ ${
                  formik?.values?.claim_amount
                    ? Number(formik?.values?.claim_amount)
                        ?.toFixed(2)
                        .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    : "0.00"
                }`}</h3>{" "}
                <div className={customStyles.incgst}>{`${
                  formik?.values?.gst_summary ? "inc" : "exc"
                } GST`}</div>
              </div>
              <div className={customStyles.gstText}>{`GST - $ ${
                formik?.values?.gst_summary
                  ? Number(formik?.values?.gst_summary)
                      ?.toFixed(2)
                      .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  : "0.00"
              }`}</div>
              <div className={customStyles.dateClaim}>
                {`Payment Claim Id - ${formik?.values?.payment_claim_id}`}
              </div>
              <div className={customStyles.dateClaim}>
                Due Date -{" "}
                {formik?.values?.due_date
                  ? formatDate(formik?.values?.due_date)
                  : ""}
              </div>
              {patchData?.retention_id && (
                <div className={customStyles.dateClaim}>
                  {`Retention Id - ${patchData?.retention_id}`}
                </div>
              )}
            </div>
          </Col>
        </Row>
      </Col>
    </Row>
  );
}
