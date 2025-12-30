import React from "react";

interface TitleSectionProps {
  title: string; // Main title (e.g., h1)
  subtitle: string; // Subtitle (e.g., h5)
  description: string; // Additional description (e.g., paragraph)
}

const TitleSection: React.FC<TitleSectionProps> = ({
  title,
  subtitle,
  description,
}) => {
  return (
    <div className="pt_titletop">
      <div className="container-fluid">
        <div className="center">
          <h1>{title}</h1>
          <h5>{subtitle}</h5>
          <p>{description}</p>
        </div>
      </div>
    </div>
  );
};

export default TitleSection;
