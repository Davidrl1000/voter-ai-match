import Header from '@/components/Header';
import InfoBlock from '@/components/InfoBlock';

export default function NotesPage() {
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
                Votante AI es una herramienta diseñada para ayudarte a entender qué candidato presidencial se alinea mejor con tus valores y prioridades políticas para las elecciones de Costa Rica 2026.
              </p>
              <p className="leading-relaxed">
                A través de un cuestionario basado en inteligencia artificial, comparamos tus respuestas con las posiciones documentadas de cada candidato en áreas clave como economía, salud, educación, seguridad, medio ambiente, políticas sociales e infraestructura.
              </p>
            </InfoBlock>

            <InfoBlock title="Cómo funciona">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">1. Responde el cuestionario</h3>
                  <p className="leading-relaxed">
                    Selecciona cuántas preguntas deseas responder (recomendamos al menos 20) y completa el cuestionario sobre diferentes áreas de política.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">2. Algoritmo de coincidencia</h3>
                  <p className="leading-relaxed">
                    Nuestro sistema utiliza similitud semántica para comparar tus respuestas con las posiciones de cada candidato, considerando no solo las respuestas directas sino también el contexto y significado.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">3. Resultados personalizados</h3>
                  <p className="leading-relaxed">
                    Recibirás un porcentaje de compatibilidad con cada candidato y una explicación generada por IA que te ayuda a entender por qué obtuviste esos resultados.
                  </p>
                </div>
              </div>
            </InfoBlock>

            <InfoBlock title="Importante" variant="highlighted">
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span className="leading-relaxed">Esta herramienta es solo una <strong>guía informativa</strong>. No sustituye tu propia investigación sobre los candidatos.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span className="leading-relaxed">Los resultados se basan en las posiciones documentadas de los candidatos en sus planes de gobierno oficiales.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span className="leading-relaxed">El sistema es completamente <strong>neutral políticamente</strong> y no favorece a ningún candidato.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span className="leading-relaxed">Tus respuestas son <strong>privadas y no se almacenan</strong>. Todo el procesamiento ocurre en tu dispositivo.</span>
                </li>
              </ul>
            </InfoBlock>

            <InfoBlock title="Transparencia">
              <p className="leading-relaxed mb-4">
                Este proyecto utiliza inteligencia artificial de OpenAI para generar preguntas y explicaciones, pero el algoritmo de coincidencia es completamente determinista y transparente.
              </p>
              <p className="leading-relaxed">
                El código fuente está disponible públicamente para garantizar la neutralidad y permitir que cualquiera verifique cómo funciona el sistema.
              </p>
            </InfoBlock>
          </div>
        </div>
      </div>
    </>
  );
}
