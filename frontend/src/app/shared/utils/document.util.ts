import { CountryCode } from '../../core/models/api.models';

const CPF_LENGTH = 11;
const CPF_SEPARATORS = /[.\-\s]/g;

export function stripDocumentSeparators(value: string): string {
  return value.replace(CPF_SEPARATORS, '');
}

export const DOCUMENT_MAX_LENGTH: Record<CountryCode, number> = { BO: 10, BR: 14 };

function cpfCheckDigit(digits: number[], length: number): number {
  const sum = digits
    .slice(0, length)
    .reduce((total, digit, index) => total + digit * (length + 1 - index), 0);
  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

function isValidCpf(value: string): boolean {
  const raw = stripDocumentSeparators(value);
  if (!/^\d+$/.test(raw) || raw.length !== CPF_LENGTH || /^(\d)\1+$/.test(raw)) return false;
  const digits = [...raw].map(Number);
  return cpfCheckDigit(digits, 9) === digits[9] && cpfCheckDigit(digits, 10) === digits[10];
}

export function isValidDocument(value: string, country: CountryCode): boolean {
  return country === 'BR' ? isValidCpf(value) : /^\d{5,10}$/.test(value);
}

export function formatDocument(value: string | null | undefined, country: CountryCode): string {
  if (!value) return '';
  const digits = stripDocumentSeparators(value);
  if (country === 'BR' && /^\d{11}$/.test(digits)) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  return value;
}
