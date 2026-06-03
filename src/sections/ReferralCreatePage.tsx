import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { IconSearch } from '@/components/Icons';
import {
  createReferralPartner,
  deleteReferralPartner,
  fetchPanelDailyQuotas,
  fetchReferralPartners,
  type PanelDailyQuotas,
  type ReferralPartnerDto,
  type SitePlanName,
} from '@/lib/adminApi';
import { useAdminRole } from '@/hooks/useAdminRole';
import styles from './Section.module.css';
import s from './ReferralCreatePage.module.css';

const SOURCES = ['youtube', 'telegram', 'tiktok', 'other'] as const;
type Source = (typeof SOURCES)[number];

const SOURCE_LABELS: Record<Source, string> = {
  youtube: 'YouTube',
  telegram: 'Telegram',
  tiktok: 'TikTok',
  other: 'Другое',
};

const PLAN_OPTIONS: { id: SitePlanName; label: string; price: number }[] = [
  { id: 'Lite', label: 'Lite', price: 390 },
  { id: 'Pro', label: 'Pro', price: 1350 },
  { id: 'Business', label: 'Business', price: 2300 },
];

function suggestPromoCode(name: string): string {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-ZА-Я0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 12);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SEEP-${base || 'PARTNER'}-${suffix}`.slice(0, 64);
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Активен',
  paused: 'Приостановлен',
  moderation: 'На модерации',
};

function formatDateTimeRu(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function ReferralCreatePage() {
  const { theme } = useTheme();
  const { canEditReferralPartners, isFinanceAnalyst } = useAdminRole();
  const isDark = theme === 'dark';
  const dk = isDark ? ' ' + s.dk : '';

  const [partners, setPartners] = useState<ReferralPartnerDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quotas, setQuotas] = useState<PanelDailyQuotas | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<Source | 'all'>('all');
  const [selectedReferrer, setSelectedReferrer] = useState<ReferralPartnerDto | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSource, setFormSource] = useState<Source>('telegram');
  const [formChannel, setFormChannel] = useState('');
  const [formPromoCode, setFormPromoCode] = useState('');
  const [formDiscountRub, setFormDiscountRub] = useState(50);
  const [formPlans, setFormPlans] = useState<SitePlanName[]>(['Lite', 'Pro', 'Business']);
  const [formCampaign, setFormCampaign] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadPartners = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { partners: list } = await fetchReferralPartners();
      setPartners(list);
    } catch (e) {
      setError((e as Error).message);
      setPartners([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshQuotas = useCallback(async () => {
    if (!isFinanceAnalyst) return;
    try {
      setQuotas(await fetchPanelDailyQuotas());
    } catch {
      setQuotas(null);
    }
  }, [isFinanceAnalyst]);

  useEffect(() => {
    void loadPartners();
  }, [loadPartners]);

  useEffect(() => {
    void refreshQuotas();
  }, [refreshQuotas, partners.length]);

  const filteredReferrers = partners.filter((r) => {
    const src = r.source as Source;
    const matchSearch =
      !searchQuery.trim() ||
      r.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      (r.promoCode || '').toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      (SOURCE_LABELS[src] ?? r.source).toLowerCase().includes(searchQuery.trim().toLowerCase());
    const matchSource = sourceFilter === 'all' || r.source === sourceFilter;
    return matchSearch && matchSource;
  });

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);
    try {
      if (formPlans.length === 0) {
        setFormError('Выберите хотя бы один тариф для промокода');
        setFormSubmitting(false);
        return;
      }
      const { partner } = await createReferralPartner({
        name: formName.trim(),
        email: formEmail.trim(),
        source: formSource,
        channelLink: formChannel.trim(),
        rewardPercent: 0,
        campaign: formCampaign.trim(),
        promoCode: formPromoCode.trim(),
        discountRub: formDiscountRub,
        appliesToPlans: formPlans,
      });
      setPartners((prev) => [partner, ...prev]);
      setFormName('');
      setFormEmail('');
      setFormChannel('');
      setFormPromoCode('');
      setFormDiscountRub(50);
      setFormPlans(['Lite', 'Pro', 'Business']);
      setFormCampaign('');
      void refreshQuotas();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Удалить эту реферальную запись?')) return;
    setDeleteBusy(true);
    setError(null);
    try {
      await deleteReferralPartner(id);
      setPartners((prev) => prev.filter((p) => p.id !== id));
      setSelectedReferrer(null);
      void refreshQuotas();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleteBusy(false);
    }
  };

  const statusClass = (st: string) => {
    const label = statusLabel(st);
    if (label === 'Активен') return s.badgeGreen;
    if (label === 'Приостановлен') return s.badgeRed;
    return s.badgeOrange;
  };

  const sourceBadgeClass = (src: Source) => {
    if (src === 'youtube') return s.sourceYoutube;
    if (src === 'telegram') return s.sourceTelegram;
    if (src === 'tiktok') return s.sourceTiktok;
    return s.sourceOther;
  };

  const quotaHint =
    isFinanceAnalyst && quotas?.limits
      ? ` Лимиты в сутки: создать ${quotas.limits.referralLinkCreate.remaining}/${quotas.limits.referralLinkCreate.limit}, удалить ${quotas.limits.referralLinkDelete.remaining}/${quotas.limits.referralLinkDelete.limit} (пауза ${quotas.limits.referralLinkDelete.cooldownSec} с между удалениями).`
      : '';

  return (
    <section className={styles.section}>
      <h1 className={`${styles.title} ${isDark ? styles.titleDark : ''}`}>Реферальная система</h1>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        Создание записей реферальщиков и просмотр по источникам: YouTube, Telegram, TikTok и другие.
        {quotaHint}
      </p>

      {error ? (
        <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`} style={{ color: '#c0392b' }} role="alert">
          {error}
        </p>
      ) : null}

      <div className={`${s.createCard}${dk}`}>
        <h2 className={s.createCardTitle}>Создать реферальный аккаунт</h2>
        <p className={`${s.createCardDesc}${dk}`}>
          Промокод для сайта при оплате: скидка в рублях и тарифы, на которых он действует. По умолчанию — все
          тарифы.
        </p>
        {formError ? (
          <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`} style={{ color: '#c0392b' }} role="alert">
            {formError}
          </p>
        ) : null}
        <form onSubmit={(e) => void handleCreateAccount(e)} className={s.form}>
          <div className={s.formRow}>
            <label className={s.label}>Имя / название канала</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => {
                setFormName(e.target.value);
                if (!formPromoCode.trim() && e.target.value.trim().length >= 2) {
                  setFormPromoCode(suggestPromoCode(e.target.value));
                }
              }}
              placeholder="Например: Канал про продуктивность"
              className={`${s.input}${dk}`}
              required
            />
          </div>
          <div className={s.formRow}>
            <label className={s.label}>Email реферальщика</label>
            <input
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="partner@example.com"
              className={`${s.input}${dk}`}
              required
            />
          </div>
          <div className={s.formRow}>
            <label className={s.label}>Источник (виджет)</label>
            <select
              value={formSource}
              onChange={(e) => setFormSource(e.target.value as Source)}
              className={`${s.select}${dk}`}
            >
              {SOURCES.map((src) => (
                <option key={src} value={src}>
                  {SOURCE_LABELS[src]}
                </option>
              ))}
            </select>
          </div>
          <div className={s.formRow}>
            <label className={s.label}>Ссылка на канал / профиль</label>
            <input
              type="text"
              value={formChannel}
              onChange={(e) => setFormChannel(e.target.value)}
              placeholder="youtube.com/... или t.me/... или tiktok.com/..."
              className={`${s.input}${dk}`}
            />
          </div>
          <div className={s.formRow}>
            <label className={s.label}>Промокод (для сайта)</label>
            <div className={s.promoRow}>
              <input
                type="text"
                value={formPromoCode}
                onChange={(e) => setFormPromoCode(e.target.value.toUpperCase())}
                placeholder="SEEP-PARTNER-XXXX"
                className={`${s.input}${dk}`}
                required
                minLength={4}
              />
              <button
                type="button"
                className={`${s.genPromoBtn}${dk}`}
                onClick={() => setFormPromoCode(suggestPromoCode(formName || 'partner'))}
              >
                Сгенерировать
              </button>
            </div>
          </div>
          <div className={s.formRow}>
            <label className={s.label}>Скидка для клиента (₽)</label>
            <input
              type="number"
              min={0}
              max={2300}
              step={10}
              value={formDiscountRub}
              onChange={(e) => setFormDiscountRub(Math.max(0, Number(e.target.value)))}
              className={`${s.input} ${s.inputNarrow}${dk}`}
              required
            />
            <p className={`${s.fieldHint}${dk}`}>
              Вычитается из цены тарифа на сайте (минимум к оплате — 1 ₽).
            </p>
          </div>
          <div className={s.formRow}>
            <span className={s.label}>Действует на тарифы</span>
            <div className={s.planChips}>
              {PLAN_OPTIONS.map((p) => {
                const on = formPlans.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`${s.planChip} ${on ? s.planChipOn : ''}${dk}`}
                    onClick={() => {
                      setFormPlans((prev) =>
                        on ? prev.filter((x) => x !== p.id) : [...prev, p.id],
                      );
                    }}
                  >
                    {p.label} ({p.price} ₽)
                  </button>
                );
              })}
              <button
                type="button"
                className={`${s.planChip} ${formPlans.length === 3 ? s.planChipOn : ''}${dk}`}
                onClick={() => setFormPlans(['Lite', 'Pro', 'Business'])}
              >
                Все тарифы
              </button>
            </div>
          </div>
          <div className={s.formRow}>
            <label className={s.label}>Название кампании (необязательно)</label>
            <input
              type="text"
              value={formCampaign}
              onChange={(e) => setFormCampaign(e.target.value)}
              placeholder="Например: Запуск весна 2026"
              className={`${s.input}${dk}`}
            />
          </div>
          <div className={s.formActions}>
            <button type="submit" className={s.submitBtn} disabled={formSubmitting}>
              {formSubmitting ? 'Создаём…' : 'Создать реферальный аккаунт'}
            </button>
          </div>
        </form>
      </div>

      <h2 className={`${s.sectionTitle} ${isDark ? styles.titleDark : ''}`}>Все реферальщики</h2>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        Поиск и фильтр по источнику. Нажмите на строку для деталей.
      </p>

      <div className={`${s.toolbar}${dk}`}>
        <div className={s.searchWrap}>
          <IconSearch className={s.searchIcon} />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по имени, email, ID, источнику..."
            className={`${s.searchInput}${dk}`}
          />
        </div>
        <div className={s.filters}>
          <span className={s.filterLabel}>Источник:</span>
          {(['all', ...SOURCES] as const).map((src) => (
            <button
              key={src}
              type="button"
              className={`${s.filterChip} ${sourceFilter === src ? s.filterChipActive : ''}${dk}`}
              onClick={() => setSourceFilter(src)}
            >
              {src === 'all' ? 'Все' : SOURCE_LABELS[src]}
            </button>
          ))}
        </div>
        <span className={`${s.count}${dk}`}>
          {loading ? '…' : `${filteredReferrers.length} из ${partners.length}`}
        </span>
      </div>

      <div className={`${styles.tableWrap} ${isDark ? styles.tableWrapDark : ''}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Источник</th>
              <th>Реферальщик</th>
              <th>Канал / ссылка</th>
              <th>Промокод</th>
              <th>Скидка</th>
              <th>Тарифы</th>
              <th>Статус</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className={s.emptyCell}>
                  Загрузка…
                </td>
              </tr>
            ) : filteredReferrers.length === 0 ? (
              <tr>
                <td colSpan={9} className={s.emptyCell}>
                  {searchQuery.trim() || sourceFilter !== 'all' ? 'Никого не найдено.' : 'Нет записей.'}
                </td>
              </tr>
            ) : (
              filteredReferrers.map((r) => {
                const src = r.source as Source;
                return (
                  <tr key={r.id} className={s.rowClick} onClick={() => setSelectedReferrer(r)}>
                    <td>
                      <span className={`${s.idChip}${dk}`}>{r.id.slice(0, 8)}…</span>
                    </td>
                    <td>
                      <span className={`${s.sourceBadge} ${sourceBadgeClass(src)}`}>
                        {SOURCE_LABELS[src] ?? r.source}
                      </span>
                    </td>
                    <td>
                      <div>
                        <div className={`${s.refName}${dk}`}>{r.name}</div>
                        <div className={`${s.refEmail}${dk}`}>{r.email}</div>
                      </div>
                    </td>
                    <td>
                      <span className={`${s.channelLink}${dk}`}>{r.channelLink || '—'}</span>
                    </td>
                    <td>
                      <code className={`${s.promoCodeChip}${dk}`}>{r.promoCode || '—'}</code>
                    </td>
                    <td>
                      <span className={s.percentChip}>−{r.discountRub} ₽</span>
                    </td>
                    <td>
                      <span className={`${s.plansMini}${dk}`}>
                        {(r.appliesToPlans || []).join(', ') || 'Все'}
                      </span>
                    </td>
                    <td>
                      <span className={`${s.badge} ${statusClass(r.status)}`}>{statusLabel(r.status)}</span>
                    </td>
                    <td>
                      <span className={`${s.arrow}${dk}`}>→</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedReferrer && (
        <div className={s.overlay} onClick={() => setSelectedReferrer(null)}>
          <div className={`${s.modal}${dk}`} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <span
                className={`${s.sourceBadge} ${sourceBadgeClass(selectedReferrer.source as Source)} ${s.sourceBadgeLg}`}
              >
                {SOURCE_LABELS[selectedReferrer.source as Source] ?? selectedReferrer.source}
              </span>
              <div className={s.modalHeaderInfo}>
                <h3 className={s.modalTitle}>{selectedReferrer.name}</h3>
                <span className={`${s.modalEmail}${dk}`}>{selectedReferrer.email}</span>
                <span className={`${s.modalId}${dk}`}>{selectedReferrer.id}</span>
              </div>
              <button type="button" className={`${s.closeBtn}${dk}`} onClick={() => setSelectedReferrer(null)}>
                ✕
              </button>
            </div>
            <div className={s.modalBody}>
              <div className={s.detailGrid}>
                <DetailRow label="Ссылка на канал" value={selectedReferrer.channelLink || '—'} dk={dk} link={!!selectedReferrer.channelLink} />
                <DetailRow label="Кампания" value={selectedReferrer.campaign || '—'} dk={dk} />
                <DetailRow label="Промокод" value={selectedReferrer.promoCode || '—'} dk={dk} />
                <DetailRow label="Скидка" value={`−${selectedReferrer.discountRub} ₽`} dk={dk} />
                <DetailRow
                  label="Тарифы"
                  value={(selectedReferrer.appliesToPlans || []).join(', ') || 'Все'}
                  dk={dk}
                />
                <DetailRow label="Привлечено аккаунтов" value={String(selectedReferrer.accountsAttracted)} dk={dk} />
                <DetailRow label="Статус" value={statusLabel(selectedReferrer.status)} dk={dk} />
                <DetailRow label="Дата добавления" value={formatDateTimeRu(selectedReferrer.createdAt)} dk={dk} />
                <DetailRow label="Обновлено" value={formatDateTimeRu(selectedReferrer.updatedAt)} dk={dk} />
              </div>
              <div className={s.formActions} style={{ marginTop: 16 }}>
                {selectedReferrer.promoCode ? (
                  <button
                    type="button"
                    className={`${s.genPromoBtn}${dk}`}
                    onClick={() => void navigator.clipboard.writeText(selectedReferrer.promoCode)}
                  >
                    Скопировать промокод
                  </button>
                ) : null}
                {canEditReferralPartners ? (
                  <button
                    type="button"
                    className={s.submitBtn}
                    style={{ background: 'var(--danger, #c0392b)' }}
                    disabled={deleteBusy}
                    onClick={() => void handleDelete(selectedReferrer.id)}
                  >
                    {deleteBusy ? 'Удаление…' : 'Удалить запись'}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function DetailRow({
  label,
  value,
  dk,
  link,
}: {
  label: string;
  value: string;
  dk: string;
  link?: boolean;
}) {
  const href = value.startsWith('http') ? value : `https://${value}`;
  return (
    <div className={`${s.detailRow}${dk}`}>
      <span className={s.detailLabel}>{label}</span>
      {link && value !== '—' ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={`${s.detailLink}${dk}`}>
          {value}
        </a>
      ) : (
        <span className={s.detailValue}>{value}</span>
      )}
    </div>
  );
}
