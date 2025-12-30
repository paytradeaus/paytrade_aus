import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { FetchAllTransactions } from "../../BankAccountOverview/BankAccountsOverview.function";
import { ITransactions } from "../../BankAccounts/bankTrustAccount.types";
import { ApiResponse } from "@/shared/constant/messages";
import { DD_MM_YYYY } from "@/shared/constant/identificationNumbers";
import { convertPositiveDecimalTwoDigit, formatDate } from "@/utils";
// Config constants for classes and animation duration
const baseModalConstants = {
  TYPE: "modal",
  isOpenClass: "modal-is-open",
  openingClass: "modal-is-opening",
  closingClass: "modal-is-closing",
  scrollbarWidthCssVar: "--pico-scrollbar-width",
  animationDuration: 400, // ms
};

// Define action types for the modal buttons
const actionType = {
  CLOSE: "close",
  CONFIRM: "confirm",
};

interface BaseModalProps {
  modalId?: any; //id for modal
  displayModal: boolean; // Determines if the modal should be shown
  onConfirm?: () => void; // Function to call when confirm button is clicked
  onClose?: (type?: boolean) => void; // Function to call when cancel button is clicked
  setTransactionIDs?: any;
  restrictOncloseFunctionInHeader?: boolean;
  onHeaderIconClose?: () => void;
  bankAccountId?: number;
  selectedCompanyId?: number;
  transactionType?: any;
  transactionIDs?: any;
}

