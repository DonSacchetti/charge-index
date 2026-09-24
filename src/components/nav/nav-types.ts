export type ClientNavData = {
  name: string | null;
  /** The session being tracked, or the most recent one to keep filling in. */
  logHref: string | null;
  /** The latest completed session's results, if any. */
  resultsHref: string | null;
  /** The Peak Plan for the latest purchased session, if any. */
  planHref: string | null;
  isStaff: boolean;
};
