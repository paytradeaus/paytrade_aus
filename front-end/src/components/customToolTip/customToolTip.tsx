import React from "react";
import Popover from "react-bootstrap/Popover";
import OverlayTrigger, {
  OverlayTriggerProps,
} from "react-bootstrap/OverlayTrigger";
import { InfoCircle } from "react-bootstrap-icons"; // Adjust the import as per your icons setup
import styles from "./customToolTip.module.scss"; // Make sure you import your custom styles

type Placement = OverlayTriggerProps["placement"];

interface TooltipInfoIconProps {
  tooltipText: string;
  alignment?: Placement;
  className?: string; // Added className prop for custom styling
  icon?: React.ReactNode; // Added icon prop to allow custom icons
  iconColor?: string;
}

const TooltipInfoIcon: React.FC<TooltipInfoIconProps> = ({
  tooltipText,
  alignment = "right",
  className = "", // Default to an empty string if not provided
  icon = <InfoCircle />, // Default to InfoCircle if no icon is provided
  iconColor = "#007bff",
}) => {
  return (
    <OverlayTrigger
      placement={alignment}
      trigger={["hover", "focus"]} // Trigger on hover and focus
      overlay={
        <Popover className={styles.popoverInner}>
          <Popover.Body style={{ color: "white" }}>{tooltipText}</Popover.Body>
        </Popover>
      }
    >
      <span className={className}>
        {React.cloneElement(icon as React.ReactElement, {
          style: {
            cursor: "pointer",
            marginLeft: 5,
            color: iconColor,
            marginBottom: 1,
          },
        })}
      </span>
    </OverlayTrigger>
  );
};

export default TooltipInfoIcon;
