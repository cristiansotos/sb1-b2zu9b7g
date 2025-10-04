import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Share2, Eye, Edit, BookOpen, X, Save, Loader, Trash2, Menu, ChevronRight, ChevronDown } from 'lucide-react';
import Layout from '../layout/Layout';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { toast } from 'sonner';
import { useStoryStore } from '../../store/storyStore';
import { useChapterStore } from '../../store/chapterStore';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';
import { Image } from '../../types';

const BookEditor: React.FC = () => {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();
  const { stories, loading: storiesLoading, fetchStories } = useStoryStore();
  const { chapters, recordings, loading: chaptersLoading, fetchChapters } = useChapterStore();
  const [story, setStory] = useState(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [images, setImages] = useState<Image[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loadingImages, setLoadingImages] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<string>('');
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null);
  const [memoirContent, setMemoirContent] = useState<Record<string, {
    text: string;
    isGenerated: boolean;
    isLoading: boolean;
    hasError: boolean;
    errorMessage?: string;
    isEditing: boolean;
    editingText: string;
  }>>({});

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
        fetchImages(storyId);
        generateMemoirContent();
      }
    }
  }, [storyId, stories, fetchChapters]);

  const fetchImages = async (storyId: string) => {
    setLoadingImages(true);
    try {
      const { data: chapterData } = await supabase
        .from('chapters')
        .select('id')
        .eq('story_id', storyId);

      if (chapterData && chapterData.length > 0) {
        const chapterIds = chapterData.map(c => c.id);
        
        const { data: imageData, error } = await supabase
          .from('images')
          .select('*')
          .in('chapter_id', chapterIds)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setImages(imageData || []);
      }
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoadingImages(false);
    }
  };

  const generateMemoirContent = async () => {
    if (!chapters.length) return;

    // Create a map to group recordings by chapter and question
    const chapterQuestionsMap = new Map<string, Map<string, string[]>>();
    
    // Initialize map for each chapter with its current question order
    chapters.forEach(chapter => {
      const questionMap = new Map<string, string[]>();
      // Initialize all questions from current question_order (even if no recordings yet)
      (chapter.question_order || []).forEach(question => {
        questionMap.set(question, []);
      });
      chapterQuestionsMap.set(chapter.id, questionMap);
    });

    // Group transcripts by chapter and question, respecting current question order
    recordings.forEach(recording => {
      if (recording.transcript && recording.chapter_id) {
        const chapterMap = chapterQuestionsMap.get(recording.chapter_id);
        if (chapterMap && chapterMap.has(recording.question)) {
          const transcripts = chapterMap.get(recording.question) || [];
          transcripts.push(recording.transcript);
          chapterMap.set(recording.question, transcripts);
        }
      }
    });

    // Process each chapter's questions in order
    for (const [chapterId, questionMap] of chapterQuestionsMap.entries()) {
      for (const [question, transcripts] of questionMap.entries()) {
        // Skip questions with no transcripts
        if (transcripts.length === 0) continue;
        
        const key = `${chapterId}-${question}`;
      
        setMemoirContent(prev => ({
          ...prev,
          [key]: {
            text: '',
            isGenerated: false,
            isLoading: true,
            hasError: false,
            isEditing: false,
            editingText: ''
          }
        }));

        try {
          const { data: { session } } = await supabase.auth.getSession();
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-memoir`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session?.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              transcripts,
              question
            })
          });

          const result = await response.json();

          if (response.ok && result.success) {
            setMemoirContent(prev => ({
              ...prev,
              [key]: {
                text: result.generatedText,
                isGenerated: true,
                isLoading: false,
                hasError: false,
                isEditing: false,
                editingText: result.generatedText
              }
            }));
          
            toast.success(`Memorias generadas para: ${question.substring(0, 50)}...`);
          } else {
            // Handle AI errors or insufficient content
            const fallbackText = result.originalText || transcripts.join(' ');
            const errorMessage = result.insufficient 
              ? 'Contenido insuficiente para procesamiento IA'
              : `Error al procesar con IA (modelo: ${result.modelUsed || 'desconocido'}). Verifica la configuración del modelo en la base de datos.`;
          
            setMemoirContent(prev => ({
              ...prev,
              [key]: {
                text: fallbackText,
                isGenerated: false,
                isLoading: false,
                hasError: true,
                errorMessage,
                isEditing: false,
                editingText: fallbackText
              }
            }));
          
            toast.error(`Alerta IA para ${question.substring(0, 30)}...: ${errorMessage}`);
          }
        } catch (error) {
          console.error('Error generating memoir:', error);
          const fallbackText = transcripts.join(' ');
          const errorMessage = 'Error al procesar con IA. Mostrando transcripción original.';
        
          setMemoirContent(prev => ({
            ...prev,
            [key]: {
              text: fallbackText,
              isGenerated: false,
              isLoading: false,
              hasError: true,
              errorMessage,
              isEditing: false,
              editingText: fallbackText
            }
          }));
        
          toast.error(`Error al generar memorias para: ${question.substring(0, 30)}...: ${errorMessage}`);
        }
      }
    }
  };

  const handleEditStart = (key: string) => {
    setMemoirContent(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        isEditing: true,
        editingText: prev[key].text
      }
    }));
  };

  const handleEditSave = (key: string) => {
    const content = memoirContent[key];
    if (!content) return;

    setMemoirContent(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        text: prev[key].editingText,
        isEditing: false,
        hasError: false, // Clear any AI alerts when manually edited
        errorMessage: undefined
      }
    }));
    
    toast.success('Cambios guardados correctamente');
  };

  const handleEditCancel = (key: string) => {
    setMemoirContent(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        isEditing: false,
        editingText: prev[key].text
      }
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent, key: string) => {
    if (e.key === 'Escape') {
      handleEditCancel(key);
    } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleEditSave(key);
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      // Handle bold formatting - simplified for now
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      // Handle italic formatting - simplified for now
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from('images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      // Remove from local state
      setImages(prev => prev.filter(img => img.id !== imageId));
      setDeleteImageId(null);
      
      toast.success('Imagen eliminada correctamente');
    } catch (error: any) {
      console.error('Error deleting image:', error);
      toast.error('Error al eliminar la imagen');
    }
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
      
      // Close sidebar on mobile
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    }
  };

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chapterId)) {
        newSet.delete(chapterId);
      } else {
        newSet.add(chapterId);
      }
      return newSet;
    });
  };

  // Initialize expanded chapters and scroll tracking
  useEffect(() => {
    if (chapters.length > 0) {
      setExpandedChapters(new Set(chapters.map(c => c.id)));
    }
  }, [chapters]);

  // Scroll tracking for active section
  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('[data-section-id]');
      let currentSection = '';
      
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 100 && rect.bottom >= 100) {
          currentSection = section.getAttribute('data-section-id') || '';
        }
      });
      
      if (currentSection !== activeSection) {
        setActiveSection(currentSection);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeSection]);

  const generateBook = () => {
    // TODO: Implement book generation logic
    alert('Generación de libro próximamente');
  };

  const exportBook = () => {
    // TODO: Implement book export logic
    alert('Exportación de libro próximamente');
  };

  const shareBook = () => {
    // TODO: Implement book sharing logic
    alert('Compartir libro próximamente');
  };

  if (storiesLoading || chaptersLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner size="lg" message="Cargando editor de memorias..." />
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

  // Create chapters with recordings, but respect the current question order
  const chaptersWithRecordings = chapters.map(chapter => {
    const chapterRecordings = recordings.filter(r => r.chapter_id === chapter.id && r.transcript);
    
    // Group recordings by question
    const recordingsByQuestion = new Map<string, typeof chapterRecordings>();
    chapterRecordings.forEach(recording => {
      const question = recording.question;
      if (!recordingsByQuestion.has(question)) {
        recordingsByQuestion.set(question, []);
      }
      recordingsByQuestion.get(question)!.push(recording);
    });
    
    // Create ordered recordings based on current question_order
    const orderedRecordings: typeof chapterRecordings = [];
    (chapter.question_order || []).forEach(question => {
      const questionRecordings = recordingsByQuestion.get(question) || [];
      orderedRecordings.push(...questionRecordings);
    });
    
    return {
      ...chapter,
      recordings: orderedRecordings
    };
  });

  const getImagesForQuestion = (chapterId: string, question: string) => {
    return images.filter(img => img.chapter_id === chapterId && img.question === question);
  };

  return (
    <Layout>
      <div className="flex min-h-screen bg-gray-50">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden bg-white border-r border-gray-200 flex-shrink-0`}>
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Navegación</h3>
          </div>
          
          <div className="p-4 space-y-2 max-h-screen overflow-y-auto">
            {chaptersWithRecordings.map((chapter) => {
              const chapterRecordings = chapter.recordings;
              const isExpanded = expandedChapters.has(chapter.id);
              const chapterSectionId = `chapter-${chapter.id}`;
              
              return (
                <div key={chapter.id}>
                  <button
                    onClick={() => {
                      scrollToSection(chapterSectionId);
                      toggleChapter(chapter.id);
                    }}
                    className={`w-full flex items-center justify-between p-2 text-left rounded-lg hover:bg-gray-100 transition-colors ${
                      activeSection === chapterSectionId ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <span className="font-medium text-sm">{chapter.title}</span>
                    {chapterRecordings.length > 0 && (
                      isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  
                  {isExpanded && chapterRecordings.length > 0 && (
                    <div className="ml-4 mt-1 space-y-1">
                      {chapterRecordings.map((recording) => {
                        const questionSectionId = `question-${chapter.id}-${recording.id}`;
                        return (
                          <button
                            key={recording.id}
                            onClick={() => scrollToSection(questionSectionId)}
                            className={`w-full text-left p-2 text-xs rounded hover:bg-gray-100 transition-colors ${
                              activeSection === questionSectionId ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
                            }`}
                          >
                            {recording.question.length > 50 
                              ? `${recording.question.substring(0, 50)}...`
                              : recording.question
                            }
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          {/* Mobile: Stack buttons vertically */}
          <div className="flex flex-col space-y-3 sm:hidden">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                icon={Menu}
                onClick={() => setSidebarOpen(!sidebarOpen)}
                size="sm"
                title="Ver capítulos"
              />
              
              <Button
                variant="ghost"
                icon={ArrowLeft}
                onClick={() => navigate(`/story-recorder/${storyId}`)}
                size="sm"
              >
                Volver
              </Button>
            </div>
            
            <div className="flex items-center justify-between space-x-2">
              <Button
                onClick={generateBook}
                icon={BookOpen}
                variant="secondary"
                size="sm"
                className="flex-1"
              >
                Libro
              </Button>
              
              <Button
                onClick={exportBook}
                icon={Download}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Exportar
              </Button>
              
              <Button
                onClick={shareBook}
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
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              icon={Menu}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden"
              title="Ver capítulos"
            />
            
            <Button
              variant="ghost"
              icon={ArrowLeft}
              onClick={() => navigate(`/story-recorder/${storyId}`)}
            >
              Volver a la Historia
            </Button>
          </div>
          
            <div className="flex items-center space-x-3">
            <Button
              onClick={generateBook}
              icon={BookOpen}
              variant="secondary"
            >
              Generar Libro
            </Button>
            
            <Button
              onClick={exportBook}
              icon={Download}
              variant="outline"
            >
              Exportar
            </Button>
            
            <Button
              onClick={shareBook}
              icon={Share2}
              variant="outline"
            >
              Compartir
            </Button>
          </div>
          </div>
        </div>

        {/* Story Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-start space-x-6">
            {/* Story Cover Photo */}
            <div className="flex-shrink-0 relative">
              {story.photo_url ? (
                <img
                  src={story.photo_url}
                  alt={story.title}
                  className="w-20 h-20 sm:w-32 sm:h-32 rounded-lg object-cover shadow-md"
                />
              ) : (
                <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-lg bg-gradient-to-br from-blue-100 to-teal-100 flex items-center justify-center shadow-md">
                  <span className="text-xl sm:text-3xl font-bold text-blue-600">
                    {story.title.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-3">
                La Historia de {story.title}
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm sm:text-base text-gray-600 mb-4 space-y-1 sm:space-y-0">
                <span>{story.relationship}</span>
                <span>Creado {formatDate(story.created_at)}</span>
                <span>{story.progress}% completado</span>
              </div>
              
              <p className="text-gray-700 text-base sm:text-lg mb-4">
                Una colección de recuerdos y historias que preservan el legado de {story.title}.
              </p>
              
              <div className="text-sm text-gray-500">
                Memorias generadas el {formatDate(new Date().toISOString())}
              </div>
            </div>
          </div>
        </div>

        {/* Book Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-8 max-w-4xl mx-auto">
              <div className="prose prose-lg max-w-none">
                {chaptersWithRecordings.map((chapter) => (
                  <div key={chapter.id} className="mb-12" id={`chapter-${chapter.id}`} data-section-id={`chapter-${chapter.id}`}>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b-2 border-blue-500 pb-2">
                      {chapter.title}
                    </h2>
                    
                    {chapter.recordings.length > 0 ? (
                      <div className="space-y-6">
                        {(chapter.question_order || []).map((question) => {
                          // Get all recordings for this question
                          const questionRecordings = chapter.recordings.filter(r => r.question === question);
                          
                          // Skip questions with no recordings
                          if (questionRecordings.length === 0) return null;
                          
                          const questionImages = getImagesForQuestion(chapter.id, question);
                          const contentKey = `${chapter.id}-${question}`;
                          const content = memoirContent[contentKey];
                          
                          return (
                          <div key={`${chapter.id}-${question}`} className="bg-gray-50 rounded-lg p-4 sm:p-6" id={`question-${chapter.id}-${question.replace(/\s+/g, '-')}`} data-section-id={`question-${chapter.id}-${question.replace(/\s+/g, '-')}`}>
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">
                              {question}
                            </h3>
                            
                            {/* Question Images */}
                            {questionImages.length > 0 && (
                              <div className="mb-4">
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                  {questionImages.map((image) => (
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
                                          onClick={() => setDeleteImageId(image.id)}
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
                            
                            {/* AI-Generated Memoir Content or Transcript */}
                            {content ? (
                              <div className="relative">
                                {/* Loading State */}
                                {content.isLoading && (
                                  <div className="flex items-center justify-center py-8">
                                    <Loader className="h-6 w-6 animate-spin text-blue-500 mr-2" />
                                    <span className="text-gray-600">Procesando con IA...</span>
                                  </div>
                                )}
                                
                                {/* Content Display/Edit */}
                                {!content.isLoading && (
                                  <div className="relative group">
                                    {/* Edit Button */}
                                    {!content.isEditing && (
                                      <button
                                        onClick={() => handleEditStart(contentKey)}
                                        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-gray-500 hover:text-blue-600"
                                        title="Editar texto"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </button>
                                    )}
                                    
                                    {content.isEditing ? (
                                      /* Edit Mode */
                                      <div className="space-y-3">
                                        <textarea
                                          value={content.editingText}
                                          onChange={(e) => setMemoirContent(prev => ({
                                            ...prev,
                                            [contentKey]: {
                                              ...prev[contentKey],
                                              editingText: e.target.value
                                            }
                                          }))}
                                          onKeyDown={(e) => handleKeyDown(e, contentKey)}
                                          className="w-full h-32 sm:h-40 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                                          placeholder="Edita el contenido de las memorias..."
                                        />
                                        
                                        <div className="flex items-center justify-between">
                                          <div className="text-xs text-gray-500 hidden sm:block">
                                            Usa Ctrl/Cmd+S para guardar, Escape para cancelar
                                          </div>
                                          
                                          <div className="flex space-x-2 ml-auto">
                                            <button
                                              onClick={() => handleEditCancel(contentKey)}
                                              className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-gray-600 hover:text-gray-800 transition-colors"
                                            >
                                              Cancelar
                                            </button>
                                            <button
                                              onClick={() => handleEditSave(contentKey)}
                                              className="flex items-center px-2 sm:px-3 py-1 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                            >
                                              <Save className="h-3 w-3 mr-1 hidden sm:inline" />
                                              Guardar
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      /* Display Mode */
                                      <div className="text-gray-700 leading-relaxed">
                                        {content.text.split('\n').map((paragraph, i) => (
                                          <p key={i} className="mb-3">{paragraph}</p>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : questionRecordings.length > 0 && questionRecordings[0].transcript && (
                              /* Fallback to original transcript */
                              <div className="text-gray-700 leading-relaxed">
                                {questionRecordings.map(recording => recording.transcript).join(' ').split('\n').map((paragraph, i) => (
                                  <p key={i} className="mb-3">{paragraph}</p>
                                ))}
                              </div>
                            )}
                          </div>
                          );
                        }).filter(Boolean)}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">
                        No hay grabaciones en este capítulo aún.
                      </p>
                    )}
                  </div>
                ))}

                {chaptersWithRecordings.length === 0 && (
                  <div className="text-center py-12">
                    <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                      Memorias en Construcción
                    </h3>
                    <p className="text-gray-600 text-sm sm:text-base px-4">
                      Comienza a grabar y transcribir historias para ver el contenido de las memorias aquí.
                    </p>
                  </div>
                )}
              </div>
            </div>
        </div>
      </div>
        </div>
      </div>
      
      {/* Full Screen Image Preview */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-full max-h-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="h-8 w-8" />
            </button>
            <img
              src={selectedImage}
              alt="Vista completa"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
      
      {/* Delete Image Confirmation Modal */}
      {deleteImageId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirmar Eliminación
            </h3>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que quieres eliminar esta imagen? Esta acción no se puede deshacer.
            </p>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setDeleteImageId(null)}
                fullWidth
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDeleteImage(deleteImageId)}
                fullWidth
              >
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default BookEditor;