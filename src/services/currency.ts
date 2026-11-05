/**
 * Indian Rupee formatting and Number-to-Words utility
 */

export function formatINR(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '₹0.00';
  return '₹' + Number(val).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatINRCompact(val: number): string {
  if (val >= 10000000) {
    return `₹${(val / 10000000).toFixed(2)} Cr`;
  }
  if (val >= 100000) {
    return `₹${(val / 100000).toFixed(2)} L`;
  }
  if (val >= 1000) {
    return `₹${(val / 1000).toFixed(1)} k`;
  }
  return formatINR(val);
}

export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertLessThanOneThousand(n: number): string {
  let str = '';
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)] + ' ';
    n %= 10;
  }
  if (n > 0) {
    str += ONES[n] + ' ';
  }
  return str.trim();
}

/**
 * Converts a numeric amount to Indian Currency Words (Lakhs, Crores)
 * e.g., 70800 -> "Seventy Thousand Eight Hundred Rupees Only"
 */
export function numberToIndianWords(amount: number): string {
  if (amount === 0) return 'Zero Rupees Only';

  const absolute = Math.abs(amount);
  const rupees = Math.floor(absolute);
  const paise = Math.round((absolute - rupees) * 100);

  let result = '';

  const crores = Math.floor(rupees / 10000000);
  let remainder = rupees % 10000000;

  const lakhs = Math.floor(remainder / 100000);
  remainder = remainder % 100000;

  const thousands = Math.floor(remainder / 1000);
  remainder = remainder % 1000;

  if (crores > 0) {
    result += convertLessThanOneThousand(crores) + ' Crore ';
  }
  if (lakhs > 0) {
    result += convertLessThanOneThousand(lakhs) + ' Lakh ';
  }
  if (thousands > 0) {
    result += convertLessThanOneThousand(thousands) + ' Thousand ';
  }
  if (remainder > 0) {
    result += convertLessThanOneThousand(remainder) + ' ';
  }

  result = result.trim() + ' Rupees';

  if (paise > 0) {
    result += ' and ' + convertLessThanOneThousand(paise) + ' Paise';
  }

  return result + ' Only';
}
