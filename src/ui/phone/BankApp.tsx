import type { Simulation } from '../../sim/Simulation';
import { BRANDS } from '../../content/brands';
import { formatMoney } from '../../sim/core/money';
import { useSimEvents } from '../hooks/useSim';
import { Lcd } from '../components/Lcd';
import { signedMoney, when } from './format';

const SHOWN = 50;

export function BankApp({ sim }: { sim: Simulation }) {
  useSimEvents(sim, ['cashChanged', 'dayStarted']);
  const { finance, player, clock } = sim.state;
  const week = sim.economy.flow(7);
  const recent = finance.ledger.slice(-SHOWN).reverse();

  return (
    <div class="app bank">
      <section class="bank-balance">
        <p class="app-label">Checking · {BRANDS.bank}</p>
        <Lcd text={formatMoney(player.cash)} class="bank-lcd" label="Balance" />
        <p class="bank-week">
          Last 7 days: <span class="in">{signedMoney(week.income)}</span> in, <span>{formatMoney(week.spending)}</span> out
        </p>
      </section>

      <section>
        <h3 class="app-heading">Debts</h3>
        {finance.debts.length === 0 ? (
          <p class="app-empty">No debts. Keep it that way.</p>
        ) : (
          <ul class="rows">
            {finance.debts.map((d) => (
              <li key={d.id} class="row">
                <span class="row-main">
                  <span class="row-title">{d.label}</span>
                  <span class="row-sub">{(d.apr * 100).toFixed(1)}% APR · {formatMoney(d.minMonthlyPayment)}/month minimum</span>
                </span>
                <span class="row-amount out">{formatMoney(d.balance)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 class="app-heading">Transactions</h3>
        <ul class="rows">
          {recent.map((tx) => (
            <li key={tx.id} class="row">
              <span class="row-main">
                <span class="row-title">{tx.description}</span>
                <span class="row-sub">{when(tx.minute, clock.totalMinutes)}</span>
              </span>
              <span class={`row-amount ${tx.amount >= 0 ? 'in' : 'out'}`}>{signedMoney(tx.amount)}</span>
            </li>
          ))}
        </ul>
        {finance.ledger.length > SHOWN && <p class="app-empty">Showing your latest {SHOWN} transactions.</p>}
      </section>
    </div>
  );
}
