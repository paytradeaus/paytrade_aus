import Link from "next/link";
import Image from "next/image";
import React from "react";

// Define the props for the BlogBox
interface BlogBoxProps {
  href: string; // The URL to navigate to
  imageSrc: string; // The source of the image
  title: string; // The title of the blog
  description: string; // The description text
}

// Higher-Order Component (HOC) to wrap a component
const withBlogBox = <P extends object>(
  WrappedComponent: React.ComponentType<P>
) => {
  const BlogBox: React.FC<BlogBoxProps & P> = ({
    href,
    imageSrc,
    title,
    description,
    ...props
  }) => {
    return (
      <Link
        href={href}
        className="pt_blogbox"
        style={{ display: "flex", flexDirection: "column" }}
      >
        <div
          style={{ position: "relative", width: "100%", paddingTop: "77.62%" }}
        >
          <Image
            src={imageSrc}
            alt={title}
            fill={true}
            style={{ objectFit: "cover" }}
            unoptimized
          />
        </div>
        <h4
          style={{
            fontSize: "var(--step-2)",
            textDecoration: "none",
            margin: "15px 0 0 0",
            padding: "0 var(--space-s)",
          }}
        >
          {title}
        </h4>
        <p
          style={{
            color: "var(--pico-contrast)",
            padding: "0 var(--space-s)",
            margin: "15px 0 0 0",
          }}
        >
          {description}
        </p>
        <WrappedComponent {...(props as P)} />
      </Link>
    );
  };
  return BlogBox;
};

export default withBlogBox;
