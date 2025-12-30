import React from "react";

interface FeatureCardProps {
  lottieSrc: string; // Path to Lottie animation JSON
  title: string; // Heading for the card
  description: string; // Description text for the card
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  lottieSrc,
  title,
  description,
}) => {
  return (
    <div className="pt_glow">
      <div className="card">
        <div className="inner">
          <div className="pt_feature pt_featureiconcard">
            <div className="pt_featureimage pt_featureicon">
              <lottie-player
                autoplay
                loop
                mode="normal"
                src={lottieSrc}
              ></lottie-player>
            </div>
            <div className="pt_featuretext pt_featureicontext">
              <h4>{title}</h4>
              <p>{description}</p>
            </div>
          </div>
        </div>
        <div className="blob"></div>
        <div className="fakeblob"></div>
      </div>
    </div>
  );
};

export default FeatureCard;
