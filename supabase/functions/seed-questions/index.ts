import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const chapters = [
  {
    title: "Capítulo 0: Orígenes y Antepasados",
    order: 0,
    questions: [
      "¿Cómo se llamaban tus padres? ¿De dónde eran exactamente (pueblo, ciudad, región)?",
      "¿Sabes algo sobre la infancia o juventud de tus padres? ¿Cómo fue su educación?",
      "¿A qué se dedicaban tus padres? ¿Cambiaron de trabajo a lo largo de su vida?",
      "¿Cómo era su día a día? ¿Era un trabajo difícil o gratificante para ellos?",
      "¿Recuerdas si tuvieron dificultades económicas o prosperidad en algún momento?",
      "¿Hablaban de sus sueños o metas en la vida? ¿Lograron cumplirlos?",
      "¿Qué recuerdas de sus personalidades? ¿Cómo eran como personas?",
      "¿Había algo que los hacía únicos o especiales? ¿Alguna habilidad o talento particular?",
      "¿Cómo expresaban su cariño? ¿Eran afectuosos o más reservados?",
      "¿Tenían alguna frase o consejo que repetían con frecuencia?",
      "¿Sabes algo sobre tus abuelos? ¿Cómo se llamaban y de dónde venían?",
      "¿Hay alguna historia familiar sobre cómo llegaron tus antepasados al lugar donde naciste?",
      "¿Existía algún oficio o profesión tradicional en tu familia?",
      "¿Conoces alguna anécdota o historia que se haya transmitido a través de generaciones en tu familia?",
      "¿Cómo se conocieron tus padres y cuál es su historia de amor, si la conoces?",
      "¿En qué época se conocieron? ¿Cómo era el contexto social de ese momento?",
      "¿Hubo alguna oposición familiar o social a su relación?",
      "¿Hubo algo que te haya parecido especial en su relación?",
      "¿Qué valores crees que compartían?",
      "¿Cómo fue su boda? ¿Tienes alguna foto o recuerdo de ese día?",
      "¿Había alguna tradición o costumbre familiar que recuerdes de ellos?",
      "¿Qué festividades eran importantes para tu familia y cómo las celebraban?",
      "¿Se mantenían esas costumbres cuando eras niño?",
      "¿Alguna tradición ha perdurado en la familia hasta hoy?",
      "¿Había comidas típicas que sólo se preparaban en tu familia o en ocasiones especiales?",
      "¿Existían canciones, cuentos o relatos que fueran especiales en tu familia?",
    ],
  },
  {
    title: "Capítulo 1: Nacimiento y Primeros Años",
    order: 1,
    questions: [
      "¿Cuándo y dónde naciste exactamente? ¿En qué hospital, ciudad o pueblo?",
      "¿Te han contado alguna anécdota sobre el día de tu nacimiento o el embarazo?",
      "¿Hubo alguna complicación o circunstancia especial en tu nacimiento?",
      "¿Tus padres esperaban un niño o una niña? ¿Tenían algún nombre pensado desde antes?",
      "¿Quién escogió tu nombre y por qué? ¿Tiene algún significado especial?",
      "¿Sabes si tu nacimiento coincidió con algún evento importante familiar o histórico?",
      "¿Cómo era la casa donde vivías cuando eras bebé? ¿Era grande o pequeña?",
      "¿Era una casa familiar, heredada, alquilada o propia?",
      "¿Cómo estaban distribuidas las habitaciones? ¿Con quién compartías habitación?",
      "¿Había algo especial que recuerdes, como un objeto, un mueble o un olor característico?",
      "¿Había jardín, patio o algún espacio exterior donde jugar?",
      "¿Cambiasteis de casa durante tus primeros años? ¿Por qué motivo?",
      "¿Cómo te describían tus padres cuando eras pequeño? ¿Eras tranquilo, inquieto, risueño?",
      "¿Recuerdas alguna anécdota que ellos te contaran sobre ti de bebé?",
      "¿Tienes algún recuerdo propio de esa época, por muy vago que sea?",
      "¿Sufriste alguna enfermedad o accidente siendo muy pequeño?",
      "¿Quién te cuidaba principalmente? ¿Tus padres, abuelos, hermanos mayores u otros?",
      "¿Había algún ritual o costumbre especial para dormirte o alimentarte?",
      "¿Había algo que te gustaba especialmente hacer de niño? ¿Tenías un juguete favorito?",
      "¿Había alguna actividad que te hiciera especialmente feliz?",
      "¿Cuál es el recuerdo más antiguo que conservas? ¿Qué edad tendrías?",
      "¿Recuerdas alguna canción de cuna o cuento que te contaban antes de dormir?",
    ],
  },
  {
    title: "Capítulo 2: Infancia y Descubrimiento",
    order: 2,
    questions: [
      "¿Cómo era el lugar donde creciste? ¿Había campo, ciudad, muchos niños para jugar?",
      "¿Cómo eran las calles, los parques o los espacios donde jugabas?",
      "¿Era un lugar seguro para los niños? ¿Podías salir a jugar libremente?",
      "¿Había vecinos con quienes te llevabas bien? ¿Alguno que recuerdes especialmente?",
      "¿Existía algún lugar de reunión para los niños del barrio? ¿Un árbol, una plaza...?",
      "¿Cómo eran las tiendas o comercios de tu barrio? ¿Recuerdas alguna especialmente?",
      "¿Había algún evento comunitario que esperabas con ilusión cada año?",
      "¿Cómo era tu casa en tu infancia? ¿Recuerdas su distribución, los muebles, los olores?",
      "¿Tenías tu propio espacio o habitación? ¿Cómo lo habías decorado?",
      "¿Había algún rincón favorito de la casa donde te gustaba estar?",
      "¿Cómo era el ambiente familiar dentro del hogar? ¿Tranquilo, bullicioso, estricto?",
      "¿Se realizaban reuniones familiares o celebraciones especiales? ¿Cómo eran?",
      "¿Qué olores asocias con tu casa de la infancia? ¿Alguna comida, perfume o aroma específico?",
      "¿Teníais mascotas? ¿Cómo se llamaban y qué relación tenías con ellas?",
      "¿Quiénes eran las personas más importantes en tu vida cuando eras niño?",
      "¿Había alguien que te cuidara especialmente o que te prestara más atención?",
      "¿Tenías una relación especial con algún abuelo, tío o familiar cercano?",
      "¿Recuerdas algún consejo o enseñanza de una persona mayor en tu infancia?",
      "¿Había algún adulto fuera de tu familia que consideraras un modelo a seguir?",
      "¿Hubo alguna figura que influyera significativamente en tus valores o forma de pensar?",
      "¿Tuviste hermanos? ¿Eres el mayor, el menor o estás en medio?",
      "¿Cómo era tu relación con ellos? ¿Jugaban juntos o tenían personalidades diferentes?",
      "¿Alguna travesura o anécdota especial con ellos que recuerdes vívidamente?",
      "¿Compartíais habitación, juguetes, responsabilidades?",
      "¿Había rivalidad o complicidad entre vosotros?",
      "¿Teníais primos cercanos con los que jugabas habitualmente?",
      "¿Cómo han evolucionado esas relaciones con el paso del tiempo?",
      "¿Cómo era un día normal en tu infancia? ¿A qué hora te levantabas y qué hacías primero?",
      "¿Tenías responsabilidades o tareas asignadas en casa?",
      "¿Cómo eran las comidas en casa? ¿Comíais todos juntos?",
      "¿Había algún plato que te encantara? ¿Y alguno que detestaras?",
      "¿Qué se solía cocinar en ocasiones especiales?",
      "¿Qué hacías después de la escuela? ¿Jugabas, estudiabas, ayudabas en casa?",
      "¿Cómo pasabas los fines de semana? ¿Había alguna actividad familiar habitual?",
      "¿Cómo eran las vacaciones? ¿Viajabais o las pasabais en casa?",
      "¿Ibas a guardería o empezaste directamente en la escuela?",
      "¿Recuerdas tu primer día de escuela? ¿Cómo te sentiste?",
      "¿Cómo fue tu experiencia escolar? ¿Te gustaba ir a la escuela?",
      "¿Cómo era tu escuela físicamente? ¿Grande, pequeña, nueva, antigua?",
      "¿Qué materias te gustaban y cuáles no tanto? ¿Por qué?",
      "¿Recuerdas a algún maestro o compañero que haya sido especial para ti?",
      "¿Participabas en actividades extraescolares? ¿Cuáles?",
      "¿Eras buen estudiante o te costaba concentrarte?",
      "Si no pudiste estudiar mucho, ¿cómo fue eso para ti? ¿Te hubiese gustado poder estudiar más?",
      "¿Cómo afectó tu educación (o la falta de ella) a tus oportunidades más adelante?",
      "¿Tuviste que empezar a trabajar desde pequeño? ¿A qué edad?",
      "¿En qué consistía ese trabajo infantil?",
      "¿Cómo conseguiste ese primer trabajo? ¿Fue algo que buscaste o te lo ofrecieron?",
      "¿Cómo compaginabas el trabajo con tus estudios o juegos?",
      "¿Cómo te sentiste al recibir tu primer dinero o recompensa?",
      "¿Qué aprendiste de esa experiencia temprana de trabajo?",
      "¿A qué jugabas cuando eras niño? ¿Tenías juguetes favoritos?",
      "¿Jugabas solo o preferías jugar con otros niños?",
      "¿Había juegos tradicionales o populares en tu época que ya no se juegan?",
      "¿Qué hacías para divertirte cuando llovía o no podías salir?",
      "¿Tenías algún hobbie o pasatiempo especial?",
      "¿Leías libros? ¿Cuál era tu libro o cuento favorito?",
      "¿Veías televisión? ¿Qué programas te gustaban?",
      "¿Recuerdas la primera película que viste en el cine?",
      "¿Había alguna celebración del año que esperabas con especial ilusión?",
    ],
  },
  {
    title: "Capítulo 3: Juventud e Independencia",
    order: 3,
    questions: [
      "¿Cómo recuerdas tu adolescencia? ¿Fue una etapa fácil o difícil?",
      "¿Cómo eras en esa época? ¿Rebelde, conformista, soñador?",
      "¿Cuáles eran tus principales preocupaciones o intereses en esos años?",
      "¿Cómo cambió tu relación con tus padres y hermanos en esa etapa?",
      "¿Cómo era la dinámica en casa en ese período de tu vida?",
      "¿Tuviste algún conflicto importante con tus padres? ¿Por qué motivos?",
      "¿Hubo algún evento o experiencia que marcara un antes y después en tu adolescencia?",
      "¿Cómo viviste los cambios físicos y emocionales propios de esa edad?",
      "¿Continuaste estudiando durante tu adolescencia? ¿Hasta qué nivel?",
      "¿Cómo era el instituto o centro educativo donde estudiabas?",
      "¿Tenías claro lo que querías estudiar o a qué querías dedicarte?",
      "¿Hubo algún profesor o mentor que influyera en tus decisiones futuras?",
      "¿Tuviste la oportunidad de formarte en lo que realmente te interesaba?",
      "Si no pudiste seguir estudiando, ¿cómo fue esa experiencia para ti?",
      "¿Cómo veías tu futuro académico o profesional en esa época?",
      "¿Quiénes eran tus mejores amigos en la juventud?",
      "¿Formabas parte de algún grupo o pandilla? ¿Cómo erais?",
      "¿Dónde os reuníais habitualmente? ¿Qué hacíais juntos?",
      "¿Conservas alguna de esas amistades en la actualidad?",
      "¿Había algún lugar de moda donde los jóvenes iban a divertirse?",
      "¿Cómo era la vida nocturna en tu juventud? ¿Salías mucho?",
      "¿Había diferencias marcadas entre chicos y chicas en las actividades sociales?",
      "¿Recuerdas alguna anécdota divertida o significativa con tus amigos?",
      "¿Recuerdas tu primer amor o tu primer flechazo?",
      "¿Cómo fue tu primera cita? ¿Estabas nervioso/a?",
      "¿Cómo se expresaba el romance en tu época de juventud?",
      "¿Era difícil conocer a personas del sexo opuesto? ¿Cómo se hacía?",
      "¿Había mucho control familiar sobre las relaciones de pareja?",
      "¿Cuál fue tu relación más significativa en la juventud?",
      "¿Hubo algún desamor que te afectara especialmente?",
      "¿Cómo conociste a quien sería tu pareja o esposo/a?",
      "¿Cuál fue tu primer trabajo formal? ¿A qué edad empezaste?",
      "¿Cómo conseguiste ese primer trabajo? ¿Fue algo que buscaste o te lo ofrecieron?",
      "¿Cómo era un día típico en ese trabajo?",
      "¿Cómo te sentiste al recibir tu primer sueldo?",
      "¿En qué lo gastaste o invertiste?",
      "¿Cómo era el mundo laboral en tu juventud? ¿Cuáles eran las condiciones de trabajo?",
      "¿Era fácil o difícil encontrar empleo para los jóvenes en esa época?",
      "¿Cómo trataban a los jóvenes en el trabajo? ¿Sentías respeto o discriminación?",
      "¿Cuándo empezaste a contribuir económicamente en casa?",
      "¿Cómo manejabas tu dinero? ¿Ahorrabas o te gustaba gastar?",
      "¿Cuándo te mudaste de casa de tus padres por primera vez?",
      "¿Cómo fue ese proceso? ¿Fue por estudios, trabajo o formación de pareja?",
      "¿Viviste solo/a o compartiste piso? ¿Con quién?",
      "¿Cómo te organizabas para las tareas domésticas y la economía?",
      "¿Fue difícil adaptarte a vivir sin tus padres?",
      "¿Cómo reaccionaron tus padres a tu independencia?",
      "¿Te sentías preparado/a para vivir por tu cuenta?",
      "¿Qué fue lo más difícil y lo más liberador de independizarte?",
      "¿Cómo definirías tu personalidad en esa etapa de tu vida?",
      "¿Tenías algún ídolo o persona a quien admirabas especialmente?",
      "¿Seguías alguna moda o estilo particular? ¿Cómo te vestías?",
      "¿Qué tipo de música escuchabas? ¿Ibas a conciertos?",
      "¿Tenías alguna ideología política o social que te definiera?",
      "¿Participabas en algún movimiento juvenil, político o social?",
      "¿Cómo te imaginabas tu futuro cuando eras joven? ¿Tenías un plan de vida?",
      "¿Cuáles eran tus aspiraciones y sueños en esa época?",
      "¿Hay algo que lograste que nunca imaginaste que sucedería?",
      "¿Hay sueños de juventud que nunca llegaste a cumplir?",
      "¿Qué acontecimientos históricos importantes ocurrieron durante tu juventud?",
      "¿Cómo afectaron estos eventos a tu vida o a tu forma de pensar?",
      "¿Había tensiones sociales, políticas o económicas relevantes en esa época?",
      "¿Cómo era la situación económica del país cuando eras joven?",
      "¿Sentías que tenías más o menos oportunidades que la generación de tus padres?",
      "¿Qué avances tecnológicos recuerdas de esa época? ¿Cómo los viviste?",
      "¿Cómo eran las costumbres sociales entonces comparadas con las actuales?",
      "¿Había temas tabú que no se podían discutir abiertamente?",
    ],
  },
  {
    title: "Capítulo 4: Vida Adulta y Crecimiento",
    order: 4,
    questions: [
      "¿Cómo fueron tus primeros años como adulto? ¿Sentías que ya eras 'mayor'?",
      "¿Cuándo sentiste por primera vez que eras verdaderamente independiente?",
      "¿Cómo te independizaste económicamente? ¿Fue un proceso gradual o repentino?",
      "¿Hubo algún momento o decisión que consideres el paso definitivo a la adultez?",
      "¿Qué responsabilidades nuevas asumiste en esta etapa?",
      "¿Cómo cambió tu relación con tus padres cuando ya eras adulto?",
      "¿Cómo fue el momento en que formaste tu propia familia? ¿Fue planeado o sucedió naturalmente?",
      "¿Cómo conociste a tu pareja? ¿Qué te atrajo de ella/él?",
      "¿Cómo fue vuestra boda o el inicio de vuestra vida en común?",
      "¿Hubo alguna dificultad inicial en la convivencia?",
      "¿Cómo fue la relación de tu pareja con tu familia de origen, y viceversa?",
      "¿Cómo cambió tu vida al formar una familia?",
      "¿Hubo tradiciones de tu familia de origen que mantuviste? ¿Creaste nuevas?",
      "¿Qué valores considerabas importantes transmitir en tu nuevo hogar?",
      "¿Cómo evolucionó tu carrera profesional a lo largo de los años?",
      "¿Hubo algún trabajo que te marcara especialmente?",
      "¿Cómo era el trabajo en esa época? ¿Fue difícil avanzar profesionalmente?",
      "¿Sufriste alguna crisis laboral o período de desempleo significativo?",
      "¿Tuviste que adaptarte a grandes cambios en tu sector profesional?",
      "¿Hubo algún trabajo que marcó un antes y un después en tu vida?",
      "¿Llegaste a ocupar puestos de responsabilidad? ¿Cómo te sentías en ellos?",
      "¿Recibiste algún reconocimiento o premio importante por tu labor?",
      "¿Cómo equilibrabas tu vida laboral con tu vida familiar?",
      "¿Te sentías realizado/a con tu trabajo o lo veías principalmente como un medio de vida?",
      "Si pudieras elegir otra profesión, ¿cuál habría sido?",
      "¿Cómo fue la experiencia de ser padre/madre por primera vez?",
      "¿Recuerdas cómo te sentiste cuando tuviste a tu primer hijo?",
      "¿Cómo cambió tu vida y tus prioridades con la llegada de los hijos?",
      "¿Qué tipo de padre/madre crees que has sido?",
      "¿Qué valores intentaste transmitirle a tus hijos en su crianza?",
      "¿Seguiste el ejemplo de tus padres o intentaste hacer las cosas diferentes?",
      "¿Cuáles fueron los momentos más gratificantes de la crianza?",
      "¿Y los más difíciles o desafiantes?",
      "¿Cómo era un día típico en casa cuando tus hijos eran pequeños?",
      "¿Cómo fue viendo crecer a tus hijos y convertirse en adultos?",
      "¿Cómo evolucionó tu relación con ellos a lo largo del tiempo?",
      "¿Dónde estableciste tu hogar como adulto?",
      "¿Cómo conseguiste tu primera vivienda propia?",
      "¿Cómo era esa casa o apartamento? ¿La recuerdas con cariño?",
      "¿Cambiaste de vivienda a lo largo de tu vida adulta? ¿Por qué motivos?",
      "¿Hubo algún hogar al que te costara especialmente decir adiós?",
      "¿Qué importancia le dabas a la decoración o al ambiente del hogar?",
      "¿Había algún espacio de la casa que fuera especialmente importante para ti?",
      "¿Tenías alguna afición relacionada con el hogar, como la jardinería, bricolaje, etc.?",
      "¿Cuáles fueron los momentos más difíciles de tu vida adulta?",
      "¿Cómo afrontaste esas dificultades?",
      "¿Hubo alguna crisis familiar importante? ¿Cómo la superasteis?",
      "¿Sufriste alguna pérdida significativa? ¿Cómo te afectó?",
      "¿Hubo algún problema de salud que cambiara el rumbo de tu vida?",
      "¿Qué aprendiste de estos momentos difíciles?",
      "¿Quién estuvo a tu lado en los momentos complicados?",
      "¿Cómo crees que estas experiencias te han modelado como persona?",
      "¿Cómo cambió tu vida social al convertirte en adulto?",
      "¿Mantuviste amistades de la juventud o formaste nuevos círculos?",
      "¿Cómo conociste a tus amigos en la etapa adulta?",
      "¿Qué papel han jugado las amistades en tu vida adulta?",
      "¿Tenías tiempo para cultivar amistades con las responsabilidades familiares y laborales?",
      "¿Había ocasiones especiales para reunirse con amigos?",
      "¿Cómo ha cambiado tu concepto de amistad a lo largo de los años?",
      "¿Qué hacías en tu tiempo libre durante tu vida adulta?",
      "¿Tenías algún hobby o pasión que cultivaras regularmente?",
      "¿Practicabas algún deporte o actividad física?",
      "¿Viajabas? ¿Cuáles fueron tus viajes más memorables?",
      "¿Había alguna actividad que hicieras regularmente con tu familia?",
      "¿Cómo equilibrabas el tiempo para ti mismo con las responsabilidades?",
      "¿Has mantenido las mismas aficiones a lo largo de los años o han cambiado?",
      "¿Hay alguna actividad que siempre quisiste hacer pero nunca tuviste oportunidad?",
    ],
  },
  {
    title: "Capítulo 5: Reflexiones y Legado",
    order: 5,
    questions: [
      "Si pudieras hablar con tu 'yo' más joven, ¿qué consejo le darías?",
      "¿Hay algo que ahora entiendes mejor y que hubieras hecho diferente?",
      "¿Cuáles crees que han sido las decisiones más importantes de tu vida?",
      "¿Cómo ves ahora las preocupaciones que tenías cuando eras joven?",
      "¿Qué sabiduría crees que has adquirido con los años?",
      "¿Has cambiado mucho como persona a lo largo de tu vida?",
      "¿Qué valores han permanecido constantes y cuáles han evolucionado?",
      "¿Cuáles crees que han sido los momentos más importantes de tu vida?",
      "¿Qué eventos o decisiones cambiaron tu camino?",
      "¿Hubo algún 'punto de inflexión' que alteró completamente el rumbo de tu vida?",
      "¿Recuerdas algún momento en que sentiste que estabas exactamente donde debías estar?",
      "¿Cuáles han sido tus mayores alegrías?",
      "¿Y tus mayores desafíos?",
      "¿Hay algún momento de tu vida al que te gustaría volver?",
      "¿De qué te sientes más orgulloso?",
      "¿Hay algo que lograste que te sorprendió o que pensaste que no podrías alcanzar?",
      "¿Cuál consideras que ha sido tu mayor contribución a tu familia?",
      "¿Y a tu comunidad o sociedad?",
      "¿Qué habilidades o talentos has descubierto en ti mismo a lo largo de la vida?",
      "¿Hay algún reconocimiento o elogio que hayas recibido y que valoras especialmente?",
      "¿Sientes que has vivido conforme a tus principios y valores?",
      "¿Qué legado te gustaría dejar a tu familia?",
      "¿Qué te gustaría que recordaran de ti las futuras generaciones?",
      "¿Hay alguna enseñanza fundamental que te gustaría transmitir?",
      "¿Qué valores consideras más importantes para una vida plena?",
      "¿Cómo definirías una vida bien vivida?",
      "¿Qué consejo darías a las nuevas generaciones sobre cómo afrontar la vida?",
      "¿Qué te gustaría que la gente dijera de ti cuando ya no estés?",
      "¿Hay alguna frase o lema por el que te gustaría ser recordado?",
      "¿Cómo ha cambiado tu percepción del tiempo a lo largo de tu vida?",
      "¿Sientes que el tiempo pasa más rápido ahora que cuando eras joven?",
      "¿Cómo ves el mundo actual comparado con el de tu juventud?",
      "¿Qué cambios sociales importantes has presenciado a lo largo de tu vida?",
      "¿Hay aspectos del pasado que echas de menos?",
      "¿Qué avances o progresos te parecen más positivos?",
      "¿Cómo imaginas que será el mundo para tus nietos o futuras generaciones?",
      "¿Hay algo que te hubiera gustado ver o experimentar en el futuro?",
      "¿Has podido hacer las paces con momentos difíciles de tu pasado?",
      "¿Hay personas con las que te hubiera gustado reconciliarte?",
      "¿A quién te gustaría poder agradecer algo importante?",
      "¿Qué personas han sido fundamentales en tu vida?",
      "¿Por qué aspectos de tu vida sientes más gratitud?",
      "¿Cuáles son los regalos más valiosos (no materiales) que has recibido en la vida?",
      "¿Qué te hace sentir en paz contigo mismo?",
    ],
  },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    for (const chapter of chapters) {
      const { data: existingChapter } = await supabase
        .from("chapter_templates")
        .select("id")
        .eq("title", chapter.title)
        .maybeSingle();

      let chapterId: string;

      if (existingChapter) {
        chapterId = existingChapter.id;
        await supabase
          .from("chapter_templates")
          .update({ order: chapter.order })
          .eq("id", chapterId);
      } else {
        const { data: newChapter, error } = await supabase
          .from("chapter_templates")
          .insert({
            title: chapter.title,
            order: chapter.order,
          })
          .select()
          .single();

        if (error) throw error;
        chapterId = newChapter.id;
      }

      await supabase
        .from("question_templates")
        .delete()
        .eq("chapter_template_id", chapterId);

      const questionsToInsert = chapter.questions.map((q, index) => ({
        chapter_template_id: chapterId,
        question: q,
        order: index,
      }));

      const { error: questionsError } = await supabase
        .from("question_templates")
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Questions seeded successfully",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
