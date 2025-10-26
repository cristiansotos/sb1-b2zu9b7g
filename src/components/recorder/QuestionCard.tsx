import React, { useState, useRef, useEffect } from 'react';
import { Mic, Camera, Upload, Play, Pause, Trash2, Square, Eye, FileText, Image as ImageIcon, AlertTriangle, SkipForward, RotateCcw } from 'lucide-react';
import Button from '../ui/Button';
import EditableTranscriptionDisplay from '../ui/EditableTranscriptionDisplay';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useChapterStore } from '../../store/chapterStore';
import { useQuestionStateStore } from '../../store/questionStateStore';
import SkipWarningModal from '../ui/SkipWarningModal';
import { formatDuration } from '../../lib/utils';
import { Recording, Image } from '../../types';
import { supabase } from '../../lib/supabase';
import { analyzeAudioQuality, AudioQualityThresholds } from '../../lib/audioValidation';

interface QuestionCardProps {
  storyId: string;
  chapterId: string;
  question: string;
  recordings: Recording[];
  onRecordingComplete: () => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  storyId,
  chapterId,
  question,
  recordings,
  onRecordingComplete
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [images, setImages] = useState<Image[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loadingImages, setLoadingImages] = useState(false);
  const [imageLoadError, setImageLoadError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const fetchInProgressRef = useRef(false);
  const [imageUploadError, setImageUploadError] = useState<{ message: string; details?: string } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);
  const [isPausedRecordingId, setIsPausedRecordingId] = useState<string | null>(null);
  const [audioQualityWarnings, setAudioQualityWarnings] = useState<string[]>([]);
  const [showQualityWarning, setShowQualityWarning] = useState(false);
  const [audioQualityThresholds, setAudioQualityThresholds] = useState<AudioQualityThresholds | undefined>(undefined);
  const [savedRecordingsExpanded, setSavedRecordingsExpanded] = useState(true);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ type: 'recording' | 'transcript', id: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [skipDontShowAgain, setSkipDontShowAgain] = useState(false);
  const playingAudioRef = useRef<HTMLAudioElement | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const {
    isRecording,
    isPaused,
    recordingTime,
    audioBlob,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    playRecording,
    stopPlayback,
    isPlaying
  } = useAudioRecorder();

  const {
    createRecording,
    deleteRecording,
    transcribeRecording,
    updateRecordingTranscript,
    deleteRecordingTranscript
  } = useChapterStore();

  const {
    getQuestionState,
    skipQuestion,
    reactivateQuestion,
    checkQuestionHasContent,
    markQuestionAsAnswered,
    userPreferences,
    fetchUserPreferences,
    updateShowSkipWarning
  } = useQuestionStateStore();

