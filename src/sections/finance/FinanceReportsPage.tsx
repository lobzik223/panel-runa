import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import styles from '../Section.module.css';
import fc from './Finance.module.css';
import { FinancePeriodToolbar } from './FinancePeriodToolbar';
import {
  downloadFinanceReport,
  fetchFinanceReports,
  generateFinanceReport,
  type FinancePeriod,
} from '@/lib/financeApi';

export function FinanceReportsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [period, setPeriod] = useState<FinancePeriod>('month');
  const [reports, setReports] = useState<Awaited<ReturnType<typeof fetchFinanceReports>>['reports']>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchFinanceReports();
      setReports(r.reports);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      await generateFinanceReport(period);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (id: string) => {
    setDownloadingId(id);
    setError(null);
    try {
      const blob = await downloadFinanceReport(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `seepromnt-report-${id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <section className={styles.section}>
      <h1 className={`${styles.title} ${isDark ? styles.titleDark : ''}`}>PDF-отчёты</h1>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        Сводка по выручке, ИИ, аудитории и заметкам с флагом «в отчёт». Не более 10 генераций в час на аккаунт.
      </p>

      <div className={`${fc.toolbar} ${isDark ? fc.toolbarDark : ''}`}>
        <FinancePeriodToolbar period={period} onChange={setPeriod} />
        <button
          type="button"
          className={fc.primaryBtn}
          disabled={generating}
          onClick={() => void handleGenerate()}
        >
          {generating ? 'Генерация…' : 'Сгенерировать PDF'}
        </button>
      </div>

      {error ? (
        <p className={`${fc.alertError} ${isDark ? fc.alertErrorDark : ''}`} role="alert">
          {error}
        </p>
      ) : null}

      <div className={`${styles.tableWrap} ${isDark ? styles.tableWrapDark : ''}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Дата</th>
              <th>Период</th>
              <th>Автор</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4}>Загрузка…</td>
              </tr>
            ) : reports.length ? (
              reports.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.createdAt).toLocaleString('ru-RU')}</td>
                  <td>
                    {new Date(r.periodFrom).toLocaleDateString('ru-RU')} —{' '}
                    {new Date(r.periodTo).toLocaleDateString('ru-RU')}
                  </td>
                  <td>{r.authorName}</td>
                  <td>
                    <button
                      type="button"
                      className={fc.linkBtn}
                      disabled={downloadingId === r.id}
                      onClick={() => void handleDownload(r.id)}
                    >
                      {downloadingId === r.id ? 'Скачивание…' : 'Скачать'}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4}>Отчётов пока нет — нажмите «Сгенерировать PDF»</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
