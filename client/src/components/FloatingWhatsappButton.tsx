import { useState } from "react";
import { buildWhatsappUrl, type WhatsappAction, type WhatsappContext, WHATSAPP_NUMBER } from "../config/contact";

const whatsappOptions: Array<{ action: WhatsappAction; label: string }> = [
  { action: "consultar_materia", label: "Consultar por esta materia" },
  { action: "reservar_tema", label: "Reservar clase de este tema" },
  { action: "enviar_tarea", label: "Enviar foto de mi tarea" },
  { action: "consultar_disponibilidad", label: "Consultar disponibilidad" },
  { action: "plan_examen", label: "Pedir plan para examen" },
];

export function FloatingWhatsappButton({
  context,
  phoneNumber = WHATSAPP_NUMBER,
}: {
  context?: WhatsappContext;
  phoneNumber?: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const number = (phoneNumber || WHATSAPP_NUMBER).replace(/\D/g, "");

  return (
    <div className={`floating-whatsapp ${isOpen ? "open" : ""}`}>
      <div className="floating-whatsapp-menu" aria-label="Opciones de WhatsApp">
        {whatsappOptions.map((option) => (
          <a
            href={buildWhatsappUrl(option.action, context, number)}
            key={option.action}
            target="_blank"
            rel="noreferrer"
          >
            {option.label}
          </a>
        ))}
      </div>
      <button
        className="floating-whatsapp-button"
        type="button"
        aria-expanded={isOpen}
        aria-label="Abrir consultas por WhatsApp"
        onClick={() => setIsOpen((current) => !current)}
      >
        WA
      </button>
    </div>
  );
}
