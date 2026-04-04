import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  fetchSiteReviews,
  patchSiteReview,
  deleteSiteReview,
  type SiteReviewAdminDto,
  type SiteReviewFilter,
} from '@/lib/adminApi';
import styles from './Section.module.css';
import pageStyles from './ReviewsPage.module.css';

const FILTER_TABS: { id: SiteReviewFilter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'demo', label: 'Демо (на сайте)' },
  { id: 'user', label: 'От пользователей' },
];

export function ReviewsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [filter, setFilter] = useState<SiteReviewFilter>('all');
  const [reviews, setReviews] = useState<SiteReviewAdminDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { reviews: rows } = await fetchSiteReviews(filter);
      setReviews(rows);
    } catch (e) {
      setReviews([]);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleApproved = async (id: string, approved: boolean) => {
    setActionId(id);
    try {
      const { review } = await patchSiteReview(id, { approved });
      setReviews((prev) => prev.map((r) => (r.id === id ? review : r)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionId(null);
    }
  };

  const removeReview = async (id: string) => {
    if (!window.confirm('Удалить отзыв навсегда из базы? Это действие нельзя отменить.')) return;
    setDeleteId(id);
    setError(null);
    try {
      await deleteSiteReview(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <section className={styles.section}>
      <h2 className={`${styles.title} ${isDark ? styles.titleDark : ''}`}>Отзывы с сайта</h2>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        Демо создаются миграцией бэкенда. Отзывы пользователей приходят с формы «Оставить отзыв» на лендинге. Галочка
        «Показывать на сайте» — публикация в карусели.
      </p>

      <div className={pageStyles.tabs}>
        {FILTER_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`${pageStyles.tab} ${filter === t.id ? pageStyles.tabActive : ''} ${isDark ? pageStyles.tabDark : ''}`}
            onClick={() => setFilter(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>Загрузка…</p>
      ) : error ? (
        <p className={pageStyles.errorText}>{error}</p>
      ) : reviews.length === 0 ? (
        <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>Нет записей.</p>
      ) : (
        <ul className={pageStyles.list}>
          {reviews.map((r) => (
            <li
              key={r.id}
              className={`${pageStyles.card} ${isDark ? pageStyles.cardDark : ''}`}
            >
              <div className={pageStyles.cardTop}>
                <div className={pageStyles.badges}>
                  {r.isDemo ? (
                    <span className={pageStyles.badgeDemo}>Демо</span>
                  ) : (
                    <span className={pageStyles.badgeUser}>Пользователь</span>
                  )}
                  {r.approved ? (
                    <span className={pageStyles.badgeOk}>На сайте</span>
                  ) : (
                    <span className={pageStyles.badgeOff}>Скрыт</span>
                  )}
                </div>
                <div className={pageStyles.cardActions}>
                  <label className={pageStyles.checkRow}>
                    <input
                      type="checkbox"
                      checked={r.approved}
                      disabled={actionId === r.id}
                      onChange={(e) => void toggleApproved(r.id, e.target.checked)}
                    />
                    <span>Показывать на сайте</span>
                  </label>
                  <button
                    type="button"
                    className={`${pageStyles.deleteBtn} ${isDark ? pageStyles.deleteBtnDark : ''}`}
                    disabled={deleteId === r.id || actionId === r.id}
                    onClick={() => void removeReview(r.id)}
                  >
                    {deleteId === r.id ? 'Удаление…' : 'Удалить навсегда'}
                  </button>
                </div>
              </div>
              <p className={pageStyles.body}>&ldquo;{r.body}&rdquo;</p>
              <div className={pageStyles.meta}>
                <span className={pageStyles.author}>
                  {r.firstName} {r.lastName}
                  {r.roleLabel ? ` · ${r.roleLabel}` : ''}
                </span>
                {!r.isDemo ? (
                  <span className={pageStyles.email}>{r.email}</span>
                ) : (
                  <span className={pageStyles.emailMuted}>демо-данные</span>
                )}
                <span className={pageStyles.date}>
                  {new Date(r.createdAt).toLocaleString('ru-RU')}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
