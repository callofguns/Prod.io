import type { Cents } from '../../../sim/core/money';
import { formatMoney } from '../../../sim/core/money';

/** Steps through a tier's allowed prices with − and + keys. */
export function PriceStepper({ label, value, steps, onChange, custom }: {
  label: string; value: Cents; steps: Cents[]; onChange: (price: Cents) => void; custom?: boolean;
}) {
  const i = steps.indexOf(value);
  const at = i === -1 ? steps.findIndex((s) => s >= value) : i;
  return (
    <div class="price-stepper">
      <button class="step" aria-label={`Lower ${label} price`} disabled={at <= 0} onClick={() => onChange(steps[Math.max(0, at - 1)]!)}>−</button>
      <span class="price-value">{formatMoney(value)}{custom && <span class="custom-chip">custom</span>}</span>
      <button class="step" aria-label={`Raise ${label} price`} disabled={at >= steps.length - 1} onClick={() => onChange(steps[Math.min(steps.length - 1, at + 1)]!)}>+</button>
    </div>
  );
}
