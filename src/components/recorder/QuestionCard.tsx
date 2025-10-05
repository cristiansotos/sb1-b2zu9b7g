import React, { useState, useRef, useEffect } from 'react';
import { Mic, Camera, Upload, Play, Pause, Trash2, Square, Eye, FileText, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import RichTextEditor from '../ui/RichTextEditor';
import TranscriptionDisplay from '../ui/TranscriptionDisplay';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useChapterStore } from '../../store/chapterStore';
import { formatDuration } from '../../lib/utils';
import { Recording, Image } from '../../types';
import { supabase } from '../../lib/supabase';
import { analyzeAudioQuality, AudioQualityThresholds } from '../../lib/audioValidation';

interface QuestionCardProps {
  chapterId: string;
  question: string;
  recordings: Recording[];
  onRecordingComplete: () => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  chapterId,
  question,
  recordings,
  onRecordingComplete
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [images, setImages] = useState<Image[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loadingImages, setLoadingImages] = useState(false);
  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);
  const [editingTranscriptId, setEditingTranscriptId] = useState<string | null>(null);
  const [audioQualityWarnings, setAudioQualityWarnings] = useState<string[]>([]);
  const [showQualityWarning, setShowQualityWarning] = useState(false);
  const [audioQualityThresholds, setAudioQualityThresholds] = useState<AudioQualityThresholds | undefined>(undefined);
  const playingAudioRef = useRef<HTMLAudioElement | null>(null);
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

  const fetchImages = async () => {
    setLoadingImages(true);
    try {
      const { data, error } = await supabase
        .from('images')
        .select('*')
        .eq('chapter_id', chapterId)
        .eq('question', question)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoadingImages(false);
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

  useEffect(() => {
    fetchImages();
    fetchAudioQualitySettings();
  }, [chapterId, question]);

  const handleStartRecording = async () => {
    try {
      await startRecording();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleSaveRecording = async () => {
    if (!audioBlob) return;

    setIsUploading(true);
    try {
      const qualityMetrics = await analyzeAudioQuality(audioBlob, audioQualityThresholds);

      if (!qualityMetrics.isValid || qualityMetrics.warnings.length > 0) {
        setAudioQualityWarnings(qualityMetrics.warnings);
        setShowQualityWarning(true);
        setIsUploading(false);
        return;
      }

      const result = await createRecording({
        chapterId,
        question,
        audioBlob,
        durationMs: qualityMetrics.durationMs,
        silenceRatio: qualityMetrics.silenceRatio,
        averageEnergy: qualityMetrics.averageEnergy
      });

      if (result.success) {
        clearRecording();
        setAudioQualityWarnings([]);
        setShowQualityWarning(false);
      } else {
        alert(result.error || 'Error al guardar la grabación');
      }
    } catch (error) {
      alert('Error al guardar la grabación');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveAnyway = async () => {
    if (!audioBlob) return;

    setIsUploading(true);
    try {
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

      if (result.success) {
        clearRecording();
        setAudioQualityWarnings([]);
        setShowQualityWarning(false);
      } else {
        alert(result.error || 'Error al guardar la grabación');
      }
    } catch (error) {
      alert('Error al guardar la grabación');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteRecording = async (recordingId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta grabación de audio? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const result = await deleteRecording(recordingId);
      if (result.success) {
      } else {
        alert(result.error || 'Error al eliminar la grabación');
      }
    } catch (error) {
      console.error('Error deleting recording:', error);
      alert('Error al eliminar la grabación');
    }
  };

  const handleTranscribe = async (recordingId: string) => {
    setIsUploading(true);
    const result = await transcribeRecording(recordingId);
    if (!result.success) {
      alert(result.error || 'Error al transcribir');
    }
    setIsUploading(false);
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        alert('Usuario no autenticado');
        return;
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

      if (uploadError) throw uploadError;

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

      if (error) throw error;

      setImages(prev => [imageData, ...prev]);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      alert('Error al subir la imagen');
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
    } catch (error: any) {
      console.error('Error deleting image:', error);
      alert('Error al eliminar la imagen');
    }
  };

  const handlePlaySavedRecording = (recordingId: string, audioUrl: string) => {
    if (playingRecordingId === recordingId) {
      if (playingAudioRef.current) {
        playingAudioRef.current.pause();
        playingAudioRef.current = null;
      }
      setPlayingRecordingId(null);
      return;
    }

    if (playingAudioRef.current) {
      playingAudioRef.current.pause();
      playingAudioRef.current = null;
    }

    const audio = new Audio(audioUrl);

    audio.onended = () => {
      setPlayingRecordingId(null);
      playingAudioRef.current = null;
    };

    audio.onerror = () => {
      setPlayingRecordingId(null);
      playingAudioRef.current = null;
      alert('Error al reproducir el audio');
    };

    playingAudioRef.current = audio;
    setPlayingRecordingId(recordingId);
    audio.play();
  };

  const questionRecordings = recordings.filter(r => r.question === question);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
      {/* Question Header */}
      <div className="bg-gradient-to-r from-blue-50 to-teal-50 px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 leading-tight">{question}</h3>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Audio Quality Warning */}
        {showQualityWarning && audioQualityWarnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
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
                <div className="flex items-center space-x-3">
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

        {/* Images Section */}
        {images.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="h-4 w-4 text-gray-600" />
              <h4 className="text-sm font-semibold text-gray-700">Imágenes ({images.length})</h4>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="relative group cursor-pointer"
                >
                  <img
                    src={image.image_url}
                    alt={`Imagen para: ${question}`}
                    className="w-full h-24 sm:h-28 object-cover rounded-lg shadow-sm group-hover:shadow-md transition-shadow"
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
        <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-lg p-4 sm:p-5 border border-blue-200">
          <div className="flex items-center gap-2 mb-4">
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
              >
                Grabar
              </Button>
            )}

            {isRecording && (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex gap-3 flex-1">
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

                <div className="flex items-center justify-center bg-white px-4 py-2 rounded-lg border border-blue-300 shadow-sm">
                  <span className="text-base font-bold text-gray-800 tabular-nums">
                    {formatDuration(recordingTime)}
                  </span>
                </div>
              </div>
            )}

            {audioBlob && !isRecording && (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex gap-2 flex-1 flex-wrap sm:flex-nowrap">
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

                <div className="flex items-center justify-center bg-white px-4 py-2 rounded-lg border border-blue-300 shadow-sm">
                  <span className="text-base font-bold text-gray-800 tabular-nums">
                    {formatDuration(recordingTime)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Photo Upload Section */}
          <div className="border-t border-blue-200 pt-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="h-4 w-4 text-gray-600" />
              <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Agregar Imágenes</h5>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                icon={Upload}
                variant="outline"
                size="sm"
                disabled={isUploading}
                className="flex-1 sm:flex-initial"
              >
                Galería
              </Button>

              <Button
                onClick={() => cameraInputRef.current?.click()}
                icon={Camera}
                variant="outline"
                size="sm"
                disabled={isUploading}
                className="flex-1 sm:flex-initial"
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
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <Play className="h-4 w-4 text-gray-600" />
              <h4 className="text-sm font-semibold text-gray-700">Grabaciones Guardadas ({questionRecordings.length})</h4>
            </div>

            {questionRecordings.map((recording) => {
              const isCurrentlyPlaying = playingRecordingId === recording.id;

              return (
                <div key={recording.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Button
                          onClick={() => recording.audio_url && handlePlaySavedRecording(recording.id, recording.audio_url)}
                          icon={isCurrentlyPlaying ? Square : Play}
                          variant="secondary"
                          size="sm"
                        >
                          {isCurrentlyPlaying ? 'Detener' : 'Reproducir'}
                        </Button>

                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-gray-700">
                            {recording.duration_ms ? formatDuration(recording.duration_ms / 1000) : 'Sin duración'}
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="text-gray-500">
                            {new Date(recording.created_at).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!recording.transcript && (
                          <Button
                            onClick={() => handleTranscribe(recording.id)}
                            icon={FileText}
                            variant="secondary"
                            size="sm"
                            loading={isUploading}
                          >
                            <span className="hidden sm:inline">Transcribir</span>
                            <span className="sm:hidden">Transcribir</span>
                          </Button>
                        )}
                        <Button
                          onClick={() => handleDeleteRecording(recording.id)}
                          icon={Trash2}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <span className="hidden sm:inline">Eliminar</span>
                          <span className="sm:hidden"><Trash2 className="h-4 w-4" /></span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {recording.transcript && editingTranscriptId !== recording.id && (
                    <div className="p-4">
                      <TranscriptionDisplay
                        html={recording.transcript_formatted?.html}
                        plainText={recording.transcript}
                        qualityWarnings={recording.quality_warnings}
                        onEdit={() => setEditingTranscriptId(recording.id)}
                        onDelete={async () => {
                          if (!confirm('¿Estás seguro de que quieres eliminar esta transcripción? Esta acción no se puede deshacer.')) {
                            return;
                          }
                          const result = await deleteRecordingTranscript(recording.id);
                          if (!result.success) {
                            alert(result.error || 'Error al eliminar la transcripción');
                          }
                        }}
                        recordingDate={recording.created_at}
                      />
                    </div>
                  )}

                  {editingTranscriptId === recording.id && (
                    <div className="p-4 bg-gray-50">
                      <RichTextEditor
                        initialValue={recording.transcript_formatted?.html || recording.transcript || ''}
                        onSave={async (html, plain) => {
                          const result = await updateRecordingTranscript(recording.id, {
                            html,
                            plain,
                            version: 1
                          });
                          if (result.success) {
                            setEditingTranscriptId(null);
                          } else {
                            alert(result.error || 'Error al guardar la transcripción');
                          }
                        }}
                        onCancel={() => setEditingTranscriptId(null)}
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
    </div>
  );
};

export default QuestionCard;
