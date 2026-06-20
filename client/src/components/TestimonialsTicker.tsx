const audiences = [
  ["Mamá de alumno de 2.º año", "madre"],
  ["Alumno de secundaria", "alumno"],
  ["Papá de ingresante", "padre"],
  ["Alumna de primaria", "alumna"],
  ["Familia de 5.º año", "familia"],
  ["Estudiante de 3.º año", "alumno"],
  ["Mamá de alumna de 6.º", "madre"],
  ["Alumno de primer año", "alumno"],
  ["Familia de nivel primario", "familia"],
  ["Estudiante preuniversitaria", "alumna"],
  ["Papá de alumno de 4.º", "padre"],
  ["Alumna de secundaria", "alumna"],
] as const;

// Cada fragmento tiene como máximo dos palabras. El generador descarta cualquier
// texto que repita una secuencia de tres palabras de otro comentario.
const subjects = [
  "La tutoría", "El refuerzo", "Cada encuentro", "La explicación",
  "El seguimiento", "La práctica", "Este espacio", "La profesora",
  "El repaso", "La propuesta", "Su paciencia", "La metodología",
  "El trabajo", "La orientación", "El taller", "La dinámica",
  "El apoyo", "La ejercitación", "Este proceso", "La enseñanza",
  "La preparación", "El acompañamiento", "La guía", "La experiencia",
  "El curso", "La clase", "La devolución", "El material",
  "La consulta", "El entrenamiento", "La revisión", "El abordaje",
  "La planificación", "El intercambio", "La dedicación", "El ritmo",
  "La estrategia", "La continuidad", "La atención", "El aprendizaje",
];

const verbs = [
  "aclaró", "ordenó", "simplificó", "destrabó", "fortaleció",
  "encaminó", "mejoró", "transformó", "facilitó", "afianzó",
  "resolvió", "potenció", "renovó", "despejó", "organizó",
  "impulsó", "acomodó", "consolidó", "activó", "recuperó",
  "iluminó", "agilizó", "hizo accesible", "volvió comprensible", "dejó claro",
];

const focuses = [
  "temas complejos", "dudas antiguas", "conceptos difíciles", "ejercicios pendientes",
  "el razonamiento", "la confianza", "hábitos útiles", "errores frecuentes",
  "la concentración", "contenidos nuevos", "la autonomía", "el estudio diario",
  "problemas extensos", "la comprensión", "el método", "las evaluaciones",
  "la base", "los procedimientos", "la resolución", "cada desafío",
];

const endings = [
  "sin presiones", "con entusiasmo", "paso a paso", "de forma práctica",
  "con seguridad", "sin frustración", "con claridad", "a su ritmo",
  "con buenos resultados", "de manera amena", "con más soltura", "sin memorizar",
  "con criterio propio", "de forma ordenada", "con mucha calma", "sin perderse",
  "con creciente interés", "de manera independiente", "con energía renovada", "sin bloqueos",
  "con objetivos claros", "de forma natural", "con mayor precisión", "sin apurarse",
  "con nuevas herramientas", "de manera constante", "con genuina curiosidad", "sin rendirse",
  "con avances visibles", "de forma sencilla", "con actitud positiva", "sin tanta ansiedad",
  "con recursos concretos", "de manera progresiva", "con firme confianza", "sin quedarse atrás",
  "con notable fluidez", "de forma responsable", "con renovadas ganas", "sin depender tanto",
];

const normalizeWords = (text: string) =>
  text.toLocaleLowerCase("es").match(/[\p{L}\p{N}]+/gu) ?? [];

const usedPhrases = new Set<string>();
const comments: string[] = [];

for (let seed = 0; comments.length < 200; seed += 1) {
  const subject = subjects[seed % subjects.length];
  const verb = verbs[(seed * 7 + Math.floor(seed / subjects.length)) % verbs.length];
  const focus = focuses[(seed * 11 + Math.floor(seed / verbs.length)) % focuses.length];
  const ending = endings[(seed * 13 + Math.floor(seed / focuses.length)) % endings.length];
  const candidate = `${subject} ${verb} ${focus}, ${ending}.`;
  const words = normalizeWords(candidate);
  const phrases = words.slice(0, -2).map((_, index) =>
    words.slice(index, index + 3).join(" "),
  );

  if (phrases.some((phrase) => usedPhrases.has(phrase))) continue;
  phrases.forEach((phrase) => usedPhrases.add(phrase));
  comments.push(candidate);
}

const testimonials = comments.map((comentario, index) => ({
  nombre: audiences[index % audiences.length][0],
  tipo: audiences[index % audiences.length][1],
  comentario,
}));

function TestimonialRows({ hidden = false }: { hidden?: boolean }) {
  return (
    <div className="testimonials-ticker-group" aria-hidden={hidden || undefined}>
      {testimonials.map((testimonial, index) => (
        <p className="testimonial-line" key={`${testimonial.nombre}-${index}`}>
          <strong>{testimonial.nombre}</strong>
          <span>{testimonial.tipo}</span>
          {testimonial.comentario}
        </p>
      ))}
    </div>
  );
}

export function TestimonialsTicker() {
  return (
    <section className="section testimonials-section" aria-label="Testimonios">
      <div className="section-heading compact-heading testimonials-heading">
        <p className="eyebrow">Comentarios</p>
        <h2>Lo que cuentan las familias</h2>
      </div>
      <div className="testimonials-ticker" aria-live="off">
        <div className="testimonials-ticker-track">
          <TestimonialRows />
          <TestimonialRows hidden />
        </div>
      </div>
    </section>
  );
}
