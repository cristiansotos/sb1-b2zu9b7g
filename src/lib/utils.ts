import { ALL_FILTERED_PHRASES, NO_SPEECH_MESSAGE } from './filteredPhrases';

export const formatDate = (date: string | Date): string => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const calculateAge = (birthDate: string): string => {
  if (!birthDate) return '';
  const birth = new Date(birthDate);
  const today = new Date();
  const ageInMs = today.getTime() - birth.getTime();
  const ageInYears = Math.floor(ageInMs / (365.25 * 24 * 60 * 60 * 1000));
  return `${ageInYears} años`;
};

export const optimizeImage = async (file: File, maxSize = 1200, quality = 0.75): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Calculate new dimensions
      let { width, height } = img;
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(resolve, 'image/webp', quality);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

export const filterTranscript = (text: string): string => {
  if (!text) return NO_SPEECH_MESSAGE;

  let filtered = text;

  ALL_FILTERED_PHRASES.forEach(phrase => {
    const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filtered = filtered.replace(new RegExp(escapedPhrase, 'gi'), '');
  });

  filtered = filtered.replace(/\s+/g, ' ').trim();

  if (!filtered || filtered.length === 0) {
    return NO_SPEECH_MESSAGE;
  }

  return filtered;
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateDateOfBirth = (dateStr: string): { isValid: boolean; error?: string } => {
  if (!dateStr) return { isValid: false, error: 'La fecha es requerida' };

  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = dateStr.match(regex);

  if (!match) return { isValid: false, error: 'Formato debe ser DD/MM/YYYY' };

  const [, day, month, year] = match;
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const today = new Date();

  if (date > today) return { isValid: false, error: 'La fecha no puede ser futura' };

  const age = (today.getTime() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (age > 150) return { isValid: false, error: 'Edad no puede ser mayor a 150 años' };

  return { isValid: true };
};

export function stripHtmlTags(html: string): string {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}