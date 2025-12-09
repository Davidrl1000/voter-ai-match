'use client';

import { useEffect } from 'react';
import Header from '@/components/Header';
import InfoBlock from '@/components/InfoBlock';
import { trackGTMEvent, GTMEvents } from '@/lib/gtm';

export default function NotesPage() {
  // Track page view on mount
  useEffect(() => {
    trackGTMEvent(GTMEvents.NOTES_PAGE_VIEWED);
  }, []);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-white py-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
              <span className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                Votante
              </span>
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
                {' '}AI
              </span>
            </h1>
          </div>

          {/* Content */}
          <div className="prose prose-gray max-w-none">
            <InfoBlock title="Sobre esta herramienta">
              <p className="leading-relaxed mb-4">
                Votante AI es una herramienta informativa diseñada para ayudarte a explorar qué candidato presidencial podría alinearse con tus valores y prioridades políticas para las elecciones de Costa Rica 2026.
              </p>
              <p className="leading-relaxed">
                El cuestionario utiliza modelos de inteligencia artificial para analizar textos públicos, pero los resultados son aproximaciones basadas en información disponible y no representan una recomendación, predicción ni evaluación oficial.
              </p>
            </InfoBlock>

            <InfoBlock title="Cómo funciona">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">1. Responde el cuestionario</h3>
                  <p className="leading-relaxed">
                    Selecciona cuántas preguntas deseas responder y completa el cuestionario sobre diferentes áreas de política.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">2. Algoritmo de coincidencia</h3>
                  <p className="leading-relaxed">
                    El sistema compara tus respuestas con los planes y posiciones públicas documentadas de cada candidato mediante similitud semántica. La comparación es automática y puede contener márgenes de error.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">3. Resultados personalizados</h3>
                  <p className="leading-relaxed">
                    Obtendrás porcentajes de compatibilidad y una explicación generada por IA. Estos resultados son orientativos y no deben interpretarse como verificación factual o asesoría electoral.
                  </p>
                </div>
              </div>
            </InfoBlock>

            <InfoBlock title="Importante" variant="highlighted">
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span className="leading-relaxed">
                    Esta herramienta es únicamente una <strong>guía informativa</strong> y no sustituye la investigación personal ni representa una recomendación de voto.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span className="leading-relaxed">
                    La información utilizada proviene de <strong>fuentes públicas y oficiales</strong> disponibles al momento del análisis. La herramienta no valida ni garantiza la exactitud, vigencia o exhaustividad de dichos documentos.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span className="leading-relaxed">
                    El sistema busca ser neutral y no pretende favorecer a ningún candidato. Cualquier coincidencia depende únicamente de las respuestas ingresadas por el usuario y de la información pública analizada.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span className="leading-relaxed">
                    Tus respuestas del cuestionario son <strong>privadas y no se almacenan</strong>. Solo se registran datos agregados y anónimos con fines analíticos (como el candidato con mayor coincidencia) sin asociar la información con tu identidad.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span className="leading-relaxed">
                    Utilizamos <strong>herramientas de análisis web</strong> que recopilan datos técnicos anónimos como: páginas visitadas, tiempo de uso, interacciones generales (clics en botones, navegación), tipo de dispositivo y navegador. Estos datos nos ayudan a mejorar la experiencia del usuario y entender cómo se utiliza la herramienta, pero nunca se vinculan con tu identidad personal ni con tus respuestas específicas del cuestionario.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span className="leading-relaxed">
                    Esta herramienta se ofrece “tal cual” y sin garantías de ningún tipo. Su uso es voluntario y bajo la responsabilidad del usuario.
                  </span>
                </li>
              </ul>
            </InfoBlock>

            <InfoBlock title="Transparencia">
              <p className="leading-relaxed mb-4">
                Este proyecto utiliza tecnologías de inteligencia artificial de OpenAI para generar preguntas y explicaciones, pero el proceso de coincidencia entre respuestas y candidatos es completamente determinista, verificable y documentado.
              </p>

              <p className="leading-relaxed mb-4">
                El código fuente es 100% público en <a
                  href="https://github.com/Davidrl1000/voter-ai-match"
                  className="underline"
                  target="_blank"
                >
                  este repositorio
                </a>, lo que garantiza neutralidad, auditabilidad y la posibilidad de que cualquier persona examine cómo funciona el sistema.
              </p>

              <p className="leading-relaxed mb-4">
                El propósito de esta herramienta es aportar claridad en un entorno saturado de información, combatir la desinformación y promover un proceso electoral más transparente y accesible para todos.
              </p>

              <p className="leading-relaxed text-gray-400 text-sm">
                Conceptualizado y desarrollado por <a
                  href="https://www.linkedin.com/in/davidrl1000"
                  className="underline"
                  target="_blank"
                >
                  David Rojas
                </a>.
              </p>
            </InfoBlock>

          </div>
        </div>
      </div>
    </>
  );
}
