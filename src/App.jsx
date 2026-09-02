import { useMemo, useState } from "react";
import "./App.css";
import GatewayStatus from "./components/GatewayStatus";

const telegramBotUrl = import.meta.env.VITE_TELEGRAM_BOT_URL || "https://t.me/DV9_SYSTEMbot";
const telegramIsConfigured = telegramBotUrl.startsWith("https://t.me/");

const systems = [
  {
    code: "HYDRA",
    title: "Orchestration Core",
    text: "Единый мозг маршрутизации задач, контекста, агентов, решений и событий.",
    meta: ["ROUTING", "CONTEXT", "EVENT BUS"],
    signal: "CORE",
  },
  {
    code: "HYDRUNYA",
    title: "Supervisor Mesh",
    text: "Контур управления множеством рабочих процессов, очередями, recovery и состоянием узлов.",
    meta: ["WORKERS", "RECOVERY", "STATE"],
    signal: "MESH",
  },
  {
    code: "HYDROCOOL",
    title: "Resource Governor",
    text: "Телеметрия ресурсов и управляемая нагрузка без жёстко зашитой политики — правила подключаются отдельно.",
    meta: ["CPU", "RAM", "QUEUE"],
    signal: "FLOW",
  },
  {
    code: "NIXA",
    title: "Engineering Intelligence",
    text: "Технический анализ, код, документы, расчёты и инженерные сценарии в одном рабочем контуре.",
    meta: ["CODE", "RAG", "ENGINEERING"],
    signal: "LAB",
  },
  {
    code: "COBRA",
    title: "Signal & Guard Layer",
    text: "Наблюдение за событиями, аномалиями, входящими сигналами и состоянием физических узлов.",
    meta: ["SIGNALS", "GUARD", "EDGE"],
    signal: "SENSE",
  },
  {
    code: "FORGE",
    title: "Build & Delivery",
    text: "Сборка, тестирование, артефакты, версии и путь от идеи до работающего модуля.",
    meta: ["BUILD", "TEST", "SHIP"],
    signal: "MAKE",
  },
];

const capabilities = [
  ["01", "Construction OS", "Объект, дефекты, скрытые работы, акты, материалы, график и цифровой журнал."],
  ["02", "AI Parliament", "Несколько интеллектуальных профилей работают параллельно и собираются в единое решение."],
  ["03", "Digital Twin", "Связь документов, фото, датчиков, оборудования и истории объекта в одном контексте."],
  ["04", "Automation Fabric", "События, боты, браузер, API, локальные устройства и фоновые процессы через коннекторы."],
  ["05", "Memory Layer", "Версионированная память проекта, решения, receipts, восстановление и повторное использование знаний."],
  ["06", "Asset Layer", "Цифровые активы, идентичности, кошельки и бизнес-модули подключаются как отдельные органы системы."],
];

const intelligenceProfiles = [
  { name: "CODEX", role: "Builder", family: "Development", use: "Код, рефакторинг, тесты, сборка и инженерная реализация", mode: "EXECUTION" },
  { name: "ARCHITECT", role: "System Design", family: "Engineering", use: "Архитектура, связи, контракты, границы модулей", mode: "DESIGN" },
  { name: "RESEARCH", role: "Explorer", family: "Research", use: "Поиск, сравнение источников, разведка технологий и рынка", mode: "DISCOVERY" },
  { name: "SENTINEL", role: "Observer", family: "Operations", use: "Состояние, риски, сигналы, отклонения и контроль качества", mode: "WATCH" },
  { name: "PLANNER", role: "Sequencer", family: "Operations", use: "Планы, зависимости, очереди, сроки и последовательность исполнения", mode: "PLAN" },
  { name: "LOCAL", role: "Edge Brain", family: "Local", use: "Локальные модели, приватные вычисления и работа рядом с устройством", mode: "EDGE" },
];

