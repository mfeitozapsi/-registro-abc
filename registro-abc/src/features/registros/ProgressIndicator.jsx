import "./ProgressIndicator.css";

// "Etapa 2 de 5" + barra de progresso discreta.
export default function ProgressIndicator({ atual, total }) {
  return (
    <div className="progress">
      <p className="progress__label">Etapa {atual} de {total}</p>
      <div
        className="progress__track"
        role="progressbar"
        aria-label="Progresso do registro"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={atual}
      >
        <div className="progress__fill" style={{ width: `${(atual / total) * 100}%` }} />
      </div>
    </div>
  );
}
