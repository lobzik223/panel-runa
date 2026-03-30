import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { IconExternal, IconSearch } from '@/components/Icons';
import {
  createDataLink,
  deleteDataLink,
  fetchDataLinks,
  type DataLinkDto,
} from '@/lib/adminApi';
import styles from './Section.module.css';
import mainStyles from './MainPage.module.css';
import dataLinksStyles from './DataLinksPage.module.css';

export type LinkType = 'excel' | 'google-sheets' | 'google-docs';

export interface DataLinkItem {
  id: string;
  name: string;
  description: string;
  url: string;
  type: LinkType;
}

const LINK_TYPE_LABELS: Record<LinkType, string> = {
  excel: 'Excel',
  'google-sheets': 'Google Таблицы',
  'google-docs': 'Google Документы',
};

function dtoToItem(d: DataLinkDto): DataLinkItem {
  return {
    id: d.id,
    name: d.title,
    description: d.description,
    url: d.url,
    type: d.type,
  };
}

export function DataLinksPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [links, setLinks] = useState<DataLinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState<LinkType>('google-sheets');
  const [saving, setSaving] = useState(false);

  const loadLinks = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { links: rows } = await fetchDataLinks();
      setLinks(rows.map(dtoToItem));
    } catch (e) {
      setLinks([]);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLinks();
  }, [loadLinks]);

  const handleAdd = async () => {
    if (!newName.trim() || !newUrl.trim()) return;
    setActionError(null);
    setSaving(true);
    try {
      const { link } = await createDataLink({
        title: newName.trim(),
        description: newDesc.trim(),
        url: newUrl.trim(),
        linkType: newType,
      });
      setLinks((prev) => [...prev, dtoToItem(link)]);
      setNewName('');
      setNewDesc('');
      setNewUrl('');
      setNewType('google-sheets');
      setShowForm(false);
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    setActionError(null);
    try {
      await deleteDataLink(id);
      setLinks((prev) => prev.filter((l) => l.id !== id));
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  const query = searchQuery.trim().toLowerCase();
  const filteredLinks = query
    ? links.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          LINK_TYPE_LABELS[item.type].toLowerCase().includes(query)
      )
    : links;

  return (
    <section className={styles.section}>
      <h1 className={`${styles.title} ${isDark ? styles.titleDark : ''}`}>Графики и данные</h1>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        Ссылки на Excel и Google Таблицы/Документы. Укажите название и за что отвечает каждая ссылка — администратор может открыть и проверить все данные из панели.
      </p>

      {error ? (
        <p className={`${mainStyles.apiError} ${isDark ? mainStyles.apiErrorDark : ''}`} role="alert">
          {error}
        </p>
      ) : null}
      {actionError ? (
        <p className={`${mainStyles.apiError} ${isDark ? mainStyles.apiErrorDark : ''}`} role="alert">
          {actionError}
        </p>
      ) : null}

      <div className={`${styles.contentBlock} ${isDark ? styles.contentBlockDark : ''}`}>
        <div className={`${dataLinksStyles.searchWrap} ${isDark ? dataLinksStyles.searchWrapDark : ''}`}>
          <IconSearch className={dataLinksStyles.searchIcon} aria-hidden />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск графика или данных..."
            className={`${dataLinksStyles.searchInput} ${isDark ? dataLinksStyles.searchInputDark : ''}`}
            aria-label="Поиск по графикам и данным"
          />
        </div>
        <h2 className={`${dataLinksStyles.blockTitle} ${isDark ? dataLinksStyles.blockTitleDark : ''}`}>
          Что прикрепляем
        </h2>
        <p className={`${dataLinksStyles.blockHint} ${isDark ? dataLinksStyles.blockHintDark : ''}`}>
          При добавлении ссылки выберите тип: Excel (файл .xlsx) или Google Таблицы / Google Документы. Так в панели будет понятно, где что открывать.
        </p>

        <div className={dataLinksStyles.linkList}>
          {loading ? (
            <p className={`${dataLinksStyles.emptySearch} ${isDark ? dataLinksStyles.emptySearchDark : ''}`}>
              Загрузка…
            </p>
          ) : filteredLinks.length === 0 ? (
            <p className={`${dataLinksStyles.emptySearch} ${isDark ? dataLinksStyles.emptySearchDark : ''}`}>
              {query ? 'По запросу ничего не найдено.' : 'Нет добавленных ссылок.'}
            </p>
          ) : (
          filteredLinks.map((item) => (
            <div
              key={item.id}
              className={`${dataLinksStyles.linkRow} ${isDark ? dataLinksStyles.linkRowDark : ''}`}
            >
              <div className={dataLinksStyles.linkMain}>
                <span className={`${dataLinksStyles.linkName} ${isDark ? dataLinksStyles.linkNameDark : ''}`}>
                  {item.name}
                </span>
                {item.description && (
                  <span className={`${dataLinksStyles.linkDesc} ${isDark ? dataLinksStyles.linkDescDark : ''}`}>
                    {item.description}
                  </span>
                )}
                <span className={dataLinksStyles.linkTypeBadge} data-type={item.type}>
                  {LINK_TYPE_LABELS[item.type]}
                </span>
              </div>
              <div className={dataLinksStyles.linkActions}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={dataLinksStyles.openBtn}
                >
                  <IconExternal className={dataLinksStyles.openBtnIcon} />
                  Открыть
                </a>
                <button
                  type="button"
                  className={dataLinksStyles.removeBtn}
                  onClick={() => handleRemove(item.id)}
                  aria-label="Удалить ссылку"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))
          )}
        </div>

        {showForm ? (
          <div className={`${dataLinksStyles.form} ${isDark ? dataLinksStyles.formDark : ''}`}>
            <h3 className={`${dataLinksStyles.formTitle} ${isDark ? dataLinksStyles.formTitleDark : ''}`}>
              Новая ссылка
            </h3>
            <label className={dataLinksStyles.label}>
              <span className={isDark ? dataLinksStyles.labelDark : ''}>Название (за что эта ссылка)</span>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Например: Реферальная статистика"
                className={`${dataLinksStyles.input} ${isDark ? dataLinksStyles.inputDark : ''}`}
              />
            </label>
            <label className={dataLinksStyles.label}>
              <span className={isDark ? dataLinksStyles.labelDark : ''}>Описание (где что и как)</span>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Кратко: что в файле, за какой период"
                className={`${dataLinksStyles.input} ${isDark ? dataLinksStyles.inputDark : ''}`}
              />
            </label>
            <label className={dataLinksStyles.label}>
              <span className={isDark ? dataLinksStyles.labelDark : ''}>Тип</span>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as LinkType)}
                className={`${dataLinksStyles.select} ${isDark ? dataLinksStyles.selectDark : ''}`}
              >
                <option value="excel">Excel</option>
                <option value="google-sheets">Google Таблицы</option>
                <option value="google-docs">Google Документы</option>
              </select>
            </label>
            <label className={dataLinksStyles.label}>
              <span className={isDark ? dataLinksStyles.labelDark : ''}>Ссылка (URL)</span>
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://..."
                className={`${dataLinksStyles.input} ${isDark ? dataLinksStyles.inputDark : ''}`}
              />
            </label>
            <div className={dataLinksStyles.formActions}>
              <button
                type="button"
                className={dataLinksStyles.addBtn}
                onClick={() => void handleAdd()}
                disabled={saving || !newName.trim() || !newUrl.trim()}
              >
                {saving ? 'Сохранение…' : 'Добавить'}
              </button>
              <button
                type="button"
                className={dataLinksStyles.cancelBtn}
                onClick={() => setShowForm(false)}
              >
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className={dataLinksStyles.addLinkTrigger}
            onClick={() => setShowForm(true)}
          >
            + Добавить ссылку
          </button>
        )}
      </div>
    </section>
  );
}
