import { useState } from "react";
import Modal from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import "./HelpButton.css";

// Botão "?" que abre a ajuda de um campo. Cada instância é independente.
// conteudo: { explicacao, adequado, inadequado, dica } (a dica é opcional)
export default function HelpButton({ titulo, conteudo }) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button
        type="button"
        className="help-btn"
        aria-label={`Ajuda: ${titulo}`}
        aria-haspopup="dialog"
        onClick={() => setAberto(true)}
      >
        ?
      </button>

      {aberto && (
        <Modal titulo={titulo} onClose={() => setAberto(false)}>
          <section className="help__bloco">
            <h3 className="help__rotulo">Explicação</h3>
            <p>{conteudo.explicacao}</p>
          </section>
          <section className="help__bloco">
            <h3 className="help__rotulo">Exemplo adequado</h3>
            <p>{conteudo.adequado}</p>
          </section>
          <section className="help__bloco">
            <h3 className="help__rotulo">Exemplo inadequado</h3>
            <p>{conteudo.inadequado}</p>
          </section>
          {conteudo.dica && (
            <aside className="help__dica">
              <h3 className="help__rotulo">Dica</h3>
              <p>{conteudo.dica}</p>
            </aside>
          )}
          <Button onClick={() => setAberto(false)}>Fechar</Button>
        </Modal>
      )}
    </>
  );
}
