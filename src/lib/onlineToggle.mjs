/** Shared state for the Add Listing online-only toggle. */
export function onlineToggleState(checked) {
  const on = Boolean(checked);
  return {
    mode: on ? 'on' : 'off',
    activeId: on ? 'online-on-label' : 'online-off-label',
    inactiveId: on ? 'online-off-label' : 'online-on-label',
    message: on
      ? 'This listing is for online services only.'
      : 'This listing is for in-person services.',
    formValue: on ? '1' : '',
  };
}
