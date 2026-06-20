export const WHATSAPP_NUMBER = "5493446643467";

export type WhatsappAction =
  | "consultar_materia"
  | "reservar_tema"
  | "enviar_tarea"
  | "consultar_disponibilidad"
  | "plan_examen";

export interface WhatsappContext {
  materia?: string | null;
  nivel?: string | null;
  anio?: string | null;
  tema?: string | null;
}

function compact(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function whatsappMessage(action: WhatsappAction, context: WhatsappContext = {}) {
  const materia = context.materia || "Matemática";
  const tema = context.tema || "ecuaciones";
  const curso = compact([context.nivel, context.anio ? `de ${context.anio}` : null]);

  if (action === "consultar_materia") {
    return `Hola, quiero consultar por clases de ${materia}.`;
  }

  if (action === "reservar_tema") {
    return `Hola, quiero reservar una clase sobre ${tema} de ${materia}${curso ? ` ${curso}` : ""}.`;
  }

  if (action === "enviar_tarea") {
    return "Hola, quiero enviar una foto de mi tarea para consultar si pueden ayudarme.";
  }

  if (action === "consultar_disponibilidad") {
    return "Hola, quiero consultar disponibilidad para clases particulares.";
  }

  return "Hola, quiero pedir un plan para preparar un examen.";
}

export function buildWhatsappUrl(
  action: WhatsappAction,
  context: WhatsappContext = {},
  phoneNumber = WHATSAPP_NUMBER,
) {
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(whatsappMessage(action, context))}`;
}
