import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { IconSearch } from '@/components/Icons';
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

interface DemoReferrer {
  id: string;
  name: string;
  email: string;
  source: Source;
  channelLink: string;
  accountsAttracted: number;
  rewardPercent: number;
  status: 'Активен' | 'Приостановлен' | 'На модерации';
  createdAt: string;
  lastActivity: string;
}

const REFERRERS: DemoReferrer[] = [];

export function ReferralCreatePage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const dk = isDark ? ' ' + s.dk : '';

  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<Source | 'all'>('all');
  const [selectedReferrer, setSelectedReferrer] = useState<DemoReferrer | null>(null);

  /* Form: create referral account */
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSource, setFormSource] = useState<Source>('telegram');
  const [formChannel, setFormChannel] = useState('');
  const [formRewardPercent, setFormRewardPercent] = useState(15);
  const [formCampaign, setFormCampaign] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);

  const filteredReferrers = REFERRERS.filter((r) => {
    const matchSearch =
      !searchQuery.trim() ||
      r.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      SOURCE_LABELS[r.source].toLowerCase().includes(searchQuery.trim().toLowerCase());
    const matchSource = sourceFilter === 'all' || r.source === sourceFilter;
    return matchSearch && matchSource;
  });

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    setTimeout(() => {
      setFormName('');
      setFormEmail('');
      setFormChannel('');
      setFormCampaign('');
      setFormSubmitted(false);
    }, 1500);
  };

  const statusClass = (st: string) => {
    if (st === 'Активен') return s.badgeGreen;
    if (st === 'Приостановлен') return s.badgeRed;
    return s.badgeOrange;
  };

  const sourceBadgeClass = (src: Source) => {
    if (src === 'youtube') return s.sourceYoutube;
    if (src === 'telegram') return s.sourceTelegram;
    if (src === 'tiktok') return s.sourceTiktok;
    return s.sourceOther;
  };

  return (
    <section className={styles.section}>
      <h1 className={`${styles.title} ${isDark ? styles.titleDark : ''}`}>Реферальная система</h1>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        Создание аккаунтов реферальщиков и просмотр по источникам: YouTube, Telegram, TikTok и другие.
      </p>

      {/* ═══ CREATE REFERRAL ACCOUNT CARD ═══ */}
      <div className={`${s.createCard}${dk}`}>
        <h2 className={s.createCardTitle}>Создать реферальный аккаунт</h2>
        <p className={`${s.createCardDesc}${dk}`}>
          Добавьте нового реферальщика: укажите контакты, источник трафика и условия вознаграждения.
        </p>
        <form onSubmit={handleCreateAccount} className={s.form}>
          <div className={s.formRow}>
            <label className={s.label}>Имя / название канала</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
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
                <option key={src} value={src}>{SOURCE_LABELS[src]}</option>
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
            <label className={s.label}>Процент вознаграждения (%)</label>
            <input
              type="number"
              min={1}
              max={50}
              value={formRewardPercent}
              onChange={(e) => setFormRewardPercent(Number(e.target.value))}
              className={`${s.input} ${s.inputNarrow}${dk}`}
            />
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
            <button type="submit" className={s.submitBtn} disabled={formSubmitted}>
              {formSubmitted ? 'Создаём…' : 'Создать реферальный аккаунт'}
            </button>
          </div>
        </form>
      </div>

      {/* ═══ REFERRERS LIST ═══ */}
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
          {REFERRERS.length > 0 ? `${filteredReferrers.length} из ${REFERRERS.length}` : '0'}
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
              <th>Привлечено</th>
              <th>%</th>
              <th>Статус</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredReferrers.length === 0 ? (
              <tr>
                <td colSpan={8} className={s.emptyCell}>
                  {searchQuery.trim() || sourceFilter !== 'all' ? 'Никого не найдено.' : 'Нет данных.'}
                </td>
              </tr>
            ) : (
              filteredReferrers.map((r) => (
                <tr key={r.id} className={s.rowClick} onClick={() => setSelectedReferrer(r)}>
                  <td><span className={`${s.idChip}${dk}`}>{r.id}</span></td>
                  <td><span className={`${s.sourceBadge} ${sourceBadgeClass(r.source)}`}>{SOURCE_LABELS[r.source]}</span></td>
                  <td>
                    <div>
                      <div className={`${s.refName}${dk}`}>{r.name}</div>
                      <div className={`${s.refEmail}${dk}`}>{r.email}</div>
                    </div>
                  </td>
                  <td><span className={`${s.channelLink}${dk}`}>{r.channelLink}</span></td>
                  <td><strong className={s.attracted}>{r.accountsAttracted}</strong></td>
                  <td><span className={s.percentChip}>{r.rewardPercent}%</span></td>
                  <td><span className={`${s.badge} ${statusClass(r.status)}`}>{r.status}</span></td>
                  <td><span className={`${s.arrow}${dk}`}>→</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ═══ REFERRER DETAIL MODAL ═══ */}
      {selectedReferrer && (
        <div className={s.overlay} onClick={() => setSelectedReferrer(null)}>
          <div className={`${s.modal}${dk}`} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <span className={`${s.sourceBadge} ${sourceBadgeClass(selectedReferrer.source)} ${s.sourceBadgeLg}`}>
                {SOURCE_LABELS[selectedReferrer.source]}
              </span>
              <div className={s.modalHeaderInfo}>
                <h3 className={s.modalTitle}>{selectedReferrer.name}</h3>
                <span className={`${s.modalEmail}${dk}`}>{selectedReferrer.email}</span>
                <span className={`${s.modalId}${dk}`}>{selectedReferrer.id}</span>
              </div>
              <button type="button" className={`${s.closeBtn}${dk}`} onClick={() => setSelectedReferrer(null)}>✕</button>
            </div>
            <div className={s.modalBody}>
              <div className={s.detailGrid}>
                <DetailRow label="Ссылка на канал" value={selectedReferrer.channelLink} dk={dk} link />
                <DetailRow label="Привлечено аккаунтов" value={String(selectedReferrer.accountsAttracted)} dk={dk} />
                <DetailRow label="Процент вознаграждения" value={`${selectedReferrer.rewardPercent}%`} dk={dk} />
                <DetailRow label="Статус" value={selectedReferrer.status} dk={dk} />
                <DetailRow label="Дата добавления" value={selectedReferrer.createdAt} dk={dk} />
                <DetailRow label="Последняя активность" value={selectedReferrer.lastActivity} dk={dk} />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
function DetailRow({ label, value, dk, link }: { label: string; value: string; dk: string; link?: boolean }) {
  return (
    <div className={`${s.detailRow}${dk}`}>
      <span className={s.detailLabel}>{label}</span>
      {link ? (
        <a href={`https://${value}`} target="_blank" rel="noopener noreferrer" className={`${s.detailLink}${dk}`}>{value}</a>
      ) : (
        <span className={s.detailValue}>{value}</span>
      )}
    </div>
  );
}

