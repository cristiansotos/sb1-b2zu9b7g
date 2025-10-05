export interface AudioQualityMetrics {
  durationMs: number;
  silenceRatio: number;
  averageEnergy: number;
  isValid: boolean;
  warnings: string[];
}

export interface AudioQualityThresholds {
  minDurationMs: number;
  maxDurationMs: number;
  silenceThreshold: number;
  lowEnergyThreshold: number;
  silenceRatioWarning: number;
}

// Default thresholds (fallback values if database settings are not available)
// Audio samples in Web Audio API range from -1.0 to +1.0
const DEFAULT_MINIMUM_DURATION_MS = 1000; // 1 second
const DEFAULT_MAXIMUM_DURATION_MS = 1200000; // 20 minutes (increased from 10)
const DEFAULT_SILENCE_THRESHOLD = 0.005; // 0.5% amplitude (lowered from 1%)
const DEFAULT_LOW_ENERGY_THRESHOLD = 0.02; // 2% amplitude (lowered from 5% for less false positives)
const DEFAULT_SILENCE_RATIO_WARNING = 0.85; // Warn if 85%+ is silence (increased from 70%)

// Typical audio energy levels for reference:
// - Normal speech with proper recording: 0.1 to 0.3
// - Quiet but clear speech: 0.05 to 0.1
// - Very quiet/distant: 0.02 to 0.05
// - Too quiet to transcribe reliably: below 0.02

export const analyzeAudioQuality = async (
  audioBlob: Blob,
  thresholds?: AudioQualityThresholds
): Promise<AudioQualityMetrics> => {
  // Use provided thresholds or fall back to defaults
  const minDuration = thresholds?.minDurationMs ?? DEFAULT_MINIMUM_DURATION_MS;
  const maxDuration = thresholds?.maxDurationMs ?? DEFAULT_MAXIMUM_DURATION_MS;
  const silenceThreshold = thresholds?.silenceThreshold ?? DEFAULT_SILENCE_THRESHOLD;
  const lowEnergyThreshold = thresholds?.lowEnergyThreshold ?? DEFAULT_LOW_ENERGY_THRESHOLD;
  const silenceRatioWarning = thresholds?.silenceRatioWarning ?? DEFAULT_SILENCE_RATIO_WARNING;

  const warnings: string[] = [];

  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const durationMs = audioBuffer.duration * 1000;
    const channelData = audioBuffer.getChannelData(0);

    if (durationMs < minDuration) {
      warnings.push('La grabación es demasiado corta (menos de 1 segundo)');
    }

    if (durationMs > maxDuration) {
      const maxMinutes = Math.floor(maxDuration / 60000);
      warnings.push(`La grabación es muy larga (más de ${maxMinutes} minutos). Esto podría causar problemas de procesamiento.`);
    }

    let totalEnergy = 0;
    let silentSamples = 0;

    for (let i = 0; i < channelData.length; i++) {
      const sample = Math.abs(channelData[i]);
      totalEnergy += sample;

      if (sample < silenceThreshold) {
        silentSamples++;
      }
    }

    const averageEnergy = totalEnergy / channelData.length;
    const silenceRatio = silentSamples / channelData.length;

    if (averageEnergy < lowEnergyThreshold) {
      const energyPercent = Math.round(averageEnergy * 100);
      warnings.push(`El nivel de audio es bajo (${energyPercent}%). Si es posible, intenta hablar más cerca del micrófono.`);
    }

    if (silenceRatio > silenceRatioWarning) {
      const silencePercent = Math.round(silenceRatio * 100);
      warnings.push(`La grabación contiene mucho silencio (${silencePercent}%). Asegúrate de estar hablando claramente.`);
    }

    const isValid = durationMs >= minDuration && durationMs <= maxDuration;

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
