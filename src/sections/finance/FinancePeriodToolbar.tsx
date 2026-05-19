import { useTheme } from '@/contexts/ThemeContext';
import type { FinancePeriod } from '@/lib/financeApi';
import fc from './Finance.module.css';

const LABELS: Record<FinancePeriod, string> = {
  day: 'День',
  week: 'Неделя',
  month: 'Месяц',
};

export function FinancePeriodToolbar({
  period,
  onChange,
}: {
  period: FinancePeriod;
  onChange: (p: FinancePeriod) => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <div className={fc.periodRow}>
      <span className={`${fc.periodLabel} ${isDark ? fc.periodLabelDark : ''}`}>Период:</span>
      <select
        className={`${fc.periodSelect} ${isDark ? fc.periodSelectDark : ''}`}
        value={period}
        onChange={(e) => onChange(e.target.value as FinancePeriod)}
      >
        {(Object.keys(LABELS) as FinancePeriod[]).map((k) => (
          <option key={k} value={k}>
            {LABELS[k]}
          </option>
        ))}
      </select>
    </div>
  );
}
