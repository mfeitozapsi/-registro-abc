import { useEffect, useId, useRef } from "react";
import "./Modal.css";

// Janela sobreposta reutilizável (usa o <dialog> nativo do navegador, que já
// prende o foco dentro da janela e fecha com a tecla Esc).
// - Em smartphones aparece colada na base da tela; em telas maiores, centralizada.
// - Fecha ao tocar fora do painel, com Esc ou pelo que o conteúdo chamar.
// - "titulo" é opcional; sem ele, informe "rotulo" (leitores de tela).
// Deve ser renderizada apenas enquanto estiver aberta.
export default function Modal({ titulo, rotulo, onClose, children }) {
  const ref = useRef(null);
  const tituloId = useId();

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titulo ? tituloId : undefined}
      aria-label={titulo ? undefined : rotulo}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      <div className="modal__painel">
        {titulo && <h2 id={tituloId} className="modal__titulo">{titulo}</h2>}
        {children}
      </div>
    </dialog>
  );
}
