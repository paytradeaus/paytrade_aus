import { IFetchedAllContents, IFetchedAllRules } from './functions.interfaces';

export async function todayIsGreaterThanOpeningDatePlusBusinessDays(data: {
  startDate: Date;
  compareDate?: Date; // optional, defaults to today
  businessDays: number;
  holidayDetails: {
    holiday_date: Date;
    recurring_every_year: boolean;
    holiday_status: 'Active' | 'Inactive' | 'Deleted';
  }[];
}) {
  try {
    const { startDate, businessDays, holidayDetails, compareDate } = data;

    const todayOrCompareDate = compareDate ? new Date(compareDate) : new Date();
    todayOrCompareDate.setHours(0, 0, 0, 0);
    const today = new Date(todayOrCompareDate);

    let date = new Date(startDate);
    date.setHours(0, 0, 0, 0);
    let addedDays = 0;

    while (addedDays < businessDays) {
      date.setDate(date.getDate() + 1);
      const day = date.getDay();

      // Skip weekends
      if (day === 0 || day === 6) {
        continue;
      }

      const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const monthDay = formattedDate.slice(5); // MM-DD

      const isHoliday = holidayDetails.some((holiday) => {
        if (holiday.holiday_status !== 'Active') return false;

        const holidayDate = new Date(holiday.holiday_date);
        holidayDate.setHours(0, 0, 0, 0);
        const holidayDateStr = holidayDate.toISOString().split('T')[0];
        const holidayMonthDay = holidayDateStr.slice(5);

        if (!holiday.recurring_every_year) {
          return holidayDateStr  === formattedDate;
        } else {
          return holidayMonthDay === monthDay;
        }
      });

      if (isHoliday) {
        continue;
      }

      addedDays++;
    }
    return today > date;
  } catch (error) {
    throw error;
  }
}

//Check for the payment date to check whether TODAY > PAYMENT DATE + 5 days
export function filterPendingLatePayments(unsentNoticeDetails) {
  return unsentNoticeDetails.filter((notice) => {
    //today
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset the time portion of today's date

    const payment_date = notice.payment_date;

    // Add 5 days to the provided payment date
    const paymentDatePlusFive = new Date(payment_date);
    paymentDatePlusFive.setDate(paymentDatePlusFive.getDate() + 5);
    paymentDatePlusFive.setHours(0, 0, 0, 0); // Reset the time portion of the payment date

    // Compare today's date with payment_date + 5 days
    if (today.getTime() > paymentDatePlusFive.getTime()) {
      return notice;
    }
  });
}

//Check for the payment date to check whether TODAY < PAYMENT DATE + 5 days
export function filterPendingNonLatePayments(unsentNoticeDetails) {
  return unsentNoticeDetails.filter((notice) => {
    //today
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset the time portion of today's date

    const payment_date = notice.payment_date;

    // Add 5 days to the provided payment date
    const paymentDatePlusFive = new Date(payment_date);
    paymentDatePlusFive.setDate(paymentDatePlusFive.getDate() + 5);
    paymentDatePlusFive.setHours(0, 0, 0, 0); // Reset the time portion of the payment date

    // Compare today's date with payment_date + 5 days
    if (today.getTime() < paymentDatePlusFive.getTime()) {
      return notice;
    }
  });
}

export function filterComplianceContentDetails(
  check_number: number,
  rule_number: number,
  fetchedAllContents: IFetchedAllContents[],
) {
  try {
    const filteredContentDetails = fetchedAllContents.filter(
      (content) =>
        content.check_number == check_number &&
        content.rule_number == rule_number,
    )[0];
    // console.log('filteredContentDetails', filteredContentDetails);

    return filteredContentDetails;
  } catch (error) {
    throw error;
  }
}
export function fetchComplianceRuleDetails(
  check_number: number,
  rule_number: number,
  fetchedAllRules: IFetchedAllRules[],
) {
  try {
    const filteredRuleDetails = fetchedAllRules?.filter(
      (rule) =>
        rule.check_number == check_number && rule.rule_number == rule_number,
    )[0];
    // console.log('filteredRuleDetails', filteredRuleDetails);

    return filteredRuleDetails;
  } catch (error) {
    throw error;
  }
}
