export interface ItineraryPoint {
  id: string;
  time: string; // HH:MM
  minutes: number; // minutes since start of day (monotonic across midnight)
  locationName: string;
  originalText: string;
  lat?: number;
  lng?: number;
  isRest: boolean;
  restore?: { locationName: string; lat?: number; lng?: number };
}

const TIME_RE = /(\d{1,2})[.:](\d{2})/;

export function parseItinerary(text: string): ItineraryPoint[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const points: ItineraryPoint[] = [];
  let lastLocation = '';
  let lastMinutes = -1;
  let dayOffset = 0;

  lines.forEach((line, index) => {
    const match = line.match(TIME_RE);
    if (!match) return;

    let minutes = parseInt(match[1], 10) * 60 + parseInt(match[2], 10) + dayOffset;
    if (lastMinutes >= 0 && minutes < lastMinutes) {
      dayOffset += 24 * 60;
      minutes += 24 * 60;
    }
    lastMinutes = minutes;

    // "Rest Area KM 88" is a place name; "Rest", "Rest until 21.23", "istirahat" mean we stay put.
    const REST_WORD = /\b(rest|istirahat|break)\b(?!\s*area)/gi;
    let locName = line
      .replace(TIME_RE, '')
      .replace(/\b(WIB|WITA|WIT|start|arrive[d]?|until|sampai)\b/gi, '')
      .replace(REST_WORD, '')
      .replace(/\s+/g, ' ')
      .trim();
    const isRest =
      !!lastLocation &&
      (!locName ||
        ((new RegExp(REST_WORD.source, 'i').test(line) || /\buntil\b/i.test(line)) &&
          locName.toLowerCase() === lastLocation.toLowerCase()));

    if (isRest || !locName) {
      locName = lastLocation;
    } else {
      lastLocation = locName;
    }

    points.push({
      id: `pt-${index}`,
      time: `${match[1].padStart(2, '0')}:${match[2]}`,
      minutes,
      locationName: locName,
      originalText: line,
      isRest,
    });
  });

  return points;
}
