import type { Simulation, System } from '../Simulation';
import { fail, ok, type CommandResult } from '../core/commands';
import { formatMoney, type Cents } from '../core/money';
import type { Debt } from '../core/state';
import { MINUTES_PER_DAY, toCalendar, type CalendarTime } from '../core/time';
import { BRANDS } from '../../content/brands';
import {
  BILLING_HOUR, CREDIT, LOAN, LOAN_LATE_FEE, MONTHLY_BILLS, OVERDUE, RENT, monthlyPayment,
} from '../../content/living';

/** Keeps a small cushion when collecting overdue bills, so you can still buy food. */
const COLLECTION_BUFFER: Cents = 100_00;

export interface UpcomingBill {
  label: string;
  amount: Cents;
  /** Game minute it's due. */
  due: number;
}

/**
 * Rent, monthly bills, debt repayments, interest, credit score and personal
 * loans. Going broke never ends the game: unpaid bills become overdue debt
 * with late fees, which the bank collects once you can cover it.
 */
export class BillsSystem implements System {
  readonly id = 'bills';

  constructor(private sim: Simulation) {
    sim.events.on('hour', ({ time }) => {
      if (time.hour !== BILLING_HOUR) return;
      if (time.weekdayIndex === 1 && time.day > 1) this.chargeRent();
      if (time.date === 1) this.monthly(time);
      this.collectOverdue();
    });
    sim.handle('takeLoan', ({ amount }) => this.takeLoan(amount));
  }

  private get finance() {
    return this.sim.state.finance;
  }

  // ---------- Bills ----------

  private chargeRent(): void {
    this.pay(RENT.label, RENT.weekly, RENT.lateFee, RENT.landlord, 'rent');
  }

  private monthly(time: CalendarTime): void {
    for (const bill of MONTHLY_BILLS) this.pay(bill.label, bill.amount, bill.lateFee, BRANDS.carrier, 'other');
    for (const debt of [...this.finance.debts]) this.monthlyDebt(debt, time);
  }

  /** Pays a bill in full or turns it (plus a late fee) into overdue debt. */
  private pay(label: string, amount: Cents, lateFee: Cents, from: string, category: 'rent' | 'other'): void {
    if (this.sim.state.player.cash >= amount) {
      this.sim.economy.record(-amount, label, category);
      return;
    }
    this.addOverdue(amount + lateFee);
    this.hitCredit();
    this.sim.needs.change({ mood: -8 });
    this.sim.messages.send(
      from,
      `Missed payment: ${label}`,
      `Your payment of ${formatMoney(amount)} didn't go through. A ${formatMoney(lateFee)} late fee was added and the total moved to your overdue bills. The bank will collect it automatically once your balance can cover it.`,
    );
    this.sim.events.emit('notice', { text: `Missed payment: ${label}. It's now overdue debt.`, tone: 'bad' });
  }

  private monthlyDebt(debt: Debt, time: CalendarTime): void {
    const interest = Math.round((debt.balance * debt.apr) / 12);
    debt.balance += interest;
    if (debt.kind === 'overdue') return this.debtsChanged();

    const payment = Math.min(debt.minMonthlyPayment, debt.balance);
    if (this.sim.state.player.cash >= payment) {
      this.sim.economy.record(-payment, `${debt.label} payment`, 'loan');
      debt.balance -= payment;
      this.changeCredit(CREDIT.onTimeGain);
      if (debt.balance <= 0) {
        this.finance.debts = this.finance.debts.filter((d) => d !== debt);
        this.sim.messages.send(BRANDS.bank, `${debt.label} paid off`, `Congratulations, your ${debt.label.toLowerCase()} is fully paid off as of ${time.month} ${time.date}.`);
      }
    } else {
      debt.balance += LOAN_LATE_FEE;
      this.hitCredit();
      this.sim.needs.change({ mood: -8 });
      const from = debt.kind === 'student' ? BRANDS.studentLoans : BRANDS.bank;
      this.sim.messages.send(from, `Missed payment: ${debt.label}`, `We couldn't collect your ${formatMoney(payment)} payment. A ${formatMoney(LOAN_LATE_FEE)} late fee was added to your balance and reported to the credit bureau.`);
      this.sim.events.emit('notice', { text: `Missed your ${debt.label.toLowerCase()} payment.`, tone: 'bad' });
    }
    this.debtsChanged();
  }

