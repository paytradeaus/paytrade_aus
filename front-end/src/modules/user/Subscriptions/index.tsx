import { SubscriptionsContextProvider } from "./SubscriptionContext";
import Subscriptions from "./Subscriptions";

export default function SubscriptionWrapper() {
  return (
    <SubscriptionsContextProvider>
      <Subscriptions />
    </SubscriptionsContextProvider>
  );
}
