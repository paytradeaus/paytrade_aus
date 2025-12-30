import { Fragment } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// types for route paths
interface Route {
  path: string; // The URL path of the breadcrumb link
  name: string; // The display name of the breadcrumb link
}

interface BreadCrumbsProps {
  routePaths: Route[]; // Array of routes that will be displayed as breadcrumb links
  activeRoute: string; // The name of the active route, displayed at the end (not clickable)
  routeBack?: boolean;
}

/**
 * BreadCrumbs Component
 *
 * This component renders a breadcrumb navigation based on the provided `routePaths` and highlights the `activeRoute`.
 * It uses Next.js's `Link` component for navigation and a chevron icon to separate links.
 *
 * Props:
 * - routePaths: An array of route objects representing the breadcrumb links.
 * - activeRoute: The name of the active route to be displayed at the end without a link.
 */
export default function BreadCrumbs({
  routePaths,
  activeRoute,
  routeBack,
}: Readonly<BreadCrumbsProps>) {
  const router = useRouter();
  return (
    <div className="pt_breadcrumbs">
      {/* Render breadcrumb links if routePaths is not empty */}
      {routePaths?.length > 0 &&
        routePaths.map((routeObj: any) => (
          <Fragment key={routeObj.path}>
            {/* Next.js Link component for each route */}
            <Link
              href={routeObj?.path}
              className="contrast"
              onClick={() => routeBack && !routeObj?.path && router.back()}
            >
              {routeObj?.name} {/* Display the name of each route */}
            </Link>
            {/* Chevron icon to separate breadcrumb links */}
            <i className="fa-light fa-chevron-right"></i>
          </Fragment>
        ))}

      {/* Display the active route as plain text (non-clickable) */}
      <span>{activeRoute}</span>
    </div>
  );
}
