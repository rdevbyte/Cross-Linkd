import {
  HOURS_DAYS,
  HOURS_PRESETS,
  createEmptyHoursSchedule,
  parseHoursSchedule,
  serializeHoursSchedule,
} from '@/lib/hoursSchedule.mjs';

type TimeSlot = { open: string; close: string };
type DaySchedule = { mode: 'unspecified' | 'custom' | 'closed' | 'always' | 'note'; slots: TimeSlot[]; note: string };
type HoursSchedule = { days: Record<string, DaySchedule>; notes: Array<{ label: string; value: string }> };
const MAX_FRAMES_PER_DAY = 6;
const initialized = new WeakSet<HTMLElement>();

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function parseJson(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function stateFromRoot(root: HTMLElement): HoursSchedule {
  const hidden = root.querySelector<HTMLInputElement>('[data-hours-json]');
  return parseHoursSchedule(parseJson(hidden?.value || root.dataset.initialHours || '{}')) as HoursSchedule;
}

function readNotes(text: string): Array<{ label: string; value: string }> {
  const notes: Array<{ label: string; value: string }> = [];
  let untitled = 1;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const colon = line.indexOf(':');
    const label = colon > 0 ? line.slice(0, colon).trim() : (untitled === 1 ? 'Schedule note' : `Schedule note ${untitled}`);
    const value = colon > 0 ? line.slice(colon + 1).trim() : line;
    if (label && value) {
      notes.push({ label, value });
      untitled++;
    }
  }
  return notes;
}

function notesText(notes: Array<{ label: string; value: string }>): string {
  return notes.map(({ label, value }) => `${label}: ${value}`).join('\n');
}

function syncHidden(root: HTMLElement, schedule: HoursSchedule) {
  const hidden = root.querySelector<HTMLInputElement>('[data-hours-json]');
  if (hidden) hidden.value = JSON.stringify(serializeHoursSchedule(schedule));
}

function buildSlotRow(day: string, index: number, slot: TimeSlot): HTMLElement {
  const row = element('div', 'rounded-xl border p-3');
  row.dataset.hoursSlot = '';
  row.dataset.slotIndex = String(index);
  row.style.borderColor = 'var(--border)';
  row.style.background = 'var(--surface)';

  const timeGrid = element('div', 'grid grid-cols-1 items-end gap-2 sm:grid-cols-2 sm:gap-3');
  for (const [field, label, value] of [['open', 'Opens', slot.open], ['close', 'Closes', slot.close]] as const) {
    const labelNode = element('label', 'min-w-0 text-xs font-medium', label);
    const input = element('input', 'input mt-1 min-w-0 w-full !px-3 !py-2 text-base');
    input.type = 'time';
    input.value = value;
    input.style.boxSizing = 'border-box';
    input.style.fontVariantNumeric = 'tabular-nums';
    input.dataset.slotField = field;
    input.setAttribute('aria-label', `${day} ${label.toLowerCase()} time, time frame ${index + 1}`);
    labelNode.append(input);
    timeGrid.append(labelNode);
  }
  const remove = element('button', 'btn btn-ghost col-span-1 justify-self-end !min-h-10 !px-3 !py-2 text-xs sm:col-span-2', 'Remove');
  remove.type = 'button';
  remove.dataset.hoursAction = 'remove-slot';
  remove.dataset.day = day;
  remove.dataset.slotIndex = String(index);
  remove.setAttribute('aria-label', `Remove time frame ${index + 1} for ${day}`);
  remove.style.color = 'var(--accent)';
  timeGrid.append(remove);
  row.append(timeGrid);

  const copyDetails = element('details', 'mt-2');
  const summary = element('summary', 'cursor-pointer select-none text-xs font-medium', 'Copy this time frame to…');
  summary.style.color = 'var(--teal)';
  copyDetails.append(summary);
  const copyPanel = element('div', 'mt-2 rounded-lg border p-2');
  copyPanel.style.borderColor = 'var(--border)';
  copyPanel.style.background = 'var(--surface-2)';
  const quickSelect = element('div', 'flex flex-wrap gap-1.5');
  for (const [value, label] of [['weekdays', 'Weekdays'], ['weekend', 'Weekend'], ['all', 'All days'], ['clear', 'Clear']] as const) {
    const button = element('button', 'btn btn-ghost !min-h-8 !px-2 !py-1 text-[11px]', label);
    button.type = 'button';
    button.dataset.hoursAction = 'select-copy-days';
    button.dataset.copyGroup = value;
    quickSelect.append(button);
  }
  copyPanel.append(quickSelect);
  const dayChecks = element('div', 'mt-2 grid grid-cols-2 gap-x-2 gap-y-1 sm:grid-cols-3');
  for (const targetDay of HOURS_DAYS) {
    if (targetDay === day) continue;
    const label = element('label', 'flex items-center gap-1.5 py-1 text-xs');
    const checkbox = element('input', 'h-4 w-4 accent-[var(--teal)]');
    checkbox.type = 'checkbox';
    checkbox.value = targetDay;
    checkbox.dataset.copyTarget = '';
    label.append(checkbox, document.createTextNode(targetDay.slice(0, 3)));
    dayChecks.append(label);
  }
  copyPanel.append(dayChecks);
  const copyButton = element('button', 'btn btn-secondary mt-2 !min-h-9 !w-full !px-3 !py-1.5 !text-xs', 'Copy to selected days');
  copyButton.type = 'button';
  copyButton.dataset.hoursAction = 'copy-slot';
  copyButton.dataset.day = day;
  copyButton.dataset.slotIndex = String(index);
  copyDetails.append(copyPanel, copyButton);
  row.append(copyDetails);
  return row;
}

