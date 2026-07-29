export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota exceeded */ }
}

/**
 * Wie `saveJSON`, meldet aber ob das Schreiben geklappt hat. Gebraucht fuer
 * Daten, deren stiller Verlust der Nutzer merken wuerde — z. B. Shotlisten mit
 * Thumbnails, die die localStorage-Quota sprengen koennen. Der Aufrufer kann
 * dann warnen, statt dass Shots beim naechsten Start einfach weg sind.
 */
export function saveJSONSafe(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
