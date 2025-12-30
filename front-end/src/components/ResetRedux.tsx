"use-client";
import { ApplicationURLS } from "@/common/applicationURLS";

import { setAuditDetails } from "@/redux/slices/subscribeRouteBackDetails";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

/**
 * ResetReduxState Component
 *
 * A functional component that resets specific Redux state slices when the user navigates
 * away from certain paths (such as subscription upgrade or audit-related routes).
 * This ensures that the state remains clean and relevant for different parts of the application.
 *
 * Functionality:
 * - Listens for changes in the current path using Next.js's `usePathname` hook.
 * - Resets the Redux state for audit subscription details when the user navigates
 *   away from certain defined paths.
 *
 * Dependencies:
 * - Redux (for managing state)
 * - Next.js `usePathname` (for detecting route changes)
 *
 * @returns  This component does not render any UI elements.
 */
export default function ResetReduxState() {
  const dispatch = useDispatch(); // Hook to dispatch Redux actions
  const currentPath = usePathname(); // Get the current path from the router

  useEffect(() => {
    // Reset Redux state whenever the path changes
    resetSubscriptionDetails();
  }, [currentPath]); // Dependency array ensures the effect runs on path changes

  function isSubscriptionRoutes() {
    return (
      !currentPath.startsWith(ApplicationURLS.USER_MANAGE_SUBSCRIPTIONS) &&
      currentPath !== ApplicationURLS.USER_SUBSCRIPTION_PAYMENT_HISTORY
    );
  }

  /**
   * Reset subscription details in the Redux store.
   *
   * - Clears the audit-related details in the Redux state if the current route
   *   is not one of the defined paths for subscription upgrade or audit management.
   * - This ensures that audit data does not persist when it's not relevant.
   */
  function resetSubscriptionDetails() {
    if (
      isSubscriptionRoutes() &&
      currentPath !== ApplicationURLS.USER_AUDIT_ADD &&
      currentPath !== ApplicationURLS.USER_AUDIT_EDIT
    ) {
      dispatch(setAuditDetails({})); // Reset audit details in Redux state
    }
  }

  return null; // No UI is rendered by this component
}
