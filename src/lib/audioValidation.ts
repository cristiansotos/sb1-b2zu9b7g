export interface AudioQualityMetrics {
  durationMs: number;
  silenceRatio: number;
  averageEnergy: number;
  isValid: boolean;
  warnings: string[];
}

const MINIMUM_DURATION_MS = 1000;
const MAXIMUM_DURATION_MS = 600000;
const SILENCE_THRESHOLD = 0.01;
const LOW_ENERGY_THRESHOLD = 0.05;

export const analyzeAudioQuality = async (audioBlob: Blob): Promise<AudioQualityMetrics> => {
  const warnings: string[] = [];

  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const durationMs = audioBuffer.duration * 1000;
    const channelData = audioBuffer.getChannelData(0);

    if (durationMs < MINIMUM_DURATION_MS) {
      warnings.push('La grabación es demasiado corta (menos de 1 segundo)');
    }

    if (durationMs > MAXIMUM_DURATION_MS) {
      warnings.push('La grabación es muy larga (más de 10 minutos). Esto podría causar problemas de procesamiento.');
    }

    let totalEnergy = 0;
    let silentSamples = 0;

    for (let i = 0; i < channelData.length; i++) {
      const sample = Math.abs(channelData[i]);
      totalEnergy += sample;

      if (sample < SILENCE_THRESHOLD) {
        silentSamples++;
      }
    }

    const averageEnergy = totalEnergy / channelData.length;
    const silenceRatio = silentSamples / channelData.length;

    if (averageEnergy < LOW_ENERGY_THRESHOLD) {
      warnings.push('El nivel de audio es muy bajo. Intenta hablar más cerca del micrófono.');
    }

    if (silenceRatio > 0.7) {
      warnings.push('La grabación contiene mucho silencio. Asegúrate de estar hablando claramente.');
    }

    const isValid = durationMs >= MINIMUM_DURATION_MS && durationMs <= MAXIMUM_DURATION_MS;

    await audioContext.close();

    return {
      durationMs,
      silenceRatio,
      averageEnergy,
      isValid,
      warnings
    };
  } catch (error) {
    console.error('Error analyzing audio:', error);
    await audioContext.close();

    return {
      durationMs: 0,
      silenceRatio: 0,
      averageEnergy: 0,
      isValid: false,
      warnings: ['No se pudo analizar la calidad del audio']
    };
  }
};

export const calculateConfidenceScore = (transcriptText: string, durationMs: number): number => {
  if (!transcriptText || durationMs === 0) return 0;

  const words = transcriptText.trim().split(/\s+/).length;
  const durationSeconds = durationMs / 1000;
  const wordsPerSecond = words / durationSeconds;

  if (wordsPerSecond < 0.5) return 0.3;
  if (wordsPerSecond > 5) return 0.4;
  if (wordsPerSecond >= 1.5 && wordsPerSecond <= 3) return 1.0;
  if (wordsPerSecond >= 1.0 && wordsPerSecond <= 4) return 0.8;

  return 0.6;
};

export const detectValidationIssues = (
  transcript: string,
  durationMs: number,
  silenceRatio: number
): string[] => {
  const issues: string[] = [];

  if (!transcript || transcript.trim().length === 0) {
    issues.push('empty_transcript');
    return issues;
  }

  const words = transcript.trim().split(/\s+/);
  const wordCount = words.length;
  const durationSeconds = durationMs / 1000;

  if (durationSeconds > 30 && wordCount < 10) {
    issues.push('short_transcript');
  }

  const threeWordSequences = new Map<string, number>();
  for (let i = 0; i < words.length - 2; i++) {
    const sequence = `${words[i]} ${words[i + 1]} ${words[i + 2]}`.toLowerCase();
    threeWordSequences.set(sequence, (threeWordSequences.get(sequence) || 0) + 1);
  }

  for (const [, count] of threeWordSequences) {
    if (count > 2) {
      issues.push('excessive_repetition');
      break;
    }
  }

  if (silenceRatio > 0.7 && wordCount > 50) {
    issues.push('high_silence_with_long_transcript');
  }

  const nonVerbalPatterns = [
    /\[music\]/gi,
    /\[applause\]/gi,
    /\[laughter\]/gi,
    /\d{1,2}:\d{2}/g,
    /\.{3,}/g
  ];

  for (const pattern of nonVerbalPatterns) {
    if (pattern.test(transcript)) {
      issues.push('non_verbal_content');
      break;
    }
  }

  return issues;
};
