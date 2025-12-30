import ReuseableCards from "@/components/ReuseableCards";
import TitleSection from "@/components/TitleSection";
import React, { useEffect, useRef } from "react";

export default function BookKeepersPage() {
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
        title="Bookkeepers"
        subtitle="Easy project trust accounting and compliance with PayTrade for Bookkeepers"
        description="Bookkeepers can check and monitor their clients project trust eligibility, manage their project and retention trust accounts, process claims and payments, monitor their compliance, submit regulatory notices, automate trust accounts and reporting and integrate with other apps. See how Pay Trade can help you support your clients."
      />
      <ReuseableCards></ReuseableCards>
    </main>
  );
}
