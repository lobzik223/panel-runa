import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import styles from '../Section.module.css';
import fc from './Finance.module.css';
import { ReportGenerateModal } from './ReportGenerateModal';
import {
  deleteFinanceReport,
  downloadFinanceReport,
  fetchFinanceReports,
  generateFinanceReport,
  type FinancePeriod,
  type FinanceReportSections,
} from '@/lib/financeApi';

function formatExpiresIn(ms: number): string {
  if (ms <= 0) return 'истёк';
  const h = Math.floor(ms / (60 * 60 * 1000));
  const m = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (h > 0) return `ещё ${h} ч ${m} мин`;
  return `ещё ${m} мин`;
}

export function FinanceReportsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [reports, setReports] = useState<Awaited<ReturnType<typeof fetchFinanceReports>>['reports']>([]);
  const [retentionHours, setRetentionHours] = useState(24);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchFinanceReports();
      setReports(r.reports);
      setRetentionHours(r.retentionHours ?? 24);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleGenerate = async (period: FinancePeriod, sections: FinanceReportSections) => {
    setGenerating(true);
    setError(null);
    try {
      await generateFinanceReport(period, sections);
      setModalOpen(false);
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

  const handleDelete = async (id: string) => {
    if (!window.confirm('Удалить этот отчёт с сервера?')) return;
    setDeletingId(id);
    setError(null);
    try {
      await deleteFinanceReport(id);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className={styles.section}>
      <h1 className={`${styles.title} ${isDark ? styles.titleDark : ''}`}>PDF-отчёты</h1>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        Сводка по выручке, выдачам с панели, новым пользователям и графику регистраций. При генерации выбираете
        период и блоки данных. Файлы хранятся {retentionHours} ч, затем удаляются автоматически. Не более 10 PDF в
        час на аккаунт. Финансовый аналитик может создавать и скачивать отчёты так же, как администратор.
      </p>

      <div className={`${fc.toolbar} ${isDark ? fc.toolbarDark : ''}`}>
        <button type="button" className={fc.primaryBtn} onClick={() => setModalOpen(true)}>
          Сгенерировать PDF
        </button>
      </div>

      {error ? (
        <p className={`${fc.alertError} ${isDark ? fc.alertErrorDark : ''}`} role="alert">
          {error}
        </p>
      ) : null}

      <ReportGenerateModal
        open={modalOpen}
        generating={generating}
        onClose={() => !generating && setModalOpen(false)}
        onSubmit={(period, sections) => void handleGenerate(period, sections)}
      />

      <div className={`${styles.tableWrap} ${isDark ? styles.tableWrapDark : ''}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Дата</th>
              <th>Период</th>
              <th>Автор</th>
              <th>Хранение</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5}>Загрузка…</td>
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
                    <span className={`${fc.expiresMuted} ${isDark ? fc.expiresMutedDark : ''}`}>
                      {formatExpiresIn(r.expiresInMs)}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      className={fc.linkBtn}
                      disabled={downloadingId === r.id || r.expiresInMs <= 0}
                      onClick={() => void handleDownload(r.id)}
                    >
                      {downloadingId === r.id ? '…' : 'Скачать'}
                    </button>
                    {' · '}
                    <button
                      type="button"
                      className={fc.linkBtnDanger}
                      disabled={deletingId === r.id}
                      onClick={() => void handleDelete(r.id)}
                    >
                      {deletingId === r.id ? '…' : 'Удалить'}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>Отчётов нет — нажмите «Сгенерировать PDF»</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
