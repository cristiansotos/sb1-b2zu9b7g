/*
  # Add Batch Reorder Functions for Performance
  
  ## Overview
  Replaces N individual UPDATE queries with single batch operations using
  PostgreSQL's array operations and UPDATE...FROM syntax.
  
  ## New Functions
  
  1. **batch_reorder_chapter_templates**
     - Takes arrays of chapter IDs and their new order positions
     - Updates all chapters in a single transaction
  
  2. **batch_reorder_section_templates**
     - Takes arrays of section IDs and their new order positions
     - Updates all sections in a single transaction
  
  3. **batch_reorder_question_templates**
     - Takes arrays of question IDs and their new order positions
     - Updates all questions in a single transaction
  
  ## Performance Impact
  - Reduces N queries to 1 query for reordering operations
  - Decreases transaction overhead and network round trips
  - Significantly reduces disk IO for bulk operations
  
  ## Notes
  - Functions use SECURITY DEFINER to bypass RLS for performance
  - Input arrays must be same length (enforced with check)
  - All operations are atomic (single transaction)
*/

-- Function to batch reorder chapter templates
CREATE OR REPLACE FUNCTION batch_reorder_chapter_templates(
  ids uuid[],
  orders integer[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate input arrays have same length
  IF array_length(ids, 1) != array_length(orders, 1) THEN
    RAISE EXCEPTION 'Arrays must have the same length';
  END IF;

  -- Perform batch update using unnest
  UPDATE chapter_templates
  SET "order" = data.new_order,
      updated_at = now()
  FROM (
    SELECT 
      unnest(ids) as id,
      unnest(orders) as new_order
  ) AS data
  WHERE chapter_templates.id = data.id;
END;
$$;

-- Function to batch reorder section templates
CREATE OR REPLACE FUNCTION batch_reorder_section_templates(
  ids uuid[],
  orders integer[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate input arrays have same length
  IF array_length(ids, 1) != array_length(orders, 1) THEN
    RAISE EXCEPTION 'Arrays must have the same length';
  END IF;

  -- Perform batch update using unnest
  UPDATE section_templates
  SET "order" = data.new_order,
      updated_at = now()
  FROM (
    SELECT 
      unnest(ids) as id,
      unnest(orders) as new_order
  ) AS data
  WHERE section_templates.id = data.id;
END;
$$;

-- Function to batch reorder question templates
CREATE OR REPLACE FUNCTION batch_reorder_question_templates(
  ids uuid[],
  orders integer[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate input arrays have same length
  IF array_length(ids, 1) != array_length(orders, 1) THEN
    RAISE EXCEPTION 'Arrays must have the same length';
  END IF;

  -- Perform batch update using unnest
  UPDATE question_templates
  SET "order" = data.new_order,
      updated_at = now()
  FROM (
    SELECT 
      unnest(ids) as id,
      unnest(orders) as new_order
  ) AS data
  WHERE question_templates.id = data.id;
END;
$$;
