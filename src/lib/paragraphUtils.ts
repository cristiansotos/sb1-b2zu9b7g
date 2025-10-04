/**
 * Utility functions for automatic paragraph breaking in transcripts
 */

/**
 * Adds paragraph breaks to a transcript text.
 * Randomly breaks text into paragraphs of 3-5 sentences for natural appearance.
 *
 * @param text - The original transcript text
 * @returns Text with automatic paragraph breaks added
 */
export function addParagraphBreaks(text: string): string {
  if (!text || text.trim().length === 0) {
    return text;
  }

  // Split text into sentences based on periods followed by space and capital letter
  // Also handle periods followed by quotes and capital letters
  const sentenceRegex = /([.!?]+[\s]+)(?=[A-ZÁÉÍÓÚÑ"'«])/g;

  // Split the text but keep the delimiters
  const parts = text.split(sentenceRegex);
  const sentences: string[] = [];

  // Reconstruct sentences with their punctuation
  for (let i = 0; i < parts.length; i += 2) {
    const sentence = parts[i];
    const delimiter = parts[i + 1] || '';

    if (sentence.trim()) {
      sentences.push(sentence + delimiter);
    }
  }

  // If we couldn't split into sentences, return original text
  if (sentences.length === 0) {
    return text;
  }

  // Group sentences into paragraphs of 3-5 sentences randomly
  const paragraphs: string[] = [];
  let currentParagraph: string[] = [];

  for (let i = 0; i < sentences.length; i++) {
    currentParagraph.push(sentences[i]);

    // Randomly decide paragraph length (3, 4, or 5 sentences)
    const minSentences = 3;
    const maxSentences = 5;
    const targetLength = Math.floor(Math.random() * (maxSentences - minSentences + 1)) + minSentences;

    // Create a new paragraph when we reach target length or end of sentences
    if (currentParagraph.length >= targetLength || i === sentences.length - 1) {
      paragraphs.push(currentParagraph.join('').trim());
      currentParagraph = [];
    }
  }

  // Join paragraphs with double line breaks
  return paragraphs.join('\n\n');
}

/**
 * Wraps formatted text with paragraph breaks in HTML paragraph tags
 *
 * @param text - Text with paragraph breaks (separated by \n\n)
 * @returns HTML formatted text with <p> tags
 */
export function wrapParagraphsInHtml(text: string): string {
  if (!text || text.trim().length === 0) {
    return text;
  }

  // Split by double line breaks
  const paragraphs = text.split(/\n\n+/);

  // Wrap each paragraph in <p> tags
  return paragraphs
    .filter(p => p.trim().length > 0)
    .map(p => `<p>${p.trim()}</p>`)
    .join('');
}

/**
 * Prepares transcript for storage by adding paragraph breaks and HTML formatting
 *
 * @param originalText - The original transcript text from the AI
 * @returns Object containing plain text with breaks and HTML formatted version
 */
export function formatTranscript(originalText: string): {
  plain: string;
  html: string;
} {
  const plainWithBreaks = addParagraphBreaks(originalText);
  const html = wrapParagraphsInHtml(plainWithBreaks);

  return {
    plain: plainWithBreaks,
    html
  };
}
