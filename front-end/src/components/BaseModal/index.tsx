import { buttonType } from "@/shared/constant/general";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";

// Config constants for classes and animation duration
export const baseModalConstants = {
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

// the props interface for the BaseModal component
interface BaseModalProps {
  modalId?: any; //id for modal
  displayModal: boolean; // Determines if the modal should be shown
  firstButtonName?: string; // Optional label for the first button
  secondButtonName?: string; // Optional label for the second button
  hideFirstButton?: boolean; //optional prop to hide first button
  hideSecondButton?: boolean; //optional prop to hide second button
  children?: React.ReactNode; // The content of the modal
  onConfirm?: () => void; // Function to call when confirm button is clicked
  onClose?: (type?: boolean) => void; // Function to call when cancel button is clicked
  title?: string; // Optional title for the modal
  disableFirstButton?: boolean;
  disableSecondButton?: boolean;
  hideFooter?: boolean;
  restrictOncloseFunctionInHeader?: boolean;
  onHeaderIconClose?: () => void;
  halfScreenPopup?: boolean; // New optional boolean for half-screen popup styling
  customOptionsForModal?: Array<any>;
  isPaymentType?: boolean; // for payment options modal
  firstBtnClassTypes?: string;
  secondBtnClassTypes?: string;
  hideHeaderCloseIcon?: boolean;
  childrenClicked?: (data: any) => void;
  disableHeaderCloseIcon?: boolean;
}

// BaseModal component definition
export default function BaseModal({
  title = "", // Default title if none is provided
  children, // The content inside the modal
  displayModal = false, // Controls whether the modal is displayed
  onConfirm = () => {}, // Function to handle confirm action
  onClose = () => {}, // Function to handle cancel action
  firstButtonName = "Cancel", // Default text for the confirm button
  secondButtonName = "Confirm", // Default text for the cancel button
  hideFirstButton,
  hideSecondButton,
  modalId,
  disableFirstButton,
  disableSecondButton,
  hideFooter,
  restrictOncloseFunctionInHeader,
  onHeaderIconClose = () => {},
  halfScreenPopup = false,
  customOptionsForModal,
  isPaymentType = false,
  firstBtnClassTypes = "secondary",
  secondBtnClassTypes = "primary",
  hideHeaderCloseIcon = false,
  childrenClicked = (data) => {},
  disableHeaderCloseIcon,
}: Readonly<BaseModalProps>) {
  const router = useRouter();

  // State to track if an action is in progress (to restrict multiple clicks)
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  async function toggleModal(
    event?: React.MouseEvent<HTMLButtonElement>,
    buttonType?: string // Determine if the toggle is a 'close' or 'confirm' action
  ) {
    event?.preventDefault();
    const modal = document.getElementById(
      modalId || baseModalConstants.TYPE
    ) as HTMLDialogElement;
    if (!modal || isSubmitting) return; // Prevent action if already submitting

    setIsSubmitting(true); // Set submitting state to prevent further clicks
    if (buttonType === actionType.CLOSE) {
      onClose(true); // Trigger the cancel handler if close is requested
      closeModal(modal);
    } else if (buttonType === actionType.CONFIRM) {
      const response: any = await onConfirm(); // Trigger the confirm handler if confirmed

      if (response == true) {
        closeModal(modal);
      }
    }
    setIsSubmitting(false); // Reset the submitting state after action is complete
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
      if (event.key === "Escape" && (!disableSecondButton || hideFirstButton)) {
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

  // Apply dynamic classes
  const modalClass = halfScreenPopup ? "half-screen-popup" : "";

  return (
    <dialog
      id={modalId || baseModalConstants.TYPE}
      className={modalClass} // Dynamically apply the class
    >
      <article className={modalClass}>
        <header>
          <div className="mb-1">
            <button
              disabled={disableHeaderCloseIcon}
              aria-label="Close"
              rel="prev"
              onClick={(e: any) => closeModal(e)}
              className={hideHeaderCloseIcon ? "visibleHidden" : ""}
            />
          </div>
          {/* Modal title */}
          <h4 className="model-title-color">{title}</h4>
        </header>

        {/* The modal's content */}
        {isPaymentType &&
          customOptionsForModal &&
          customOptionsForModal.map((group: any, index) => (
            <div
              key={index}
              className="grid"
              style={{ columnGap: "var(--space-s)" }}
            >
              {group.map((each: any, linkIndex: any) => (
                <Link
                  key={linkIndex}
                  href={each.routeLink}
                  className="pt_selectbox"
                  onClick={(e: any) => {
                    toggleModal(e, actionType.CONFIRM);
                    if (each.routeLink) {
                      router.push(each.routeLink);
                    } else {
                      childrenClicked(each);
                    }
                  }}
                >
                  <h5
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      alignItems: "center",
                    }}
                  >
                    {each.label}
                    {each.logo && (
                      <Image
                        src={each.logo}
                        alt="logo"
                        width={Number(each.width) || 60}
                        height={Number(each.height) || 60}
                        unoptimized
                      />
                    )}
                  </h5>
                  {each?.description && <p>{each?.description}</p>}
                </Link>
              ))}
            </div>
          ))}

        {children}
        {!hideFooter && (
          <footer>
            {!hideFirstButton && (
              <button
                className={firstBtnClassTypes}
                type="button"
                onClick={(e: any) => {
                  toggleModal(e, actionType.CLOSE);
                }}
                disabled={disableFirstButton || isSubmitting}
              >
                {firstButtonName}
              </button>
            )}
            {!hideSecondButton && (
              <button
                className={secondBtnClassTypes}
                autoFocus
                type="button"
                onClick={(e: any) => {
                  toggleModal(e, actionType.CONFIRM);
                }}
                disabled={disableSecondButton || isSubmitting}
              >
                {secondButtonName}
              </button>
            )}
          </footer>
        )}
      </article>
    </dialog>
  );
}
