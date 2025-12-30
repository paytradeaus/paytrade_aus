"use client";
import { createContext, useState, useContext } from "react";

const ClientsAndSuppliersContext: any = createContext(null);

export const ClientsAndSuppliersProvider = ({ children }: any) => {
  //useState and useEffect Management
  //   const [selectedToggle, setSelectedToggle] = useState<string>(
  //     toggleOptions[0]?.value
  //   );
  const [tabStatus, setTabStatus] = useState(null);
  const [searchedValue, setSearchedValue] = useState<string>("");
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());

  //other Hooks

  //functions

  //render Template
  return (
    <ClientsAndSuppliersContext.Provider
      value={{
        searchedValue,
        setSearchedValue,
        isCustomDate,
        setIsCustomDate,
        customStartDate,
        setCustomStartDate,
        customEndDate,
        setCustomEndDate,
        setTabStatus,
        tabStatus,
      }}
    >
      {children}
    </ClientsAndSuppliersContext.Provider>
  );
};

// Create a custom hook for using the global context
const useClientsSuppliersContext = () => {
  const context = useContext(ClientsAndSuppliersContext);
  return context;
};

export { useClientsSuppliersContext };