  private addOverdue(amount: Cents): void {
    let overdue = this.finance.debts.find((d) => d.kind === 'overdue');
    if (!overdue) {
      overdue = { id: OVERDUE.id, label: OVERDUE.label, kind: 'overdue', balance: 0, apr: OVERDUE.apr, minMonthlyPayment: 0 };
      this.finance.debts.push(overdue);
    }
    overdue.balance += amount;
    overdue.minMonthlyPayment = overdue.balance;
    this.debtsChanged();
  }

  /** Daily: the bank takes what it can of overdue bills, keeping a small cushion. */
  private collectOverdue(): void {
    const overdue = this.finance.debts.find((d) => d.kind === 'overdue');
    if (!overdue) return;
    const available = this.sim.state.player.cash - COLLECTION_BUFFER;
    const take = Math.min(overdue.balance, available);
    if (take <= 0) return;
    this.sim.economy.record(-take, 'Overdue bills collected', 'fees');
    overdue.balance -= take;
    overdue.minMonthlyPayment = overdue.balance;
    if (overdue.balance <= 0) {
      this.finance.debts = this.finance.debts.filter((d) => d !== overdue);
      this.sim.messages.send(BRANDS.bank, 'Overdue bills cleared', 'Your overdue bills are fully paid. Nice work getting back on track.');
    }
    this.debtsChanged();
  }

  // ---------- Credit and loans ----------

  private hitCredit(): void {
    this.changeCredit(-CREDIT.latePenalty);
  }

  private changeCredit(delta: number): void {
    this.finance.credit = Math.max(CREDIT.min, Math.min(CREDIT.max, this.finance.credit + delta));
  }

  loanOffer(): { max: Cents; apr: number; reason: string | null } {
    const { credit, debts } = this.finance;
    const max = LOAN.maxAt(credit);
    const apr = LOAN.aprAt(credit);
    if (debts.some((d) => d.kind === 'personal')) return { max: 0, apr, reason: 'Pay off your current personal loan first.' };
    if (max === 0) return { max, apr, reason: `Declined: your credit score of ${credit} is too low.` };
    return { max, apr, reason: null };
  }

  private takeLoan(amount: Cents): CommandResult {
    const offer = this.loanOffer();
    if (offer.reason) return fail(offer.reason);
    if (!LOAN.amounts.includes(amount) || amount > offer.max) return fail(`${BRANDS.bank} can lend you up to ${formatMoney(offer.max)}.`);
    const debt: Debt = {
      id: `loan-${this.sim.state.clock.totalMinutes}`,
      label: 'Personal loan',
      kind: 'personal',
      balance: amount,
      apr: offer.apr,
      minMonthlyPayment: monthlyPayment(amount, offer.apr, LOAN.termMonths),
    };
    this.finance.debts.push(debt);
    this.changeCredit(-5); // hard inquiry
    this.sim.economy.record(amount, `Personal loan from ${BRANDS.bank}`, 'loan');
    this.sim.messages.send(
      BRANDS.bank,
      'Your personal loan is approved',
      `${formatMoney(amount)} is in your account. You'll pay ${formatMoney(debt.minMonthlyPayment)} on the 1st of each month for ${LOAN.termMonths} months at ${(offer.apr * 100).toFixed(1)}% APR.`,
    );
    this.debtsChanged();
    return ok;
  }

  // ---------- Queries ----------

  upcoming(): UpcomingBill[] {
    const now = this.sim.state.clock.totalMinutes;
    const bills: UpcomingBill[] = [];
    const nextAt = (predicate: (m: number) => boolean) => {
      for (let day = 0; day <= 31; day++) {
        const m = now - (now % MINUTES_PER_DAY) + day * MINUTES_PER_DAY + BILLING_HOUR * 60;
        if (m > now && predicate(m)) return m;
      }
      return null;
    };
    const rentDue = nextAt((m) => {
      const t = toCalendar(m);
      return t.weekdayIndex === 1 && t.day > 1;
    });
    if (rentDue !== null) bills.push({ label: 'Rent', amount: RENT.weekly, due: rentDue });
    const firstOfMonth = nextAt((m) => toCalendar(m).date === 1);
    if (firstOfMonth !== null) {
      for (const b of MONTHLY_BILLS) bills.push({ label: b.label, amount: b.amount, due: firstOfMonth });
      for (const d of this.finance.debts) {
        if (d.kind !== 'overdue') bills.push({ label: `${d.label} payment`, amount: Math.min(d.minMonthlyPayment, d.balance), due: firstOfMonth });
      }
    }
    return bills.sort((a, b) => a.due - b.due);
  }

  private debtsChanged(): void {
    this.sim.events.emit('debtsChanged', { debts: this.finance.debts, credit: this.finance.credit });
  }
}
