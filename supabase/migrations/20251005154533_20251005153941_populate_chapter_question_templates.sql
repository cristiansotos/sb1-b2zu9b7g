/*
  # Populate Chapter and Question Templates

  This migration creates the complete structure of chapters, sections, and questions
  for the memoir application. These templates will be used to initialize all new
  stories created from this point forward.

  ## Chapters Created
  - Capítulo 0: Orígenes y antepasados (27 questions across 5 sections)
  - Capítulo 1: Nacimiento y primeros años (16 questions across 4 sections)
  - Capítulo 2: Infancia y descubrimiento (48 questions across 11 sections)
  - Capítulo 3: Juventud e independencia (44 questions across 9 sections)
  - Capítulo 4: Vida adulta y crecimiento (29 questions across 8 sections)
  - Capítulo 5: Reflexiones y legado (25 questions across 6 sections)

  ## Important Notes
  - Existing stories will NOT be affected by this migration
  - Only new stories created after this migration will use these templates
  - Questions are organized into thematic sections within each chapter
*/

-- Clear existing templates (if any)
DELETE FROM question_templates;
DELETE FROM section_templates;
DELETE FROM chapter_templates;

-- ============================================================================
-- CAPÍTULO 0: ORÍGENES Y ANTEPASADOS
-- ============================================================================

INSERT INTO chapter_templates (title, "order")
VALUES ('Capítulo 0: Orígenes y antepasados', 0)
RETURNING id AS chapter_0_id;

-- Get the chapter ID for reference
DO $$
DECLARE
  v_chapter_0_id uuid;
  v_section_id uuid;
BEGIN
  SELECT id INTO v_chapter_0_id FROM chapter_templates WHERE "order" = 0;

  -- Section: Antepasados
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_0_id, 'Antepasados', 0)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_0_id, v_section_id, '¿Cuál es el antepasado más antiguo del que tienes constancia o del que has oído hablar?', 0),
  (v_chapter_0_id, v_section_id, '¿Sabes de dónde procedía originalmente tu familia?', 1),
  (v_chapter_0_id, v_section_id, '¿Conoces si hubo migraciones o cambios de lugar importantes en la historia familiar?', 2),
  (v_chapter_0_id, v_section_id, '¿Existía algún oficio o tradición familiar que se repitiera entre generaciones?', 3),
  (v_chapter_0_id, v_section_id, '¿Sabes algo sobre tus abuelos? ¿Dónde nacieron y cómo eran?', 4);

  -- Section: Historia familiar
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_0_id, 'Historia familiar', 1)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_0_id, v_section_id, '¿Hay alguna historia o anécdota familiar que se haya transmitido de generación en generación?', 5),
  (v_chapter_0_id, v_section_id, '¿Hay alguna historia sobre cómo llegó tu familia al lugar donde naciste?', 6),
  (v_chapter_0_id, v_section_id, '¿Qué valores crees que caracterizaban a tu familia antes de que tú nacieras?', 7);

  -- Section: Padres
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_0_id, 'Padres', 2)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_0_id, v_section_id, '¿Cómo se llamaban tus padres? ¿De dónde eran exactamente (pueblo, ciudad, región)?', 8),
  (v_chapter_0_id, v_section_id, '¿Sabes algo sobre la infancia o juventud de tus padres? ¿Cómo fue su educación?', 9),
  (v_chapter_0_id, v_section_id, '¿A qué se dedicaban tus padres? ¿Cambiaron de trabajo a lo largo de su vida?', 10),
  (v_chapter_0_id, v_section_id, '¿Cómo era su día a día? ¿Era un trabajo difícil o gratificante para ellos?', 11),
  (v_chapter_0_id, v_section_id, '¿Tuvieron dificultades económicas o épocas de prosperidad?', 12),
  (v_chapter_0_id, v_section_id, '¿Qué recuerdas de sus personalidades?', 13),
  (v_chapter_0_id, v_section_id, '¿Había algo que los hiciera únicos o especiales?', 14),
  (v_chapter_0_id, v_section_id, '¿De qué forma expresaban el cariño tus padres?', 15),
  (v_chapter_0_id, v_section_id, '¿Tenían alguna frase o consejo que repetían con frecuencia?', 16);

  -- Section: Relación de los padres
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_0_id, 'Relación de los padres', 3)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_0_id, v_section_id, '¿Cómo se conocieron tus padres?', 17),
  (v_chapter_0_id, v_section_id, '¿Hubo algo especial o significativo en su relación?', 18),
  (v_chapter_0_id, v_section_id, '¿Cómo fue su boda o el inicio de su vida juntos?', 19),
  (v_chapter_0_id, v_section_id, '¿Qué valores crees que compartían como pareja?', 20);

  -- Section: Costumbres familiares
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_0_id, 'Costumbres familiares', 4)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_0_id, v_section_id, '¿Qué tradiciones o costumbres familiares recuerdas de tu infancia?', 21),
  (v_chapter_0_id, v_section_id, '¿Qué festividades eran importantes para tu familia y cómo las celebrabais?', 22),
  (v_chapter_0_id, v_section_id, '¿Alguna de esas tradiciones ha perdurado hasta hoy?', 23),
  (v_chapter_0_id, v_section_id, '¿Cuál era un plato típico que cocinaban tus padres en ocasiones especiales?', 24),
  (v_chapter_0_id, v_section_id, '¿Existían canciones, cuentos o relatos familiares que fueran especiales en tu casa?', 25);

