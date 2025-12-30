"use client";
import React from "react";
import Link from "next/link";

interface GuidesCTAProps {
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  lottieSrc: string;
}

const GuidesCTA: React.FC<GuidesCTAProps> = ({
  title,
  description,
  buttonText,
  buttonLink,
  lottieSrc,
}) => {
  return (
    <div className="pt_guidescta">
      <div className="pt_guidesctatext">
        <h3>{title}</h3>
        <p>{description}</p>
        <Link href={buttonLink}>
          <button className="contrast">
            {buttonText}
            <i className="fa-light fa-arrow-right right"></i>
          </button>
        </Link>
      </div>
      <div className="pt_guidesctabutton">
        <lottie-player
          autoplay
          loop
          mode="normal"
          src={lottieSrc}
        ></lottie-player>
      </div>
    </div>
  );
};

export default GuidesCTA;
