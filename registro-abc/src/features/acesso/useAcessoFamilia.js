import { useCallback, useEffect, useRef, useState } from "react";
import { validarAcesso } from "../../services/familiaApi.js";
import {
  limparCodigoArmazenado,
  obterCodigoDeEntrada,
} from "./codigoAcesso.js";
import { estadoPelaResposta } from "./estadoAcesso.js";

// Estados: "verificando" | "sem_link" | "valido" | "invalido" | "bloqueado" |
//          "indisponivel" | "erro"
// O código só é entregue ao restante do app quando o estado é "valido".
export function useAcessoFamilia() {
  const [estado, setEstado] = useState("verificando");
  const codigoRef = useRef(null);
  const iniciou = useRef(false);
  const verificacaoAtual = useRef(0); // ignora respostas de verificações antigas

  const verificar = useCallback(async (codigo) => {
    const numero = ++verificacaoAtual.current;
    setEstado("verificando");
    const resposta = await validarAcesso(codigo);
    if (numero !== verificacaoAtual.current) return;

    const novo = estadoPelaResposta(resposta);
    if (novo === "invalido") {
      limparCodigoArmazenado(); // não insistir em um código que o servidor recusou
      codigoRef.current = null;
    }
    setEstado(novo);
  }, []);

  const iniciar = useCallback(() => {
    const entrada = obterCodigoDeEntrada();
    if (!entrada.codigo) {
      verificacaoAtual.current++;
      codigoRef.current = null;
      setEstado(entrada.origem === "link" ? "invalido" : "sem_link");
      return;
    }
    codigoRef.current = entrada.codigo;
    verificar(entrada.codigo);
  }, [verificar]);

  // Verificação inicial (uma única vez, mesmo com o StrictMode do React).
  useEffect(() => {
    if (iniciou.current) return;
    iniciou.current = true;
    iniciar();
  }, [iniciar]);

  // Se a família abrir outro link com o app já aberto, verifica o novo código.
  useEffect(() => {
    const aoMudarHash = () => {
      if (window.location.hash.startsWith("#/f/")) iniciar();
    };
    window.addEventListener("hashchange", aoMudarHash);
    return () => window.removeEventListener("hashchange", aoMudarHash);
  }, [iniciar]);

  const tentarNovamente = useCallback(() => {
    if (codigoRef.current) verificar(codigoRef.current);
  }, [verificar]);

  return {
    estado,
    codigo: estado === "valido" ? codigoRef.current : null,
    tentarNovamente,
  };
}