END $$;

-- ============================================================================
-- CAPÍTULO 1: NACIMIENTO Y PRIMEROS AÑOS
-- ============================================================================

INSERT INTO chapter_templates (title, "order")
VALUES ('Capítulo 1: Nacimiento y primeros años', 1);

DO $$
DECLARE
  v_chapter_1_id uuid;
  v_section_id uuid;
BEGIN
  SELECT id INTO v_chapter_1_id FROM chapter_templates WHERE "order" = 1;

  -- Section: Nacimiento
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_1_id, 'Nacimiento', 0)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_1_id, v_section_id, '¿Cuándo y dónde naciste exactamente?', 26),
  (v_chapter_1_id, v_section_id, '¿Te han contado alguna anécdota sobre el día de tu nacimiento o el embarazo?', 27),
  (v_chapter_1_id, v_section_id, '¿Quién eligió tu nombre y por qué ese nombre?', 28),
  (v_chapter_1_id, v_section_id, '¿Sabes si tu nacimiento coincidió con algún evento familiar o histórico importante?', 29);

  -- Section: Primeros recuerdos
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_1_id, 'Primeros recuerdos', 1)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_1_id, v_section_id, '¿Cuál es el recuerdo más antiguo que tienes?', 30),
  (v_chapter_1_id, v_section_id, '¿Cómo te describían tus padres cuando eras pequeño?', 31),
  (v_chapter_1_id, v_section_id, '¿Tienes algún recuerdo propio de esa época, por muy vago que sea?', 32),
  (v_chapter_1_id, v_section_id, '¿Sufriste alguna enfermedad o accidente siendo muy pequeño?', 33),
  (v_chapter_1_id, v_section_id, '¿Recuerdas alguna canción o cuento que te contaban antes de dormir?', 34);

  -- Section: Primeros años y hogar
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_1_id, 'Primeros años y hogar', 2)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_1_id, v_section_id, '¿Cómo era la casa donde vivías durante tus primeros años?', 35),
  (v_chapter_1_id, v_section_id, '¿Compartías habitación? ¿Recuerdas cómo era?', 36),
  (v_chapter_1_id, v_section_id, '¿Había algún objeto o rincón especial que te gustara especialmente?', 37),
  (v_chapter_1_id, v_section_id, '¿Cambiasteis de casa durante tus primeros años o viviste siempre en el mismo lugar?', 38),
  (v_chapter_1_id, v_section_id, '¿Quién te cuidaba principalmente en esa etapa?', 39),
  (v_chapter_1_id, v_section_id, '¿Había alguna costumbre o ritual especial para dormirte o alimentarte?', 40);

  -- Section: Juguetes y actividades
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_1_id, 'Juguetes y actividades', 3)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_1_id, v_section_id, '¿Tenías un juguete favorito o algo que te gustara especialmente hacer de niño? ¿Había alguna actividad o juego que te hiciera especialmente feliz?', 41);

END $$;

