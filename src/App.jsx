import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import GatewayStatus from "./components/GatewayStatus";
import ModuleCard from "./components/ModuleCard";
import ModuleDrawer from "./components/ModuleDrawer";
import ModuleVisual from "./components/ModuleVisual";
import PlanerkaSection from "./components/PlanerkaSection";
import { defaultPlanerkaResources, dv9Modules } from "./data/modules";

const telegramBotUrl = import.meta.env.VITE_TELEGRAM_BOT_URL || "https://t.me/DV9_SYSTEMbot";
const telegramIsConfigured = telegramBotUrl.startsWith("https://t.me/");

const pipeline = [
  ["01", "Принять цель", "OWNER GOAL", "Зафиксировать результат, ограничения и критерии успеха."],
  ["02", "Разложить", "PLANЁRKA · DAG", "Построить задачи, зависимости и критический путь без лишней активности."],
  ["03", "Расчистить путь", "READINESS · HANDOFF", "Сначала снять блокеры, которые удерживают остальные компоненты."],
  ["04", "Выполнить", "HYDRA · ORGANS", "Назначить безопасное действие подходящей технике или AI-профилю."],
  ["05", "Подтвердить", "OWNER NODE 999", "Остановить внешнее, физическое или необратимое действие у Owner Gate."],
  ["06", "Доказать", "RECEIPT · VERIFY", "Признать действие полезным только после принятого доказательства."],
];

const models = [
  { name: "GPT-5.6", maker: "OpenAI", category: "Инженерия", use: "Агенты, код и проектная документация", mode: "CLOUD", tone: "cyan" },
  { name: "Claude", maker: "Anthropic", category: "Документы", use: "Контракты, акты и технические отчёты", mode: "CLOUD", tone: "violet" },
  { name: "Gemini", maker: "Google", category: "Vision", use: "Планы, фото дефектов и визуальный анализ", mode: "VISION", tone: "lime" },
  { name: "Kimi", maker: "Moonshot", category: "Оркестрация", use: "Проекты, расчёты и длинные документы", mode: "CLOUD", tone: "orange" },
  { name: "Nemotron", maker: "NVIDIA", category: "Локальные", use: "Приватный контур и edge-инференс", mode: "EDGE", tone: "lime" },
  { name: "Qwen Coder", maker: "Alibaba", category: "Инженерия", use: "BIM-скрипты, интеграции и автоматизация", mode: "EDGE", tone: "violet" },
];

