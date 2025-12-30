import TextField from "@/components/TextField/textField";
import { Row, Col } from "react-bootstrap";
import customStyles from "./payments.module.scss";
import { usePaymentsContext } from "./paymentsContext";
import { tabTypes } from "./payments.constant";
import { convertPositiveDecimalTwoDigit } from "@/common/commonFunctions";

export default function PaymentsType() {
  const { formik, isViewMode, isNextPayment }: any = usePaymentsContext() || {};

  // useEffect(() => {
  //   const { payment_amount, claim_amount, retention_amount ,} = formik.values;

  //   if (
  //     +replaceDollarSymbol(payment_amount) +
  //       +replaceDollarSymbol(retention_amount) <=
  //       claim_amount &&
  //     !isViewMode
  //   ) {
  //     formik?.setFieldValue(
  //       "outstanding_amount",
  //       claim_amount -
  //         (+replaceDollarSymbol(payment_amount) +
  //           +replaceDollarSymbol(retention_amount))
  //     );
  //   }
  // }, [formik?.values?.payment_amount, formik?.values?.retention_amount]);

  return (
    <Row className="mt-4">
      <Col>
        <TextField
          type="text"
          labelText="Project"
          name="Project"
          value={formik.values.project_name}
          id="Project"
          disabled
          className={customStyles.text}
        />
      </Col>
      <Col>
        <TextField
          type="text"
          labelText="Contract"
          name="Contract"
          value={formik.values.contract_name}
          id="Contract"
          className={customStyles.text}
          disabled
        />
      </Col>
      <Col>
        <TextField
          type="text"
          labelText={
            formik?.values?.claim_type === tabTypes.BILLABLES
              ? "Supplier"
              : "Client"
          }
          name="name"
          id="name"
          value={formik.values.client_supplier_name}
          className={customStyles.text}
          disabled
        />
      </Col>
      {/* <Col>
        <TextField
          type="text"
          labelText="Contract"
          name="Contract"
          id="Contract"
          className={customStyles.text}
        />
      </Col> */}
      {(formik?.values?.payment_type === tabTypes.PART ||
        formik?.values?.payment_type === tabTypes.PAY_LESS_PART) &&
        (isViewMode || isNextPayment) && (
          <Col>
            <div className={customStyles.claimAmt}>
              <div className={customStyles.amountName}>
                Part Payment Outstanding
              </div>
              <div className="d-flex align-items-center">
                <h3>{`$ ${
                  formik?.values?.outstanding_amount
                    ? Number(formik?.values?.outstanding_amount)
                        ?.toFixed(2)
                        .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    : "0.00"
                }`}</h3>
                <div className={customStyles.incgst}>inc GST</div>
              </div>
            </div>
          </Col>
        )}
    </Row>
  );
}