-- ============================================================================
-- CAPÍTULO 2: INFANCIA Y DESCUBRIMIENTO
-- ============================================================================

INSERT INTO chapter_templates (title, "order")
VALUES ('Capítulo 2: Infancia y descubrimiento', 2);

DO $$
DECLARE
  v_chapter_2_id uuid;
  v_section_id uuid;
BEGIN
  SELECT id INTO v_chapter_2_id FROM chapter_templates WHERE "order" = 2;

  -- Section: Entorno y barrio
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_2_id, 'Entorno y barrio', 0)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_2_id, v_section_id, '¿Cómo era el lugar donde creciste y qué espacios recuerdas para jugar?', 42),
  (v_chapter_2_id, v_section_id, '¿Recuerdas a vecinos o amistades del barrio con quienes jugabas?', 43),
  (v_chapter_2_id, v_section_id, '¿Qué recuerdas de las tiendas o comercios de tu barrio?', 44),
  (v_chapter_2_id, v_section_id, '¿Qué celebraciones o eventos comunitarios recuerdas del barrio?', 45);

  -- Section: Casa de la infancia
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_2_id, 'Casa de la infancia', 1)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_2_id, v_section_id, '¿Cómo era tu casa en la infancia?', 46),
  (v_chapter_2_id, v_section_id, '¿Cómo era tu habitación? Descríbela.', 47),
  (v_chapter_2_id, v_section_id, '¿Había algún rincón especial de la casa que recuerdes con cariño?', 48),
  (v_chapter_2_id, v_section_id, '¿Qué reuniones o celebraciones familiares se hacían en casa?', 49),
  (v_chapter_2_id, v_section_id, '¿Qué olores o sensaciones recuerdas de tu casa de la infancia?', 50),
  (v_chapter_2_id, v_section_id, '¿Conservas hoy algún objeto o foto de esa casa?', 51),
  (v_chapter_2_id, v_section_id, '¿Tuviste mascotas en tu infancia? ¿Qué recuerdas de ellas?', 52);

  -- Section: Personas importantes
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_2_id, 'Personas importantes', 2)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_2_id, v_section_id, '¿Quién era tu mejor amigo o amiga de la infancia?', 53),
  (v_chapter_2_id, v_section_id, '¿Qué recuerdos guardas de tus profesores y cuál fue el que más te inspiró?', 54),
  (v_chapter_2_id, v_section_id, '¿Quién te cuidaba de pequeño?', 55),
  (v_chapter_2_id, v_section_id, '¿Tuviste una relación especial con algún familiar cercano (abuelos, tíos…)?', 56),
  (v_chapter_2_id, v_section_id, '¿Recuerdas algún consejo o enseñanza de un mayor que te marcara?', 57),
  (v_chapter_2_id, v_section_id, '¿Qué persona marcó más tu infancia y por qué?', 58);

  -- Section: Hermanos y primos
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_2_id, 'Hermanos y primos', 3)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_2_id, v_section_id, '¿Tuviste hermanos? ¿Cómo te llevabas con ellos?', 59),
  (v_chapter_2_id, v_section_id, '¿Recuerdas alguna travesura o anécdota especial con tus hermanos?', 60),
  (v_chapter_2_id, v_section_id, '¿Compartíais habitación, juguetes o responsabilidades?', 61),
  (v_chapter_2_id, v_section_id, '¿Había más rivalidad o complicidad entre vosotros?', 62),
  (v_chapter_2_id, v_section_id, '¿Quiénes eran tus primos más cercanos y qué relación tenías con ellos?', 63),
  (v_chapter_2_id, v_section_id, '¿Qué aprendiste de crecer con tus hermanos o primos?', 64);

  -- Section: Rutinas y vida diaria
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_2_id, 'Rutinas y vida diaria', 4)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_2_id, v_section_id, '¿Cómo era un día normal en tu infancia?', 65),
  (v_chapter_2_id, v_section_id, '¿Qué responsabilidades o tareas tenías en casa de niño?', 66),
  (v_chapter_2_id, v_section_id, '¿Cómo eran las comidas en casa y qué platos recuerdas especialmente?', 67),
  (v_chapter_2_id, v_section_id, '¿Qué se cocinaba en ocasiones especiales?', 68),
  (v_chapter_2_id, v_section_id, '¿Qué hacías después de la escuela?', 69),
  (v_chapter_2_id, v_section_id, '¿Cómo eran las vacaciones familiares en tu infancia?', 70),
  (v_chapter_2_id, v_section_id, '¿Qué sonidos o olores recuerdas del día a día en casa?', 71);

  -- Section: Escuela
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_2_id, 'Escuela', 5)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_2_id, v_section_id, '¿Recuerdas tu primer día de escuela?', 72),
  (v_chapter_2_id, v_section_id, '¿Cómo recuerdas tu experiencia escolar y el ambiente en tu escuela?', 73),
  (v_chapter_2_id, v_section_id, '¿Qué materias te gustaban y cuáles no?', 74),
  (v_chapter_2_id, v_section_id, '¿Recuerdas a algún maestro o compañero especial de esa época?', 75),
  (v_chapter_2_id, v_section_id, '¿Participabas en actividades extraescolares?', 76),
  (v_chapter_2_id, v_section_id, '¿Eras buen estudiante o te costaba concentrarte?', 77),
  (v_chapter_2_id, v_section_id, 'Si no pudiste estudiar mucho, ¿cómo lo viviste y qué significó para ti?', 78);

  -- Section: Primeros trabajos o responsabilidades
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_2_id, 'Primeros trabajos o responsabilidades', 6)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_2_id, v_section_id, '¿Tuviste que trabajar de niño? ¿En qué consistía?', 79),
  (v_chapter_2_id, v_section_id, '¿Cómo compaginabas el trabajo con los estudios o los juegos?', 80);

  -- Section: Juegos y ocio
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_2_id, 'Juegos y ocio', 7)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_2_id, v_section_id, '¿A qué jugabas cuando eras niño y con quién?', 81),
  (v_chapter_2_id, v_section_id, '¿Qué juegos tradicionales recuerdas que ya no se juegan hoy?', 82),
  (v_chapter_2_id, v_section_id, '¿Tenías algún hobby o pasatiempo especial?', 83),
  (v_chapter_2_id, v_section_id, '¿Leías libros o cuentos? ¿Cuál recuerdas con más cariño?', 84),
  (v_chapter_2_id, v_section_id, '¿Veías televisión? ¿Qué programas te gustaban?', 85),
  (v_chapter_2_id, v_section_id, '¿Recuerdas la primera película que viste en el cine?', 86),
  (v_chapter_2_id, v_section_id, '¿Qué cosas divertidas de tu infancia crees que los niños de hoy ya no viven igual?', 87);

  -- Section: Celebraciones
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_2_id, 'Celebraciones', 8)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_2_id, v_section_id, '¿Qué celebración del año esperabas con más ilusión en tu infancia?', 88),
  (v_chapter_2_id, v_section_id, '¿Qué hacíais para celebrarlo?', 89);

