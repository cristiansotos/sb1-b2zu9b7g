/*
  # Add Rich Text Formatting Support for Transcripts

  1. Changes
    - Add `transcript_formatted` JSONB column to `recordings` table
    - This column stores rich text with formatting information

  2. Format Structure
    The JSONB will store:
    ```json
    {
      "html": "<p>Text with <strong>bold</strong> and <span class='highlight-yellow'>highlighted</span> sections</p>",
      "plain": "Plain text version",
      "version": 1
    }
    ```

  3. Notes
    - Existing `transcript` field remains for backward compatibility
    - Users can edit and format transcripts with bold and color highlighting
    - The formatted version takes precedence when available
*/

-- Add transcript_formatted column to recordings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recordings' AND column_name = 'transcript_formatted'
  ) THEN
    ALTER TABLE recordings ADD COLUMN transcript_formatted JSONB DEFAULT NULL;
  END IF;
END $$;