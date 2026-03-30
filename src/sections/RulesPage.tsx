import { useTheme } from '@/contexts/ThemeContext';
import styles from './Section.module.css';

export function RulesPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <section className={styles.section}>
      <h1 className={`${styles.title} ${isDark ? styles.titleDark : ''}`}>Правила пользования панелью</h1>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        Правила и условия использования админ-панели Seepromnt.
      </p>
      <div className={`${styles.contentBlock} ${isDark ? styles.contentBlockDark : ''}`}>
        <p>1. Панель предназначена для авторизованных администраторов и участников реферальной программы.</p>
        <p>2. Запрещается передавать учётные данные третьим лицам.</p>
        <p>3. Все действия в панели логируются.</p>
        <p>Демо-текст. Окончательные правила будут добавлены после согласования.</p>
      </div>
    </section>
  );
}