END $$;

-- ============================================================================
-- CAPÍTULO 3: JUVENTUD E INDEPENDENCIA
-- ============================================================================

INSERT INTO chapter_templates (title, "order")
VALUES ('Capítulo 3: Juventud e independencia', 3);

DO $$
DECLARE
  v_chapter_3_id uuid;
  v_section_id uuid;
BEGIN
  SELECT id INTO v_chapter_3_id FROM chapter_templates WHERE "order" = 3;

  -- Section: Adolescencia y cambios personales
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_3_id, 'Adolescencia y cambios personales', 0)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_3_id, v_section_id, '¿Cómo recuerdas tu adolescencia? ¿Fue una etapa fácil o difícil?', 90),
  (v_chapter_3_id, v_section_id, '¿Cómo eras en esa época? ¿Rebelde, conformista, soñador?', 91),
  (v_chapter_3_id, v_section_id, '¿Cuáles eran tus principales preocupaciones o intereses en esos años?', 92),
  (v_chapter_3_id, v_section_id, '¿Cómo cambió tu relación con tus padres y hermanos durante la adolescencia?', 93),
  (v_chapter_3_id, v_section_id, '¿Tuviste algún conflicto importante con tus padres? ¿Por qué motivo?', 94),
  (v_chapter_3_id, v_section_id, '¿Hubo algún evento o experiencia que marcara un antes y un después en esa etapa?', 95),
  (v_chapter_3_id, v_section_id, '¿Cómo viviste los cambios físicos y emocionales propios de esa edad?', 96);

  -- Section: Estudios y desarrollo personal
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_3_id, 'Estudios y desarrollo personal', 1)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_3_id, v_section_id, '¿Continuaste estudiando durante tu adolescencia? ¿Hasta qué curso?', 97),
  (v_chapter_3_id, v_section_id, '¿Cómo era el instituto o centro educativo donde estudiabas?', 98),
  (v_chapter_3_id, v_section_id, '¿Tenías claro lo que querías estudiar o a qué querías dedicarte?', 99),
  (v_chapter_3_id, v_section_id, '¿Hubo algún profesor o mentor que influyera en tus decisiones o forma de pensar?', 100),
  (v_chapter_3_id, v_section_id, '¿Cómo veías tu futuro académico o profesional en aquella época?', 101),
  (v_chapter_3_id, v_section_id, '¿Qué materias te gustaban y cuáles no tanto? ¿Por qué?', 102);

  -- Section: Amistades y vida social
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_3_id, 'Amistades y vida social', 2)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_3_id, v_section_id, '¿Quiénes eran tus mejores amigos en la juventud y cómo era vuestra relación?', 103),
  (v_chapter_3_id, v_section_id, '¿Dónde solíais reuniros y qué hacíais juntos?', 104),
  (v_chapter_3_id, v_section_id, '¿Conservas alguna de esas amistades hoy?', 105),
  (v_chapter_3_id, v_section_id, '¿Había algún lugar de moda o actividades que los jóvenes esperaban con ilusión?', 106),
  (v_chapter_3_id, v_section_id, '¿Cómo era la vida social en tu juventud? ¿Había diferencias entre chicos y chicas?', 107),
  (v_chapter_3_id, v_section_id, '¿Recuerdas alguna anécdota divertida o significativa con tus amigos?', 108);

  -- Section: Primeras relaciones sentimentales
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_3_id, 'Primeras relaciones sentimentales', 3)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_3_id, v_section_id, '¿Quién fue tu primer amor o tu primer novio o novia? ¿Cómo fue tu primera cita?', 109),
  (v_chapter_3_id, v_section_id, '¿Cómo solían conocerse las parejas en tu época?', 110),
  (v_chapter_3_id, v_section_id, '¿Recuerdas alguna historia romántica especial de tu juventud?', 111),
  (v_chapter_3_id, v_section_id, '¿Hubo algún desamor que te afectara especialmente?', 112);

  -- Section: Primer trabajo y dinero propio
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_3_id, 'Primer trabajo y dinero propio', 4)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_3_id, v_section_id, '¿Cuál fue tu primer trabajo formal y cómo lo conseguiste?', 113),
  (v_chapter_3_id, v_section_id, '¿Cómo era un día típico en ese trabajo? ¿Qué sentiste al recibir tu primer sueldo?', 114),
  (v_chapter_3_id, v_section_id, '¿Cómo era el mundo laboral en tu juventud? ¿Era fácil encontrar empleo para los jóvenes?', 115),
  (v_chapter_3_id, v_section_id, '¿Cuándo empezaste a contribuir económicamente en casa?', 116),
  (v_chapter_3_id, v_section_id, '¿Cómo manejabas tu dinero? ¿Eras más de ahorrar o de gastar?', 117);

  -- Section: Independencia y vida propia
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_3_id, 'Independencia y vida propia', 5)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_3_id, v_section_id, '¿Cuándo te fuiste de casa de tus padres por primera vez?', 118),
  (v_chapter_3_id, v_section_id, '¿Te fuiste a vivir solo o compartiste piso?', 119),
  (v_chapter_3_id, v_section_id, '¿Fue difícil adaptarte a vivir sin tus padres? ¿Te sentías preparado?', 120),
  (v_chapter_3_id, v_section_id, '¿Qué tal llevaron tus padres tu independencia?', 121),
  (v_chapter_3_id, v_section_id, '¿Qué fue lo más difícil y lo más liberador de independizarte?', 122);

  -- Section: Identidad, estilo y cultura juvenil
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_3_id, 'Identidad, estilo y cultura juvenil', 6)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_3_id, v_section_id, '¿Cómo definirías tu personalidad en esa etapa de tu vida?', 123),
  (v_chapter_3_id, v_section_id, '¿Tenías algún ídolo o persona a quien admirabas especialmente?', 124),
  (v_chapter_3_id, v_section_id, '¿Seguías alguna moda o estilo particular? ¿Cómo te vestías?', 125),
  (v_chapter_3_id, v_section_id, '¿Qué tipo de música escuchabas? ¿Quién era tu cantante o grupo favorito?', 126),
  (v_chapter_3_id, v_section_id, '¿Tenías alguna ideología o forma de pensar que te identificara con un movimiento social o político?', 127),
  (v_chapter_3_id, v_section_id, '¿Participabas en algún movimiento juvenil, político o social?', 128);

  -- Section: Aspiraciones y visión de futuro
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_3_id, 'Aspiraciones y visión de futuro', 7)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_3_id, v_section_id, '¿Cómo te imaginabas el futuro? ¿Qué aspiraciones y sueños tenías en esa época?', 129),
  (v_chapter_3_id, v_section_id, '¿Qué acontecimientos históricos o sociales importantes viviste durante tu juventud? ¿Cómo te afectaron?', 130),
  (v_chapter_3_id, v_section_id, '¿Había temas tabú o cosas de las que no se podía hablar abiertamente?', 131),
  (v_chapter_3_id, v_section_id, '¿Sentías que tenías más o menos oportunidades que la generación de tus padres?', 132),
  (v_chapter_3_id, v_section_id, '¿Qué avances o cambios recuerdas de esa época que te marcaran especialmente?', 133);

