import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

interface AuthUser {
  id: string;
  email: string;
  role: "SUPERADMIN" | "ADMIN";
  isActive: boolean;
}

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", {
      credentials: "include",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { user: AuthUser } | null) => {
        setUser(data?.user ?? null);
      })
      .finally(() => {
        setIsCheckingSession(false);
      });
  }, []);

  return (
    <main className="app-shell">
      <section className="intro">
        <p className="eyebrow">aulaCiencias</p>
        <h1>Reservas de turnos para clases particulares</h1>
        <p>
          Base fullstack lista para crecer con agenda, disponibilidad y gestion
          de reservas.
        </p>
        <p className="session-status">
          {isCheckingSession
            ? "Verificando sesion..."
            : user
              ? `Sesion activa: ${user.email}`
              : "Sin sesion administrativa activa"}
        </p>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
