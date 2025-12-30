import React, { Fragment, useEffect, useState } from "react";
import { Table } from "react-bootstrap";
import customStyles from "../../payment/payment.module.scss";
import {
  matchedTransactionsTableHeaders,
  paymentsTransactionsTableHeaders,
} from "./payments.constant";
import {
  fetchMatchedTransactions,
  fetchPaymentsTransactions,
} from "./payments.function";
import { usePaymentsContext } from "./paymentsContext";
import {
  convertPositiveDecimalTwoDigit,
  formatDate,
} from "@/common/commonFunctions";

export default function PaymentTransactions() {
  const { paymentId }: any = usePaymentsContext();

  const [matchedTransactions, setMatchedTransactions] = useState([]);
  const [paymentsTransactions, setPaymentsTransactions] = useState([]);

  useEffect(() => {
    getMatchedTransactions();
    getPaymentsTransactions();
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

  async function getPaymentsTransactions() {
    const postData = {
      payload: {
        payment_id: +paymentId,
      },
    };
    const response: any = await fetchPaymentsTransactions(postData);

    if (response) {
      setPaymentsTransactions(response);
    } else {
      setPaymentsTransactions([]);
    }
  }

  return (
    <Fragment>
      <TransactionsTable
        isMatchedTransactions={false}
        paymentsTransactions={paymentsTransactions}
      />
      <TransactionsTable
        isMatchedTransactions={true}
        matchedTransactions={matchedTransactions}
      />
    </Fragment>
  );
}

export function TransactionsTable({
  isMatchedTransactions,
  matchedTransactions,
  paymentsTransactions,
}: any) {
  const tableHeaders = isMatchedTransactions
    ? matchedTransactionsTableHeaders
    : paymentsTransactionsTableHeaders;
  return (
    <Fragment>
      <div className={`${customStyles.notice} ${"mt-4"}`}>
        {isMatchedTransactions
          ? "Matched Transactions"
          : "Payment Transactions"}
      </div>
      <Table>
        <thead>
          <tr>
            {tableHeaders.map((headers: any) => (
              <th key={headers.id}>{headers.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isMatchedTransactions ? (
            <Fragment>
              {matchedTransactions?.length > 0 ? (
                matchedTransactions.map((data: any) => (
                  <tr key={data?.sub_payment_id}>
                    <td>
                      {data?.transaction_date
                        ? formatDate(data?.transaction_date)
                        : ""}
                    </td>
                    <td>{data?.description}</td>
                    <td>
                      {data?.txn_amount < 0
                        ? `$ ${convertPositiveDecimalTwoDigit(
                            data?.txn_amount,
                            true
                          )}`
                        : ""}
                    </td>
                    <td>
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
                <td colSpan={6} className="text-center">
                  There are no records to display
                </td>
              )}
            </Fragment>
          ) : (
            <Fragment>
              {paymentsTransactions?.length > 0 ? (
                paymentsTransactions.map((data: any) => (
                  <tr key={data?.payment_transaction_id}>
                    <td>{data?.payment_transaction_id}</td>
                    <td>{data?.sub_payment_type}</td>
                    <td>{data?.payment_to_account_name}</td>
                    <td>
                      {data?.payment_amount
                        ? `$ ${convertPositiveDecimalTwoDigit(
                            data?.payment_amount,
                            true
                          )}`
                        : ""}
                    </td>
                    <td>{data?.status}</td>
                  </tr>
                ))
              ) : (
                <td colSpan={6} className="text-center">
                  There are no records to display
                </td>
              )}
            </Fragment>
          )}
        </tbody>
      </Table>
    </Fragment>
  );
}