END $$;

-- ============================================================================
-- CAPÍTULO 4: VIDA ADULTA Y CRECIMIENTO
-- ============================================================================

INSERT INTO chapter_templates (title, "order")
VALUES ('Capítulo 4: Vida adulta y crecimiento', 4);

DO $$
DECLARE
  v_chapter_4_id uuid;
  v_section_id uuid;
BEGIN
  SELECT id INTO v_chapter_4_id FROM chapter_templates WHERE "order" = 4;

  -- Section: Primeros años de adultez
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_4_id, 'Primeros años de adultez', 0)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_4_id, v_section_id, '¿Cómo recuerdas la transición a la vida adulta y los primeros años por tu cuenta?', 134),
  (v_chapter_4_id, v_section_id, '¿Qué aprendizajes o decisiones marcaron esa etapa inicial de independencia?', 135);

  -- Section: Pareja y familia
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_4_id, 'Pareja y familia', 1)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_4_id, v_section_id, '¿Cómo conociste a tu pareja y cómo fue el inicio de vuestra relación?', 136),
  (v_chapter_4_id, v_section_id, '¿Qué recuerdas de vuestra boda o de la decisión de formar una vida juntos?', 137),
  (v_chapter_4_id, v_section_id, '¿Cómo viviste la llegada de tus hijos y qué sentimientos recuerdas de esos momentos?', 138),
  (v_chapter_4_id, v_section_id, '¿Cómo afrontaste los retos de la paternidad o maternidad y qué momentos de la crianza recuerdas como los más gratificantes o difíciles?', 139),
  (v_chapter_4_id, v_section_id, '¿Qué valores intentaste transmitir a tus hijos?', 140);

  -- Section: Vida laboral y vocación
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_4_id, 'Vida laboral y vocación', 2)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_4_id, v_section_id, '¿Qué trabajos has tenido a lo largo de tu vida y cuál marcó un antes y un después para ti?', 141),
  (v_chapter_4_id, v_section_id, '¿Cómo era el mundo laboral en esa época y tuviste algún momento difícil en el trabajo o de desempleo?', 142),
  (v_chapter_4_id, v_section_id, '¿Cuál fue el momento de tu vida laboral que te hizo sentir más orgulloso?', 143),
  (v_chapter_4_id, v_section_id, '¿Cómo equilibrabas tu trabajo con la vida familiar?', 144),
  (v_chapter_4_id, v_section_id, 'Si pudieras elegir otra profesión, ¿cuál habría sido y por qué?', 145);

  -- Section: Hogar y entorno
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_4_id, 'Hogar y entorno', 3)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_4_id, v_section_id, '¿Dónde estableciste tu primer hogar como adulto y cómo lo conseguiste?', 146),
  (v_chapter_4_id, v_section_id, '¿Cómo era tu primer hogar propio y qué recuerdos guardas de él?', 147),
  (v_chapter_4_id, v_section_id, '¿Cambiaste de vivienda con los años y hubo alguna casa a la que te costara despedirte?', 148),
  (v_chapter_4_id, v_section_id, '¿Tenías alguna afición relacionada con el hogar, como la jardinería o el bricolaje?', 149);

  -- Section: Momentos difíciles y superación
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_4_id, 'Momentos difíciles y superación', 4)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_4_id, v_section_id, '¿Cuáles fueron los momentos más difíciles de tu vida adulta y cómo los superaste?', 150),
  (v_chapter_4_id, v_section_id, '¿Viviste alguna crisis familiar importante y cómo la afrontasteis?', 151),
  (v_chapter_4_id, v_section_id, '¿Sufriste alguna pérdida importante y cómo te afectó?', 152),
  (v_chapter_4_id, v_section_id, '¿Tuviste algún problema de salud que cambiara tu forma de ver la vida?', 153),
  (v_chapter_4_id, v_section_id, '¿Qué aprendiste de los momentos difíciles y quién te acompañó en ellos?', 154),
  (v_chapter_4_id, v_section_id, '¿Cómo crees que las dificultades en la vida te cambiaron como persona?', 155);

  -- Section: Amistades y vida social adulta
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_4_id, 'Amistades y vida social adulta', 5)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_4_id, v_section_id, '¿Cómo cambió tu vida social al convertirte en adulto y mantuviste amistades de tu juventud? ¿Cómo conociste a tus amigos en la vida adulta y qué papel jugaron en tu vida?', 156),
  (v_chapter_4_id, v_section_id, '¿Tenías tiempo para cuidar tus amistades con todas tus responsabilidades y cómo ha cambiado tu forma de entender la amistad con el tiempo?', 157);

  -- Section: Tiempo libre y pasiones
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_4_id, 'Tiempo libre y pasiones', 6)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_4_id, v_section_id, '¿Qué actividades o aficiones te gustaba practicar en tu tiempo libre durante tu vida adulta?', 158),
  (v_chapter_4_id, v_section_id, '¿Practicabas algún deporte o actividad física con regularidad?', 159),
  (v_chapter_4_id, v_section_id, '¿Cómo solías viajar y cuál fue el viaje del que guardas mejor recuerdo?', 160),
  (v_chapter_4_id, v_section_id, '¿Qué actividades solías hacer en familia de forma habitual?', 161),
  (v_chapter_4_id, v_section_id, '¿Hay algún hobby que te hubiera gustado hacer y nunca tuviste oportunidad?', 162);

