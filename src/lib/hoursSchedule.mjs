/** Canonical day order shared by the owner-facing hours editor and display serializer. */
export const HOURS_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Keep the legacy quick-fill choices while allowing owners to edit every resulting day. */
export const HOURS_PRESETS = {
  standard: { 'Mon–Fri': '9a–5p', Sat: 'Closed', Sun: 'Closed' },
  extended: { 'Mon–Fri': '8a–8p', Sat: '9a–5p', Sun: 'Closed' },
  weekends: { Sat: '9a–5p', Sun: '12p–4p' },
  appointment: { 'By appointment': 'Call or email to schedule' },
  always: { 'Every day': 'Open 24 hours' },
  vary: { 'Hours vary': 'Contact us for current hours' },
};

const DAY_ABBREVIATIONS = {
  mon: 0, monday: 0,
  tue: 1, tues: 1, tuesday: 1,
  wed: 2, weds: 2, wednesday: 2,
  thu: 3, thur: 3, thurs: 3, thursday: 3,
  fri: 4, friday: 4,
  sat: 5, saturday: 5,
  sun: 6, sunday: 6,
};

const emptyDay = () => ({ mode: 'unspecified', slots: [], note: '' });
export const createEmptyHoursSchedule = () => ({
  days: Object.fromEntries(HOURS_DAYS.map((day) => [day, emptyDay()])),
  notes: [],
});

function dayIndexesForKey(rawKey) {
  const key = String(rawKey ?? '').toLocaleLowerCase('en-US').trim()
    .replace(/[.]/g, '')
    .replace(/[–—−]/g, '-')
    .replace(/\b(?:through|to)\b/g, '-')
    .replace(/\s+/g, '');
  if (['everyday', 'daily', 'allweek'].includes(key)) return HOURS_DAYS.map((_, index) => index);
  if (['weekday', 'weekdays', 'monday-friday', 'mon-fri'].includes(key)) return [0, 1, 2, 3, 4];
  if (['weekend', 'weekends', 'saturday-sunday', 'sat-sun'].includes(key)) return [5, 6];

  const parts = key.split('-');
  const start = DAY_ABBREVIATIONS[parts[0]];
  if (parts.length === 1 && start !== undefined) return [start];
  const end = parts.length === 2 ? DAY_ABBREVIATIONS[parts[1]] : undefined;
  if (start === undefined || end === undefined) return [];
  const indexes = [];
  for (let index = start, limit = 0; limit < HOURS_DAYS.length; index = (index + 1) % HOURS_DAYS.length, limit++) {
    indexes.push(index);
    if (index === end) break;
  }
  return indexes;
}

function meridiemOf(token) {
  const suffix = String(token).match(/([ap])\.?m?\.?$/i)?.[1]?.toLowerCase();
  return suffix === 'p' ? 'pm' : suffix === 'a' ? 'am' : '';
}

function hourTo24(rawHour, meridiem) {
  const hour = Number(rawHour);
  if (!Number.isInteger(hour)) return null;
  if (!meridiem) return hour >= 0 && hour <= 23 ? hour : null;
  if (hour < 1 || hour > 12) return null;
  return (hour % 12) + (meridiem === 'pm' ? 12 : 0);
}

function parseTimePair(startToken, endToken) {
  const start = String(startToken).trim();
  const end = String(endToken).trim();
  const startParts = start.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m?\.?)?$/i);
  const endParts = end.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m?\.?)?$/i);
  if (!startParts || !endParts) return null;
  const startRawHour = Number(startParts[1]);
  const endRawHour = Number(endParts[1]);
  const startMeridiem = meridiemOf(start);
  const endMeridiem = meridiemOf(end);

  let startPeriod = startMeridiem || (endMeridiem === 'pm' && startRawHour <= endRawHour ? 'am' : endMeridiem || '');
  let endPeriod = endMeridiem || startPeriod;
  if (!startPeriod && startRawHour <= 12) startPeriod = 'am';
  if (!endMeridiem && startPeriod === 'am' && endRawHour < startRawHour && endRawHour > 0) endPeriod = 'pm';

  const startHour = hourTo24(startRawHour, startPeriod);
  const endHour = hourTo24(endRawHour, endPeriod);
  const startMinute = Number(startParts[2] ?? 0);
  const endMinute = Number(endParts[2] ?? 0);
  if (startHour === null || endHour === null || startMinute > 59 || endMinute > 59) return null;
  return {
    open: `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`,
    close: `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`,
  };
}

