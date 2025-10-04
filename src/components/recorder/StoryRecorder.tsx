import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Share2, Settings, Camera, Upload, Edit } from 'lucide-react';
import Layout from '../layout/Layout';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useStoryStore } from '../../store/storyStore';
import { useChapterStore } from '../../store/chapterStore';
import { formatDate, calculateAge } from '../../lib/utils';
import ChapterNavigation from './ChapterNavigation';
import QuestionCard from './QuestionCard';
import EditStoryModal from '../dashboard/EditStoryModal';

const StoryRecorder: React.FC = () => {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();
  const { stories, loading: storiesLoading, fetchStories } = useStoryStore();
  const { 
    chapters, 
    recordings, 
    loading: chaptersLoading, 
    selectedChapterId,
    fetchChapters, 
    fetchRecordings,
    transcribeRecording,
    setSelectedChapter,
    updateStoryProgress
  } = useChapterStore();
  const [story, setStory] = useState(null);
  const [untranscribedCount, setUntranscribedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (stories.length === 0) {
      fetchStories();
    }
  }, [fetchStories, stories.length]);

  useEffect(() => {
    if (storyId && stories.length > 0) {
      const foundStory = stories.find(s => s.id === storyId);
      setStory(foundStory || null);
      
      if (foundStory) {
        fetchChapters(storyId);
      }
    }
  }, [storyId, stories]);

  useEffect(() => {
    if (chapters.length > 0 && !selectedChapterId) {
      setSelectedChapter(chapters[0].id);
    }
  }, [chapters, selectedChapterId, setSelectedChapter]);

  useEffect(() => {
    if (selectedChapterId) {
      fetchRecordings(selectedChapterId);
    }
  }, [selectedChapterId, fetchRecordings]);

  useEffect(() => {
    const count = recordings.filter(r => !r.transcript).length;
    setUntranscribedCount(count);
  }, [recordings]);

  const handleRecordingComplete = async () => {
    if (storyId) {
      await updateStoryProgress(storyId);
      await fetchStories(); // Refresh story data to update progress
    }
  };

  const handleTranscribeAll = async () => {
    // TODO: Implement batch transcription
    alert('Funcionalidad de transcripción masiva próximamente');
  };

  const handleTranscribeChapter = async () => {
    if (!selectedChapterId) return;
    
    setLoading(true);
    
    const chapterRecordings = recordings.filter(r => 
      r.chapter_id === selectedChapterId && !r.transcript
    );
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const recording of chapterRecordings) {
      try {
        const result = await transcribeRecording(recording.id);
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
          console.error('Error transcribing recording:', recording.id, result.error);
        }
      } catch (error) {
        errorCount++;
        console.error('Error transcribing recording:', recording.id, error);
      }
    }
    
    setLoading(false);
    
    if (errorCount === 0) {
      alert(`Se transcribieron exitosamente ${successCount} grabaciones`);
    } else if (successCount > 0) {
      alert(`Se transcribieron ${successCount} grabaciones. ${errorCount} fallaron.`);
    } else {
      alert(`Error: No se pudo transcribir ninguna grabación (${errorCount} errores)`);
    }
  };

  const handleViewMemoirs = () => {
    // Check if there are any transcribed recordings
    const hasTranscripts = recordings.some(r => r.transcript);
    
    if (!hasTranscripts) {
      alert('Para ver las memorias, primero necesitas transcribir al menos una grabación.');
      return;
    }
    
    navigate(`/book-editor/${storyId}`);
  };

  const handleShareStory = () => {
    // TODO: Open share modal
    alert('Compartir historia próximamente');
  };

  const selectedChapter = chapters.find(c => c.id === selectedChapterId);
  const currentQuestions = selectedChapter?.question_order || [];
  const hasUntranscribedRecordings = recordings.some(r => 
    r.chapter_id === selectedChapterId && !r.transcript
  );

  if (storiesLoading || chaptersLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner size="lg" message="Cargando historia..." />
        </div>
      </Layout>
    );
  }

  if (!story) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Historia no encontrada
            </h1>
            <p className="text-gray-600 mb-6">
              La historia que buscas no existe o no tienes permisos para verla.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Volver al Dashboard
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          {/* Mobile: Stack buttons vertically */}
          <div className="flex flex-col space-y-3 sm:hidden w-full">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                icon={ArrowLeft}
                onClick={() => navigate('/dashboard')}
                size="sm"
              >
                Volver
              </Button>
              
              <Button
                onClick={() => setShowEditModal(true)}
                icon={Edit}
                variant="outline"
                size="sm"
              >
                Editar
              </Button>
            </div>
            
            <div className="flex items-center justify-between space-x-2">
              {untranscribedCount > 0 && (
                <Button
                  onClick={handleTranscribeAll}
                  icon={FileText}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Transcribir ({untranscribedCount})
                </Button>
              )}
              
              <Button
                onClick={handleViewMemoirs}
                icon={FileText}
                variant="secondary"
                size="sm"
                className="flex-1"
                disabled={recordings.length === 0 || !recordings.some(r => r.transcript)}
              >
                {recordings.some(r => r.transcript) ? 'Memorias' : 'Sin transcripciones'}
              </Button>
            </div>
            
            <div className="flex items-center justify-center">
              <Button
                onClick={handleShareStory}
                icon={Share2}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Compartir
              </Button>
            </div>
          </div>
          
          {/* Desktop: Original layout */}
          <div className="hidden sm:flex items-center justify-between w-full">
          <Button
            variant="ghost"
            icon={ArrowLeft}
            onClick={() => navigate('/dashboard')}
          >
            Volver a Mis Historias
          </Button>
          
          <div className="flex items-center space-x-3">
            {untranscribedCount > 0 && (
              <Button
                onClick={handleTranscribeAll}
                icon={FileText}
                variant="outline"
              >
                Transcribir ({untranscribedCount})
              </Button>
            )}
            
            <Button
              onClick={handleViewMemoirs}
              icon={FileText}
              variant="secondary"
              disabled={recordings.length === 0 || !recordings.some(r => r.transcript)}
            >
              {recordings.some(r => r.transcript) ? 'Ver memorias' : 'Transcribir para ver memorias'}
            </Button>
            
            <Button
              onClick={handleShareStory}
              icon={Share2}
              variant="outline"
            >
              Compartir
            </Button>
            
            <Button
              onClick={() => setShowEditModal(true)}
              icon={Edit}
              variant="outline"
            >
              Editar
            </Button>
          </div>
          </div>
        </div>

        {/* Story Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-start space-x-6">
            <div className="flex-shrink-0">
              {story.photo_url ? (
                <img
                  src={story.photo_url}
                  alt={story.title}
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-teal-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600">
                    {story.title.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {story.title}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                <span>{story.relationship}</span>
                {story.date_of_birth && (
                  <span>{calculateAge(story.date_of_birth)}</span>
                )}
                <span>{story.progress}% completado</span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-teal-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${story.progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Chapter Navigation */}
        {chapters.length > 0 && (
          <ChapterNavigation
            chapters={chapters}
            selectedChapterId={selectedChapterId}
            onChapterSelect={setSelectedChapter}
            recordings={recordings}
          />
        )}

        {/* Questions */}
        {selectedChapter && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <Button
                  icon={Settings}
                  variant="ghost"
                  size="sm"
                  onClick={() => alert('Gestionar preguntas próximamente')}
                >
                  Gestionar preguntas
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedChapter.title}
                </h2>
                
                <Button
                  onClick={handleTranscribeChapter}
                  variant="secondary"
                  size="sm"
                  loading={loading}
                  disabled={!hasUntranscribedRecordings}
                >
                  Transcribir capítulo
                </Button>
              </div>
            </div>

            {currentQuestions.map((question) => (
              <QuestionCard
                key={question}
                chapterId={selectedChapterId}
                question={question}
                recordings={recordings}
                onRecordingComplete={handleRecordingComplete}
              />
            ))}

            {currentQuestions.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No hay preguntas en este capítulo</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      <EditStoryModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        story={story}
      />
    </Layout>
  );
};

export default StoryRecorder;