import TextField from "@/components/TextField/textField";
import customStyles from "./BusinessInfoPage.module.scss";
import React, { useEffect, useState } from "react";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import FormButton from "@/components/Button/button";
import { Button } from "react-bootstrap";
import { MdOutlineSubscriptions } from "react-icons/md";
import { fetchSubscriptionType } from "./BusinessInfo.function";
import { mapDropdownOptions } from "@/common/commonFunctions";

export default function Subscriptions() {
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  useEffect(() => {
    getSubscriptionPlans();
  }, []);

  async function getSubscriptionPlans() {
    try {
      const response: any[] = await fetchSubscriptionType();

      // Early return if response is empty or an error occurs
      if (!response || !Array.isArray(response) || response.length === 0) {
        setSubscriptionPlans([]);
        return;
      }

      const modifiedSubscriptionOptions = mapDropdownOptions(
        response,
        "plan_name",
        "plan_name"
      );

      setSubscriptionPlans(modifiedSubscriptionOptions);
      setSelectedPlan(modifiedSubscriptionOptions[2]);
    } catch (err) {
      console.error("Error fetching subscription plans:", err);
    }
  }

  return (
    <div>
      <div className="text-center">
        <MdOutlineSubscriptions className={customStyles.AddCompanyIconStyles} />
      </div>
      <div className={customStyles.title}>Subscriptions</div>
      <div className={customStyles.DropdownStyles}>
        <SearchableSelect
          // key={timeKey}
          options={subscriptionPlans}
          label="Subscription *"
          selectedData={selectedPlan}
          placeholder="Select subscription plan"
          onChange={(selectedOption) => setSelectedPlan(selectedOption)}
        />
      </div>
      <div className={customStyles.textFieldStyles}>
        <TextField
          type="text"
          maxLength={150}
          labelText="Status"
          name="Status"
          placeholder="Subscribed"
          id="subscription"
          value={""}
          onChange={(e: any) => {}}
          disabled={true}
          className={customStyles.inputFieldControl}
        />
      </div>
      <div className={customStyles.textFieldStyles}>
        <TextField
          type="text"
          maxLength={150}
          labelText="Payment method"
          name="method"
          placeholder="6544 (expires on 25/04/2030)"
          id="method"
          value={""}
          onChange={(e: any) => {}}
          disabled={true}
          className={customStyles.inputFieldControl}
        />
      </div>
      <FormButton className={customStyles.buttonStyles} type="submit">
        Save
      </FormButton>
      <Button
        className={customStyles.SkipButtonStyles}
        type="button"
        // onClick={handleFormCancelClick}
      >
        Cancel
      </Button>
    </div>
  );
}
