import { useMemo, useState } from "react";
import "./App.css";
import GatewayStatus from "./components/GatewayStatus";

const telegramBotUrl = import.meta.env.VITE_TELEGRAM_BOT_URL || "https://t.me/DV9_SYSTEMbot";
const telegramIsConfigured = telegramBotUrl.startsWith("https://t.me/");

const pipeline = [
  ["01", "Воспринять", "BIM · PDF · фото · IoT", "Собрать данные объекта в единый инженерный контекст."],
  ["02", "Понять", "AI · RAG · правила", "Связать документы, состояние, риски, сроки и экономику."],
  ["03", "Предложить", "План · NCR · действие", "Подготовить проверяемое решение без скрытых изменений."],
  ["04", "Подтвердить", "OWNER NODE 999", "Передать критическое решение владельцу системы."],
  ["05", "Зафиксировать", "Receipt · history · recovery", "Сохранить доказательство действия и путь восстановления."],
];

const organs = [
  { code: "CRN", title: "Крановый интеллект", text: "Конфигурация, lift plan, нагрузка, цифровой паспорт и обслуживание.", tags: ["BOM", "LOAD", "MRO"] },
  { code: "SITE", title: "Зрение площадки", text: "Фото, скрытые работы, QA/QC, NCR и контроль критических отклонений.", tags: ["VISION", "ITP", "HSE"] },
  { code: "OPS", title: "Контур исполнения", text: "Календарь, закупки, зависимости, бюджет и фактическая готовность.", tags: ["PLAN", "RFQ", "COST"] },
  { code: "AI", title: "Инженерная команда", text: "Профильные агенты анализируют объект и готовят решения владельцу.", tags: ["RAG", "RULES", "GATE"] },
];

const models = [
  { name: "GPT-5.6", maker: "OpenAI", category: "Инженерия", use: "Агенты, код и проектная документация", mode: "CLOUD", tone: "cyan" },
  { name: "Claude", maker: "Anthropic", category: "Документы", use: "Контракты, акты и технические отчёты", mode: "CLOUD", tone: "violet" },
  { name: "Gemini", maker: "Google", category: "Vision", use: "Планы, фото дефектов и визуальный анализ", mode: "VISION", tone: "lime" },
  { name: "Kimi", maker: "Moonshot", category: "Оркестрация", use: "Проекты, расчёты и длинные документы", mode: "CLOUD", tone: "orange" },
  { name: "Nemotron", maker: "NVIDIA", category: "Локальные", use: "Приватный контур и edge-инференс", mode: "EDGE", tone: "lime" },
  { name: "Qwen Coder", maker: "Alibaba", category: "Инженерия", use: "BIM-скрипты, интеграции и автоматизация", mode: "EDGE", tone: "violet" },
];

function TelegramLink({ className = "", children, onClick }) {
  return (
    <a
      className={className}
      href={telegramBotUrl}
      target={telegramIsConfigured ? "_blank" : undefined}
      rel={telegramIsConfigured ? "noreferrer" : undefined}
      onClick={onClick}
    >
      {children}
    </a>
  );
}

