import React from "react";
import AddClientsAndSuppliers from "./AddClientsAndSuppliers";
import { AddClientsAndSuppliersContextProvider } from "./AddClientsAndSuppliersContext";

export default function index() {
  return (
    <AddClientsAndSuppliersContextProvider>
      <AddClientsAndSuppliers />
    </AddClientsAndSuppliersContextProvider>
  );
}
