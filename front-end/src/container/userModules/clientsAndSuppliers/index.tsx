import ClientsAndSuppliers from "./clientsAndSuppliers";
import { ClientsAndSuppliersProvider } from "./clientsAndSuppliersContext";

export default function ClientsSuppliersContainer({ overViewDetails }: any) {
  return (
    <ClientsAndSuppliersProvider>
      <ClientsAndSuppliers overViewDetails={overViewDetails} />
    </ClientsAndSuppliersProvider>
  );
}
