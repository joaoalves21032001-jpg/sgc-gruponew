export function maskCPF(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskCNPJ(value: string): string {
  // Accepted format: AA.AAA.AAA/AAAA-DD
  // Remove any character that is not alphanumeric (A-Z, a-z, 0-9)
  let cleanValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 14);
  
  // Format as AA.AAA.AAA/AAAA-DD
  if (cleanValue.length > 12) {
    cleanValue = cleanValue.replace(/^(.{2})(.{3})(.{3})(.{4})(.{2})$/, '$1.$2.$3/$4-$5');
  } else if (cleanValue.length > 8) {
    cleanValue = cleanValue.replace(/^(.{2})(.{3})(.{3})(.{1,4})$/, '$1.$2.$3/$4');
  } else if (cleanValue.length > 5) {
    cleanValue = cleanValue.replace(/^(.{2})(.{3})(.{1,3})$/, '$1.$2.$3');
  } else if (cleanValue.length > 2) {
    cleanValue = cleanValue.replace(/^(.{2})(.{1,3})$/, '$1.$2');
  }
  
  return cleanValue;
}

export function maskRG(value: string): string {
  // RG format varies by state: allow alphanumeric, flexible length (7-14 chars)
  // Just clean and allow free-form entry
  return value.replace(/[^a-zA-Z0-9.\-\/]/g, '').slice(0, 20);
}

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function maskCurrency(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  const formatted = (num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return formatted;
}

export function unmaskCurrency(value: string): number {
  const digits = value.replace(/\D/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}

export function formatCurrencyDisplay(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function unmask(value: string): string {
  return value.replace(/\D/g, '');
}
