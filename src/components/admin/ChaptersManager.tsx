import { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useChaptersStore, Chapter } from '../../store/chaptersStore';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { QuestionsManager } from './QuestionsManager';
import { toast } from 'sonner';

interface SortableChapterProps {
  chapter: Chapter;
  onEdit: (chapter: Chapter) => void;
  onDelete: (chapter: Chapter) => void;
  onToggle: (chapterId: string) => void;
  isExpanded: boolean;
}

function SortableChapter({ chapter, onEdit, onDelete, onToggle, isExpanded }: SortableChapterProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chapter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-2">
      <div className="flex items-center gap-2 p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <button
          onClick={() => onToggle(chapter.id)}
          className="text-gray-600 hover:text-gray-900"
        >
          {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </button>

        <div className="flex-1 text-left">
          <span className="text-sm text-gray-500 mr-2">#{chapter.order}</span>
          <span className="font-medium">{chapter.title}</span>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => onEdit(chapter)}
        >
          <Pencil className="h-4 w-4" />
        </Button>

        <Button
          variant="danger"
          size="sm"
          onClick={() => onDelete(chapter)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {isExpanded && (
        <div className="mt-2 ml-12 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <QuestionsManager chapterId={chapter.id} />
        </div>
      )}
    </div>
  );
}

export function ChaptersManager() {
  const { chapters, loading, fetchChapters, createChapter, updateChapter, deleteChapter, reorderChapters } = useChaptersStore();
  const [localChapters, setLocalChapters] = useState<Chapter[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [title, setTitle] = useState('');
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);

  useEffect(() => {
    setLocalChapters(chapters);
  }, [chapters]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localChapters.findIndex((c) => c.id === active.id);
      const newIndex = localChapters.findIndex((c) => c.id === over.id);

      const newChapters = arrayMove(localChapters, oldIndex, newIndex);
      setLocalChapters(newChapters);

      try {
        await reorderChapters(newChapters);
        toast.success('Capítulos reordenados exitosamente');
      } catch (error) {
        toast.error('Error al reordenar capítulos');
        setLocalChapters(chapters);
      }
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('El título es requerido');
      return;
    }

    try {
      await createChapter(title, localChapters.length);
      toast.success('Capítulo creado exitosamente');
      setTitle('');
      setIsCreateModalOpen(false);
    } catch (error) {
      toast.error('Error al crear capítulo');
    }
  };

  const handleEdit = async () => {
    if (!editingChapter || !title.trim()) {
      toast.error('El título es requerido');
      return;
    }

    try {
      await updateChapter(editingChapter.id, title, editingChapter.order);
      toast.success('Capítulo actualizado exitosamente');
      setTitle('');
      setEditingChapter(null);
      setIsEditModalOpen(false);
    } catch (error) {
      toast.error('Error al actualizar capítulo');
    }
  };

  const handleDelete = async (chapter: Chapter) => {
    if (!confirm(`¿Estás seguro de eliminar "${chapter.title}"? Esto eliminará todas sus preguntas.`)) {
      return;
    }

    try {
      await deleteChapter(chapter.id);
      toast.success('Capítulo eliminado exitosamente');
    } catch (error) {
      toast.error('Error al eliminar capítulo');
    }
  };

  const openEditModal = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setTitle(chapter.title);
    setIsEditModalOpen(true);
  };

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  };

  if (loading && localChapters.length === 0) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestión de Capítulos</h2>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-5 w-5 mr-2" />
          Nuevo Capítulo
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={localChapters.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {localChapters.map((chapter) => (
            <SortableChapter
              key={chapter.id}
              chapter={chapter}
              onEdit={openEditModal}
              onDelete={handleDelete}
              onToggle={toggleChapter}
              isExpanded={expandedChapters.has(chapter.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {localChapters.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No hay capítulos. Crea uno nuevo para comenzar.
        </div>
      )}

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setTitle('');
        }}
        title="Crear Nuevo Capítulo"
      >
        <div className="space-y-4">
          <Input
            label="Título del Capítulo"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Capítulo 1: Introducción"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                setTitle('');
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
          setTitle('');
          setEditingChapter(null);
        }}
        title="Editar Capítulo"
      >
        <div className="space-y-4">
          <Input
            label="Título del Capítulo"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Capítulo 1: Introducción"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                setTitle('');
                setEditingChapter(null);
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
