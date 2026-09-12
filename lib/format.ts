const DISPLAY_TIME_ZONE = 'UTC';

export function formatTimestamp(isoTimestamp: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: DISPLAY_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(isoTimestamp));
}

export function formatChartDate(isoTimestamp: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: DISPLAY_TIME_ZONE,
    month: 'short',
    day: 'numeric',
  }).format(new Date(isoTimestamp));
}
