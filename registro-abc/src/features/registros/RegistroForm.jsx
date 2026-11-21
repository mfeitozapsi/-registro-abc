import { useEffect, useRef, useState } from "react";
import AppLayout from "../../components/layout/AppLayout.jsx";
import Button from "../../components/ui/Button.jsx";
import TextInput from "../../components/ui/TextInput.jsx";
import TextArea from "../../components/ui/TextArea.jsx";
import ConfirmDialog from "../../components/ui/ConfirmDialog.jsx";
import HelpButton from "../../components/help/HelpButton.jsx";
import ProgressIndicator from "./ProgressIndicator.jsx";
import RegistroRevisao from "./RegistroRevisao.jsx";
import RegistroConcluido from "./RegistroConcluido.jsx";
import { criarRegistro } from "../../services/familiaApi.js";
import { criarSalvador } from "./salvador.js";
import { mensagemDeErroAoSalvar } from "./mensagensErro.js";
import { STEPS } from "./steps.js";
import { HELP } from "./helpContent.js";
import "./RegistroForm.css";

const doisDigitos = (n) => String(n).padStart(2, "0");

// Data e hora atuais, no formato dos campos HTML (aaaa-mm-dd e hh:mm).
function dataHoraAtual() {
  const d = new Date();
  return {
    data: `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`,
    hora: `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`,
  };
}

// Formulário em 5 etapas, seguido da revisão e do salvamento no Supabase.
// Os dados ficam na memória (estado do React) até o salvamento ser confirmado:
// são mantidos ao voltar e avançar (e se o salvamento falhar), e se perdem ao
// sair do formulário. "codigoAcesso" é a credencial da família: nunca exibir ou registrar.
export default function RegistroForm({ codigoAcesso, onSair }) {
  const [etapa, setEtapa] = useState(0);
  // "formulario" | "revisao" | "finalizado"
  const [tela, setTela] = useState("formulario");
  // Verdadeiro quando o usuário veio da revisão para editar uma etapa.
  const [editandoDaRevisao, setEditandoDaRevisao] = useState(false);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroAoSalvar, setErroAoSalvar] = useState(null);
  const [registro, setRegistro] = useState(() => ({
    ...dataHoraAtual(),
    antecedente: "",
    comportamento: "",
    intervencao: "",
    consequencia: "",
  }));
  const tituloRef = useRef(null);
  const salvadorRef = useRef(null);
  if (!salvadorRef.current) {
    salvadorRef.current = criarSalvador((dados) => criarRegistro(codigoAcesso, dados));
  }

  // Só mostra a conclusão depois que o servidor confirmar; em caso de falha,
  // mantém tudo preenchido e permite nova tentativa. Ignora toques repetidos.
  const salvar = async () => {
    const salvador = salvadorRef.current;
    if (salvador.ocupado) return;
    setErroAoSalvar(null);
    setSalvando(true);
    const resposta = await salvador.salvar(registro);
    if (resposta.ignorado) return;
    setSalvando(false);
    if (resposta.ok) {
      setTela("finalizado");
    } else {
      setErroAoSalvar(mensagemDeErroAoSalvar(resposta.erro));
    }
  };

  // A cada etapa nova: volta ao topo e leva o foco ao título (acessibilidade).
  useEffect(() => {
    window.scrollTo(0, 0);
    tituloRef.current?.focus();
  }, [etapa, tela]);

  if (tela === "finalizado") {
    return <RegistroConcluido onVoltarInicio={onSair} />;
  }

  if (tela === "revisao") {
    return (
      <RegistroRevisao
        registro={registro}
        onEditar={(indice) => {
          setErroAoSalvar(null);
          setEtapa(indice);
          setEditandoDaRevisao(true);
          setTela("formulario");
        }}
        onVoltar={() => {
          setErroAoSalvar(null);
          setEtapa(STEPS.length - 1); // volta à última etapa
          setTela("formulario");
        }}
        onSalvar={salvar}
        salvando={salvando}
        erroAoSalvar={erroAoSalvar}
      />
    );
  }

  const atual = STEPS[etapa];
  const ultima = etapa === STEPS.length - 1;
  const atualizar = (campo) => (e) =>
    setRegistro((r) => ({ ...r, [campo]: e.target.value }));

  // Na primeira etapa, "Voltar" sai do registro, e por isso pede confirmação.
  const voltar = () => (etapa === 0 ? setConfirmandoSaida(true) : setEtapa(etapa - 1));
  const avancar = () => (ultima ? setTela("revisao") : setEtapa(etapa + 1));
  const voltarParaRevisao = () => {
    setEditandoDaRevisao(false);
    setTela("revisao");
  };

  return (
    <AppLayout header={<ProgressIndicator atual={etapa + 1} total={STEPS.length} />}>
      <div className="registro__conteudo">
        <div className="registro__titulo-linha">
          <h1 className="registro__titulo" id="titulo-etapa" ref={tituloRef} tabIndex={-1}>
            {atual.title}
          </h1>
          {HELP[atual.id] && <HelpButton titulo={atual.title} conteudo={HELP[atual.id]} />}
        </div>

        {atual.id === "dataHora" ? (
          <>
            <TextInput id="campo-data" type="date" label="Data" value={registro.data} onChange={atualizar("data")} />
            <TextInput id="campo-hora" type="time" label="Horário" value={registro.hora} onChange={atualizar("hora")} />
          </>
        ) : (
          <TextArea
            id={`campo-${atual.id}`}
            labelledBy="titulo-etapa"
            value={registro[atual.id]}
            onChange={atualizar(atual.id)}
          />
        )}
      </div>

      <div className="registro__acoes">
        {editandoDaRevisao ? (
          <Button onClick={voltarParaRevisao}>Voltar à revisão</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={voltar}>Voltar</Button>
            <Button onClick={avancar}>{ultima ? "Revisar" : "Próximo"}</Button>
          </>
        )}
      </div>

      {confirmandoSaida && (
        <ConfirmDialog
          mensagem="Deseja realmente sair do registro? As informações preenchidas até aqui serão perdidas."
          rotuloCancelar="Continuar preenchendo"
          rotuloConfirmar="Sair do registro"
          onCancelar={() => setConfirmandoSaida(false)}
          onConfirmar={onSair}
        />
      )}
    </AppLayout>
  );
}
