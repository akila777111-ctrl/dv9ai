import "./App.css";

const telegramBotUrl = import.meta.env.VITE_TELEGRAM_BOT_URL || "#contact";
const telegramIsConfigured = telegramBotUrl.startsWith("https://t.me/");

export default function App() {
  return (
    <main className="page">
      <nav className="nav">
        <div className="logo">DV9</div>
        <a
          href={telegramBotUrl}
          target={telegramIsConfigured ? "_blank" : undefined}
          rel={telegramIsConfigured ? "noreferrer" : undefined}
        >
          Открыть AI-пилот
        </a>
      </nav>

      <section className="hero">
        <p className="badge">DV9 AI ECOSYSTEM • 2035</p>
        <h1>AI-пилот для стройки, бизнеса и цифровой защиты</h1>
        <p className="lead">
          DV9 объединяет искусственный интеллект, строительный контроль,
          автоматизацию, безопасность и сеть AI-агентов в одну экосистему.
        </p>

        <div className="buttons">
          <a
            href={telegramBotUrl}
            target={telegramIsConfigured ? "_blank" : undefined}
            rel={telegramIsConfigured ? "noreferrer" : undefined}
          >
            Запустить в Telegram
          </a>
          <a className="ghost" href="#modules">Смотреть модули</a>
        </div>
      </section>

      <section id="modules" className="cards">
        <div className="card">
          <h2>AI Brain</h2>
          <p>Центральный мозг проекта: анализ, решения, агенты и управление.</p>
        </div>
        <div className="card">
          <h2>Construction OS</h2>
          <p>Контроль стройки, дефектов, материалов, актов и процессов.</p>
        </div>
        <div className="card">
          <h2>Security Layer</h2>
          <p>Цифровая защита, аудит, мониторинг и безопасная архитектура.</p>
        </div>
        <div className="card">
          <h2>Telegram Command Center</h2>
          <p>Единый защищённый шлюз для DV9 SYSTEM, AI PILOT, PREMIUM и строительного бота.</p>
        </div>
      </section>

      <section id="contact" className="cta">
        <h2>Сеть ботов DV9 готовится к запуску</h2>
        <p>
          Сайт, Telegram и AI-ядро соединяются через защищённый backend. После
          добавления токенов бот отвечает на команды, показывает статус и передаёт запросы AI-модели.
        </p>
        <a
          className="ctaButton"
          href={telegramBotUrl}
          target={telegramIsConfigured ? "_blank" : undefined}
          rel={telegramIsConfigured ? "noreferrer" : undefined}
        >
          Войти в DV9
        </a>
      </section>
    </main>
  );
}
