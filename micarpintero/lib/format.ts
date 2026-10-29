const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const currencyCents = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
const integer = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

export const formatMoney = (value: number): string => currency.format(value);
export const formatMoneyCents = (value: number): string => currencyCents.format(value);
export const formatMm = (value: number): string => `${integer.format(Math.round(value))} mm`;
export const formatInt = (value: number): string => integer.format(value);
export const formatPercent = (ratio: number): string => `${Math.round(ratio * 100)} %`;
export const formatArea = (mm2: number): string => `${(mm2 / 1e6).toFixed(2)} m²`;

export const formatDuration = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number): string => n.toString().padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
};