function parseTimeRanges(value) {
  const text = String(value ?? '');
  const rangePattern = /(\d{1,2}(?::\d{2})?\s*(?:a\.?m?\.?|p\.?m?\.?)?)\s*(?:to|[-–—])\s*(\d{1,2}(?::\d{2})?\s*(?:a\.?m?\.?|p\.?m?\.?)?)/gi;
  const slots = [];
  for (const match of text.matchAll(rangePattern)) {
    const slot = parseTimePair(match[1], match[2]);
    if (slot) slots.push(slot);
  }
  return slots;
}

function parseHoursValue(value) {
  const text = String(value ?? '').trim();
  if (!text) return emptyDay();
  if (/^(closed|close|not open)$/i.test(text)) return { mode: 'closed', slots: [], note: '' };
  if (/^(open\s*)?(24\s*hours?|24\/7|always open)$/i.test(text)) return { mode: 'always', slots: [], note: '' };
  const slots = parseTimeRanges(text);
  if (slots.length) return { mode: 'custom', slots, note: '' };
  return { mode: 'note', slots: [], note: text };
}

/** Expand legacy presets/day ranges and retain unrecognized entries as editable notes. */
export function parseHoursSchedule(hours = {}) {
  const schedule = createEmptyHoursSchedule();
  if (!hours || typeof hours !== 'object' || Array.isArray(hours)) return schedule;
  for (const [key, value] of Object.entries(hours)) {
    const indexes = dayIndexesForKey(key);
    if (!indexes.length) {
      schedule.notes.push({ label: String(key), value: String(value ?? '') });
      continue;
    }
    const parsed = parseHoursValue(value);
    for (const index of indexes) schedule.days[HOURS_DAYS[index]] = structuredClone(parsed);
  }
  return schedule;
}

function formatTime(value) {
  const match = String(value ?? '').match(/^(\d{2}):(\d{2})$/);
  if (!match) return '';
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return '';
  const period = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${period}`;
}

function valueForDay(config) {
  if (config?.mode === 'closed') return 'Closed';
  if (config?.mode === 'always') return 'Open 24 hours';
  if (config?.mode === 'note') return String(config.note ?? '').trim();
  if (config?.mode !== 'custom') return '';
  const ranges = (Array.isArray(config.slots) ? config.slots : [])
    .map((slot) => [formatTime(slot.open), formatTime(slot.close)])
    .filter(([open, close]) => open && close)
    .map(([open, close]) => `${open}–${close}`);
  return ranges.join('; ');
}

/** Serialize the editor model back into the legacy JSON map of readable strings. */
export function serializeHoursSchedule(schedule) {
  const result = {};
  const dayValues = HOURS_DAYS.map((day) => valueForDay(schedule?.days?.[day]));
  const nonempty = dayValues.filter(Boolean);
  if (nonempty.length === HOURS_DAYS.length && nonempty.every((value) => value === nonempty[0])) {
    result['Every day'] = nonempty[0];
  } else {
    const weekdayValues = dayValues.slice(0, 5);
    const weekdaysSame = weekdayValues[0] && weekdayValues.every((value) => value === weekdayValues[0]);
    if (weekdaysSame) result['Mon–Fri'] = weekdayValues[0];
    else weekdayValues.forEach((value, index) => { if (value) result[HOURS_DAYS[index]] = value; });

    if (dayValues[5] && dayValues[5] === dayValues[6]) result['Sat–Sun'] = dayValues[5];
    else {
      if (dayValues[5]) result.Saturday = dayValues[5];
      if (dayValues[6]) result.Sunday = dayValues[6];
    }
  }

  for (const note of schedule?.notes ?? []) {
    const label = String(note?.label ?? '').trim().slice(0, 80);
    const value = String(note?.value ?? '').trim().slice(0, 240);
    if (label && value && !(label in result)) result[label] = value;
  }
  return result;
}
