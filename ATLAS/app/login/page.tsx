import Link from "next/link";
import { signIn } from "./actions";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="admin-shell">
      <section className="admin-panel auth-panel" id="loginPanel">
        <p className="eyebrow">Panel editorial</p>
        <h1>Ingresar al CMS</h1>
        <p className="admin-copy">Acceso protegido con Supabase Auth y sesiones reales.</p>
        <form action={signIn} className="auth-form">
          <label>
            <span>Email</span>
            <input type="email" name="email" autoComplete="username" required />
          </label>
          <label>
            <span>Contraseña</span>
            <input type="password" name="password" autoComplete="current-password" required />
          </label>
          <button type="submit" className="button button--primary">
            Entrar
          </button>
        </form>
        {params.error === "config" && (
          <p className="hint" data-tone="warning">Faltan las variables de entorno de Supabase en el hosting.</p>
        )}
        {params.error && params.error !== "config" && (
          <p className="hint" data-tone="warning">No se pudo iniciar sesión. Revisa tus credenciales.</p>
        )}
        <Link className="back-link" href="/">
          Volver al sitio
        </Link>
      </section>
    </div>
  );
}
