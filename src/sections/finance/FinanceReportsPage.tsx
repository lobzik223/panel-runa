import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import styles from '../Section.module.css';
import { FinancePeriodToolbar } from './FinancePeriodToolbar';
import {
  fetchFinanceReports,
  generateFinanceReport,
  type FinancePeriod,
} from '@/lib/financeApi';
import { adminRequest } from '@/lib/adminApi';

export function FinanceReportsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [period, setPeriod] = useState<FinancePeriod>('month');
  const [reports, setReports] = useState<Awaited<ReturnType<typeof fetchFinanceReports>>['reports']>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
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

  const handleDownload = async (path: string, id: string) => {
    try {
      const apiPath = path.startsWith('http') ? path : `/admin/finance/reports/${id}/download`;
      const res = await adminRequest(apiPath);
      if (!res.ok) throw new Error(`Ошибка ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `seepromnt-report-${id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <section className={styles.section}>
      <h1 className={`${styles.title} ${isDark ? styles.titleDark : ''}`}>PDF-отчёты</h1>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        Сводка по выручке, ИИ, аудитории и отмеченным заметкам. Не более 10 генераций в час на аккаунт.
      </p>

      <FinancePeriodToolbar period={period} onChange={setPeriod} />

      <div style={{ marginBottom: 24 }}>
        <button type="button" disabled={generating} onClick={() => void handleGenerate()}>
          {generating ? 'Генерация…' : 'Сгенерировать PDF'}
        </button>
      </div>

      {error ? <p role="alert">{error}</p> : null}

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
                    <button type="button" onClick={() => void handleDownload(r.downloadUrl, r.id)}>
                      Скачать
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4}>Отчётов пока нет</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
