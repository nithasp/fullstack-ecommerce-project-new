export const USER_FILTER_DEBOUNCE_MS = 300;

// The moment a local day starts, as ISO 8601; `addDays` moves it forward
export function localDayStart(date: string, addDays = 0): string {
  const day = new Date(`${date}T00:00:00`);
  day.setDate(day.getDate() + addDays);
  return day.toISOString();
}
