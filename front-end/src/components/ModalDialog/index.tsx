import React, { useState } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModalDialog() {
  // Config
  const isOpenClass = "modal-is-open";
  const openingClass = "modal-is-opening";
  const closingClass = "modal-is-closing";
  const scrollbarWidthCssVar = "--pico-scrollbar-width";
  const animationDuration = 400; // ms

  const [visibleModal, setVisibleModal] = useState<any>(null);

  // Toggle modal
  const toggleModal = (event: any) => {
    event.preventDefault();
    const modal: any = document.getElementById(
      event.currentTarget.dataset.target
    );
    if (!modal) return;
    modal && (modal.open ? closeModal(modal) : openModal(modal));
  };

  // Open modal
  const openModal = (modal: any) => {
    const { documentElement: html } = document;
    const scrollbarWidth = getScrollbarWidth();
    if (scrollbarWidth) {
      html.style.setProperty(scrollbarWidthCssVar, `${scrollbarWidth}px`);
    }
    html.classList.add(isOpenClass, openingClass);
    setTimeout(() => {
      setVisibleModal(modal);
      html.classList.remove(openingClass);
    }, animationDuration);
    modal.showModal();
  };

  // Close modal
  const closeModal = (modal: any) => {
    setVisibleModal(null);
    const { documentElement: html } = document;
    html.classList.add(closingClass);
    setTimeout(() => {
      html.classList.remove(closingClass, isOpenClass);
      html.style.removeProperty(scrollbarWidthCssVar);
      modal.close();
    }, animationDuration);
  };

  // Close with a click outside
  document.addEventListener("click", (event) => {
    if (visibleModal === null) return;
    const modalContent = visibleModal.querySelector("article");
    const isClickInside = modalContent.contains(event.target);
    !isClickInside && closeModal(visibleModal);
  });

  // Close with Esc key
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && visibleModal) {
      closeModal(visibleModal);
    }
  });

  // Get scrollbar width
  const getScrollbarWidth = () => {
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    return scrollbarWidth;
  };

  // Is scrollbar visible
  const isScrollbarVisible = () => {
    return document.body.scrollHeight > screen.height;
  };

  return (
    <dialog id="terms">
      <article>
        <header>
          <button aria-label="Close" rel="prev" data-target="terms"></button>
          <h4>Terms and Conditions</h4>
        </header>
        <p>
          Effective Date: [Insert Date]
          <br />
          Please read these terms and conditions carefully before using our
          website, products, or services.
          <br />
          1. Acceptance of Terms
          <br />
          By accessing or using our website, products, or services, you agree to
          be bound by these terms and conditions and our privacy policy.
          <br />
          2. Use License
          <br />
          Permission is granted to temporarily download one copy of the
          materials on our website for personal, non-commercial transitory
          viewing only.
          <br />
          3. User Accounts
          <br />
          You may need to create a user account to access certain features of
          our website or services. You are responsible for maintaining the
          confidentiality of your account information and for any activities
          that occur under your account.
          <br />
          4. Intellectual Property Rights
          <br />
          All content on our website, products, and services, including text,
          graphics, logos, and images, is the property of PT and is protected by
          copyright and other intellectual property laws.
          <br />
          5. Limitations
          <br />
          In no event shall PT or its suppliers be liable for any damages
          arising out of the use or inability to use our website, products, or
          services.
          <br />
          6. Governing Law
          <br />
          These terms and conditions shall be governed by and construed in
          accordance with the laws of [Your Jurisdiction], without regard to its
          conflict of law provisions.
          <br />
          7. Changes to Terms and Conditions
          <br />
          We reserve the right to update or modify these terms and conditions at
          any time without prior notice. Your continued use of our website,
          products, or services after any such changes constitutes your
          acceptance of the new terms and conditions.
          <br />
          8. Contact Us If you have any questions about these terms and
          conditions, please contact us at [Insert Contact Information].
        </p>
        <footer>
          <button role="button" className="secondary" data-target="terms">
            Close
          </button>
        </footer>
      </article>
    </dialog>
  );
}