  const fetchImages = async (retryCount = 0, isManualRetry = false) => {
    // Prevent duplicate concurrent requests
    if (fetchInProgressRef.current && !isManualRetry) {
      return;
    }

    fetchInProgressRef.current = true;

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    // Only update state if component is still mounted
    if (isMountedRef.current) {
      setLoadingImages(true);
      setImageLoadError(null);
    }

    try {
      const { data, error } = await supabase
        .from('images')
        .select('*')
        .eq('chapter_id', chapterId)
        .eq('question', question)
        .order('created_at', { ascending: false })
        .limit(50)
        .abortSignal(abortControllerRef.current.signal);

      if (error) {
        // Log detailed error information for debugging
        console.error('Supabase images query error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          retryCount
        });

        // Handle different error types
        if (error.code === '57014' && retryCount < 2) {
          // Query timeout - retry with exponential backoff
          console.warn(`Image query timeout, retrying (${retryCount + 1}/2)...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
          fetchInProgressRef.current = false;
          return fetchImages(retryCount + 1, isManualRetry);
        }

        // Handle 500 server errors with retry
        if (error.message?.includes('500') && retryCount < 3) {
          console.warn(`Server error 500, retrying (${retryCount + 1}/3)...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
          fetchInProgressRef.current = false;
          return fetchImages(retryCount + 1, isManualRetry);
        }

        throw error;
      }

      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setImages(data || []);
        setImageLoadError(null);
      }
    } catch (error: any) {
      // Don't handle AbortError - it's expected on unmount
      if (error.name === 'AbortError') {
        console.log('Image fetch aborted (component unmounting or new request started)');
        return;
      }

      // Only set error if component is still mounted
      if (isMountedRef.current) {
        console.error('Error fetching images:', error);

        let errorMessage = 'Error al cargar las imágenes. Por favor, intenta de nuevo.';

        if (error.code === '57014') {
          errorMessage = 'La carga de imágenes está tardando demasiado. Por favor, intenta recargar.';
        } else if (error.message?.includes('500')) {
          errorMessage = 'Error del servidor al cargar imágenes. Por favor, intenta de nuevo en unos momentos.';
        } else if (error.message?.includes('Failed to fetch') || error instanceof TypeError) {
          errorMessage = 'Error de conexión. Verifica tu internet e intenta de nuevo.';
        }

        setImageLoadError(errorMessage);
      }
    } finally {
      fetchInProgressRef.current = false;
      // Only update loading state if component is still mounted
      if (isMountedRef.current) {
        setLoadingImages(false);
      }
    }
  };

  const fetchAudioQualitySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('audio_quality_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setAudioQualityThresholds({
          minDurationMs: data.min_duration_ms,
          maxDurationMs: data.max_duration_ms,
          silenceThreshold: data.silence_threshold,
          lowEnergyThreshold: data.low_energy_threshold,
          silenceRatioWarning: data.silence_ratio_warning
        });
      }
    } catch (error) {
      console.error('Error fetching audio quality settings:', error);
    }
  };

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');

        wakeLockRef.current.addEventListener('release', () => {
          console.log('Wake lock was released');
        });
      }
    } catch (error) {
      console.warn('Wake lock request failed:', error);
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  const handleVisibilityChange = async () => {
    if (document.visibilityState === 'visible' && playingRecordingId) {
      await requestWakeLock();
    }
  };

  useEffect(() => {
    // Set mounted flag
    isMountedRef.current = true;

    fetchImages();
    fetchAudioQualitySettings();
    fetchUserPreferences();

    // Cleanup function to abort pending requests and mark as unmounted
    return () => {
      isMountedRef.current = false;
      fetchInProgressRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [chapterId, question]);

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [playingRecordingId]);

  const handleStartRecording = async () => {
    try {
      await startRecording();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleSaveRecording = async () => {
    if (!audioBlob) return;

    if (isUploading) {
      console.log('Save already in progress, ignoring duplicate request');
      return;
    }

    setIsUploading(true);

    const timeoutDuration = 45000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('SAVE_TIMEOUT')), timeoutDuration)
    );

    try {
      const savePromise = (async () => {
        const qualityMetrics = await analyzeAudioQuality(audioBlob, audioQualityThresholds);

        if (!qualityMetrics.isValid || qualityMetrics.warnings.length > 0) {
          setAudioQualityWarnings(qualityMetrics.warnings);
          setShowQualityWarning(true);
          return { success: false, showWarning: true };
        }

        const result = await createRecording({
          chapterId,
          question,
          audioBlob,
          durationMs: qualityMetrics.durationMs,
          silenceRatio: qualityMetrics.silenceRatio,
          averageEnergy: qualityMetrics.averageEnergy
        });

        return result;
      })();

      const result = await Promise.race([savePromise, timeoutPromise]);

      if (result.showWarning) {
        setIsUploading(false);
        return;
      }

      if (result.success) {
        markQuestionAsAnswered(storyId, chapterId, question).catch(err => {
          console.error('Error marking question as answered:', err);
        });

        clearRecording();
        setAudioQualityWarnings([]);
        setShowQualityWarning(false);
        onRecordingComplete();
      } else {
        alert(result.error || 'Error al guardar la grabación');
      }
    } catch (error: any) {
      console.error('Error saving recording:', error);
      if (error.message === 'SAVE_TIMEOUT') {
        alert('La grabación está tardando demasiado en guardarse. Por favor, verifica tu conexión e intenta de nuevo.');
      } else {
        alert('Error al guardar la grabación. Por favor, intenta de nuevo.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveAnyway = async () => {
    if (!audioBlob) return;

    if (isUploading) {
      console.log('Save already in progress, ignoring duplicate request');
      return;
    }

    setIsUploading(true);

    const timeoutDuration = 45000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('SAVE_TIMEOUT')), timeoutDuration)
    );

    try {
      const savePromise = (async () => {
        const qualityMetrics = await analyzeAudioQuality(audioBlob, audioQualityThresholds);

        const result = await createRecording({
          chapterId,
          question,
          audioBlob,
          durationMs: qualityMetrics.durationMs,
          silenceRatio: qualityMetrics.silenceRatio,
          averageEnergy: qualityMetrics.averageEnergy,
          qualityWarnings: audioQualityWarnings
        });

        return result;
      })();

      const result = await Promise.race([savePromise, timeoutPromise]);

      if (result.success) {
        markQuestionAsAnswered(storyId, chapterId, question).catch(err => {
          console.error('Error marking question as answered:', err);
        });

        clearRecording();
        setAudioQualityWarnings([]);
        setShowQualityWarning(false);
        onRecordingComplete();
      } else {
        alert(result.error || 'Error al guardar la grabación');
      }
    } catch (error: any) {
      console.error('Error saving recording with warnings:', error);
      if (error.message === 'SAVE_TIMEOUT') {
        alert('La grabación está tardando demasiado en guardarse. Por favor, verifica tu conexión e intenta de nuevo.');
      } else {
        alert('Error al guardar la grabación. Por favor, intenta de nuevo.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteRecording = async (recordingId: string) => {
    setDeleteConfirmModal({ type: 'recording', id: recordingId });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmModal) return;

    setIsDeleting(true);
    try {
      if (deleteConfirmModal.type === 'recording') {
        // Stop audio playback if this recording is currently playing
        if (playingRecordingId === deleteConfirmModal.id) {
          if (playingAudioRef.current) {
            playingAudioRef.current.pause();
            playingAudioRef.current = null;
          }
          setPlayingRecordingId(null);
          setIsPausedRecordingId(null);
          releaseWakeLock();
        }

        const result = await deleteRecording(deleteConfirmModal.id);
        if (!result.success) {
          console.error('Error al eliminar la grabación:', result.error);
        }
      } else if (deleteConfirmModal.type === 'transcript') {
        const result = await deleteRecordingTranscript(deleteConfirmModal.id);
        if (!result.success) {
          console.error('Error al eliminar la transcripción:', result.error);
        }
      }
    } catch (error) {
      console.error('Error during delete:', error);
    } finally {
      setIsDeleting(false);
      setDeleteConfirmModal(null);
    }
  };

  const handleTranscribe = async (recordingId: string) => {
    const result = await transcribeRecording(recordingId);
    if (!result.success) {
      alert(result.error || 'Error al transcribir');
    }
  };

  const handleImageUpload = async (file: File, retryCount = 0) => {
    if (!file) return;

    setIsUploading(true);
    setImageUploadError(null);

    const timeoutDuration = 30000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), timeoutDuration)
    );

    try {
      const uploadPromise = (async () => {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          throw new Error('Usuario no autenticado');
        }

        const { optimizeImage } = await import('../../lib/utils');
        const optimizedImage = await optimizeImage(file);
        const fileName = `${user.id}/${chapterId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(fileName, optimizedImage, {
            contentType: 'image/webp',
            upsert: false
          });

        if (uploadError) {
          console.error('Storage upload error:', {
            message: uploadError.message,
            name: uploadError.name,
            stack: uploadError.stack
          });
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(fileName);

        const { data: imageData, error } = await supabase
          .from('images')
          .insert([{
            chapter_id: chapterId,
            question: question,
            image_url: publicUrl
          }])
          .select()
          .single();

        if (error) {
          console.error('Database insert error:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          });
          throw error;
        }

        return imageData;
      })();

      const imageData = await Promise.race([uploadPromise, timeoutPromise]);

      setImages(prev => [imageData, ...prev]);
      setImageUploadError(null);

      markQuestionAsAnswered(storyId, chapterId, question).catch(err => {
        console.error('Error marking question as answered:', err);
      });
    } catch (error: any) {
      console.error('Error uploading image:', {
        message: error.message,
        type: error.name,
        retryCount,
        code: error.code,
        details: error.details
      });

      if (error.message === 'TIMEOUT' && retryCount < 2) {
        console.log(`Upload timeout, retrying (${retryCount + 1}/2)...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return handleImageUpload(file, retryCount + 1);
      }

      const errorMessage = error.message === 'TIMEOUT'
        ? 'La carga de la imagen está tardando demasiado. Por favor, verifica tu conexión e intenta de nuevo.'
        : error.code === '23505'
        ? 'Esta imagen ya existe en el sistema.'
        : error.code === '42501'
        ? 'No tienes permisos para subir imágenes. Por favor, contacta al administrador.'
        : 'Error al subir la imagen. Por favor, intenta de nuevo.';

      setImageUploadError({
        message: errorMessage,
        details: `${error.message}${error.code ? ` (Código: ${error.code})` : ''}`
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta imagen? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      setImages(prev => prev.filter(img => img.id !== imageId));

      await supabase.rpc('update_story_progress', {
        story_id_param: storyId
      });
    } catch (error: any) {
      console.error('Error deleting image:', error);
      alert('Error al eliminar la imagen');
    }
  };

  const handlePlaySavedRecording = async (recordingId: string, audioUrl: string) => {
    // If already playing or paused, resume
    if (playingRecordingId === recordingId && playingAudioRef.current) {
      if (isPausedRecordingId === recordingId) {
        await playingAudioRef.current.play();
        setIsPausedRecordingId(null);
        await requestWakeLock();
      }
      return;
    }

    // Stop any current playback
    if (playingAudioRef.current) {
      playingAudioRef.current.pause();
      playingAudioRef.current = null;
      releaseWakeLock();
    }

    const audio = new Audio(audioUrl);

    audio.onended = () => {
      setPlayingRecordingId(null);
      setIsPausedRecordingId(null);
      playingAudioRef.current = null;
      releaseWakeLock();
    };

    audio.onerror = () => {
      setPlayingRecordingId(null);
      setIsPausedRecordingId(null);
      playingAudioRef.current = null;
      releaseWakeLock();
      alert('Error al reproducir el audio');
    };

    playingAudioRef.current = audio;
    setPlayingRecordingId(recordingId);
    setIsPausedRecordingId(null);
    await audio.play();
    await requestWakeLock();
  };

  const handlePauseRecording = (recordingId: string) => {
    if (playingAudioRef.current && playingRecordingId === recordingId) {
      playingAudioRef.current.pause();
      setIsPausedRecordingId(recordingId);
      releaseWakeLock();
    }
  };

  const handleStopRecording = (recordingId: string) => {
    if (playingAudioRef.current && playingRecordingId === recordingId) {
      playingAudioRef.current.pause();
      playingAudioRef.current = null;
      setPlayingRecordingId(null);
      setIsPausedRecordingId(null);
      releaseWakeLock();
    }
  };

  const questionRecordings = recordings.filter(r => r.question === question);
  const questionState = getQuestionState(storyId, chapterId, question);
  const isSkipped = questionState === 'skipped';

  const [isSkipping, setIsSkipping] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);

  const handleSkipQuestion = async () => {
    if (isSkipping) {
      console.log('Skip already in progress, ignoring duplicate request');
      return;
    }

    setIsSkipping(true);

    try {
      const hasContent = await checkQuestionHasContent(chapterId, question);

      if (hasContent && userPreferences?.show_skip_warning) {
        setShowSkipModal(true);
        setIsSkipping(false);
      } else {
        const result = await skipQuestion(storyId, chapterId, question);

        if (!result.success) {
          console.error('Error skipping question:', result.error);
          alert('Error al saltar la pregunta. Por favor, intenta de nuevo.');
        }
      }
    } catch (error: any) {
      console.error('Error in handleSkipQuestion:', error);
      alert('Error al saltar la pregunta. Por favor, intenta de nuevo.');
    } finally {
      setIsSkipping(false);
    }
  };

  const handleConfirmSkip = async () => {
    if (isSkipping) {
      console.log('Skip already in progress, ignoring duplicate request');
      return;
    }

    setIsSkipping(true);
    setShowSkipModal(false);

    try {
      if (skipDontShowAgain) {
        await updateShowSkipWarning(false);
      }

      const result = await skipQuestion(storyId, chapterId, question);

      if (!result.success) {
        console.error('Error skipping question:', result.error);
        alert('Error al saltar la pregunta. Por favor, intenta de nuevo.');
      }

      setSkipDontShowAgain(false);
    } catch (error: any) {
      console.error('Error in handleConfirmSkip:', error);
      alert('Error al saltar la pregunta. Por favor, intenta de nuevo.');
    } finally {
      setIsSkipping(false);
    }
  };

  const handleReactivateQuestion = async () => {
    if (isReactivating) {
      console.log('Reactivate already in progress, ignoring duplicate request');
      return;
    }

    setIsReactivating(true);

    try {
      const result = await reactivateQuestion(storyId, chapterId, question);

      if (!result.success) {
        console.error('Error reactivating question:', result.error);
        alert('Error al reactivar la pregunta. Por favor, intenta de nuevo.');
      }
    } catch (error: any) {
      console.error('Error in handleReactivateQuestion:', error);
      alert('Error al reactivar la pregunta. Por favor, intenta de nuevo.');
    } finally {
      setIsReactivating(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg sm:rounded-xl shadow-sm border overflow-hidden mb-4 sm:mb-6 transition-all ${isSkipped ? 'border-gray-300 opacity-60' : 'border-gray-200'}`}>
      {/* Question Header */}
      <div className={`px-3 sm:px-6 py-3 sm:py-5 border-b border-gray-200 ${isSkipped ? 'bg-gray-100' : 'bg-gradient-to-r from-blue-50 to-teal-50'}`}>
        <div className="flex items-start justify-between gap-3">
          <h3 className={`text-base sm:text-xl font-semibold leading-tight flex-1 ${isSkipped ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{question}</h3>
          <div className="flex-shrink-0">
            {!isSkipped ? (
              <Button
                onClick={handleSkipQuestion}
                icon={SkipForward}
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900"
                loading={isSkipping}
                disabled={isSkipping}
              >
                <span className="hidden sm:inline">{isSkipping ? 'Saltando...' : 'Saltar pregunta'}</span>
              </Button>
            ) : (
              <Button
                onClick={handleReactivateQuestion}
                icon={RotateCcw}
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-700"
                loading={isReactivating}
                disabled={isReactivating}
              >
                <span className="hidden sm:inline">{isReactivating ? 'Reactivando...' : 'Reactivar'}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Audio Quality Warning */}
        {showQualityWarning && audioQualityWarnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-yellow-900 mb-2">
                  Advertencia de Calidad de Audio
                </h4>
                <ul className="text-sm text-yellow-800 space-y-1 mb-3">
                  {audioQualityWarnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
                <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 xs:space-x-3">
                  <Button
                    onClick={handleSaveAnyway}
                    variant="primary"
                    size="sm"
                    loading={isUploading}
                  >
                    Guardar de todas formas
                  </Button>
                  <Button
                    onClick={() => {
                      setShowQualityWarning(false);
                      setAudioQualityWarnings([]);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Image Load Error */}
        {imageLoadError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-yellow-800 mb-2">{imageLoadError}</p>
                <Button
                  onClick={() => fetchImages(0, true)}
                  variant="outline"
                  size="sm"
                  loading={loadingImages}
                  disabled={loadingImages}
                >
                  {loadingImages ? 'Cargando...' : 'Reintentar'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Image Loading Indicator */}
        {loadingImages && !imageLoadError && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
              <p className="text-sm text-blue-800">Cargando imágenes...</p>
            </div>
          </div>
        )}

        {/* Image Upload Error */}
        {imageUploadError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h5 className="text-sm font-medium text-red-900 mb-1">
                  Error al cargar la imagen
                </h5>
                <p className="text-sm text-red-800 mb-2">{imageUploadError.message}</p>
                {imageUploadError.details && (
                  <p className="text-xs text-red-700 mb-2">Detalles: {imageUploadError.details}</p>
                )}
                <Button
                  onClick={() => setImageUploadError(null)}
                  variant="outline"
                  size="sm"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Images Section */}
        {images.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="h-4 w-4 text-gray-600" />
              <h4 className="text-sm font-semibold text-gray-700">Imágenes ({images.length})</h4>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="relative group cursor-pointer"
                >
                  <img
                    src={image.image_url}
                    alt={`Imagen para: ${question}`}
                    className="w-full h-20 sm:h-28 object-cover rounded-lg shadow-sm group-hover:shadow-md transition-shadow"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center space-x-2">
                    <button
                      onClick={() => setSelectedImage(image.image_url)}
                      className="p-2 bg-white bg-opacity-90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-opacity-100 shadow-lg"
                      title="Ver imagen completa"
                    >
                      <Eye className="h-4 w-4 text-gray-700" />
                    </button>
                    <button
                      onClick={() => handleDeleteImage(image.id)}
                      className="p-2 bg-white bg-opacity-90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-opacity-100 shadow-lg"
                      title="Eliminar imagen"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recording Controls Section */}
        <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-lg p-3 sm:p-5 border border-blue-200">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Mic className="h-5 w-5 text-blue-600" />
            <h4 className="text-sm font-semibold text-gray-800">Grabar Audio</h4>
          </div>

          <div className="flex flex-col gap-3">
            {!isRecording && !audioBlob && (
              <Button
                onClick={handleStartRecording}
                icon={Mic}
                variant="primary"
                size="sm"
                className="w-full sm:w-auto"
                disabled={isSkipped}
              >
                Grabar
              </Button>
            )}

            {isRecording && (
              <div className="flex flex-col gap-2 sm:gap-3">
                <div className="flex gap-2 sm:gap-3 flex-1">
                  <Button
                    onClick={isPaused ? resumeRecording : pauseRecording}
                    icon={isPaused ? Play : Pause}
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                  >
                    {isPaused ? 'Continuar' : 'Pausar'}
                  </Button>

                  <Button
                    onClick={stopRecording}
                    icon={Square}
                    variant="danger"
                    size="sm"
                    className="flex-1"
                  >
                    Detener
                  </Button>
                </div>

                <div className="flex items-center justify-center bg-white px-3 sm:px-4 py-2 rounded-lg border border-blue-300 shadow-sm">
                  <span className="text-sm sm:text-base font-bold text-gray-800 tabular-nums">
                    {formatDuration(recordingTime)}
                  </span>
                </div>
              </div>
            )}

            {audioBlob && !isRecording && (
              <div className="flex flex-col gap-2 sm:gap-3">
                <div className="flex gap-2 flex-1">
                  <Button
                    onClick={isPlaying ? stopPlayback : playRecording}
                    icon={isPlaying ? Pause : Play}
                    variant="secondary"
                    size="sm"
                    className="flex-1 sm:flex-initial"
                  >
                    {isPlaying ? 'Pausar' : 'Reproducir'}
                  </Button>

                  <Button
                    onClick={handleSaveRecording}
                    loading={isUploading}
                    variant="primary"
                    size="sm"
                    className="flex-1 sm:flex-initial"
                  >
                    Guardar
                  </Button>

                  <Button
                    onClick={clearRecording}
                    icon={Trash2}
                    variant="ghost"
                    size="sm"
                    className="flex-1 sm:flex-initial"
                  >
                    Descartar
                  </Button>
                </div>

                <div className="flex items-center justify-center bg-white px-3 sm:px-4 py-2 rounded-lg border border-blue-300 shadow-sm">
                  <span className="text-sm sm:text-base font-bold text-gray-800 tabular-nums">
                    {formatDuration(recordingTime)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Photo Upload Section */}
          <div className="border-t border-blue-200 pt-3 sm:pt-4 mt-3 sm:mt-4">
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="h-4 w-4 text-gray-600" />
              <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Agregar Imágenes</h5>
            </div>
            <div className="flex gap-2 w-full">
              <Button
                onClick={() => fileInputRef.current?.click()}
                icon={Upload}
                variant="outline"
                size="sm"
                disabled={isUploading || isSkipped}
                className="flex-1"
              >
                Galería
              </Button>

              <Button
                onClick={() => cameraInputRef.current?.click()}
                icon={Camera}
                variant="outline"
                size="sm"
                disabled={isUploading || isSkipped}
                className="flex-1"
              >
                Cámara
              </Button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
            className="hidden"
          />

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
            className="hidden"
          />
        </div>

        {/* Saved Recordings Section */}
        {questionRecordings.length > 0 && (
          <div className="space-y-2 sm:space-y-3">
            <button
              onClick={() => setSavedRecordingsExpanded(!savedRecordingsExpanded)}
              className="w-full flex items-center justify-between gap-2 pb-2 border-b border-gray-200 hover:bg-gray-50 transition-colors px-2 py-1 rounded"
            >
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 text-gray-600" />
                <h4 className="text-sm font-semibold text-gray-700">Grabaciones Guardadas ({questionRecordings.length})</h4>
              </div>
              <svg
                className={`h-4 w-4 text-gray-600 transition-transform ${savedRecordingsExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {savedRecordingsExpanded && questionRecordings.map((recording, index) => {
              const isCurrentlyPlaying = playingRecordingId === recording.id;
              const recordingNumber = index + 1;

              return (
                <div key={recording.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="bg-gray-50 px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200">
                    <div className="flex flex-col gap-2 sm:gap-3">
                      {/* Recording Title and Delete */}
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs sm:text-sm font-semibold text-gray-900">
                          Grabación {recordingNumber}
                        </h5>
                        <Button
                          onClick={() => handleDeleteRecording(recording.id)}
                          icon={Trash2}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        />
                      </div>

                      {/* Recording Metadata and Controls */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                        <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2 xs:gap-3 flex-wrap">
                          {!isCurrentlyPlaying ? (
                            <Button
                              onClick={() => recording.audio_url && handlePlaySavedRecording(recording.id, recording.audio_url)}
                              icon={Play}
                              variant="secondary"
                              size="sm"
                            >
                              Reproducir
                            </Button>
                          ) : (
                            <div className="flex items-center gap-2">
                              {isPausedRecordingId !== recording.id ? (
                                <Button
                                  onClick={() => handlePauseRecording(recording.id)}
                                  icon={Pause}
                                  variant="secondary"
                                  size="sm"
                                >
                                  Pausar
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => recording.audio_url && handlePlaySavedRecording(recording.id, recording.audio_url)}
                                  icon={Play}
                                  variant="secondary"
                                  size="sm"
                                >
                                  Reanudar
                                </Button>
                              )}
                              <Button
                                onClick={() => handleStopRecording(recording.id)}
                                icon={Square}
                                variant="secondary"
                                size="sm"
                              >
                                Detener
                              </Button>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm flex-wrap">
                            <span className="font-medium text-gray-700">
                              {recording.audio_duration_ms ? formatDuration(recording.audio_duration_ms / 1000) : 'Sin duración'}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-gray-500">
                              {new Date(recording.created_at).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-gray-500">
                              {new Date(recording.created_at).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 w-full xs:w-auto">
                          {!recording.transcript && (
                            <>
                              <Button
                                onClick={() => handleTranscribe(recording.id)}
                                icon={FileText}
                                variant="secondary"
                                size="sm"
                                loading={recording.transcribing}
                                disabled={recording.transcribing}
                                className="bg-gradient-to-r from-green-500 to-purple-500 hover:from-green-600 hover:to-purple-600 text-white border-none shadow-md w-full xs:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <span className="text-xs sm:text-sm">
                                  {recording.transcribing ? 'Transcribiendo...' : 'Transcribir'}
                                </span>
                              </Button>
                              {recording.last_transcription_error && (
                                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                                  Error: {recording.last_transcription_error}
                                  {recording.transcription_attempts && (
                                    <span className="block mt-1 text-gray-600">
                                      Intentos: {recording.transcription_attempts}
                                    </span>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {recording.transcript && (
                    <div className="p-3 sm:p-4">
                      <EditableTranscriptionDisplay
                        html={recording.transcript_formatted?.html}
                        plainText={recording.transcript}
                        qualityWarnings={recording.quality_warnings}
                        onSave={async (html, plain) => {
                          const result = await updateRecordingTranscript(recording.id, {
                            html,
                            plain,
                            version: 1
                          });
                          return result;
                        }}
                        onDelete={() => setDeleteConfirmModal({ type: 'transcript', id: recording.id })}
                        recordingDate={recording.created_at}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full Screen Image Preview */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-full max-h-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <span className="text-2xl">✕</span>
            </button>
            <img
              src={selectedImage}
              alt="Vista completa"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Skip Warning Modal */}
      <SkipWarningModal
        isOpen={showSkipModal}
        onClose={() => setShowSkipModal(false)}
        onConfirm={handleConfirmSkip}
        context="question"
        showDontShowAgain={true}
        onDontShowAgainChange={setSkipDontShowAgain}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Confirmar Eliminación
            </h3>
            <p className="text-gray-600 mb-6">
              {deleteConfirmModal.type === 'recording'
                ? '¿Estás seguro de que quieres eliminar esta grabación de audio? Esta acción no se puede deshacer.'
                : '¿Estás seguro de que quieres eliminar esta transcripción? Esta acción no se puede deshacer.'}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmModal(null)}
                fullWidth
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={confirmDelete}
                fullWidth
                disabled={isDeleting}
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionCard;
