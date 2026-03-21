// Indian Rupee formatter using Intl.NumberFormat
const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Format a number as Indian Rupees
 * e.g. 150000 → ₹1,50,000
 */
export const formatINR = (value) => {
  const num = Number(value);
  if (isNaN(num)) return '₹0';
  return inrFormatter.format(num);
};
