import React, { Fragment, useEffect, useState } from "react";
import { Table } from "react-bootstrap";

import {
  convertPositiveDecimalTwoDigit,
  formatDate,
} from "@/common/commonFunctions";
import { fetchMatchedTransactions } from "../../payApps/payments/payments.function";

export default function ShowMatchTxnTable(props: any) {
  const { paymentId } = props;
  const [matchedTransactions, setMatchedTransactions] = useState([]);

  useEffect(() => {
    getMatchedTransactions();
  }, []);

  async function getMatchedTransactions() {
    const postData = {
      payload: {
        payment_id: +paymentId,
      },
    };
    const response: any = await fetchMatchedTransactions(postData);
    if (response) {
      setMatchedTransactions(response);
    } else {
      setMatchedTransactions([]);
    }
  }

  return (
    <Fragment>
      <TransactionsTable
        isMatchedTransactions={true}
        matchedTransactions={matchedTransactions}
      />
    </Fragment>
  );
}

export function TransactionsTable({ matchedTransactions }: any) {
  return (
    <Fragment>
      <div className="mb-3 mt-3">Matched Transactions</div>
      <Table responsive>
        <thead>
          <tr>
            {/* align="right" */}
            <th> Date</th>
            <th> Description</th>
            <th> Spent</th>
            <th> Received</th>
          </tr>
        </thead>
        <tbody>
          {matchedTransactions?.length > 0 ? (
            matchedTransactions.map((data: any) => (
              <tr key={data?.sub_payment_id}>
                <td>
                  {data?.transaction_date
                    ? formatDate(data?.transaction_date)
                    : ""}
                </td>
                <td>{data?.description}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {data?.txn_amount < 0
                    ? `$ ${convertPositiveDecimalTwoDigit(
                        data?.txn_amount,
                        true
                      )}`
                    : ""}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {data?.txn_amount > 0
                    ? `$ ${convertPositiveDecimalTwoDigit(
                        data?.txn_amount,
                        true
                      )}`
                    : ""}
                </td>
              </tr>
            ))
          ) : (
            <td align="center" colSpan={12} style={{ padding: "20px" }}>
              There are no records to display
            </td>
          )}
        </tbody>
      </Table>
    </Fragment>
  );
}