function TelegramLink({ className = "", children }) {
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

export default function App() {
  const [menu, setMenu] = useState(false);
  const [category, setCategory] = useState("Все");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [activeModule, setActiveModule] = useState(null);
  const [plannerResources, setPlannerResources] = useState(defaultPlanerkaResources);
  const categories = ["Все", "Инженерия", "Vision", "Документы", "Оркестрация", "Локальные"];
  const closeDrawer = useCallback(() => setActiveModule(null), []);

  const filteredModels = useMemo(
    () => models.filter((model) =>
      (category === "Все" || model.category === category)
      && `${model.name} ${model.maker} ${model.use}`.toLowerCase().includes(query.toLowerCase())),
    [category, query],
  );

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!menu) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menu]);

  function closeMenu() {
    setMenu(false);
  }

  function togglePlannerModule(moduleId, focusPlanner = true) {
    setPlannerResources((current) =>
      current.includes(moduleId)
        ? current.filter((id) => id !== moduleId)
        : [...current, moduleId],
    );
    const module = dv9Modules.find((item) => item.id === moduleId);
    setNotice(`${module?.title || "Модуль"}: состав Planёрka обновлён`);
    if (focusPlanner) {
      window.setTimeout(() => document.querySelector("#planerka")?.scrollIntoView({ behavior: "smooth" }), 80);
    }
  }

  return (
    <div className="future-site">
      <header className="future-nav">
        <a href="#top" className="brand" aria-label="DV9 Construction Intelligence" onClick={closeMenu}>
          <span className="brand-mark">9</span>
          <span><b>DV9</b><small>CONSTRUCTION INTELLIGENCE</small></span>
        </a>
        <button className="future-menu" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label={menu ? "Закрыть меню" : "Открыть меню"}>
          <span /><span />
        </button>
        <nav className={menu ? "open" : ""} aria-label="Главная навигация">
          <a href="#architecture" onClick={closeMenu}>Архитектура</a>
          <a href="#organs" onClick={closeMenu}>Органы</a>
          <a href="#planerka" onClick={closeMenu}>Planёрka</a>
          <a href="#intelligence" onClick={closeMenu}>AI-команда</a>
          <a href="#protocol" onClick={closeMenu}>Контроль</a>
        </nav>
        <TelegramLink className="future-access"><i /> Связаться с DV9 <span>↗</span></TelegramLink>
      </header>

      <main>

      <section className="future-hero" id="top">
        <aside className="hero-index" aria-hidden="true"><span>DV9 / 2026</span><i /><b>01</b></aside>
        <div className="hero-atmosphere" aria-hidden="true" />
        <div className="future-hero-copy">
          <div className="future-eyebrow"><i /> ENGINEERING SYSTEM <span>PROTOTYPE</span></div>
          <h1>Стройка<br />обрела<br /><em>нервную систему</em></h1>
          <p>DV9 связывает цель владельца, строительный объект, технику, документы и AI-команду в один проверяемый рабочий процесс.</p>
          <div className="future-actions">
            <a className="future-primary" href="#planerka"><span>Задать цель системе</span><b>↓</b></a>
            <a className="future-secondary" href="#organs">Исследовать органы <span>↓</span></a>
          </div>
          <div className="trust-line">
            <span><i /> OWNER GATE</span>
            <span>FAIL CLOSED</span>
            <span>EVIDENCE FIRST</span>
          </div>
        </div>
        <div className="guardian-core">
          <div className="guardian-frame" aria-hidden="true"><i /><i /><i /></div>
          <img
            className="guardian-emblem"
            src="/dv9-hydra-guardian.webp"
            width="760"
            height="974"
            alt="DV9 HYDRO: человек в центре инженерной системы под защитой двух стражей"
            fetchPriority="high"
          />
          <div className="guardian-telemetry" aria-hidden="true">
            <span><i /> CODEX / ENGINEERING</span>
            <span className="telemetry-owner"><i /> OWNER NODE / 999</span>
            <span><i /> HYDRA / GOVERNANCE</span>
          </div>
        </div>
        <div className="hero-status-strip">
          {[
            ["SYSTEM", "DV9 NEXUS", "PROTOTYPE"],
            ["CONTROL", "OWNER NODE", "999"],
            ["LOGIC", "GOAL → EVIDENCE", "DESIGNED"],
            ["PHYSICAL", "CRANE / SITE", "CONCEPTS"],
          ].map(([label, value, state]) => (
            <article key={label}><small>{label}</small><b>{value}</b><span><i />{state}</span></article>
          ))}
        </div>
      </section>

      <GatewayStatus />

      <section className="future-section architecture-section" id="architecture">
        <div className="section-rail" aria-hidden="true"><span>02</span><i /></div>
        <div className="future-section-head">
          <div><span className="future-kicker">SYSTEM / ARCHITECTURE</span><h2>Цель проходит<br /><em>сквозь весь организм.</em></h2></div>
          <p>Planёрka не создаёт занятость ради занятости. Она связывает каждое действие с целью, повышает приоритет блокеров критического пути и требует evidence перед DONE.</p>
        </div>
        <div className="section-visual-wide">
          <ModuleVisual variant="planerka" label="Архитектура DV9: цель, компоненты и доказательства" />
          <div><span>OWNER</span><b>→</b><span>PLANЁRKA</span><b>→</b><span>HYDRA ORGANS</span><b>→</b><span>RECEIPTS</span></div>
        </div>
        <div className="architecture-map">
          <div className="architecture-spine" aria-hidden="true"><span>GOAL</span><i /><b>DV9</b><i /><span>PROOF</span></div>
          <div className="architecture-layers">
            {pipeline.map(([id, title, tech, desc], index) => (
              <article key={id} className={index === 4 ? "owner-layer" : ""}>
                <span>{id}</span>
                <div><small>{tech}</small><h3>{title}</h3></div>
                <p>{desc}</p>
                <b>{index === 4 ? "OWNER" : index === 5 ? "VERIFY" : "LINK"}</b>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="future-section organs-section" id="organs">
        <div className="section-rail" aria-hidden="true"><span>03</span><i /></div>
        <div className="future-section-head compact">
          <div><span className="future-kicker">PHYSICAL / DIGITAL</span><h2>Органы строительного интеллекта</h2></div>
          <p>Восемь специализированных контуров. Каждый показывает вход, результат, ограничение и доказательство — без декоративных обещаний.</p>
        </div>
        <div className="organ-grid organ-grid--modules">
          {dv9Modules.map((module, index) => (
            <ModuleCard
              key={module.id}
              module={module}
              index={index}
              selected={plannerResources.includes(module.id)}
              onOpen={setActiveModule}
              onAdd={togglePlannerModule}
            />
          ))}
        </div>
      </section>

      <PlanerkaSection
        modules={dv9Modules}
        resourceIds={plannerResources}
        onToggleResource={(moduleId) => togglePlannerModule(moduleId, false)}
      />

      <section className="future-section intelligence-section" id="intelligence">
        <div className="section-rail" aria-hidden="true"><span>05</span><i /></div>
        <div className="future-section-head">
          <div><span className="future-kicker">INTELLIGENCE / ROUTING</span><h2>Мозг выбирается<br />под задачу</h2></div>
          <p>AI-профиль — не начальник системы. Planёрka назначает его по типу работы, а HYDRA сохраняет политику, контекст, лимиты и проверку результата.</p>
        </div>
        <div className="intelligence-layout">
          <ModuleVisual variant="vision" label="Маршрутизация AI-профилей по задачам DV9" />
          <div className="intelligence-proof">
            <span>ROUTING RULE</span>
            <b>ЗАДАЧА → ПРОФИЛЬ → ПРОВЕРКА</b>
            <p>Статусы ниже описывают предназначение профиля, а не заявляют активное подключение к production.</p>
          </div>
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
                <button onClick={() => setNotice(`${model.name}: профиль доступен для назначения; runtime-подключение проверяется отдельно`)}>Показать роль <span>↗</span></button>
              </article>
            ))}
            {!filteredModels.length && <div className="future-empty">Профиль не найден. Измени фильтр или запрос.</div>}
          </div>
        </div>
      </section>

      <section className="future-section protocol-section" id="protocol">
        <div className="section-rail" aria-hidden="true"><span>06</span><i /></div>
        <div className="protocol-layout">
          <div className="protocol-copy">
            <span className="future-kicker">OWNER / PROTOCOL</span>
            <h2>Автономность<br />без потери<br /><em>контроля</em></h2>
            <p>Компоненты могут анализировать, строить черновики и передавать handoff. Техника, деньги, сообщения, публикация и необратимые изменения останавливаются у Owner Gate.</p>
            <a className="future-primary" href="#planerka"><span>Открыть очередь решений</span><b>↑</b></a>
          </div>
          <div className="protocol-stack">
            <ModuleVisual variant="quality" label="Owner Gate и проверка доказательств DV9" />
            <div className="decision-terminal">
              <div className="terminal-head"><span>DV9 / DECISION QUEUE</span><b><i /> OWNER APPROVAL</b></div>
              {[
                ["CRANE-X", "Разрешить физический подъём", "L3 / HOLD"],
                ["QA/QC", "Закрыть контрольную точку с evidence", "L3 / REVIEW"],
                ["PLANЁRKA", "Принять новый критический путь", "L2 / PROPOSAL"],
              ].map(([agent, title, state], index) => (
                <article key={title}>
                  <span>0{index + 1}</span>
                  <div><small>{agent} / POLICY + EVIDENCE</small><b>{title}</b></div>
                  <em className={index === 0 ? "critical" : ""}>{state}</em>
                </article>
              ))}
              <div className="terminal-actions">
                <button onClick={() => setNotice("Демо: решение осталось у владельца, внешнее действие не выполнено")}>Оставить на HOLD</button>
                <a href="#planerka">Проверить в Planёрka <span>→</span></a>
              </div>
              <p><i /> Публичная страница не запускает технику и не изменяет реальный проект.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="future-section evidence-section" id="evidence">
        <div className="section-rail" aria-hidden="true"><span>07</span><i /></div>
        <div className="future-section-head compact">
          <div><span className="future-kicker">USEFUL ACTION / EVIDENCE</span><h2>Полезность считается после результата</h2></div>
          <p>Сообщения, heartbeat и повторный анализ не повышают коэффициент. В числитель попадает только проверенное действие с receipt, которое продвинуло цель, сняло блокер или снизило доказанный риск.</p>
        </div>
        <div className="evidence-grid">
          {[
            ["01", "Связь с целью", "У каждого действия есть goalId, ожидаемый эффект и критерий приёмки."],
            ["02", "Расчистка пути", "Приоритет получают действия, которые открывают критические зависимости другим."],
            ["03", "Независимая проверка", "Исполнитель не назначает себе DONE и не оценивает собственный результат."],
            ["04", "Стоимость ошибки", "Переделка, повтор, простой и вред уменьшают фактический коэффициент."],
          ].map(([id, title, text]) => <article key={id}><span>{id}</span><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      <section className="future-cta" id="contact">
        <span className="future-kicker">DV9 / NEXT STATE</span>
        <h2>Не больше действий.<br /><em>Больше полезного результата.</em></h2>
        <p>Planёрka уже показывает безопасный цикл цели на этой странице. Реальные внешние действия остаются за защищённым Cockpit и подтверждением OWNER NODE 999.</p>
        <TelegramLink className="future-primary"><span>Открыть DV9 в Telegram</span><b>↗</b></TelegramLink>
        <div className="cta-orbit" aria-hidden="true"><span>9</span></div>
      </section>
      </main>

      <footer className="future-footer">
        <a href="#top" className="brand"><span className="brand-mark">9</span><span><b>DV9</b><small>CONSTRUCTION INTELLIGENCE</small></span></a>
        <p>Кёльн · Европа / Human-controlled engineering intelligence</p>
        <span>ENGINEERING PROTOTYPE · 2026</span>
      </footer>

      <ModuleDrawer
        module={activeModule}
        selected={activeModule ? plannerResources.includes(activeModule.id) : false}
        onAdd={(moduleId) => togglePlannerModule(moduleId, false)}
        onClose={closeDrawer}
      />
      {notice && <div className="future-toast" role="status"><i />{notice}</div>}
    </div>
  );
}
