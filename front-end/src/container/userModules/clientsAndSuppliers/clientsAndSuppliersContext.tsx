"use client";
import { createContext, useState, useContext } from "react";
import { toggleOptions } from "./clientSuppliers.constant";
import { filterByDuration } from "@/common/constants/data";

const ClientsAndSuppliersContext: any = createContext(null);

export const ClientsAndSuppliersProvider = ({ children }: any) => {
  //useState and useEffect Management
  const [selectedToggle, setSelectedToggle] = useState<string>(
    toggleOptions[0]?.value
  );
  const [searchedValue, setSearchedValue] = useState<string>("");
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [selectedDuration, setSelectedDuration] = useState(filterByDuration[0]);

  //other Hooks

  //functions

  //render Template
  return (
    <ClientsAndSuppliersContext.Provider
      value={{
        selectedToggle,
        setSelectedToggle,
        searchedValue,
        setSearchedValue,
        isCustomDate,
        setIsCustomDate,
        customStartDate,
        setCustomStartDate,
        customEndDate,
        setCustomEndDate,
        selectedDuration,
        setSelectedDuration,
      }}
    >
      {children}
    </ClientsAndSuppliersContext.Provider>
  );
};

// Create a custom hook for using the global context
const useClientsSuppliersContext = () => {
  const context = useContext(ClientsAndSuppliersContext);
  if (!context) {
    throw new Error("Error in clients/suppliers Context");
  }
  return context;
};

export { useClientsSuppliersContext };