export default function AddTransactionModal({
  modalId,
  displayModal = false, // Controls whether the modal is displayed
  onConfirm = () => {}, // Function to handle confirm action
  onClose = () => {}, // Function to handle cancel action
  setTransactionIDs,
  restrictOncloseFunctionInHeader,
  onHeaderIconClose = () => {},
  bankAccountId,
  selectedCompanyId,
  transactionType,
  transactionIDs,
}: Readonly<BaseModalProps>) {
  const router = useRouter();
  // Store the currently open modal (null when no modal is visible)
  const [visibleModal, setVisibleModal] = useState<HTMLDialogElement | null>(
    null
  );
  const [transactionData, setTransactionData] = useState<ITransactions[]>([]);
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    getListAllAdminArticles(1, 10);
  }, []);
  const getListAllAdminArticles = async (page: number, rowsPerPage: number) => {
    // setLoading(true);
    setShowLoader(true);
    const transactionsResponse = await FetchAllTransactions({
      page: page,
      items_per_page: null,
      search: null,
      status: "ToMatch",
      bank_account_id: bankAccountId || null,
      date_filter: null,
      date_from: null,
      date_to: null,
      company_id: selectedCompanyId || null,
      is_receivable: transactionType,
    });
    const filterTransactions = transactionsResponse?.transactions_list.filter(
      (each: any) => !transactionIDs.includes(each.id)
    );
    // console.log(filterTransactions, "filterTransactions");
    setTransactionData(filterTransactions || []);
    // setTotalRows(transactionsResponse?.total_count || 0);
    setShowLoader(false);
  };

  // Effect to handle showing the modal when `displayModal` changes
  useEffect(() => {
    if (displayModal) {
      const modal = document.getElementById(
        modalId || baseModalConstants.TYPE
      ) as HTMLDialogElement;
      if (!modal) return;
      openModal(modal);
    }
  }, [displayModal]);

  // Function to open the modal
  function openModal(modal: HTMLDialogElement) {
    const { documentElement: html } = document;
    const scrollbarWidth = getScrollbarWidth(); // Calculate scrollbar width

    // Set custom scrollbar width CSS variable
    if (scrollbarWidth) {
      html.style.setProperty(
        baseModalConstants.scrollbarWidthCssVar,
        `${scrollbarWidth}px`
      );
    }

    // Add classes to handle modal opening transition
    html.classList.add(
      baseModalConstants.isOpenClass,
      baseModalConstants.openingClass
    );
    setTimeout(() => {
      setVisibleModal(modal); // Set the visible modal
      html.classList.remove(baseModalConstants.openingClass); // Remove opening transition class
    }, baseModalConstants.animationDuration);

    // Show the modal using the dialog element's API
    modal.showModal();
  }

  // Function to close the modal
  function closeModal(modal: HTMLDialogElement) {
    setVisibleModal(null); // Reset the visible modal
    const { documentElement: html } = document;
    // Add class for closing transition
    html.classList.add(baseModalConstants.closingClass);
    setTimeout(() => {
      // Remove transition classes and reset the scrollbar width
      html.classList.remove(
        baseModalConstants.closingClass,
        baseModalConstants.isOpenClass
      );
      html.style.removeProperty(baseModalConstants.scrollbarWidthCssVar);
    }, baseModalConstants.animationDuration);
    if (restrictOncloseFunctionInHeader) {
      onHeaderIconClose();
    } else {
      onClose();
    }
  }

  // Function to handle modal toggle (open/close)
  function toggleModal(
    event?: React.MouseEvent<HTMLButtonElement>,
    buttonType?: string, // Determine if the toggle is a 'close' or 'confirm' action
    row?: any
  ) {
    event?.preventDefault();
    const modal = document.getElementById(
      modalId || baseModalConstants.TYPE
    ) as HTMLDialogElement;
    if (!modal) return;

    if (buttonType === actionType.CLOSE) {
      onClose(true); // Trigger the cancel handler if close is requested
      closeModal(modal);
    } else if (buttonType === actionType.CONFIRM) {
      const response: any = onConfirm(); // Trigger the confirm handler if confirmed

      setTransactionIDs((previous: Array<string>) => {
        if (previous.includes(row?.id)) {
          return previous;
        }
        return [...previous, row?.id];
      });

      closeModal(modal);
    }
  }

  // Helper function to calculate the width of the scrollbar
  function getScrollbarWidth() {
    return window.innerWidth - document.documentElement.clientWidth;
  }

  // Effect to handle closing the modal when clicking outside or pressing Esc key
  useEffect(() => {
    // Handle clicks outside the modal content
    const handleClickOutside = (event: MouseEvent) => {
      if (visibleModal === null) return;
      const modalContent = visibleModal.querySelector("article");
      const isClickInside = modalContent?.contains(event.target as Node);
      if (!isClickInside) closeModal(visibleModal);
    };

    // Handle Escape key press to close the modal
    const handleKeyDown = (event: any) => {
      if (event.key === "Escape") {
        toggleModal(event, actionType.CLOSE);
      }
    };

    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      // Clean up event listeners when the component is unmounted
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <dialog
      id={modalId || baseModalConstants.TYPE}
      className={"pt_largedialog"} // Dynamically apply the class
    >
      <article>
        <header>
          <button
            aria-label="Close"
            rel="prev"
            data-target="addtransaction"
            // onClick={() => setIsShowTransaction(false)}
            onClick={(e: any) => closeModal(e)}
          ></button>
          <h4>Add transaction</h4>
        </header>

        <div className="grid">
          <div className="pt_defaulttable_scroll">
            <table className="pt_defaulttable">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Spent</th>
                  <th>Received</th>
                  <th>Matched to?</th>
                  <th>Status</th>
                  <th>Add</th>
                </tr>
              </thead>
              <tbody>
                {!showLoader &&
                  transactionData?.length > 0 &&
                  transactionData.map((row: ITransactions, index) => (
                    <tr
                      key={index}
                      // onClick={() => onRowClick(rowData)}
                      className={"cu-pointer"}
                    >
                      <td>
                        {row?.txn_date ? formatDate(row?.txn_date) : "N/A"}
                      </td>
                      <td>{row?.description || ""}</td>
                      <td>
                        {row?.spent_amount
                          ? `$ ${convertPositiveDecimalTwoDigit(
                              row?.spent_amount,
                              true
                            )}`
                          : ""}
                      </td>
                      <td>
                        {row?.received_amount
                          ? `$ ${convertPositiveDecimalTwoDigit(
                              row?.received_amount,
                              true
                            )}`
                          : ""}
                      </td>
                      <td>{row?.matched_to || ""}</td>
                      <td>
                        {row?.status === "To Review"
                          ? "For Review"
                          : row?.status || ""}
                      </td>
                      <td>
                        <a>
                          <button
                            className="secondary"
                            onClick={(e) => {
                              toggleModal(e, actionType.CONFIRM, row);
                            }}
                          >
                            <i className="fa-light fa-hexagon-plus"></i>
                          </button>
                        </a>
                      </td>
                    </tr>
                  ))}
                {showLoader && (
                  <tr>
                    <td colSpan={10} className="table_article">
                      <article
                        aria-busy={"true"}
                        className={`table-loader`}
                      ></article>
                    </td>
                  </tr>
                )}
                {!showLoader && transactionData?.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="
                "
                    >
                      <article className={`table-loader`}>
                        {ApiResponse.NO_RECORDS_TO_DISPLAY}
                      </article>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* <footer>
          <button
            role="button"
            className="secondary"
            data-target="addtransaction"
          >
            Match
          </button>
        </footer> */}
      </article>
    </dialog>
  );
}
