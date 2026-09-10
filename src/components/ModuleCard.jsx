import ModuleVisual from "./ModuleVisual";

export default function ModuleCard({ module, index, selected, onOpen, onAdd }) {
  return (
    <article className="module-card">
      <div className="module-card__visual">
        <ModuleVisual variant={module.visual} label={`${module.title}: инженерная схема`} compact />
        <div className="module-card__telemetry">
          <span>0{index + 1}</span>
          <b>{module.code}</b>
          <em>{module.stage}</em>
        </div>
      </div>
      <div className="module-card__body">
        <h3>{module.title}</h3>
        <p>{module.summary}</p>
        <div className="module-card__io">
          <span><small>Вход</small>{module.inputs[0]}</span>
          <span><small>Результат</small>{module.outputs[0]}</span>
        </div>
        <div className="module-card__gate"><i />{module.gate}</div>
        <div className="module-card__actions">
          <button type="button" onClick={() => onOpen(module)}>Подробнее</button>
          <button
            type="button"
            className={selected ? "is-selected" : ""}
            onClick={() => onAdd(module.id)}
            aria-pressed={selected}
          >
            {selected ? "В Planёрka ✓" : "Добавить в Planёрka"}
          </button>
        </div>
      </div>
    </article>
  );
}
