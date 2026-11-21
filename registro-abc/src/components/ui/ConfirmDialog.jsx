import Modal from "./Modal.jsx";
import Button from "./Button.jsx";
import "./ConfirmDialog.css";

// Janela de confirmação com duas opções.
// Fechar sem escolher (Esc ou toque fora) equivale a cancelar.
export default function ConfirmDialog({ mensagem, rotuloCancelar, rotuloConfirmar, onCancelar, onConfirmar }) {
  return (
    <Modal rotulo="Confirmação" onClose={onCancelar}>
      <p>{mensagem}</p>
      <div className="confirm__acoes">
        <Button onClick={onCancelar}>{rotuloCancelar}</Button>
        <Button variant="secondary" onClick={onConfirmar}>{rotuloConfirmar}</Button>
      </div>
    </Modal>
  );
}
