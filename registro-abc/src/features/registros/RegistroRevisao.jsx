import { useEffect, useRef } from "react";
import AppLayout from "../../components/layout/AppLayout.jsx";
import Button from "../../components/ui/Button.jsx";
import Card from "../../components/ui/Card.jsx";
import { STEPS } from "./steps.js";
import "./RegistroForm.css";
import "./RegistroRevisao.css";

// "2026-11-20" + "14:35" -> "20/11/2026 às 14:35"
function formatarDataHora(data, hora) {
  const [a, m, d] = (data || "").split("-");
  const dataBr = a && m && d ? `${d}/${m}/${a}` : "";
  return [dataBr, hora && (dataBr ? `às ${hora}` : hora)].filter(Boolean).join(" ");
}

function conteudoDaEtapa(etapa, registro) {
  return etapa.id === "dataHora"
    ? formatarDataHora(registro.data, registro.hora)
    : registro[etapa.id].trim();
}

// Tela de revisão: apenas MOSTRA os dados. Nada é alterado aqui;
// para mudar algo, "Editar" leva de volta à etapa correspondente.
export default function RegistroRevisao({ registro, onEditar, onVoltar, onSalvar, salvando = false, erroAoSalvar = null }) {
  const tituloRef = useRef(null);
  const avisoRef = useRef(null);
  useEffect(() => {
    window.scrollTo(0, 0);
    tituloRef.current?.focus();
  }, []);

  // Quando o salvamento falha, leva a atenção (e a leitura) à mensagem.
  useEffect(() => {
    if (erroAoSalvar) avisoRef.current?.focus();
  }, [erroAoSalvar]);

  return (
    <AppLayout>
      <div className="registro__conteudo">
        <div className="revisao__intro">
          <h1 className="registro__titulo" ref={tituloRef} tabIndex={-1}>Revise seu registro</h1>
          <p>Confira as informações antes de finalizar.</p>
        </div>

        <ul className="revisao__lista">
          {STEPS.map((etapa, indice) => {
            const texto = conteudoDaEtapa(etapa, registro);
            return (
              <li key={etapa.id}>
                <Card>
                  <div className="revisao__cabecalho">
                    <h2 className="revisao__titulo-cartao">{etapa.title}</h2>
                    <Button
                      variant="secondary"
                      size="small"
                      aria-label={`Editar ${etapa.title}`}
                      disabled={salvando}
                      onClick={() => onEditar(indice)}
                    >
                      Editar
                    </Button>
                  </div>
                  {texto ? (
                    <p className="revisao__texto">{texto}</p>
                  ) : (
                    <p className="revisao__texto revisao__texto--vazio">Não preenchido</p>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>

        {erroAoSalvar && (
          <div className="revisao__aviso" role="alert" ref={avisoRef} tabIndex={-1}>
            <p>{erroAoSalvar}</p>
          </div>
        )}
        {salvando && <p className="revisao__status" role="status">Salvando seu registro. Aguarde…</p>}
      </div>

      <div className="registro__acoes registro__acoes--coluna">
        <Button onClick={onSalvar} disabled={salvando} aria-busy={salvando}>
          {salvando ? "Salvando…" : "Salvar registro"}
        </Button>
        <Button variant="secondary" onClick={onVoltar} disabled={salvando}>Voltar</Button>
      </div>
    </AppLayout>
  );
}
