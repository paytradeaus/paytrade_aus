interface SubscriptionItem {
  id: string;
  item_name: string;
  selected: boolean;
}

interface SubscriptionItemsData {
  subscriptionItems: SubscriptionItem[];
  totalCount: number;
}

export interface SubscriptionPlan {
  actual_price: number;
  monthly_bill_cycle: string;
  description: string;
  monthly_price: number;
  yearly_price: number;
  trial_period: number;
  id: string;
  items: SubscriptionItemsData;
  plan_name: string;
  plan_type: string;
  plan_status: string;
  subscription_status: string;
  plan_items: any;
  stripe_product_id: string;
}

interface SubscriptionPlansData {
  subscriptionPlans: SubscriptionPlan[];
}
