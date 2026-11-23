/** All money is stored as integer cents to avoid floating-point drift. */
export type Cents = number;

export const dollars = (amount: number): Cents => Math.round(amount * 100);

const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(cents: Cents): string {
  return formatter.format(cents / 100);
}
