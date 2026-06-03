import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  DEFAULT_FINANCE_REPORT_SECTIONS,
  type FinancePeriod,
  type FinanceReportSections,
} from '@/lib/financeApi';
import fc from './Finance.module.css';

const PERIOD_LABELS: Record<FinancePeriod, string> = {
  day: 'За последние сутки',
  week: 'За последние 7 дней',
  month: 'За последний месяц',
};

const SECTION_OPTIONS: { key: keyof FinanceReportSections; label: string; hint?: string }[] = [
  { key: 'realPayments', label: 'Реальные оплаты (ЮKassa, магазины)' },
  {
    key: 'panelGrants',
    label: 'Выдачи с панели (0 ₽, отдельным блоком)',
  },
  { key: 'newUsers', label: 'Новые пользователи за выбранный период' },
  { key: 'usersChart', label: 'График регистраций по дням в PDF' },
  {
    key: 'usersPeriodCompare',
    label: 'Сравнение: день / неделя / месяц (цифры)',
    hint: 'Три строки с приростом регистраций от даты отчёта',
  },
  { key: 'aiCosts', label: 'Расходы ИИ и слайды по тарифам' },
  { key: 'audience', label: 'Воронка и конверсия' },
  { key: 'notes', label: 'Заметки с флагом «в отчёт»' },
];

export function ReportGenerateModal({
  open,
  generating,
  onClose,
  onSubmit,
}: {
  open: boolean;
  generating: boolean;
  onClose: () => void;
  onSubmit: (period: FinancePeriod, sections: FinanceReportSections) => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [period, setPeriod] = useState<FinancePeriod>('month');
  const [sections, setSections] = useState<FinanceReportSections>({
    ...DEFAULT_FINANCE_REPORT_SECTIONS,
  });

  if (!open) return null;

  const toggle = (key: keyof FinanceReportSections) => {
    setSections((s) => ({ ...s, [key]: !s[key] }));
  };

  const hasAny = Object.values(sections).some(Boolean);

  return (
    <div className={fc.modalOverlay} role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className={`${fc.modalCard} ${isDark ? fc.modalCardDark : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={fc.modalHeader}>
          <h2 className={`${fc.modalTitle} ${isDark ? fc.modalTitleDark : ''}`}>Новый PDF-отчёт</h2>
          <button type="button" className={fc.modalClose} onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>

        <p className={`${fc.modalHint} ${isDark ? fc.modalHintDark : ''}`}>
          Выберите период и блоки данных. Реальные оплаты и выдачи с панели идут отдельно, чтобы выручка не
          искажалась. Файл хранится на сервере 24 часа, затем удаляется автоматически.
        </p>

        <div className={fc.modalSection}>
          <span className={`${fc.periodLabel} ${isDark ? fc.periodLabelDark : ''}`}>Период отчёта</span>
          <div className={fc.periodChips}>
            {(Object.keys(PERIOD_LABELS) as FinancePeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                className={`${fc.periodChip} ${period === p ? fc.periodChipActive : ''} ${isDark ? fc.periodChipDark : ''}`}
                onClick={() => setPeriod(p)}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        <div className={fc.modalSection}>
          <span className={`${fc.periodLabel} ${isDark ? fc.periodLabelDark : ''}`}>Что включить в PDF</span>
          <ul className={fc.checkList}>
            {SECTION_OPTIONS.map((opt) => (
              <li key={opt.key}>
                <label className={fc.checkRow}>
                  <input
                    type="checkbox"
                    checked={sections[opt.key]}
                    onChange={() => toggle(opt.key)}
                  />
                  <span>
                    {opt.label}
                    {opt.hint ? (
                      <span className={`${fc.checkHint} ${isDark ? fc.checkHintDark : ''}`}> — {opt.hint}</span>
                    ) : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className={fc.modalActions}>
          <button type="button" className={fc.ghostBtn} disabled={generating} onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className={fc.primaryBtn}
            disabled={generating || !hasAny}
            onClick={() => onSubmit(period, sections)}
          >
            {generating ? 'Генерация…' : 'Сгенерировать PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
