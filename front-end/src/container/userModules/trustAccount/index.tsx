import TrustAccount from "./trustAccount";
import { TrustAccountProvider } from "./trustAccountContext";

export default function TrustAccountContainer() {
  return (
    <TrustAccountProvider>
      <TrustAccount />
    </TrustAccountProvider>
  );
}
