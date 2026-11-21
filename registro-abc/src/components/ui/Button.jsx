import "./Button.css";

// Botão grande e arredondado.
// variant: "primary" (padrão) ou "secondary".
// size: "default" (largura total) ou "small" (compacto, para ações dentro de cartões).
export default function Button({ variant = "primary", size = "default", children, ...props }) {
  return (
    <button className={`btn btn--${variant}${size === "small" ? " btn--small" : ""}`} {...props}>
      {children}
    </button>
  );
}
