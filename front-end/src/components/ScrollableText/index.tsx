import React, { useEffect, useRef, useState } from "react";

interface ScrollableTextProps {
  text: string;
  className?: string;
  maxWidth?: number; // optional override
}

const ScrollableText: React.FC<ScrollableTextProps> = ({
  text,
  className,
  maxWidth = 150, // default width
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const content = textRef.current;

    if (container && content) {
      setShouldScroll(content.scrollWidth > container.clientWidth);
    }
  }, [text]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        maxWidth,
        overflow: "hidden",
        whiteSpace: "nowrap",
        position: "relative",
      }}
    >
      <span
        ref={textRef}
        className={shouldScroll ? "scroll-anim" : ""}
        style={{ display: "inline-block" }}
      >
        {text}
      </span>
    </div>
  );
};

export default ScrollableText;
