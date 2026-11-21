import "./Field.css";

// Campo de texto amplo. O rótulo é fornecido por outro elemento da tela
// (por exemplo, o título da etapa) através de "labelledBy".
export default function TextArea({ id, labelledBy, ...props }) {
  return (
    <div className="field">
      <textarea
        id={id}
        className="field__control field__control--area"
        aria-labelledby={labelledBy}
        {...props}
      />
    </div>
  );
}