export default function App() {
  const [menu, setMenu] = useState(false);
  const [category, setCategory] = useState("Все");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const categories = ["Все", "Инженерия", "Vision", "Документы", "Оркестрация", "Локальные"];
  const filteredModels = useMemo(
    () => models.filter((model) =>
      (category === "Все" || model.category === category)
      && `${model.name} ${model.maker} ${model.use}`.toLowerCase().includes(query.toLowerCase())),
    [category, query],
  );

  function showNotice(text) {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 3200);
  }

  function closeMenu() {
    setMenu(false);
  }

  return (
    <main className="future-site">
      <header className="future-nav">
        <a href="#top" className="brand" aria-label="DV9 Construction Intelligence" onClick={closeMenu}>
          <span className="brand-mark">9</span>
          <span><b>DV9</b><small>CONSTRUCTION INTELLIGENCE</small></span>
        </a>
        <button className="future-menu" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Открыть меню">
          <span /><span />
        </button>
        <nav className={menu ? "open" : ""} aria-label="Главная навигация">
          <a href="#architecture" onClick={closeMenu}>Архитектура</a>
          <a href="#organs" onClick={closeMenu}>Возможности</a>
          <a href="#intelligence" onClick={closeMenu}>AI-слой</a>
          <a href="#protocol" onClick={closeMenu}>Протокол</a>
        </nav>
        <TelegramLink className="future-access">
          <i /> Войти в ядро <span>↗</span>
        </TelegramLink>
      </header>

      <section className="future-hero" id="top">
        <aside className="hero-index" aria-hidden="true"><span>DV9 / 2026</span><i /><b>01</b></aside>
        <div className="hero-atmosphere" aria-hidden="true" />
        <div className="future-hero-copy">
          <div className="future-eyebrow"><i /> ENGINEERING SYSTEM <span>ALPHA</span></div>
          <h1>Стройка<br />обрела<br /><em>нервную систему</em></h1>
          <p>DV9 соединяет строительный объект, краны, документы, экономику и команду AI-агентов в один управляемый организм.</p>
          <div className="future-actions">
            <TelegramLink className="future-primary"><span>Открыть командный центр</span><b>↗</b></TelegramLink>
            <a className="future-secondary" href="#architecture">Исследовать систему <span>↓</span></a>
          </div>
          <div className="trust-line">
            <span><i /> OWNER GATE</span>
            <span>HUMAN IN CONTROL</span>
            <span>RECOVERY LAYER</span>
          </div>
        </div>
        <div className="guardian-core">
          <div className="guardian-frame" aria-hidden="true"><i /><i /><i /></div>
          <img className="guardian-emblem" src="/dv9-hydra-guardian.webp" width="760" height="974" alt="DV9 HYDRO: человек в центре инженерной системы под защитой двух стражей" />
          <div className="guardian-telemetry" aria-hidden="true">
            <span><i /> CODEX / GUARDIAN</span>
            <span className="telemetry-owner"><i /> OWNER NODE / 999</span>
            <span><i /> HYDRA / GUARDIAN</span>
          </div>
        </div>
        <div className="hero-status-strip">
          {[
            ["SYSTEM", "DV9 NEXUS", "PROTOTYPE"],
            ["CONTROL", "OWNER NODE", "999"],
            ["LOGIC", "AI + RULES", "DESIGNED"],
            ["PHYSICAL", "CRANE / SITE", "MODULES"],
          ].map(([label, value, state]) => (
            <article key={label}><small>{label}</small><b>{value}</b><span><i />{state}</span></article>
          ))}
        </div>
      </section>

      <GatewayStatus />

      <section className="future-section architecture-section" id="architecture">
        <div className="section-rail" aria-hidden="true"><span>02</span><i /></div>
        <div className="future-section-head">
          <div><span className="future-kicker">SYSTEM / ARCHITECTURE</span><h2>Не набор экранов.<br /><em>Единый организм.</em></h2></div>
          <p>Каждый модуль видит один объект. Риск влияет на план, готовность деталей — на сроки, документы — на допуск, экономика — на решение владельца.</p>
        </div>
        <div className="architecture-map">
          <div className="architecture-spine" aria-hidden="true"><span>INPUT</span><i /><b>DV9</b><i /><span>RESULT</span></div>
          <div className="architecture-layers">
            {pipeline.map(([id, title, tech, desc], index) => (
              <article key={id} className={index === 3 ? "owner-layer" : ""}>
                <span>{id}</span>
                <div><small>{tech}</small><h3>{title}</h3></div>
                <p>{desc}</p>
                <b>{index === 3 ? "OWNER" : "LINK"}</b>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="future-section organs-section" id="organs">
        <div className="section-rail" aria-hidden="true"><span>03</span><i /></div>
        <div className="future-section-head compact">
          <div><span className="future-kicker">PHYSICAL / DIGITAL</span><h2>Органы строительного интеллекта</h2></div>
          <p>От металла и механики до проектных решений и доказательств выполнения.</p>
        </div>
        <div className="organ-grid">
          {organs.map((organ, index) => (
            <article key={organ.code}>
              <div className="organ-code"><span>0{index + 1}</span><b>{organ.code}</b></div>
              <div className="organ-signal" aria-hidden="true"><i /><i /><i /><i /><i /></div>
              <h3>{organ.title}</h3>
              <p>{organ.text}</p>
              <div className="organ-tags">{organ.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
              <TelegramLink>Открыть модуль <span>↗</span></TelegramLink>
            </article>
          ))}
        </div>
      </section>

      <section className="future-section intelligence-section" id="intelligence">
        <div className="section-rail" aria-hidden="true"><span>04</span><i /></div>
        <div className="future-section-head">
          <div><span className="future-kicker">INTELLIGENCE / ROUTING</span><h2>Мозг выбирается<br />под задачу</h2></div>
          <p>DV9 маршрутизирует инженерный, визуальный, документальный и локальный анализ внутри единого защищённого процесса.</p>
        </div>
        <div className="intelligence-console">
          <div className="console-toolbar">
            <div className="future-filters">
              {categories.map((item) => <button className={category === item ? "active" : ""} key={item} onClick={() => setCategory(item)}>{item}</button>)}
            </div>
            <label><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти профиль" aria-label="Найти профиль модели" /></label>
          </div>
          <div className="model-matrix">
            <div className="matrix-header"><span>Профиль</span><span>Специализация</span><span>Режим</span><span>Действие</span></div>
            {filteredModels.map((model, index) => (
              <article key={model.name}>
                <div className={`model-glyph ${model.tone}`}><span>{String(index + 1).padStart(2, "0")}</span><i /></div>
                <div className="matrix-name"><b>{model.name}</b><small>{model.maker} / {model.category}</small></div>
                <p>{model.use}</p>
                <span className="matrix-mode"><i />{model.mode}</span>
                <button onClick={() => showNotice(`${model.name}: подключение выполняется через защищённый контур DV9`)}>О профиле <span>↗</span></button>
              </article>
            ))}
            {!filteredModels.length && <div className="future-empty">Профиль не найден. Измени фильтр или запрос.</div>}
          </div>
        </div>
      </section>

      <section className="future-section protocol-section" id="protocol">
        <div className="section-rail" aria-hidden="true"><span>05</span><i /></div>
        <div className="protocol-layout">
          <div className="protocol-copy">
            <span className="future-kicker">OWNER / PROTOCOL</span>
            <h2>Автономность<br />без потери<br /><em>контроля</em></h2>
            <p>Профильные агенты проверяют проект параллельно. Критические изменения не проходят дальше, пока владелец не увидит причину и не подтвердит решение.</p>
            <TelegramLink className="future-primary"><span>Запустить AI-команду</span><b>↗</b></TelegramLink>
          </div>
          <div className="decision-terminal">
            <div className="terminal-head"><span>DV9 / DECISION QUEUE</span><b><i /> OWNER APPROVAL</b></div>
            {[
              ["HSE", "Проверить красную зону подъёма", "CRITICAL"],
              ["QA/QC", "Зафиксировать контрольную точку", "REVIEW"],
              ["PLANNER", "Сдвинуть зависимую задачу", "PROPOSAL"],
            ].map(([agent, title, state], index) => (
              <article key={title}>
                <span>0{index + 1}</span>
                <div><small>{agent} / RULE + AI</small><b>{title}</b></div>
                <em className={index === 0 ? "critical" : ""}>{state}</em>
              </article>
            ))}
            <div className="terminal-actions">
              <button onClick={() => showNotice("Демо: решение осталось в очереди владельца")}>Отклонить</button>
              <TelegramLink>Проверить и подтвердить <span>→</span></TelegramLink>
            </div>
            <p><i /> Действия на публичной странице не изменяют проект.</p>
          </div>
        </div>
      </section>

      <section className="future-cta" id="contact">
        <span className="future-kicker">DV9 / NEXT STATE</span>
        <h2>Будущее стройки<br />не ждут. <em>Его собирают.</em></h2>
        <p>Открой DV9 SYSTEM и подключи первый инженерный контур.</p>
        <TelegramLink className="future-primary"><span>Перейти в DV9</span><b>↗</b></TelegramLink>
        <div className="cta-orbit" aria-hidden="true"><span>9</span></div>
      </section>

      <footer className="future-footer">
        <a href="#top" className="brand"><span className="brand-mark">9</span><span><b>DV9</b><small>CONSTRUCTION INTELLIGENCE</small></span></a>
        <p>Кёльн · Европа / Human-controlled engineering intelligence</p>
        <span>ENGINEERING PROTOTYPE · 2026</span>
      </footer>
      {notice && <div className="future-toast" role="status"><i />{notice}</div>}
    </main>
  );
}
