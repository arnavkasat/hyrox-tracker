/**
 * A quote a day.
 *
 * Baked into the repo rather than fetched: no network call on first paint,
 * no API to go down, and — because the index is derived from the date rather
 * than from Math.random — the server and the client always agree on which
 * one to show.
 */

import { parseISODate, type ISODate } from "@/lib/date";

export type Quote = {
  text: string;
  author?: string;
};

export const QUOTES: Quote[] = [
  { text: "We are what we repeatedly do. Excellence, then, is a habit.", author: "Aristotle" },
  { text: "It never gets easier. You just go faster.", author: "Greg LeMond" },
  { text: "The body achieves what the mind believes." },
  { text: "Discipline is choosing between what you want now and what you want most." },
  { text: "Suffer the pain of discipline or the pain of regret." },
  { text: "Nobody who ever gave their best regretted it.", author: "George Halas" },
  { text: "You don't rise to the occasion. You fall to your training." },
  { text: "The miracle isn't that I finished. It's that I had the courage to start.", author: "John Bingham" },
  { text: "Hard days make easy days possible." },
  { text: "Consistency beats intensity, every week of the year." },
  { text: "Train hard, race easy." },
  { text: "The work you do when nobody's watching is the work that shows up on race day." },
  { text: "Small progress is still progress." },
  { text: "Your only limit is the one you accept today." },
  { text: "Run the mile you're in." },
  { text: "Fatigue makes cowards of us all.", author: "Vince Lombardi" },
  { text: "It's supposed to be hard. The hard is what makes it great." },
  { text: "Don't count the days. Make the days count.", author: "Muhammad Ali" },
  { text: "Pain is temporary. Quitting lasts forever.", author: "Lance Armstrong" },
  { text: "Everybody wants to be a beast until it's time to do what beasts do." },
  { text: "Showing up tired still counts. Skipping doesn't." },
  { text: "Strength does not come from winning. Struggles develop your strength.", author: "Arnold Schwarzenegger" },
  { text: "The pain you feel today is the strength you feel tomorrow." },
  { text: "A one-hour session is four percent of your day." },
  { text: "You've survived every hard session so far. That's a perfect record." },
  { text: "Motivation gets you started. Habit keeps you going.", author: "Jim Ryun" },
  { text: "Rest is part of the plan, not a break from it." },
  { text: "There is no elevator to fitness. You have to take the stairs." },
  { text: "Be stubborn about your goals and flexible about your methods." },
  { text: "The sled does not care how you feel. Push anyway." },
  { text: "Sweat is just fat crying." },
  { text: "The first step is always the heaviest. Take it anyway." },
  { text: "Compete against who you were last Tuesday." },
  { text: "If it doesn't challenge you, it doesn't change you." },
  { text: "Race weight is built in the kitchen, not the gym." },
  { text: "Doubles means someone else is counting on your Tuesday." },
  { text: "Endurance is patience concentrated.", author: "Thomas Carlyle" },
  { text: "Train the mind and the body will follow." },
  { text: "The only bad session is the one you didn't do." },
  { text: "Do today what others won't, so tomorrow you can do what others can't." },
  { text: "Fall in love with the process and the results will come." },
  { text: "Negative splits are a promise you make at the start line." },
  { text: "Compression is earned. So is the finish line." },
  { text: "Consistency isn't glamorous. It's just undefeated." },
  { text: "Wake up. Work out. Repeat. That's the whole secret." },
];

/**
 * Deterministic for a given calendar day, so it's stable across a render
 * and across a page refresh, and rolls over at midnight.
 */
export function quoteForDate(date: ISODate): Quote {
  const daysSinceEpoch = Math.floor(parseISODate(date).getTime() / 86_400_000);
  const index = ((daysSinceEpoch % QUOTES.length) + QUOTES.length) % QUOTES.length;
  return QUOTES[index];
}
