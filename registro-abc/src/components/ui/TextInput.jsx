import "./Field.css";

// Campo de uma linha (texto, data, hora...), com rótulo visível.
export default function TextInput({ label, id, ...props }) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>{label}</label>
      <input id={id} className="field__control" {...props} />
    </div>
  );
}
