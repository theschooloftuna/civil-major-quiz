import type { SubscriberRow } from "../supabase/subscribers";

export interface SubscriberSummary {
  total: number;
  subscribed: number;
  unsubscribed: number;
  fromQuiz: number;
  fromNewsletterPage: number;
}

export function computeSubscriberSummary(rows: SubscriberRow[]): SubscriberSummary {
  let subscribed = 0;
  let unsubscribed = 0;
  let fromQuiz = 0;
  let fromNewsletterPage = 0;

  for (const row of rows) {
    if (row.status === "subscribed") subscribed++;
    else unsubscribed++;

    if (row.source === "quiz") fromQuiz++;
    else fromNewsletterPage++;
  }

  return { total: rows.length, subscribed, unsubscribed, fromQuiz, fromNewsletterPage };
}

/** Addresses that would actually receive the next issue. */
export function subscribedEmails(rows: SubscriberRow[]): string[] {
  return rows.filter((row) => row.status === "subscribed").map((row) => row.email);
}
