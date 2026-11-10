export function digitosTelefoneBrasil(value: string) {
  const digits = value.replace(/\D/g, '');
  return (digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits).slice(0, 11);
}
export function mascaraTelefoneBrasil(value: string) {
  const digits = digitosTelefoneBrasil(value);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  const subscriber = digits.slice(2);
  const cut = digits.length > 10 ? 5 : 4;
  return `(${digits.slice(0, 2)}) ${subscriber.length > cut ? subscriber.slice(0, cut) + '-' + subscriber.slice(cut) : subscriber}`;
}
