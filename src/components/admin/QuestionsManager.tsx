import { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useChaptersStore, Question, Section } from '../../store/chaptersStore';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { toast } from 'sonner';

interface SortableQuestionProps {
  question: Question;
  index: number;
  onEdit: (question: Question) => void;
  onDelete: (question: Question) => void;
}

function SortableQuestion({ question, index, onEdit, onDelete }: SortableQuestionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 mb-2"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 mt-1"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="flex-1 text-left">
        <span className="text-xs text-gray-500 mr-2">#{index + 1}</span>
        <span className="text-sm">{question.question}</span>
      </div>

      <div className="flex gap-1">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onEdit(question)}
        >
          <Pencil className="h-3 w-3" />
        </Button>

        <Button
          variant="danger"
          size="sm"
          onClick={() => onDelete(question)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

interface QuestionsManagerProps {
  chapterId: string;
}

export function QuestionsManager({ chapterId }: QuestionsManagerProps) {
  const {
    fetchSectionsForChapter,
    fetchQuestionsForSection,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
    createSection,
    updateSection,
    deleteSection,
  } = useChaptersStore();

  const [sections, setSections] = useState<Section[]>([]);
  const [questionsMap, setQuestionsMap] = useState<Map<string, Question[]>>(new Map());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [isCreateQuestionModalOpen, setIsCreateQuestionModalOpen] = useState(false);
  const [isEditQuestionModalOpen, setIsEditQuestionModalOpen] = useState(false);
  const [isCreateSectionModalOpen, setIsCreateSectionModalOpen] = useState(false);
  const [isEditSectionModalOpen, setIsEditSectionModalOpen] = useState(false);

  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);

  const [questionText, setQuestionText] = useState('');
  const [sectionTitle, setSectionTitle] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadSections();
  }, [chapterId]);

  const loadSections = async () => {
    setLoading(true);
    try {
      const sectionsData = await fetchSectionsForChapter(chapterId);
      setSections(sectionsData);

      const newExpandedSections = new Set(sectionsData.map(s => s.id));
      setExpandedSections(newExpandedSections);

      const newQuestionsMap = new Map<string, Question[]>();
      for (const section of sectionsData) {
        const questions = await fetchQuestionsForSection(section.id);
        newQuestionsMap.set(section.id, questions);
      }
      setQuestionsMap(newQuestionsMap);
    } catch (error) {
      toast.error('Error al cargar secciones');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleDragEnd = async (event: DragEndEvent, sectionId: string) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const questions = questionsMap.get(sectionId) || [];
      const oldIndex = questions.findIndex((q) => q.id === active.id);
      const newIndex = questions.findIndex((q) => q.id === over.id);

      const newQuestions = arrayMove(questions, oldIndex, newIndex);

      const newMap = new Map(questionsMap);
      newMap.set(sectionId, newQuestions);
      setQuestionsMap(newMap);

      try {
        await reorderQuestions(newQuestions);
        toast.success('Preguntas reordenadas exitosamente');
      } catch (error) {
        toast.error('Error al reordenar preguntas');
        loadSections();
      }
    }
  };

  const handleCreateQuestion = async () => {
    if (!questionText.trim()) {
      toast.error('La pregunta es requerida');
      return;
    }

    if (!currentSectionId) {
      toast.error('Debe seleccionar una sección');
      return;
    }

    try {
      const questions = questionsMap.get(currentSectionId) || [];
      await createQuestion(chapterId, questionText, questions.length, currentSectionId);
      toast.success('Pregunta creada exitosamente');
      setQuestionText('');
      setCurrentSectionId(null);
      setIsCreateQuestionModalOpen(false);
      loadSections();
    } catch (error) {
      toast.error('Error al crear pregunta');
    }
  };

  const handleEditQuestion = async () => {
    if (!editingQuestion || !questionText.trim()) {
      toast.error('La pregunta es requerida');
      return;
    }

    try {
      await updateQuestion(
        editingQuestion.id,
        questionText,
        editingQuestion.order,
        editingQuestion.section_template_id
      );
      toast.success('Pregunta actualizada exitosamente');
      setQuestionText('');
      setEditingQuestion(null);
      setIsEditQuestionModalOpen(false);
      loadSections();
    } catch (error) {
      toast.error('Error al actualizar pregunta');
    }
  };

  const handleDeleteQuestion = async (question: Question) => {
    if (!confirm('¿Estás seguro de eliminar esta pregunta?')) {
      return;
    }

    try {
      await deleteQuestion(question.id);
      toast.success('Pregunta eliminada exitosamente');
      loadSections();
    } catch (error) {
      toast.error('Error al eliminar pregunta');
    }
  };

  const openEditQuestionModal = (question: Question) => {
    setEditingQuestion(question);
    setQuestionText(question.question);
    setIsEditQuestionModalOpen(true);
  };

  const handleCreateSection = async () => {
    if (!sectionTitle.trim()) {
      toast.error('El título de la sección es requerido');
      return;
    }

    try {
      await createSection(chapterId, sectionTitle, sections.length);
      toast.success('Sección creada exitosamente');
      setSectionTitle('');
      setIsCreateSectionModalOpen(false);
      loadSections();
    } catch (error) {
      toast.error('Error al crear sección');
    }
  };

  const handleEditSection = async () => {
    if (!editingSection || !sectionTitle.trim()) {
      toast.error('El título de la sección es requerido');
      return;
    }

    try {
      await updateSection(editingSection.id, sectionTitle, editingSection.order);
      toast.success('Sección actualizada exitosamente');
      setSectionTitle('');
      setEditingSection(null);
      setIsEditSectionModalOpen(false);
      loadSections();
    } catch (error) {
      toast.error('Error al actualizar sección');
    }
  };

  const handleDeleteSection = async (section: Section) => {
    const questions = questionsMap.get(section.id) || [];
    if (questions.length > 0) {
      if (!confirm(`Esta sección contiene ${questions.length} preguntas. ¿Estás seguro de eliminarla? Todas las preguntas también se eliminarán.`)) {
        return;
      }
    } else {
      if (!confirm('¿Estás seguro de eliminar esta sección?')) {
        return;
      }
    }

    try {
      await deleteSection(section.id);
      toast.success('Sección eliminada exitosamente');
      loadSections();
    } catch (error) {
      toast.error('Error al eliminar sección');
    }
  };

  const openEditSectionModal = (section: Section) => {
    setEditingSection(section);
    setSectionTitle(section.title);
    setIsEditSectionModalOpen(true);
  };

  const openCreateQuestionModal = (sectionId: string) => {
    setCurrentSectionId(sectionId);
    setIsCreateQuestionModalOpen(true);
  };

  if (loading) {
    return <div className="text-center py-4 text-sm text-gray-500">Cargando preguntas...</div>;
  }

  const totalQuestions = Array.from(questionsMap.values()).reduce((sum, qs) => sum + qs.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          Preguntas ({totalQuestions}) - {sections.length} Secciones
        </h3>
        <Button size="sm" onClick={() => setIsCreateSectionModalOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nueva Sección
        </Button>
      </div>

      {sections.length === 0 ? (
        <div className="text-center py-4 text-sm text-gray-500">
          No hay secciones en este capítulo. Crea una sección para comenzar.
        </div>
      ) : (
        sections.map((section) => {
          const isExpanded = expandedSections.has(section.id);
          const sectionQuestions = questionsMap.get(section.id) || [];

          return (
            <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleSection(section.id)}
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                  <h4 className="font-medium text-gray-900">{section.title}</h4>
                  <span className="text-sm text-gray-500">
                    ({sectionQuestions.length} preguntas)
                  </span>
                </div>

                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openCreateQuestionModal(section.id)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Pregunta
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openEditSectionModal(section)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDeleteSection(section)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 space-y-2">
                  {sectionQuestions.length === 0 ? (
                    <div className="text-center py-2 text-sm text-gray-500">
                      No hay preguntas en esta sección.
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event) => handleDragEnd(event, section.id)}
                    >
                      <SortableContext
                        items={sectionQuestions.map((q) => q.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {sectionQuestions.map((question, index) => (
                          <SortableQuestion
                            key={question.id}
                            question={question}
                            index={index}
                            onEdit={openEditQuestionModal}
                            onDelete={handleDeleteQuestion}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      <Modal
        isOpen={isCreateSectionModalOpen}
        onClose={() => {
          setIsCreateSectionModalOpen(false);
          setSectionTitle('');
        }}
        title="Crear Nueva Sección"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título de la Sección
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={sectionTitle}
              onChange={(e) => setSectionTitle(e.target.value)}
              placeholder="Ej: Antepasados, Historia familiar..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateSectionModalOpen(false);
                setSectionTitle('');
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateSection}>Crear</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isEditSectionModalOpen}
        onClose={() => {
          setIsEditSectionModalOpen(false);
          setSectionTitle('');
          setEditingSection(null);
        }}
        title="Editar Sección"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título de la Sección
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={sectionTitle}
              onChange={(e) => setSectionTitle(e.target.value)}
              placeholder="Ej: Antepasados, Historia familiar..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditSectionModalOpen(false);
                setSectionTitle('');
                setEditingSection(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleEditSection}>Guardar</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isCreateQuestionModalOpen}
        onClose={() => {
          setIsCreateQuestionModalOpen(false);
          setQuestionText('');
          setCurrentSectionId(null);
        }}
        title="Crear Nueva Pregunta"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pregunta
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Escribe la pregunta aquí..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateQuestionModalOpen(false);
                setQuestionText('');
                setCurrentSectionId(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateQuestion}>Crear</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isEditQuestionModalOpen}
        onClose={() => {
          setIsEditQuestionModalOpen(false);
          setQuestionText('');
          setEditingQuestion(null);
        }}
        title="Editar Pregunta"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pregunta
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Escribe la pregunta aquí..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditQuestionModalOpen(false);
                setQuestionText('');
                setEditingQuestion(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleEditQuestion}>Guardar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