function daySummary(config: DaySchedule): string {
  if (config.mode === 'closed') return 'Closed';
  if (config.mode === 'always') return 'Open 24 hours';
  if (config.mode === 'note') return config.note || 'Schedule note';
  if (config.mode === 'custom') {
    const count = config.slots.filter((slot) => slot.open && slot.close).length;
    return count ? `${count} time frame${count === 1 ? '' : 's'}` : 'Add opening and closing times';
  }
  return 'Not listed';
}

function buildDayCard(schedule: HoursSchedule, day: string): HTMLElement {
  const config = schedule.days[day] as DaySchedule;
  const card = element('section', 'min-w-0 rounded-xl border p-3 sm:p-4');
  card.dataset.hoursDay = day;
  card.style.borderColor = 'var(--border)';
  card.style.background = 'var(--surface)';

  const header = element('div', 'flex items-start justify-between gap-2');
  const titleWrap = element('div', 'min-w-0');
  titleWrap.append(element('h4', 'text-sm font-semibold', day));
  const summary = element('p', 'mt-0.5 text-xs', daySummary(config));
  summary.dataset.hoursDaySummary = '';
  summary.style.color = 'var(--text-mute)';
  titleWrap.append(summary);
  const clear = element('button', 'btn btn-ghost shrink-0 !min-h-8 !px-2 !py-1 text-[11px]', 'Clear');
  clear.type = 'button';
  clear.dataset.hoursAction = 'clear-day';
  clear.dataset.day = day;
  clear.setAttribute('aria-label', `Clear hours for ${day}`);
  header.append(titleWrap, clear);
  card.append(header);

  const modeLabel = element('label', 'mt-3 block text-xs font-medium', `${day} schedule`);
  const modeSelect = element('select', 'input mt-1 w-full !py-2 text-xs');
  modeSelect.dataset.dayMode = '';
  modeSelect.setAttribute('aria-label', `${day} schedule type`);
  for (const [value, label] of [
    ['unspecified', 'Not listed'],
    ['custom', 'Custom opening hours'],
    ['closed', 'Closed'],
    ['always', 'Open 24 hours'],
    ['note', 'Schedule note'],
  ]) {
    const option = element('option', '', label);
    option.value = value;
    modeSelect.append(option);
  }
  modeSelect.value = config.mode;
  modeLabel.append(modeSelect);
  card.append(modeLabel);

  const slotsPanel = element('div', 'mt-3 space-y-2');
  slotsPanel.dataset.hoursSlotsPanel = '';
  slotsPanel.hidden = config.mode !== 'custom';
  const slotsList = element('div', 'space-y-2');
  slotsList.dataset.hoursSlotList = '';
  config.slots.forEach((slot, index) => slotsList.append(buildSlotRow(day, index, slot)));
  slotsPanel.append(slotsList);
  const addSlot = element('button', 'btn btn-secondary !min-h-10 !w-full !px-3 !py-2 !text-xs', '+ Add time frame');
  addSlot.type = 'button';
  addSlot.dataset.hoursAction = 'add-slot';
  addSlot.dataset.day = day;
  addSlot.hidden = config.mode !== 'custom' || config.slots.length >= MAX_FRAMES_PER_DAY;
  slotsPanel.append(addSlot);
  card.append(slotsPanel);

  const notePanel = element('label', 'mt-3 block text-xs font-medium', 'Hours note');
  notePanel.dataset.hoursNotePanel = '';
  notePanel.hidden = config.mode !== 'note';
  const noteInput = element('input', 'input mt-1 w-full !py-2 text-sm');
  noteInput.type = 'text';
  noteInput.maxLength = 240;
  noteInput.value = config.note;
  noteInput.placeholder = 'e.g. By appointment';
  noteInput.dataset.dayNote = '';
  noteInput.setAttribute('aria-label', `${day} hours note`);
  notePanel.append(noteInput);
  card.append(notePanel);

  return card;
}

