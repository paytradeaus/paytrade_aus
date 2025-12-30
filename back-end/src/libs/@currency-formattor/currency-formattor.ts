export function formatCurrency(value) {
  if (value === null || value === undefined) return null;
  const number = parseFloat(value);
  return number >= 0
    ? // ? `$${number.toFixed(2)}`
      // : `-$${Math.abs(number).toFixed(2)}`;
      `$${number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `-$${Math.abs(number).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatCurrencyWithoutDollars(value) {
  if (value === null || value === undefined) return null;
  const number = parseFloat(value);
  return number >= 0
    ? `${number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `-${Math.abs(number).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
