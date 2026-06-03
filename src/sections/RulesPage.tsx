import { useTheme } from '@/contexts/ThemeContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import styles from './Section.module.css';

const ADMIN_RULES = [
  'Панель предназначена для авторизованных администраторов Seepromnt.',
  'Запрещается передавать учётные данные и токены входа третьим лицам.',
  'Все действия в панели (блокировки, выдача тарифов, платежи, модерация) логируются.',
  'Раздел «Серверная часть» и критичные операции с пользователями доступны только ролям admin и superadmin.',
  'Финансовые отчёты и настройки платежей изменяйте только при понимании последствий для учёта.',
];

const FINANCE_ANALYST_RULES = [
  'Роль «Финансовый аналитик» — доступ к финансам, просмотру пользователей и ограниченным операциям с рефералкой.',
  'Пользователи: просмотр профиля, покупок и финансов по аккаунту. Вкладка «Действия», выдача тарифов и сброс привязки устройства недоступны.',
  'Реферальная система: до 5 новых записей в сутки и до 5 удалений в сутки; между удалениями пауза 60 секунд.',
  'Графики и данные: просмотр всех ссылок; добавление до 2 новых записей в сутки; удаление ссылок недоступно.',
  'Заблокированные аккаунты и отзывы сайта — только просмотр, без разбана и модерации.',
  'Раздел «Серверная часть» скрыт. Скрытие строк тарифов в платежах — только у администратора.',
  'Передача доступа третьим лицам запрещена; действия с лимитами логируются.',
];

export function RulesPage() {
  const { theme } = useTheme();
  const { isFinanceAnalyst } = useAdminRole();
  const isDark = theme === 'dark';
  const rules = isFinanceAnalyst ? FINANCE_ANALYST_RULES : ADMIN_RULES;

  return (
    <section className={styles.section}>
      <h1 className={`${styles.title} ${isDark ? styles.titleDark : ''}`}>Правила пользования панелью</h1>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        {isFinanceAnalyst
          ? 'Правила для роли «Финансовый аналитик»: что доступно в панели и суточные лимиты.'
          : 'Правила и условия использования админ-панели Seepromnt для администраторов.'}
      </p>
      <div className={`${styles.contentBlock} ${isDark ? styles.contentBlockDark : ''}`}>
        <ol style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: 1.6 }}>
          {rules.map((text, i) => (
            <li key={i} style={{ marginBottom: 12 }}>
              {text}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
