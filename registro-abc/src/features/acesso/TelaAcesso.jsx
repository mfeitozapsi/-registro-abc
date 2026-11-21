import { useEffect, useRef } from "react";
import AppLayout from "../../components/layout/AppLayout.jsx";
import Button from "../../components/ui/Button.jsx";
import "../registros/RegistroForm.css";

// Tela exibida quando a família ainda NÃO pode usar o formulário.
// Mensagens simples, sem detalhes técnicos e sem o código de acesso.
const TELAS = {
  verificando: {
    titulo: "Verificando seu acesso",
    texto: "Aguarde um instante.",
  },
  sem_link: {
    titulo: "Acesso por link",
    texto: "Para usar o Registro ABC, abra o link de acesso enviado pelo seu psicólogo.",
  },
  invalido: {
    titulo: "Link de acesso inválido",
    texto: "Este link não está ativo ou não é válido. Peça um novo link ao seu psicólogo.",
  },
  bloqueado: {
    titulo: "Acesso temporariamente bloqueado",
    texto: "Houve muitas tentativas em pouco tempo. Aguarde alguns minutos e abra o link novamente.",
  },
  erro: {
    titulo: "Não foi possível conectar",
    texto: "Verifique sua conexão com a internet e tente novamente.",
    tentarNovamente: true,
  },
  indisponivel: {
    titulo: "Aplicativo indisponível",
    texto: "O aplicativo não está disponível no momento. Tente novamente mais tarde.",
  },
};

export default function TelaAcesso({ estado, onTentarNovamente }) {
  const tela = TELAS[estado] ?? TELAS.erro;
  const tituloRef = useRef(null);

  useEffect(() => {
    tituloRef.current?.focus();
  }, [estado]);

  return (
    <AppLayout>
      <div className="registro__conteudo" role="status" aria-live="polite">
        <h1 className="registro__titulo" ref={tituloRef} tabIndex={-1}>{tela.titulo}</h1>
        <p>{tela.texto}</p>
      </div>
      {tela.tentarNovamente && (
        <div className="registro__acoes">
          <Button onClick={onTentarNovamente}>Tentar novamente</Button>
        </div>
      )}
    </AppLayout>
  );
}
