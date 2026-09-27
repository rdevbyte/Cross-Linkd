export function onlineToggleState(checked: boolean): {
  mode: 'on' | 'off';
  activeId: 'online-on-label' | 'online-off-label';
  inactiveId: 'online-on-label' | 'online-off-label';
  message: string;
  formValue: '1' | '';
};
