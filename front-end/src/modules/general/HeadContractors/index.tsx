import React, { useEffect, useRef } from "react";
import TitleSection from "../../../components/TitleSection";
import ReuseableCards from "../../../components/ReuseableCards";

export default function HeadContractorsPage() {
  const ref = useRef(null);
  React.useEffect(() => {
    import("@lottiefiles/lottie-player");
  });

  const cardsRef = useRef<NodeListOf<Element> | null>(null);

  useEffect(() => {
    const handleMouseMove = (ev: MouseEvent) => {
      const all = cardsRef.current;
      if (all) {
        all.forEach((e) => {
          const blob = e.querySelector(".blob") as HTMLElement;
          const fblob = e.querySelector(".fakeblob") as HTMLElement;

          if (blob && fblob) {
            const rec = fblob.getBoundingClientRect();
            blob.style.opacity = "1";

            blob.animate(
              [
                {
                  transform: `translate(${
                    ev.clientX - rec.left - rec.width / 2
                  }px, ${ev.clientY - rec.top - rec.height / 2}px)`,
                },
              ],
              {
                duration: 300,
                fill: "forwards",
              }
            );
          }
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <main ref={(el: any) => (cardsRef.current = el?.querySelectorAll(".card"))}>
      <TitleSection
        title="Head Contractors"
        subtitle="Easy project trust accounting and compliance with PayTrade for Head Contractors"
        description="Head contractors can check and monitor projects trust eligibility, manage your project and retention trust accounts, process claims and payments, monitor your compliance, submit regulatory notices, automate your trust accounts and reporting and integrate with other apps. See how PayTrade can help you."
      />
      <ReuseableCards></ReuseableCards>
    </main>
  );
}
