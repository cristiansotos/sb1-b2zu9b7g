/*
  # Añadir validación de límite de familias por historia

  1. Cambios
    - Añade función de validación para limitar historias a máximo 4 familias
    - Añade trigger para ejecutar validación antes de insertar en story_family_groups
    - Asegura integridad de datos a nivel de base de datos

  2. Validaciones
    - Verifica que una historia no esté asociada a más de 4 familias
    - Lanza error descriptivo si se excede el límite
    - Se ejecuta automáticamente en cada INSERT

  3. Notas
    - La validación es a nivel de base de datos para máxima seguridad
    - El límite de 4 familias es configurable modificando la función
    - Los datos existentes NO son afectados por esta migración
*/

-- Función para validar el límite de familias por historia
CREATE OR REPLACE FUNCTION validate_story_family_limit()
RETURNS TRIGGER AS $$
DECLARE
  family_count integer;
BEGIN
  -- Contar cuántas familias ya tiene esta historia
  SELECT COUNT(*)
  INTO family_count
  FROM story_family_groups
  WHERE story_id = NEW.story_id;

  -- Si ya tiene 4 o más familias, rechazar la inserción
  IF family_count >= 4 THEN
    RAISE EXCEPTION 'Una historia no puede estar asociada a más de 4 familias';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para ejecutar la validación antes de insertar
DROP TRIGGER IF EXISTS check_story_family_limit ON story_family_groups;

CREATE TRIGGER check_story_family_limit
  BEFORE INSERT ON story_family_groups
  FOR EACH ROW
  EXECUTE FUNCTION validate_story_family_limit();

-- Comentario en la tabla para documentar el límite
COMMENT ON TABLE story_family_groups IS 'Tabla de relación muchos-a-muchos entre historias y grupos familiares. Límite: 4 familias por historia.';
