import React, { useState, useRef } from 'react';
import { Mic, Camera, Upload, Play, Pause, Trash2, Square, CreditCard as Edit, Eye, FileText, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import RichTextEditor from '../ui/RichTextEditor';
import TranscriptionDisplay from '../ui/TranscriptionDisplay';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useChapterStore } from '../../store/chapterStore';
import { formatDuration } from '../../lib/utils';
import { Recording, Image } from '../../types';
import { supabase } from '../../lib/supabase';
import { analyzeAudioQuality } from '../../lib/audioValidation';

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

  // Fetch images for this question
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

  // Load images when component mounts
  React.useEffect(() => {
    fetchImages();
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
      const qualityMetrics = await analyzeAudioQuality(audioBlob);

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
      const qualityMetrics = await analyzeAudioQuality(audioBlob);

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
        // Don't call onRecordingComplete to avoid full refresh
        // The recording is already removed from local state in the store
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
    // Don't call onRecordingComplete to avoid refresh - transcript is updated in store
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

      // Optimize and upload image
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

      // Create image record
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

      // Add to local state
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

      // Remove from local state
      setImages(prev => prev.filter(img => img.id !== imageId));
    } catch (error: any) {
      console.error('Error deleting image:', error);
      alert('Error al eliminar la imagen');
    }
  };

  const handlePlaySavedRecording = (recordingId: string, audioUrl: string) => {
    // If this recording is already playing, stop it
    if (playingRecordingId === recordingId) {
      if (playingAudioRef.current) {
        playingAudioRef.current.pause();
        playingAudioRef.current = null;
      }
      setPlayingRecordingId(null);
      return;
    }

    // Stop any currently playing recording
    if (playingAudioRef.current) {
      playingAudioRef.current.pause();
      playingAudioRef.current = null;
    }

    // Start playing the new recording
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
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
      {/* Question */}
      <h3 className="text-lg font-medium text-gray-900 mb-4">{question}</h3>

      {/* Audio Quality Warning */}
      {showQualityWarning && audioQualityWarnings.length > 0 && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
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

      {/* Images for this question */}
      {images.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Imágenes:</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {images.map((image) => (
              <div
                key={image.id}
                className="relative group cursor-pointer"
              >
                <img
                  src={image.image_url}
                  alt={`Imagen para: ${question}`}
                  className="w-full h-20 sm:h-24 object-cover rounded-lg shadow-sm group-hover:shadow-md transition-shadow"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center space-x-2">
                  <button
                    onClick={() => setSelectedImage(image.image_url)}
                    className="p-1 bg-white bg-opacity-90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-opacity-100"
                    title="Ver imagen completa"
                  >
                    <Eye className="h-4 w-4 text-gray-700" />
                  </button>
                  <button
                    onClick={() => handleDeleteImage(image.id)}
                    className="p-1 bg-white bg-opacity-90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-opacity-100"
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

      {/* Recording Controls */}
      <div className="flex items-center space-x-3 mb-4">
        {!isRecording && !audioBlob && (
          <Button
            onClick={handleStartRecording}
            icon={Mic}
            variant="primary"
            size="sm"
          >
            Grabar
          </Button>
        )}

        {isRecording && (
          <>
            <Button
              onClick={isPaused ? resumeRecording : pauseRecording}
              icon={isPaused ? Play : Pause}
              variant="secondary"
              size="sm"
            >
              {isPaused ? 'Continuar' : 'Pausar'}
            </Button>
            
            <Button
              onClick={stopRecording}
              icon={Square}
              variant="danger"
              size="sm"
            >
              Detener
            </Button>
            
            <span className="text-sm text-gray-600">
              {formatDuration(recordingTime)}
            </span>
          </>
        )}

        {audioBlob && !isRecording && (
          <>
            <Button
              onClick={isPlaying ? stopPlayback : playRecording}
              icon={isPlaying ? Pause : Play}
              variant="secondary"
              size="sm"
            >
              {isPlaying ? 'Pausar' : 'Reproducir'}
            </Button>
            
            <Button
              onClick={handleSaveRecording}
              loading={isUploading}
              variant="primary"
              size="sm"
            >
              Guardar
            </Button>
            
            <Button
              onClick={clearRecording}
              icon={Trash2}
              variant="ghost"
              size="sm"
            >
              Descartar
            </Button>
            
            <span className="text-sm text-gray-600">
              {formatDuration(recordingTime)}
            </span>
          </>
        )}

        {/* Photo Upload */}
        <div className="flex space-x-2">
          <Button
            onClick={() => fileInputRef.current?.click()}
            icon={ImageIcon}
            variant="outline"
            size="sm"
            disabled={isUploading}
          >
            Galería
          </Button>

          <Button
            onClick={() => cameraInputRef.current?.click()}
            icon={Camera}
            variant="outline"
            size="sm"
            disabled={isUploading}
          >
            Cámara
          </Button>
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

      {/* Existing Recordings */}
      {questionRecordings.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Grabaciones guardadas:</h4>

          {questionRecordings.map((recording) => {
            const isCurrentlyPlaying = playingRecordingId === recording.id;

            return (
              <div key={recording.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Button
                      onClick={() => recording.audio_url && handlePlaySavedRecording(recording.id, recording.audio_url)}
                      icon={isCurrentlyPlaying ? Square : Play}
                      variant="secondary"
                      size="sm"
                    >
                      {isCurrentlyPlaying ? 'Detener' : 'Reproducir'}
                    </Button>

                    <span className="text-sm font-medium text-gray-700">
                      {recording.duration_ms ? formatDuration(recording.duration_ms / 1000) : 'Sin duración'}
                    </span>

                    <span className="text-sm text-gray-500">
                      {new Date(recording.created_at).toLocaleDateString('es-ES')}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {!recording.transcript && (
                      <Button
                        onClick={() => handleTranscribe(recording.id)}
                        icon={FileText}
                        variant="secondary"
                        size="sm"
                        loading={isUploading}
                      >
                        <span className="hidden sm:inline">Transcribir</span>
                      </Button>
                    )}
                    <Button
                      onClick={() => handleDeleteRecording(recording.id)}
                      icon={Trash2}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <span className="hidden sm:inline">Eliminar grabación</span>
                    </Button>
                  </div>
                </div>

                {recording.transcript && editingTranscriptId !== recording.id && (
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
                )}

                {editingTranscriptId === recording.id && (
                  <div className="mt-4">
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
      
      {/* Full Screen Image Preview */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-full max-h-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <Trash2 className="h-8 w-8" />
            </button>
            <img
              src={selectedImage}
              alt="Vista completa"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionCard;