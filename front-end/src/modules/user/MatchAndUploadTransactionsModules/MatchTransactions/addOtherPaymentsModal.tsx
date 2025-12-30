import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

import OtherPayment from "../../OtherPayments/otherPayments";
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

  restrictOncloseFunctionInHeader?: boolean;
  onHeaderIconClose?: () => void;
  bankAccountId?: number;
}

export default function AddOtherPaymentsModal({
  modalId,
  displayModal = false, // Controls whether the modal is displayed
  onConfirm = () => {}, // Function to handle confirm action
  onClose = () => {}, // Function to handle cancel action
  restrictOncloseFunctionInHeader,
  onHeaderIconClose = () => {},
  bankAccountId,
}: Readonly<BaseModalProps>) {
  const router = useRouter();
  // Store the currently open modal (null when no modal is visible)
  const [visibleModal, setVisibleModal] = useState<HTMLDialogElement | null>(
    null
  );

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
    buttonType?: string // Determine if the toggle is a 'close' or 'confirm' action
  ) {
    event?.preventDefault();
    const modal = document.getElementById(
      modalId || baseModalConstants.TYPE
    ) as HTMLDialogElement;
    if (!modal) return;

    if (buttonType === actionType.CLOSE) {
      onClose(true); // Trigger the cancel handler if close is requested
      closeModal(modal);
      return true;
    } else if (buttonType === actionType.CONFIRM) {
      const response: any = onConfirm(); // Trigger the confirm handler if confirmed
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
      className={"half-screen-popup"} // Dynamically apply the class
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
          <h4>Add payment</h4>
        </header>
        <OtherPayment
          fromMatchScreenBankID={bankAccountId}
          fromMatchScreen
          onAddClosingModal={(e: any) => {
            toggleModal(e, actionType.CONFIRM);
          }}
        />
      </article>
    </dialog>
  );
}
