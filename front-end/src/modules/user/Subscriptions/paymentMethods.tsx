import React, { Fragment, useState } from "react";
import { useSubscriptionsContext } from "./SubscriptionContext";
import {
  deleteCardByPaymentMethodId,
  setAsDefaultByPaymentMethodId,
} from "./subscriptions.function";
import BaseModal from "@/components/BaseModal";
import { getCompanyIdFromStorage } from "@/utils";

export default function PaymentMethodsGrid() {
  const {
    allExistingCardDetails,
    setAsDefaultCard,
    getExistingCardDetails,
    getAllExistingCardDetails,
  }: any = useSubscriptionsContext();

  const [displayDeleteConfirmation, setDisplayDeleteConfirmation] =
    useState(false);
  const [deleteRow, setDeleteRow] = useState<any>(null);

  async function deleteExistingCard() {
    try {
      const postData = {
        paymentMethodId: deleteRow?.payment_method_id || null,
        companyId: getCompanyIdFromStorage() || null,
      };

      const response: any = await deleteCardByPaymentMethodId(postData);

      if (response) {
        setDeleteRow(null);
        await getExistingCardDetails();
        await getAllExistingCardDetails();
        return true;
      }
      return false;
    } catch (err: any) {
      return false;
    }
  }

  return (
    <Fragment>
      <div className="grid">
        <div className="pt_defaulttable_scroll">
          <table className="pt_defaulttable">
            <thead>
              <tr>
                <th>Payment method</th>
                <th>Expiry</th>
                <th>Status</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {/* <tr>
              <td>**** **** **** 1243</td>
              <td>12/24</td>
              <td className="invalid">Card expired</td>
              <td>
                <a href="" data-tooltip="Delete" data-placement="left">
                  <button className="contrast">
                    <i className="fa-light fa-trash"></i>
                  </button>
                </a>
              </td>
            </tr> */}
              {allExistingCardDetails?.map((cardDetailsObj: any) => (
                <tr key={cardDetailsObj?.payment_method_id}>
                  <td>{cardDetailsObj?.dropdownLabel}</td>
                  <td>{`${cardDetailsObj?.expiry_month}/${cardDetailsObj?.expiry_year}`}</td>
                  {cardDetailsObj?.is_default ? (
                    <td className="valid">Primary payment method</td>
                  ) : (
                    <td
                      className="cu-pointer"
                      onClick={() => setAsDefaultCard(cardDetailsObj)}
                    >
                      <a>Set as primary payment method</a>
                    </td>
                  )}
                  <td
                    onClick={() => {
                      setDeleteRow(cardDetailsObj);
                      setDisplayDeleteConfirmation(true);
                    }}
                  >
                    <a data-tooltip="Delete" data-placement="left">
                      <button
                        className="contrast"
                        disabled={cardDetailsObj?.is_default}
                      >
                        <i className="fa-light fa-trash"></i>
                      </button>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {displayDeleteConfirmation && (
        <BaseModal
          modalId={"card delete modal"}
          displayModal={displayDeleteConfirmation}
          onHeaderIconClose={() => setDisplayDeleteConfirmation(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setDisplayDeleteConfirmation(false)}
          onConfirm={() => {
            deleteExistingCard();
            return true;
          }}
          firstButtonName="No"
          secondButtonName="Yes"
        >
          <div className="text_center">
            Are you sure you want to delete this card?
          </div>
        </BaseModal>
      )}
    </Fragment>
  );
}
