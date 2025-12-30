import { useState } from "react";
import Link from "next/link";
import DOMPurify from "dompurify";
import { stripHtml } from "@/utils";

interface ShowMoreLessProps {
  text: string;
  maxLength?: number;
  link: string;
  title: string;
  key?: string | number;
}

const ShowMoreLess = ({
  text,
  maxLength = 100,
  link,
  title,
  key,
}: ShowMoreLessProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const plainText = stripHtml(text);

  const shouldShowToggle = plainText.length > maxLength;

  const truncatedText = plainText.slice(0, maxLength) + "...";

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="result" key={key || title}>
      <Link href={link}>
        <h5>{title}</h5>
      </Link>
      <p className="shrinkable">
        <span
          dangerouslySetInnerHTML={{
            __html:
              isExpanded || !shouldShowToggle
                ? DOMPurify.sanitize(stripHtml(text))
                : DOMPurify.sanitize(truncatedText),
          }}
        />
        &nbsp;
        {shouldShowToggle && (
          <>
            <a
              onClick={toggleExpand}
              className={!isExpanded ? "cu-pointer" : "hidden"}
            >
              More
            </a>
            <a
              onClick={toggleExpand}
              className={isExpanded ? "cu-pointer" : "hidden"}
            >
              Less
            </a>
          </>
        )}
      </p>
    </div>
  );
};

export default ShowMoreLess;
