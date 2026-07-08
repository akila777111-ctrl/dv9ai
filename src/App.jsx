import "./App.css";

export default function App() {
  return (
    <main className="page">
      <nav className="nav">
        <div className="logo">DV9</div>
        <a href="#contact">Ранний доступ</a>
      </nav>

      <section className="hero">
        <p className="badge">DV9 AI ECOSYSTEM • 2035</p>
        <h1>AI-пилот для стройки, бизнеса и цифровой защиты</h1>
        <p className="lead">
          DV9 объединяет искусственный интеллект, строительный контроль,
          автоматизацию, безопасность и сеть AI-агентов в одну экосистему.
        </p>

        <div className="buttons">
          <a href="#contact">Запустить DV9</a>
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
          <h2>Agent Network</h2>
          <p>Сеть AI-помощников для задач, клиентов, данных и автоматизации.</p>
        </div>
      </section>

      <section id="contact" className="cta">
        <h2>DV9 запускается</h2>
        <p>Первый сайт проекта. Следующий шаг — GitHub, Vercel и домен dv9.com.ua.</p>
        <button>Ранний доступ</button>
      </section>
    </main>
  );
}