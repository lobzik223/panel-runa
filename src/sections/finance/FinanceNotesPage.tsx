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

function notePreviewText(html: string, maxLen = 160): string {
  const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (plain.length <= maxLen) return plain;
  return `${plain.slice(0, maxLen)}\u2026`;
}

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    if (!window.confirm('\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0437\u0430\u043c\u0435\u0442\u043a\u0443?')) return;
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
        Заметки для команды: теги, фильтрация и включение в PDF-отчёт. Поддерживается простой HTML в тексте.
      </p>

      {error ? (
        <p className={`${fc.alertError} ${isDark ? fc.alertErrorDark : ''}`} role="alert">
          {error}
        </p>
      ) : null}

      <div className={`${styles.contentBlock} ${isDark ? styles.contentBlockDark : ''} ${fc.noteForm}`}>
        <h2 className={`${fc.noteFormTitle} ${isDark ? fc.noteFormTitleDark : ''}`}>
          {editing ? 'Редактирование' : 'Новая заметка'}
        </h2>
        <input
          type="text"
          placeholder="Заголовок"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`${fc.noteInput} ${isDark ? fc.noteInputDark : ''}`}
        />
        <textarea
          className={`${fc.noteEditor} ${isDark ? fc.noteEditorDark : ''}`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Содержимое: текст, списки, &lt;b&gt;жирный&lt;/b&gt;…"
        />
        <input
          type="text"
          placeholder="Теги: расходы, август, токены"
          value={tagsStr}
          onChange={(e) => setTagsStr(e.target.value)}
          className={`${fc.noteInput} ${isDark ? fc.noteInputDark : ''}`}
        />
        <div className={fc.noteFormActions}>
          <label className={`${fc.noteCheckbox} ${isDark ? fc.noteCheckboxDark : ''}`}>
            <input type="checkbox" checked={includeInReport} onChange={(e) => setIncludeInReport(e.target.checked)} />
            Включить в PDF-отчёт
          </label>
          <button type="button" className={fc.primaryBtn} disabled={busy || !title.trim()} onClick={() => void handleSave()}>
            {editing ? 'Сохранить' : 'Создать'}
          </button>
          {editing ? (
            <button type="button" className={`${fc.ghostBtn} ${isDark ? fc.ghostBtnDark : ''}`} onClick={resetForm}>
              Отмена
            </button>
          ) : null}
        </div>
      </div>

      {allTags.length > 0 ? (
        <div className={fc.tagRow}>
          <span className={`${fc.periodLabel} ${isDark ? fc.periodLabelDark : ''}`}>Теги:</span>
          <button
            type="button"
            className={`${fc.tagChip} ${!tagFilter ? fc.tagChipActive : ''} ${isDark ? fc.tagChipDark : ''}`}
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

      {loading ? (
        <p className={fc.emptyNotes}>Загрузка…</p>
      ) : notes.length === 0 ? (
        <p className={fc.emptyNotes}>Заметок пока нет — создайте первую выше</p>
      ) : (
        <div className={fc.notesGrid}>
          {notes.map((n) => (
            <article key={n.id} className={`${fc.noteCard} ${isDark ? fc.noteCardDark : ''}`}>
              <div className={fc.noteCardHead}>
                <h3 className={`${fc.noteCardTitle} ${isDark ? fc.noteCardTitleDark : ''}`}>{n.title}</h3>
                {n.includeInReport ? (
                  <span className={`${fc.noteBadge} ${isDark ? fc.noteBadgeDark : ''}`}>В отчёте</span>
                ) : null}
              </div>
              <p className={`${fc.notePreview} ${isDark ? fc.notePreviewDark : ''}`}>{notePreviewText(n.content)}</p>
              {n.tags.length > 0 ? (
                <div className={fc.noteTags}>
                  {n.tags.map((t) => (
                    <span key={t} className={`${fc.noteTag} ${isDark ? fc.noteTagDark : ''}`}>
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
              <p className={fc.noteMeta}>
                {n.authorName} · {new Date(n.updatedAt).toLocaleString('ru-RU')}
              </p>
              <div className={fc.noteCardActions}>
                <button type="button" className={fc.linkBtn} onClick={() => startEdit(n)}>
                  Изменить
                </button>
                <button type="button" className={`${fc.linkBtn} ${fc.linkBtnDanger}`} onClick={() => void handleDelete(n.id)}>
                  Удалить
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}