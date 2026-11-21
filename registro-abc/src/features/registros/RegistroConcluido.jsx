import { useEffect, useRef } from "react";
import AppLayout from "../../components/layout/AppLayout.jsx";
import Button from "../../components/ui/Button.jsx";
import "./RegistroForm.css";

// Exibida somente depois que o servidor confirma o salvamento do registro.
export default function RegistroConcluido({ onVoltarInicio }) {
  const tituloRef = useRef(null);
  useEffect(() => {
    window.scrollTo(0, 0);
    tituloRef.current?.focus();
  }, []);

  return (
    <AppLayout>
      <div className="registro__conteudo">
        <h1 className="registro__titulo" ref={tituloRef} tabIndex={-1}>
          Registro finalizado
        </h1>
        <p>Seu registro foi salvo com sucesso.</p>
      </div>
      <div className="registro__acoes registro__acoes--coluna">
        <Button onClick={onVoltarInicio}>Voltar ao início</Button>
      </div>
    </AppLayout>
  );
}
