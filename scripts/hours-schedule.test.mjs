import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { HOURS_DAYS, HOURS_PRESETS, parseHoursSchedule, serializeHoursSchedule } from '../src/lib/hoursSchedule.mjs';

const day = (mode, slots = [], note = '') => ({ mode, slots, note });

test('legacy presets expand into editable weekday, Saturday, and Sunday schedules', () => {
  const standard = parseHoursSchedule(HOURS_PRESETS.standard);
  for (const weekday of HOURS_DAYS.slice(0, 5)) {
    assert.deepEqual(standard.days[weekday], day('custom', [{ open: '09:00', close: '17:00' }]));
  }
  assert.equal(standard.days.Saturday.mode, 'closed');
  assert.equal(standard.days.Sunday.mode, 'closed');
  assert.deepEqual(serializeHoursSchedule(standard), {
    'Mon–Fri': '9:00 AM–5:00 PM',
    'Sat–Sun': 'Closed',
  });
});

test('legacy split shifts parse and serialize as multiple editable time frames', () => {
  const parsed = parseHoursSchedule({ Monday: '9a–12p; 1p–5p' });
  assert.deepEqual(parsed.days.Monday, day('custom', [
    { open: '09:00', close: '12:00' },
    { open: '13:00', close: '17:00' },
  ]));
  assert.deepEqual(serializeHoursSchedule(parsed), { Monday: '9:00 AM–12:00 PM; 1:00 PM–5:00 PM' });
});

test('grouped day keys expand, and custom day-specific schedules remain separate on save', () => {
  const parsed = parseHoursSchedule({
    'Monday–Friday': '8:30 AM to 4:30 PM',
    Saturday: '10:00 AM–2:00 PM',
    Sunday: 'Closed',
  });
  for (const weekday of HOURS_DAYS.slice(0, 5)) {
    assert.equal(parsed.days[weekday].slots[0].open, '08:30');
    assert.equal(parsed.days[weekday].slots[0].close, '16:30');
  }
  assert.deepEqual(serializeHoursSchedule(parsed), {
    'Mon–Fri': '8:30 AM–4:30 PM',
    Saturday: '10:00 AM–2:00 PM',
    Sunday: 'Closed',
  });
});

test('closed, 24-hour, appointment, and unknown legacy entries are retained', () => {
  const parsed = parseHoursSchedule({
    'Every day': 'Open 24 hours',
    'By appointment': 'Call or email to schedule',
    'Holiday information': 'Call before visiting',
  });
  assert.ok(HOURS_DAYS.every((weekday) => parsed.days[weekday].mode === 'always'));
  assert.deepEqual(serializeHoursSchedule(parsed), {
    'Every day': 'Open 24 hours',
    'By appointment': 'Call or email to schedule',
    'Holiday information': 'Call before visiting',
  });
});

test('unspecified days stay omitted and different weekend times do not get merged', () => {
  const parsed = parseHoursSchedule({ Saturday: '9a–1p', Sunday: '12p–4p' });
  assert.deepEqual(serializeHoursSchedule(parsed), {
    Saturday: '9:00 AM–1:00 PM',
    Sunday: '12:00 PM–4:00 PM',
  });
  assert.deepEqual(parseHoursSchedule({}), {
    days: Object.fromEntries(HOURS_DAYS.map((weekday) => [weekday, day('unspecified')])),
    notes: [],
  });
});

test('both listing forms use the flexible editor while keeping the existing hours record payload', async () => {
  const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
  const [component, script, createPage, dashboard, validation] = await Promise.all([
    read('src/components/HoursEditor.astro'),
    read('src/scripts/hoursEditor.ts'),
    read('src/pages/add-listing.astro'),
    read('src/pages/dashboard/listings.astro'),
    read('src/lib/validation.ts'),
  ]);
  assert.match(component, /data-hours-editor/);
  assert.match(component, /data-hours-preset/);
  assert.match(script, /input\.type = 'time'/);
  assert.match(script, /grid-cols-1 items-end gap-2 sm:grid-cols-2 sm:gap-3/);
  assert.match(script, /min-w-0 w-full !px-3 !py-2 text-base/);
  assert.match(script, /input\.style\.boxSizing = 'border-box'/);
  assert.match(script, /copy-slot/);
  assert.match(script, /remove-slot/);
  assert.match(script, /MAX_FRAMES_PER_DAY/);
  assert.match(createPage, /<HoursEditor id="add-listing-hours-editor" \/>/);
  assert.match(createPage, /JSON\.parse\(str\('hoursJson'\)\)/);
  assert.match(dashboard, /<HoursEditor id="dashboard-hours-editor" \/>/);
  assert.match(dashboard, /out\.hours = readHoursSchedule\(form\)/);
  assert.match(dashboard, /setHoursSchedule\(form, data\.hours\)/);
  assert.match(validation, /z\.record\(z\.string\(\)\.max\(80\), z\.string\(\)\.max\(240\)\)/);
});
