import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err?.message || 'Ошибка' };
  }

  componentDidCatch(err: Error, info: ErrorInfo): void {
    console.error('[Panel]', err, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            fontFamily: 'system-ui, sans-serif',
            background: '#0f172a',
            color: '#e2e8f0',
          }}
        >
          <h1 style={{ fontSize: 18, marginBottom: 12 }}>Панель: сбой отображения</h1>
          <p style={{ maxWidth: 520, textAlign: 'center', lineHeight: 1.5, marginBottom: 20 }}>
            {this.state.message}
          </p>
          <p style={{ fontSize: 13, color: '#94a3b8', maxWidth: 520, textAlign: 'center' }}>
            Обновите страницу. В production проверьте, что задана переменная{' '}
            <code style={{ color: '#cbd5e1' }}>VITE_API_URL</code> при сборке и что nginx отдаёт{' '}
            <code style={{ color: '#cbd5e1' }}>index.html</code> для всех путей SPA.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 24,
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: '#38bdf8',
              color: '#0f172a',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Перезагрузить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