function render(root: HTMLElement, schedule: HoursSchedule) {
  const daysContainer = root.querySelector<HTMLElement>('[data-hours-days]');
  const notesField = root.querySelector<HTMLTextAreaElement>('[data-hours-notes]');
  if (!daysContainer || !notesField) return;
  daysContainer.replaceChildren(...HOURS_DAYS.map((day) => buildDayCard(schedule, day)));
  notesField.value = notesText(schedule.notes);
  syncHidden(root, schedule);
}

function announce(root: HTMLElement, message: string) {
  const status = root.querySelector<HTMLElement>('[data-hours-status]');
  if (status) status.textContent = message;
}

function load(root: HTMLElement) {
  const schedule = stateFromRoot(root) as HoursSchedule;
  root.dataset.hoursModel = JSON.stringify(schedule);
  render(root, schedule);
}

function getModel(root: HTMLElement): HoursSchedule {
  try {
    return JSON.parse(root.dataset.hoursModel ?? '') as HoursSchedule;
  } catch {
    return createEmptyHoursSchedule() as HoursSchedule;
  }
}

function update(root: HTMLElement, callback: (schedule: HoursSchedule) => void) {
  const schedule = getModel(root);
  callback(schedule);
  root.dataset.hoursModel = JSON.stringify(schedule);
  syncHidden(root, schedule);
}

function refreshDay(root: HTMLElement, day: string) {
  const schedule = getModel(root);
  const previous = root.querySelector<HTMLElement>(`[data-hours-day="${day}"]`);
  if (!previous) return;
  previous.replaceWith(buildDayCard(schedule, day));
  announce(root, `${day} hours updated.`);
}

function defaultSlot(existingCount: number): TimeSlot {
  return existingCount === 0 ? { open: '09:00', close: '17:00' } : { open: '', close: '' };
}

