export type DetectedPixKeyType = "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "EVP";

export function detectPixKeyType(input: string): DetectedPixKeyType | null {
  const value = input.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "EMAIL";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return "EVP";
  if (!/^[\d\s()+.\-/]+$/.test(value)) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 14) return "CNPJ";
  if (digits.length === 11 && !/^(\d)\1+$/.test(digits)) {
    const check = (length: number) => {
      const sum = digits.slice(0, length).split("").reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
      const remainder = (sum * 10) % 11;
      return (remainder === 10 ? 0 : remainder) === Number(digits[length]);
    };
    if (!value.startsWith("+") && !value.includes("(") && check(9) && check(10)) return "CPF";
  }
  if ((digits.length === 10 || digits.length === 11) || ((digits.length === 12 || digits.length === 13) && digits.startsWith("55"))) return "PHONE";
  return null;
}
