import { useState } from "react";
import Home from "./pages/Home.jsx";
import RegistroForm from "./features/registros/RegistroForm.jsx";
import TelaAcesso from "./features/acesso/TelaAcesso.jsx";
import { useAcessoFamilia } from "./features/acesso/useAcessoFamilia.js";

// Navegação mínima: verifica o acesso da família (link) e alterna entre a tela
// inicial e o formulário. (Um sistema de rotas será adicionado quando houver
// mais telas.)
export default function App() {
  const acesso = useAcessoFamilia();
  const [tela, setTela] = useState("inicio");

  // Sem acesso válido, o formulário não fica disponível.
  if (acesso.estado !== "valido") {
    return <TelaAcesso estado={acesso.estado} onTentarNovamente={acesso.tentarNovamente} />;
  }

  if (tela === "registro") {
    return <RegistroForm codigoAcesso={acesso.codigo} onSair={() => setTela("inicio")} />;
  }
  return <Home onNovoRegistro={() => setTela("registro")} />;
}