function init(root: HTMLElement) {
  if (initialized.has(root)) return;
  initialized.add(root);
  load(root);

  root.addEventListener('hours-schedule-load', () => load(root));
  root.closest('form')?.addEventListener('reset', () => window.setTimeout(() => load(root), 0));

  root.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    if (target.matches('[data-slot-field]')) {
      const dayCard = target.closest<HTMLElement>('[data-hours-day]');
      const slotRow = target.closest<HTMLElement>('[data-hours-slot]');
      const day = dayCard?.dataset.hoursDay;
      const index = Number(slotRow?.dataset.slotIndex);
      if (!day || !Number.isInteger(index)) return;
      update(root, (schedule) => {
        const slot = schedule.days[day]?.slots[index];
        if (slot) slot[target.dataset.slotField === 'open' ? 'open' : 'close'] = target.value;
      });
      const summary = dayCard?.querySelector<HTMLElement>('[data-hours-day-summary]');
      if (summary && day) summary.textContent = daySummary(getModel(root).days[day]);
      return;
    }
    if (target.matches('[data-day-note]')) {
      const day = target.closest<HTMLElement>('[data-hours-day]')?.dataset.hoursDay;
      if (!day) return;
      update(root, (schedule) => { schedule.days[day].note = target.value; });
      return;
    }
    if (target.matches('[data-hours-notes]')) {
      update(root, (schedule) => { schedule.notes = readNotes(target.value); });
    }
  });

  root.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement) || !target.matches('[data-day-mode]')) return;
    const day = target.closest<HTMLElement>('[data-hours-day]')?.dataset.hoursDay;
    if (!day) return;
    update(root, (schedule) => {
      const config = schedule.days[day];
      config.mode = target.value as DaySchedule['mode'];
      if (config.mode === 'custom' && config.slots.length === 0) config.slots.push(defaultSlot(0));
    });
    refreshDay(root, day);
  });

  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest<HTMLButtonElement>('[data-hours-action]');
    if (!button || !root.contains(button)) return;
    const action = button.dataset.hoursAction;
    const day = button.dataset.day;

    if (action === 'apply-preset') {
      const selector = root.querySelector<HTMLSelectElement>('[data-hours-preset]');
      const preset = selector?.value as keyof typeof HOURS_PRESETS | '';
      if (!preset || !(preset in HOURS_PRESETS)) return;
      const hasExisting = Object.values(getModel(root).days).some((config) => config.mode !== 'unspecified') || getModel(root).notes.length > 0;
      if (hasExisting && !window.confirm('Apply this preset and replace the current weekly schedule?')) return;
      const schedule = parseHoursSchedule(HOURS_PRESETS[preset]) as HoursSchedule;
      root.dataset.hoursModel = JSON.stringify(schedule);
      render(root, schedule);
      if (selector) selector.value = '';
      announce(root, 'Preset applied. You can now customize each day.');
      return;
    }

    if (action === 'select-copy-days') {
      const details = button.closest('details');
      const group = button.dataset.copyGroup;
      details?.querySelectorAll<HTMLInputElement>('[data-copy-target]').forEach((checkbox) => {
        const index = HOURS_DAYS.indexOf(checkbox.value);
        checkbox.checked = group === 'clear' ? false
          : group === 'all' ? true
            : group === 'weekdays' ? index >= 0 && index < 5
              : group === 'weekend' ? index === 5 || index === 6 : false;
      });
      return;
    }

    if (action === 'add-slot' && day) {
      const config = getModel(root).days[day];
      if (!config || config.slots.length >= MAX_FRAMES_PER_DAY) return;
      update(root, (schedule) => {
        const current = schedule.days[day];
        current.mode = 'custom';
        current.slots.push(defaultSlot(current.slots.length));
      });
      refreshDay(root, day);
      return;
    }

    if (action === 'remove-slot' && day) {
      const index = Number(button.dataset.slotIndex);
      update(root, (schedule) => {
        const config = schedule.days[day];
        if (!config) return;
        config.slots.splice(index, 1);
        if (config.slots.length === 0) config.mode = 'unspecified';
      });
      refreshDay(root, day);
      return;
    }

    if (action === 'clear-day' && day) {
      update(root, (schedule) => { schedule.days[day] = { mode: 'unspecified', slots: [], note: '' }; });
      refreshDay(root, day);
      return;
    }

    if (action === 'copy-slot' && day) {
      const slotIndex = Number(button.dataset.slotIndex);
      const sourceRow = button.closest('[data-hours-slot]');
      const open = sourceRow?.querySelector<HTMLInputElement>('[data-slot-field="open"]')?.value ?? '';
      const close = sourceRow?.querySelector<HTMLInputElement>('[data-slot-field="close"]')?.value ?? '';
      if (!open || !close) {
        announce(root, 'Enter both opening and closing times before copying this time frame.');
        return;
      }
      const selectedDays = Array.from(button.closest('details')?.querySelectorAll<HTMLInputElement>('[data-copy-target]:checked') ?? []).map((checkbox) => checkbox.value);
      if (!selectedDays.length) {
        announce(root, 'Select one or more days to copy this time frame to.');
        return;
      }
      let copied = 0;
      let skipped = 0;
      update(root, (schedule) => {
        for (const targetDay of selectedDays) {
          const config = schedule.days[targetDay];
          if (!config || config.slots.length >= MAX_FRAMES_PER_DAY) { skipped++; continue; }
          config.mode = 'custom';
          config.slots.push({ open, close });
          copied++;
        }
      });
      for (const targetDay of selectedDays) refreshDay(root, targetDay);
      const details = button.closest('details');
      details?.removeAttribute('open');
      const message = copied ? `Time frame copied to ${copied} day${copied === 1 ? '' : 's'}.${skipped ? ` ${skipped} day${skipped === 1 ? '' : 's'} already have the maximum ${MAX_FRAMES_PER_DAY} time frames.` : ''}`
        : `No time frames copied. A day can have up to ${MAX_FRAMES_PER_DAY}.`;
      announce(root, message);
      return;
    }
  });
}

export function initHoursEditors() {
  document.querySelectorAll<HTMLElement>('[data-hours-editor]').forEach(init);
}

/** Load an owner listing's saved hours into the interactive editor. */
export function setHoursSchedule(form: HTMLFormElement, hours: unknown) {
  const editor = form.querySelector<HTMLElement>('[data-hours-editor]');
  const hidden = editor?.querySelector<HTMLInputElement>('[data-hours-json]');
  if (!editor || !hidden) return;
  hidden.value = JSON.stringify(hours && typeof hours === 'object' && !Array.isArray(hours) ? hours : {});
  editor.dispatchEvent(new Event('hours-schedule-load'));
}

/** Read the editor's backward-compatible Record<string,string> payload. */
export function readHoursSchedule(form: HTMLFormElement): Record<string, string> {
  const raw = form.querySelector<HTMLInputElement>('[data-hours-json]')?.value ?? '{}';
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}
