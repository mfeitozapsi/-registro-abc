import AppLayout from "../components/layout/AppLayout.jsx";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import BrandSignature from "../components/brand/BrandSignature.jsx";
import { APP_NAME, APP_TAGLINE, ABC_COMPONENTS } from "../config/app.js";
import "./Home.css";

export default function Home({ onNovoRegistro }) {
  return (
    <AppLayout footer={<BrandSignature />}>
      <section className="home__intro">
        <h1 className="home__title">{APP_NAME}</h1>
        <p>{APP_TAGLINE}</p>
        <p>
          O aplicativo permite registrar situações do cotidiano. Durante o
          preenchimento, você encontrará orientações para ajudar em cada parte do registro.
        </p>
      </section>

      <section aria-labelledby="como-funciona" className="home__section">
        <h2 id="como-funciona" className="home__subtitle">Cada registro tem quatro partes</h2>
        <ol className="home__list">
          {ABC_COMPONENTS.map((item) => (
            <li key={item.id}>
              <Card>
                <h3 className="home__item-title">{item.title}</h3>
                <p>{item.description}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <div className="home__action">
        <Button onClick={onNovoRegistro}>Novo registro</Button>
        <Button variant="secondary" disabled>Consultar histórico</Button>
        <p className="home__note">A consulta ao histórico estará disponível nas próximas etapas.</p>
      </div>
    </AppLayout>
  );
}
