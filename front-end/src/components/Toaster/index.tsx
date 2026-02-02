"use client";

import { applicationStorage } from "@/shared/constant/general";
import "react-toastify/dist/ReactToastify.css";

import {
  toast, // Importing toast functions from react-toastify
  ToastContainer as OriginalToastContainer, // Import the original ToastContainer from react-toastify
  ToastContainerProps, // Type for the toast container props
  ToastOptions, // Type for the toast options
} from "react-toastify";

// Type for container configuration, extending from ToastContainerProps
interface ContainerConfig extends ToastContainerProps {}

// Initialize an empty object for the container configuration
let containerConfig: ContainerConfig = {};

// Set default options for displaying a toast
const defaultOptions: ToastOptions = {
  position: "top-right", // Position the toast at the top right
  autoClose: 5000, // Automatically close the toast after 5 seconds
  hideProgressBar: false, // Show the progress bar by default
  closeOnClick: true, // Allow the toast to be closed by clicking on it
  pauseOnHover: true, // Pause the toast auto-close when hovered
  draggable: true, // Allow the toast to be draggable
  progress: undefined, // Use the default progress bar behavior
};

// Utility function to set the ToastContainer configuration dynamically
export const setToastContainerConfig = (config: ContainerConfig = {}) => {
  containerConfig = { ...containerConfig, ...config }; // Merge new config with existing one
};

// Get the current theme from localStorage
function getCurrentTheme() {
  return localStorage.getItem(applicationStorage.THEME) ?? "light"; // Default to "light" theme if not set
}

// Utility function to show a success toast
export const showSuccessToast = (
  message: string, // The success message to be displayed
  options: ToastOptions = {} // Additional toast options (optional)
) => {
  toast.success(message, {
    ...defaultOptions, // Apply default toast options
    ...options, // Merge any additional options passed in
    theme: getCurrentTheme(), // Set the theme based on current user preference
  });
};

// Utility function to show an error toast
export const showErrorToast = (
  message: string, // The error message to be displayed
  options: ToastOptions = {} // Additional toast options (optional)
) => {
  toast.error(message, {
    ...defaultOptions, // Apply default toast options
    ...options, // Merge any additional options passed in
    theme: getCurrentTheme(), // Set the theme based on current user preference
  });
};

// Utility function to show an info toast
export const showInfoToast = (
  message: string, // The info message to be displayed
  options: ToastOptions = {} // Additional toast options (optional)
) => {
  toast.info(message, {
    ...defaultOptions, // Apply default toast options
    ...options, // Merge any additional options passed in
    theme: getCurrentTheme(), // Set the theme based on current user preference
  });
};

// Utility function to show a warning toast
export const showWarningToast = (
  message: string, // The warning message to be displayed
  options: ToastOptions = {} // Additional toast options (optional)
) => {
  toast.warn(message, {
    ...defaultOptions, // Apply default toast options
    ...options, // Merge any additional options passed in
    theme: getCurrentTheme(), // Set the theme based on current user preference
  });
};

// A customized ToastifyContainer component that uses dynamic configuration
export function ToastifyContainer() {
  return (
    <OriginalToastContainer
      {...containerConfig} // Spread the dynamic container configuration
    />
  );
}
