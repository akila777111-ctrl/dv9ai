import "./App.css";
import GatewayStatus from "./components/GatewayStatus";

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

      <section className="hero" id="top">
        <p className="badge">DV9 // HYDRA · ENGINEERING INTELLIGENCE</p>
        <h1>Командный центр новой реальности.</h1>
        <p className="lead">
          Единый AI-контур для стройки, бизнеса и цифровой защиты. Видит систему целиком, реагирует на сигналы и ускоряет решения.
        </p>

        <div className="buttons">
          <a
            href={telegramBotUrl}
            target={telegramIsConfigured ? "_blank" : undefined}
            rel={telegramIsConfigured ? "noreferrer" : undefined}
          >
            Запустить в Telegram
          </a>
          <a className="ghost" href="#modules">Исследовать систему</a>
        </div>
      </section>

      <GatewayStatus />

      <section className="sectionIntro"><p className="badge">SYSTEM // ARCHITECTURE</p><h2>Одна система. Пять контуров.</h2><p>Связанный инженерный контур управления DV9 HYDRA.</p></section>
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
        <div className="card" id="digital-asset">
          <h2>Digital Asset</h2>
          <p>Preview-витрина цифрового актива DV9 без выпуска токенов, контрактов и финансовых операций.</p>
        </div>
        <div className="card">
          <h2>Telegram Command Center</h2>
          <p>Единый защищённый шлюз для DV9 SYSTEM, AI PILOT, PREMIUM и строительного бота.</p>
        </div>
      </section>

      <section id="contact" className="cta">
        <h2>Система ждёт вашу команду.</h2>
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
          Войти в DV9 HYDRA
        </a>
      </section>
    </main>
  );
}