END $$;

-- ============================================================================
-- CAPÍTULO 5: REFLEXIONES Y LEGADO
-- ============================================================================

INSERT INTO chapter_templates (title, "order")
VALUES ('Capítulo 5: Reflexiones y legado', 5);

DO $$
DECLARE
  v_chapter_5_id uuid;
  v_section_id uuid;
BEGIN
  SELECT id INTO v_chapter_5_id FROM chapter_templates WHERE "order" = 5;

  -- Section: Mirar hacia atrás
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_5_id, 'Mirar hacia atrás', 0)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_5_id, v_section_id, '¿Cómo ves ahora las preocupaciones que tenías cuando eras joven?', 163),
  (v_chapter_5_id, v_section_id, 'Si pudieras hablar con tu "yo" más joven, ¿qué consejo le darías?', 164),
  (v_chapter_5_id, v_section_id, '¿Hay algo de tu pasado que hubieras hecho de otra forma?', 165),
  (v_chapter_5_id, v_section_id, '¿Qué sabiduría o lección importante crees que has adquirido con los años?', 166),
  (v_chapter_5_id, v_section_id, '¿Cómo has cambiado a lo largo de tu vida y qué valores han permanecido o evolucionado contigo?', 167);

  -- Section: Decisiones y momentos clave
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_5_id, 'Decisiones y momentos clave', 1)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_5_id, v_section_id, '¿Qué decisiones o eventos marcaron los grandes puntos de inflexión en tu vida?', 168),
  (v_chapter_5_id, v_section_id, '¿Hay algún momento de tu vida al que te gustaría volver?', 169);

  -- Section: Alegrías, desafíos y orgullo personal
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_5_id, 'Alegrías, desafíos y orgullo personal', 2)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_5_id, v_section_id, '¿Cuáles han sido tus mayores alegrías y desafíos a lo largo de tu vida?', 170),
  (v_chapter_5_id, v_section_id, '¿De qué te sientes más orgulloso?', 171),
  (v_chapter_5_id, v_section_id, '¿Hay algo que lograste que te sorprendió o que pensaste que no podrías alcanzar?', 172),
  (v_chapter_5_id, v_section_id, '¿Qué habilidades o talentos has descubierto en ti mismo a lo largo de tu vida?', 173),
  (v_chapter_5_id, v_section_id, '¿Hay algún reconocimiento o elogio que hayas recibido y que recuerdes con especial cariño?', 174);

  -- Section: Relaciones, gratitud y contribución
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_5_id, 'Relaciones, gratitud y contribución', 3)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_5_id, v_section_id, '¿Cuál consideras que ha sido tu mayor contribución a tu familia?', 175),
  (v_chapter_5_id, v_section_id, '¿Hay personas con las que te hubiera gustado reconciliarte o agradecer algo importante?', 176),
  (v_chapter_5_id, v_section_id, '¿Qué personas han sido fundamentales en tu vida y por qué te sientes agradecido hacia ellas?', 177),
  (v_chapter_5_id, v_section_id, '¿Cuáles consideras los regalos más valiosos (no materiales) que has recibido en tu vida?', 178);

  -- Section: Vida presente
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_5_id, 'Vida presente', 4)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_5_id, v_section_id, '¿Qué actividades o intereses disfrutas ahora?', 179),
  (v_chapter_5_id, v_section_id, '¿Cómo es tu día a día actualmente y en qué se diferencia de antes?', 180),
  (v_chapter_5_id, v_section_id, '¿Qué cosas son más importantes para ti en esta etapa y por qué?', 181);

  -- Section: Legado y visión del futuro
  INSERT INTO section_templates (chapter_template_id, title, "order")
  VALUES (v_chapter_5_id, 'Legado y visión del futuro', 5)
  RETURNING id INTO v_section_id;

  INSERT INTO question_templates (chapter_template_id, section_template_id, question, "order") VALUES
  (v_chapter_5_id, v_section_id, '¿Qué te gustaría que la gente recordara de ti cuando ya no estés?', 182),
  (v_chapter_5_id, v_section_id, '¿Qué consejo darías a las nuevas generaciones sobre cómo afrontar la vida?', 183),
  (v_chapter_5_id, v_section_id, '¿Cómo ha cambiado tu percepción del tiempo y sientes que ahora pasa más rápido que antes?', 184),
  (v_chapter_5_id, v_section_id, '¿Cómo ha cambiado el mundo desde tu juventud, qué avances consideras más positivos y qué aspectos del pasado echas de menos?', 185),
  (v_chapter_5_id, v_section_id, '¿Cómo imaginas el futuro para tus nietos o qué te hubiera gustado ver o experimentar tú mismo?', 186),
  (v_chapter_5_id, v_section_id, '¿Qué mensaje te gustaría dejar para alguien que escuche esto dentro de 100 años?', 187);

END $$;

-- Verify the migration
DO $$
DECLARE
  chapter_count integer;
  section_count integer;
  question_count integer;
BEGIN
  SELECT COUNT(*) INTO chapter_count FROM chapter_templates;
  SELECT COUNT(*) INTO section_count FROM section_templates;
  SELECT COUNT(*) INTO question_count FROM question_templates;

  RAISE NOTICE 'Migration complete:';
  RAISE NOTICE '  - Chapters: %', chapter_count;
  RAISE NOTICE '  - Sections: %', section_count;
  RAISE NOTICE '  - Questions: %', question_count;

  IF chapter_count != 6 THEN
    RAISE EXCEPTION 'Expected 6 chapters, but got %', chapter_count;
  END IF;

  IF question_count != 188 THEN
    RAISE EXCEPTION 'Expected 188 questions, but got %', question_count;
  END IF;
END $$;
