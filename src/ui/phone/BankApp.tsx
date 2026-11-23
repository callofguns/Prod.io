import type { Simulation } from '../../sim/Simulation';
import { BRANDS } from '../../content/brands';
import { formatMoney } from '../../sim/core/money';
import { useSimEvents } from '../hooks/useSim';
import { Lcd } from '../components/Lcd';
import { signedMoney, when } from './format';
import { LOAN } from '../../content/living';

const SHOWN = 50;

export function BankApp({ sim, onError }: { sim: Simulation; onError: (msg: string) => void }) {
  useSimEvents(sim, ['cashChanged', 'dayStarted', 'debtsChanged']);
  const { finance, player, clock } = sim.state;
  const week = sim.economy.flow(7);
  const recent = finance.ledger.slice(-SHOWN).reverse();
  const upcoming = sim.bills.upcoming();
  const offer = sim.bills.loanOffer();
  const creditBand = finance.credit >= 740 ? 'Excellent' : finance.credit >= 670 ? 'Good' : finance.credit >= 580 ? 'Fair' : 'Poor';

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
        <h3 class="app-heading">Credit score</h3>
        <p class="credit"><strong>{finance.credit}</strong> {creditBand}</p>
        <p class="app-empty">Paying on time raises it. Missed payments drop it by 40 points.</p>
      </section>

      <section>
        <h3 class="app-heading">Upcoming</h3>
        <ul class="rows">
          {upcoming.map((b) => (
            <li key={b.label} class="row">
              <span class="row-main">
                <span class="row-title">{b.label}</span>
                <span class="row-sub">{when(b.due, clock.totalMinutes).replace('Today', 'Today,').replace('Yesterday', 'Yesterday,')}</span>
              </span>
              <span class="row-amount out">{formatMoney(b.amount)}</span>
            </li>
          ))}
        </ul>
        <p class="app-empty">Paid automatically. If your balance is short, the bill becomes overdue debt plus a late fee.</p>
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
        <h3 class="app-heading">Borrow</h3>
        {offer.reason ? (
          <p class="app-empty">{offer.reason}</p>
        ) : (
          <>
            <p class="app-empty">
              Personal loan at {(offer.apr * 100).toFixed(1)}% APR, repaid over {LOAN.termMonths} months. You qualify for up to {formatMoney(offer.max)}.
            </p>
            <div class="loan-amounts">
              {LOAN.amounts.filter((a) => a <= offer.max).map((a) => (
                <button key={a} class="order" onClick={() => {
                  const r = sim.dispatch('takeLoan', { amount: a });
                  if (!r.ok) onError(r.error);
                }}>{formatMoney(a)}</button>
              ))}
            </div>
          </>
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
