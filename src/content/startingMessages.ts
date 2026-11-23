import { BRANDS } from './brands';
import type { Background } from './backgrounds';
import { formatMoney } from '../sim/core/money';

export interface MessageTemplate {
  from: string;
  subject: string;
  body: string;
}

/** Messages waiting on the phone when a new game starts. */
export function startingMessages(bg: Background): MessageTemplate[] {
  const messages: MessageTemplate[] = [
    {
      from: BRANDS.bank,
      subject: 'Your checking account is open',
      body: `Welcome to ${BRANDS.bank}. Your opening balance of ${formatMoney(bg.cash)} is available now. Every payment in and out of your account appears in the Bank app.`,
    },
  ];
  for (const debt of bg.debts) {
    messages.push({
      from: BRANDS.studentLoans,
      subject: `${debt.label}: repayment starts next month`,
      body: `Your balance is ${formatMoney(debt.balance)} at ${(debt.apr * 100).toFixed(1)}% APR. Your minimum payment is ${formatMoney(debt.minMonthlyPayment)} a month, due on the 1st, starting next month.`,
    });
  }
  if (bg.id === 'clubDj') {
    messages.push({
      from: 'Marcus (promoter)',
      subject: 'Heard you are making beats now?',
      body: 'Ayy, heard you are producing now. Once you got something that knocks, holla at me. The Strip is always looking for new sounds.',
    });
  } else if (bg.id === 'selfTaught') {
    messages.push({
      from: 'Jaylen',
      subject: 'that last beat tho',
      body: 'bro that loop you sent me last week was crazy. you should really start selling these',
    });
  } else {
    messages.push({
      from: 'Prof. Okafor',
      subject: 'Keep writing',
      body: 'Sorry to see you leave the program. You have a real ear for harmony. Whatever you do next, keep writing every day.',
    });
  }
  return messages;
}
