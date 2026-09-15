export type ClientNavData = {
  name: string | null;
  /** The session in progress, if any. */
  logHref: string | null;
  /** The latest completed session's results, if any. */
  resultsHref: string | null;
  /** The Peak Plan for the latest purchased session, if any. */
  planHref: string | null;
  isStaff: boolean;
};
