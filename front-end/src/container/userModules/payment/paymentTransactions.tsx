import FormButton from "@/components/Button/button";
import Overlays from "@/components/Overlayes/Overlayes";
import React, { Fragment } from "react";
import { Table, Row, Col, Button } from "react-bootstrap";
import { ThreeDots } from "react-bootstrap-icons";
import customStyles from "./payment.module.scss";

export default function PaymentTransactions() {
  return (
    <Fragment>
      <div className={customStyles.notice}>Payment Transactions</div>
      <Table>
        <thead>
          <tr>
            <th>Payment Transaction Id</th>
            <th>To Account Name</th>
            <th>Payment Amount</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>10000000000</td>
            <td>Pradip</td>
            <td>$10,000.00</td>
            <td>Matched</td>
            <td>
              <Overlays
                trigger="click"
                placement={"bottom"}
                overlay={<span></span>}
                popoverTypes={"tableActions"}
                popoverActions={[
                  { label: "View", value: "view" },
                  { label: "Confirm Paid", value: "Confirm Paid" },
                ]}
                popperConfig={{
                  modifiers: [
                    {
                      name: "offset",
                      options: {
                        offset: [20, 10], // Adjust the offset as needed
                      },
                    },
                  ],
                }}
              >
                <div className={customStyles.dotsContainer}>
                  <ThreeDots />
                </div>
              </Overlays>
            </td>
          </tr>
          <tr>
            <td>10000000001</td>
            <td>Vishnu</td>
            <td>$30,000.00</td>
            <td>Matched</td>
            <td>
              <Overlays
                trigger="click"
                placement={"bottom"}
                overlay={<span></span>}
                popoverTypes={"tableActions"}
                popoverActions={[
                  { label: "View", value: "view" },
                  { label: "Confirm Paid", value: "Confirm Paid" },
                ]}
                popperConfig={{
                  modifiers: [
                    {
                      name: "offset",
                      options: {
                        offset: [20, 10], // Adjust the offset as needed
                      },
                    },
                  ],
                }}
              >
                <div className={customStyles.dotsContainer}>
                  <ThreeDots />
                </div>
              </Overlays>
            </td>
          </tr>
        </tbody>
      </Table>
    </Fragment>
  );
}
