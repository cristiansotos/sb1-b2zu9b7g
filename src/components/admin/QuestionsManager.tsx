import { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Pencil, Trash2 } from 'lucide-react';
import { useChaptersStore, Question } from '../../store/chaptersStore';
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
  const { fetchQuestionsForChapter, createQuestion, updateQuestion, deleteQuestion, reorderQuestions } = useChaptersStore();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionText, setQuestionText] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadQuestions();
  }, [chapterId]);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const data = await fetchQuestionsForChapter(chapterId);
      setQuestions(data);
    } catch (error) {
      toast.error('Error al cargar preguntas');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = questions.findIndex((q) => q.id === active.id);
      const newIndex = questions.findIndex((q) => q.id === over.id);

      const newQuestions = arrayMove(questions, oldIndex, newIndex);
      setQuestions(newQuestions);

      try {
        await reorderQuestions(chapterId, newQuestions);
        toast.success('Preguntas reordenadas exitosamente');
      } catch (error) {
        toast.error('Error al reordenar preguntas');
        loadQuestions();
      }
    }
  };

  const handleCreate = async () => {
    if (!questionText.trim()) {
      toast.error('La pregunta es requerida');
      return;
    }

    try {
      await createQuestion(chapterId, questionText, questions.length);
      toast.success('Pregunta creada exitosamente');
      setQuestionText('');
      setIsCreateModalOpen(false);
      loadQuestions();
    } catch (error) {
      toast.error('Error al crear pregunta');
    }
  };

  const handleEdit = async () => {
    if (!editingQuestion || !questionText.trim()) {
      toast.error('La pregunta es requerida');
      return;
    }

    try {
      await updateQuestion(editingQuestion.id, questionText, editingQuestion.order);
      toast.success('Pregunta actualizada exitosamente');
      setQuestionText('');
      setEditingQuestion(null);
      setIsEditModalOpen(false);
      loadQuestions();
    } catch (error) {
      toast.error('Error al actualizar pregunta');
    }
  };

  const handleDelete = async (question: Question) => {
    if (!confirm('¿Estás seguro de eliminar esta pregunta?')) {
      return;
    }

    try {
      await deleteQuestion(question.id);
      toast.success('Pregunta eliminada exitosamente');
      loadQuestions();
    } catch (error) {
      toast.error('Error al eliminar pregunta');
    }
  };

  const openEditModal = (question: Question) => {
    setEditingQuestion(question);
    setQuestionText(question.question);
    setIsEditModalOpen(true);
  };

  if (loading) {
    return <div className="text-center py-4 text-sm text-gray-500">Cargando preguntas...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Preguntas ({questions.length})</h3>
        <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nueva Pregunta
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={questions.map((q) => q.id)}
          strategy={verticalListSortingStrategy}
        >
          {questions.map((question, index) => (
            <SortableQuestion
              key={question.id}
              question={question}
              index={index}
              onEdit={openEditModal}
              onDelete={handleDelete}
            />
          ))}
        </SortableContext>
      </DndContext>

      {questions.length === 0 && (
        <div className="text-center py-4 text-sm text-gray-500">
          No hay preguntas en este capítulo.
        </div>
      )}

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setQuestionText('');
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
                setIsCreateModalOpen(false);
                setQuestionText('');
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreate}>Crear</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
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
                setIsEditModalOpen(false);
                setQuestionText('');
                setEditingQuestion(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleEdit}>Guardar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
