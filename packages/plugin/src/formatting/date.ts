// Internal date formatting helpers used by UI components to avoid direct Intl usage in UI files.
// Not exported from the public surface; import via relative path inside this package only.

export function formatDateShortLabel(date: string | Date, locale: string | undefined): string {
  try {
    const d = typeof date === 'string' ? new Date(String(date)) : date;
    // Keep the same format as previously used in CostOverviewCard
    return new Intl.DateTimeFormat(locale || 'en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(d);
  } catch {
    return String(date);
  }
}
