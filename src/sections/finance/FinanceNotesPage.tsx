import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import styles from '../Section.module.css';
import fc from './Finance.module.css';
import {
  createFinanceNote,
  deleteFinanceNote,
  fetchFinanceNotes,
  updateFinanceNote,
  type FinanceNoteDto,
} from '@/lib/financeApi';

export function FinanceNotesPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [notes, setNotes] = useState<FinanceNoteDto[]>([]);
  const [tagFilter, setTagFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<FinanceNoteDto | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [includeInReport, setIncludeInReport] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchFinanceNotes(tagFilter || undefined);
      setNotes(r.notes);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [tagFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags)));

  const resetForm = () => {
    setEditing(null);
    setTitle('');
    setContent('');
    setTagsStr('');
    setIncludeInReport(false);
  };

  const startEdit = (n: FinanceNoteDto) => {
    setEditing(n);
    setTitle(n.title);
    setContent(n.content);
    setTagsStr(n.tags.join(', '));
    setIncludeInReport(n.includeInReport);
  };

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    const tags = tagsStr
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    try {
      if (editing) {
        await updateFinanceNote(editing.id, { title, content, tags, includeInReport });
      } else {
        await createFinanceNote({ title, content, tags, includeInReport });
      }
      resetForm();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Удалить заметку?')) return;
    setBusy(true);
    try {
      await deleteFinanceNote(id);
      if (editing?.id === id) resetForm();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.section}>
      <h1 className={`${styles.title} ${isDark ? styles.titleDark : ''}`}>Внутренние заметки</h1>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        Заметки команды для финансовой отчётности. HTML в тексте поддерживается.
      </p>

      {error ? <p role="alert">{error}</p> : null}

      <div className={`${styles.contentBlock} ${isDark ? styles.contentBlockDark : ''}`}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>{editing ? 'Редактировать' : 'Новая заметка'}</h2>
        <input
          type="text"
          placeholder="Заголовок"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`${fc.noteEditor} ${isDark ? fc.noteEditorDark : ''}`}
          style={{ minHeight: 'auto', marginBottom: 8 }}
        />
        <textarea
          className={`${fc.noteEditor} ${isDark ? fc.noteEditorDark : ''}`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Содержимое (можно использовать простой HTML)"
        />
        <input
          type="text"
          placeholder="Теги через запятую"
          value={tagsStr}
          onChange={(e) => setTagsStr(e.target.value)}
          className={`${fc.noteEditor} ${isDark ? fc.noteEditorDark : ''}`}
          style={{ minHeight: 'auto', marginTop: 8 }}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <input type="checkbox" checked={includeInReport} onChange={(e) => setIncludeInReport(e.target.checked)} />
          Включить в PDF-отчёт
        </label>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button type="button" disabled={busy || !title.trim()} onClick={() => void handleSave()}>
            {editing ? 'Сохранить' : 'Создать'}
          </button>
          {editing ? (
            <button type="button" onClick={resetForm}>
              Отмена
            </button>
          ) : null}
        </div>
      </div>

      {allTags.length > 0 ? (
        <div style={{ margin: '16px 0' }}>
          <span className={`${fc.periodLabel} ${isDark ? fc.periodLabelDark : ''}`}>Фильтр по тегу: </span>
          <button
            type="button"
            className={`${fc.tagChip} ${!tagFilter ? fc.tagChipActive : ''}`}
            onClick={() => setTagFilter('')}
          >
            Все
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              type="button"
              className={`${fc.tagChip} ${tagFilter === t ? fc.tagChipActive : ''} ${isDark ? fc.tagChipDark : ''}`}
              onClick={() => setTagFilter(t)}
            >
              {t}
            </button>
          ))}
        </div>
      ) : null}

      <div className={`${styles.tableWrap} ${isDark ? styles.tableWrapDark : ''}`}>
        {loading ? (
          <p>Загрузка…</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Заголовок</th>
                <th>Теги</th>
                <th>В отчёте</th>
                <th>Обновлено</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {notes.map((n) => (
                <tr key={n.id}>
                  <td>{n.title}</td>
                  <td>{n.tags.join(', ')}</td>
                  <td>{n.includeInReport ? 'Да' : '—'}</td>
                  <td>{new Date(n.updatedAt).toLocaleString('ru-RU')}</td>
                  <td>
                    <button type="button" onClick={() => startEdit(n)}>
                      Изм.
                    </button>{' '}
                    <button type="button" onClick={() => void handleDelete(n.id)}>
                      Удал.
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

