import "./AppLayout.css";

// Estrutura reutilizável de todas as telas: cabeçalho, conteúdo e rodapé.
// "header" e "footer" são opcionais; "children" é o conteúdo da tela.
export default function AppLayout({ header, footer, children }) {
  return (
    <div className="layout">
      {header && <header className="layout__header">{header}</header>}
      <main className="layout__main">{children}</main>
      {footer && <footer className="layout__footer">{footer}</footer>}
    </div>
  );
}