const flow = [
  ["01", "SIGNAL", "Получить событие, задачу, файл, сообщение или телеметрию."],
  ["02", "CONTEXT", "Собрать связанный проектный контекст и актуальное состояние."],
  ["03", "ROUTE", "Передать работу подходящим агентам, сервисам или локальным узлам."],
  ["04", "SYNTHESIZE", "Объединить результаты, противоречия, варианты и следующий шаг."],
  ["05", "EXECUTE", "Выполнить подключённое действие через выбранный коннектор или интерфейс."],
  ["06", "REMEMBER", "Сохранить результат, receipt, историю и данные для продолжения работы."],
];

function ExternalLink({ className = "", children }) {
  return (
    <a
      className={className}
      href={telegramBotUrl}
      target={telegramIsConfigured ? "_blank" : undefined}
      rel={telegramIsConfigured ? "noreferrer" : undefined}
    >
      {children}
    </a>
  );
}

function MiniSignal() {
  return (
    <span className="mini-signal" aria-hidden="true">
      <i /><i /><i /><i /><i />
    </span>
  );
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [family, setFamily] = useState("ALL");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");

  const families = ["ALL", "Development", "Engineering", "Research", "Operations", "Local"];
  const filteredProfiles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return intelligenceProfiles.filter((profile) => {
      const familyMatches = family === "ALL" || profile.family === family;
      const queryMatches = !normalized || `${profile.name} ${profile.role} ${profile.family} ${profile.use}`.toLowerCase().includes(normalized);
      return familyMatches && queryMatches;
    });
  }, [family, query]);

  function flash(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2800);
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <main className="dv9-shell" id="top">
      <div className="global-grid" aria-hidden="true" />
      <div className="global-noise" aria-hidden="true" />

      <header className="topbar">
        <a className="brand" href="#top" onClick={closeMenu} aria-label="DV9 home">
          <span className="brand-symbol"><b>9</b><i /></span>
          <span className="brand-copy"><strong>DV9</strong><small>ENGINEERING INTELLIGENCE</small></span>
        </a>

        <button
          type="button"
          className={`menu-toggle ${menuOpen ? "is-open" : ""}`}
          onClick={() => setMenuOpen((value) => !value)}
          aria-expanded={menuOpen}
          aria-label="Открыть навигацию"
        >
          <span /><span />
        </button>

        <nav className={menuOpen ? "nav-links is-open" : "nav-links"} aria-label="Навигация DV9">
          <a href="#system" onClick={closeMenu}>Система</a>
          <a href="#capabilities" onClick={closeMenu}>Возможности</a>
          <a href="#intelligence" onClick={closeMenu}>Интеллект</a>
          <a href="#flow" onClick={closeMenu}>Поток</a>
        </nav>

        <ExternalLink className="topbar-action">
          <span className="status-dot" /> OPEN NEXUS <b>↗</b>
        </ExternalLink>
      </header>

      <section className="hero">
        <div className="hero-rail" aria-hidden="true">
          <span>DV9 / NEXUS</span>
          <i />
          <b>001</b>
        </div>

        <div className="hero-copy">
          <div className="eyebrow"><span className="status-dot" /> SYSTEM ONLINE / EVOLVING</div>
          <h1>
            НЕ САЙТ.<br />
            <span>ИНТЕРФЕЙС</span><br />
            К СИСТЕМЕ.
          </h1>
          <p className="hero-lead">
            DV9 объединяет AI, инженерные процессы, автоматизацию, стройку, устройства и память проекта в один расширяемый цифровой организм.
          </p>
          <div className="hero-actions">
            <ExternalLink className="primary-action"><span>Войти в командный центр</span><b>↗</b></ExternalLink>
            <a className="secondary-action" href="#system"><span>Исследовать архитектуру</span><b>↓</b></a>
          </div>
          <div className="hero-trust">
            <span><i /> MODULAR CORE</span>
            <span><i /> CONNECTOR READY</span>
            <span><i /> LOCAL + CLOUD</span>
          </div>
        </div>

        <div className="nexus-visual" aria-label="DV9 Nexus core visualization">
          <div className="nexus-halo halo-one" aria-hidden="true" />
          <div className="nexus-halo halo-two" aria-hidden="true" />
          <div className="nexus-halo halo-three" aria-hidden="true" />
          <div className="nexus-orbit orbit-a" aria-hidden="true"><i /><i /><i /></div>
          <div className="nexus-orbit orbit-b" aria-hidden="true"><i /><i /><i /><i /></div>
          <div className="nexus-core">
            <small>DV9</small>
            <strong>9</strong>
            <span>NEXUS</span>
          </div>
          <div className="nexus-node node-hydra"><small>01</small><b>HYDRA</b><span>ORCHESTRATION</span></div>
          <div className="nexus-node node-code"><small>02</small><b>CODEX</b><span>BUILD</span></div>
          <div className="nexus-node node-edge"><small>03</small><b>EDGE</b><span>PHYSICAL</span></div>
          <div className="nexus-node node-memory"><small>04</small><b>MEMORY</b><span>CONTINUITY</span></div>
          <div className="telemetry telemetry-left"><span>ROUTE</span><b>∞</b><small>EXTENSIBLE</small></div>
          <div className="telemetry telemetry-right"><span>STATE</span><b>LIVE</b><small>OBSERVABLE</small></div>
        </div>

        <div className="hero-metrics">
          <article><small>ARCHITECTURE</small><b>MODULAR</b><span><i /> COMPOSABLE</span></article>
          <article><small>RUNTIME</small><b>LOCAL / CLOUD</b><span><i /> HYBRID</span></article>
          <article><small>INTERFACE</small><b>HUMAN + AGENTS</b><span><i /> UNIFIED</span></article>
          <article><small>EXPANSION</small><b>CONNECTORS</b><span><i /> OPEN ENDS</span></article>
        </div>
      </section>

      <GatewayStatus />

      <section className="section system-section" id="system">
        <div className="section-index" aria-hidden="true"><span>02</span><i /></div>
        <header className="section-head">
          <div>
            <span className="kicker">SYSTEM / ORGANS</span>
            <h2>Один организм.<br /><em>Много органов.</em></h2>
          </div>
          <p>
            Функции не запираются внутри одного интерфейса. Каждый орган имеет понятную роль, может развиваться отдельно и подключаться к общей шине DV9.
          </p>
        </header>

        <div className="system-grid">
          {systems.map((system, index) => (
            <article className="system-card" key={system.code}>
              <div className="system-card-top">
                <span>0{index + 1}</span>
                <MiniSignal />
                <b>{system.signal}</b>
              </div>
              <small className="system-code">DV9 / {system.code}</small>
              <h3>{system.title}</h3>
              <p>{system.text}</p>
              <div className="system-meta">
                {system.meta.map((item) => <span key={item}>{item}</span>)}
              </div>
              <button type="button" onClick={() => flash(`${system.code}: модуль готов к подключению к общей шине DV9`)}>
                EXPLORE <b>↗</b>
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="section capabilities-section" id="capabilities">
        <div className="section-index" aria-hidden="true"><span>03</span><i /></div>
        <header className="section-head section-head-wide">
          <div>
            <span className="kicker">CAPABILITY / MATRIX</span>
            <h2>От бетона<br />до цифрового мозга.</h2>
          </div>
          <p>DV9 строится не вокруг одной отрасли и не вокруг одной модели. Основа — связность инженерной, цифровой и операционной реальности.</p>
        </header>

        <div className="capability-matrix">
          {capabilities.map(([id, title, text]) => (
            <article key={id}>
              <span className="capability-id">{id}</span>
              <div className="capability-glyph" aria-hidden="true"><i /><i /><i /></div>
              <h3>{title}</h3>
              <p>{text}</p>
              <b className="matrix-link">DV9://{title.toUpperCase().replaceAll(" ", "-")}</b>
            </article>
          ))}
        </div>
      </section>

      <section className="section intelligence-section" id="intelligence">
        <div className="section-index" aria-hidden="true"><span>04</span><i /></div>
        <header className="section-head">
          <div>
            <span className="kicker">INTELLIGENCE / ROUTER</span>
            <h2>Не одна модель.<br /><em>Команда интеллектов.</em></h2>
          </div>
          <p>Профили определяют специализацию, а конкретные провайдеры и ключи могут подключаться отдельно — без переделки всей системы.</p>
        </header>

        <div className="intelligence-console">
          <div className="console-head">
            <div className="console-title">
              <span className="status-dot" /> DV9 INTELLIGENCE MATRIX
            </div>
            <label className="search-box">
              <span>⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="SEARCH PROFILE" aria-label="Найти профиль" />
            </label>
          </div>

          <div className="profile-filters" role="group" aria-label="Фильтр профилей">
            {families.map((item) => (
              <button type="button" className={family === item ? "active" : ""} onClick={() => setFamily(item)} key={item}>{item}</button>
            ))}
          </div>

          <div className="profile-table">
            <div className="profile-header"><span>PROFILE</span><span>SPECIALIZATION</span><span>MODE</span><span>ACTION</span></div>
            {filteredProfiles.map((profile, index) => (
              <article key={profile.name}>
                <div className="profile-number"><span>{String(index + 1).padStart(2, "0")}</span><i /></div>
                <div className="profile-name"><b>{profile.name}</b><small>{profile.role} / {profile.family}</small></div>
                <p>{profile.use}</p>
                <span className="profile-mode"><i />{profile.mode}</span>
                <button type="button" onClick={() => flash(`${profile.name}: профиль выбран, провайдер подключается конфигурацией`)}>OPEN <b>↗</b></button>
              </article>
            ))}
            {!filteredProfiles.length && <div className="empty-state">NO PROFILE MATCH / измени фильтр или запрос</div>}
          </div>
        </div>
      </section>

      <section className="section flow-section" id="flow">
        <div className="section-index" aria-hidden="true"><span>05</span><i /></div>
        <header className="section-head">
          <div>
            <span className="kicker">EXECUTION / FLOW</span>
            <h2>Сигнал превращается<br />в действие.</h2>
          </div>
          <p>Один поток для чата, Telegram, файлов, браузера, устройств, фоновых задач и будущих коннекторов.</p>
        </header>

        <div className="flow-track">
          <div className="flow-line" aria-hidden="true" />
          {flow.map(([id, title, text]) => (
            <article key={id}>
              <div className="flow-node"><span>{id}</span><i /></div>
              <small>DV9 / STEP</small>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="command-section">
        <div className="command-grid" aria-hidden="true" />
        <div className="command-copy">
          <span className="kicker">DV9 / COMMAND SURFACE</span>
          <h2>Одна точка входа.<br /><em>Неограниченное расширение.</em></h2>
          <p>
            Ядро остаётся модульным: добавляй модели, API, устройства, роли, правила и ключи тогда, когда они понадобятся — без переписывания идеи с нуля.
          </p>
          <ExternalLink className="primary-action"><span>Открыть DV9 SYSTEM</span><b>↗</b></ExternalLink>
        </div>
        <div className="command-terminal">
          <div className="terminal-bar"><span>DV9:NEXUS / CONTROL</span><b><i /> READY</b></div>
          <div className="terminal-body">
            <p><span>01</span><b>CORE</b><em>HYDRA BUS</em><strong>AVAILABLE</strong></p>
            <p><span>02</span><b>AGENTS</b><em>ROUTING FABRIC</em><strong>EXTENSIBLE</strong></p>
            <p><span>03</span><b>CONNECTORS</b><em>EXTERNAL I/O</em><strong>PLUGGABLE</strong></p>
            <p><span>04</span><b>MEMORY</b><em>PROJECT CONTINUITY</em><strong>PERSISTENT</strong></p>
            <p><span>05</span><b>EDGE</b><em>PHYSICAL NODES</em><strong>DISCOVERABLE</strong></p>
          </div>
          <div className="terminal-input"><span>dv9@nexus:~$</span><b>awaiting command_</b></div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-brand"><span className="brand-symbol small"><b>9</b><i /></span><div><b>DV9</b><small>ENGINEERING INTELLIGENCE / 2026</small></div></div>
        <p>BUILD THE SYSTEM THAT BUILDS THE NEXT SYSTEM.</p>
        <div className="footer-links"><a href="#top">TOP ↑</a><ExternalLink>TELEGRAM ↗</ExternalLink></div>
      </footer>

      {notice && <div className="toast" role="status"><span className="status-dot" />{notice}</div>}
    </main>
  );
}
