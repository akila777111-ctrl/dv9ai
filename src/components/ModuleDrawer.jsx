import { useEffect, useRef } from "react";
import ModuleVisual from "./ModuleVisual";

export default function ModuleDrawer({ module, selected, onAdd, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!module || !dialog) return undefined;
    if (!dialog.open) dialog.showModal();

    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => {
      dialog.removeEventListener("close", handleClose);
      if (dialog.open) dialog.close();
    };
  }, [module, onClose]);

  if (!module) return null;

  function closeFromBackdrop(event) {
    if (event.target === dialogRef.current) dialogRef.current.close();
  }

  return (
    <dialog ref={dialogRef} className="module-drawer" onClick={closeFromBackdrop} aria-labelledby="module-drawer-title">
      <div className="module-drawer__panel">
        <button type="button" className="module-drawer__close" onClick={() => dialogRef.current?.close()} aria-label="Закрыть детали модуля">×</button>
        <ModuleVisual variant={module.visual} label={`${module.title}: схема модуля`} />
        <div className="module-drawer__head">
          <span>{module.code} / {module.stage}</span>
          <h2 id="module-drawer-title">{module.title}</h2>
          <p>{module.summary}</p>
        </div>
        <div className="module-drawer__grid">
          <section><h3>Задача</h3><p>{module.problem}</p></section>
          <section><h3>Owner Gate</h3><p>{module.gate}</p></section>
          <section><h3>Входы</h3><ul>{module.inputs.map((item) => <li key={item}>{item}</li>)}</ul></section>
          <section><h3>Результат</h3><ul>{module.outputs.map((item) => <li key={item}>{item}</li>)}</ul></section>
          <section className="module-drawer__flow"><h3>Рабочая цепочка</h3><ol>{module.flow.map((item) => <li key={item}>{item}</li>)}</ol></section>
          <section><h3>Интеграции</h3><p>{module.integrations.join(" · ")}</p><h3>Доказательство</h3><p>{module.evidence}</p></section>
        </div>
        <div className="module-drawer__actions">
          <button
            type="button"
            onClick={() => onAdd(module.id)}
            className={selected ? "is-selected" : ""}
            aria-pressed={selected}
          >
            {selected ? "Убрать из Planёрka" : "Добавить в Planёрka"}
          </button>
          <button type="button" onClick={() => dialogRef.current?.close()}>Закрыть</button>
        </div>
      </div>
    </dialog>
  );
}
