import logoMarrom from "../../assets/brand/logo-principal-marrom.png";
import logoClaro from "../../assets/brand/logo-principal-claro.png";
import { PROFESSIONAL } from "../../config/app.js";
import "./BrandSignature.css";

// Assinatura profissional (logotipo completo), discreta.
// tone="light": fundo claro  -> versão marrom (padrão)
// tone="dark" : fundo escuro -> versão clara/creme
// Não recolorir nem distorcer: apenas a largura é definida; a altura é automática.
export default function BrandSignature({ tone = "light" }) {
  const src = tone === "dark" ? logoClaro : logoMarrom;
  return (
    <img
      className="brand-signature"
      src={src}
      alt={`Logotipo de ${PROFESSIONAL.name}, ${PROFESSIONAL.role}`}
      width="1000"
      height="769"
    />
  );
}
