import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, User } from 'lucide-react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import DatePicker from '../ui/DatePicker';
import { RELATIONSHIPS } from '../../lib/constants';
import { useStoryStore } from '../../store/storyStore';
import { validateDateOfBirth } from '../../lib/utils';
import { Story } from '../../types';
import { supabase } from '../../lib/supabase';
import FamilySelector from './FamilySelector';
import { useFamilyGroupStore } from '../../store/familyGroupStore';

interface EditStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  story: Story;
}

const EditStoryModal: React.FC<EditStoryModalProps> = ({ isOpen, onClose, story }) => {
  const [formData, setFormData] = useState({
    title: story.title,
    relationship: story.relationship,
    dateOfBirth: story.date_of_birth || ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(story.photo_url || '');
  const [selectedFamilyIds, setSelectedFamilyIds] = useState<string[]>([]);
  const [initialFamilyIds, setInitialFamilyIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { updateStoryPhoto, getStoryFamilies, addStoryToFamily, removeStoryFromFamily } = useStoryStore();
  const { familyGroups } = useFamilyGroupStore();

  useEffect(() => {
    if (isOpen) {
      // Convert ISO date to DD/MM/YYYY if needed
      let displayDate = story.date_of_birth || '';
      if (displayDate && displayDate.includes('-')) {
        const [year, month, day] = displayDate.split('-');
        displayDate = `${day}/${month}/${year}`;
      }

      setFormData({
        title: story.title,
        relationship: story.relationship,
        dateOfBirth: displayDate
      });
      setPreviewUrl(story.photo_url || '');
      setSelectedFile(null);
      setErrors({});

      // Load story families
      loadStoryFamilies();
    }
  }, [isOpen, story]);

  const loadStoryFamilies = async () => {
    const families = await getStoryFamilies(story.id);
    const familyIds = families.map(f => f.family_group_id);
    setInitialFamilyIds(familyIds);
    setSelectedFamilyIds(familyIds);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrors({ photo: 'Por favor selecciona una imagen válida' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrors({ photo: 'La imagen no puede ser mayor a 10MB' });
      return;
    }

    setSelectedFile(file);
    setErrors({});

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    event.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'El título es requerido';
    } else if (formData.title.length > 100) {
      newErrors.title = 'El título no puede exceder 100 caracteres';
    }

    if (!formData.relationship) {
      newErrors.relationship = 'La relación es requerida';
    }

    if (formData.dateOfBirth) {
      const dateValidation = validateDateOfBirth(formData.dateOfBirth);
      if (!dateValidation.isValid) {
        newErrors.dateOfBirth = dateValidation.error!;
      }
    }

    if (selectedFamilyIds.length === 0) {
      newErrors.families = 'La historia debe pertenecer al menos a una familia';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload photo first if a new one was selected
      if (selectedFile) {
        const result = await updateStoryPhoto(story.id, selectedFile);

        if (!result.success) {
          setErrors({ submit: result.error || 'Error al actualizar la foto' });
          setIsSubmitting(false);
          return;
        }
      }

      // Convert date to ISO format if needed
      let dateToStore = formData.dateOfBirth || null;
      if (dateToStore) {
        const validation = validateDateOfBirth(dateToStore);
        if (validation.isValid && validation.isoDate) {
          dateToStore = validation.isoDate;
        }
      }

      // Update story metadata
      const { error: updateError } = await supabase
        .from('stories')
        .update({
          title: formData.title.trim(),
          relationship: formData.relationship,
          date_of_birth: dateToStore
        })
        .eq('id', story.id);

      if (updateError) {
        throw updateError;
      }

      // Update family associations
      const familiesToAdd = selectedFamilyIds.filter(id => !initialFamilyIds.includes(id));
      const familiesToRemove = initialFamilyIds.filter(id => !selectedFamilyIds.includes(id));

      // Add new families
      for (const familyId of familiesToAdd) {
        const result = await addStoryToFamily(story.id, familyId);
        if (!result.success) {
          throw new Error(result.error || 'Error al añadir familia');
        }
      }

      // Remove families
      for (const familyId of familiesToRemove) {
        const result = await removeStoryFromFamily(story.id, familyId);
        if (!result.success) {
          throw new Error(result.error || 'Error al eliminar familia');
        }
      }

      onClose();
    } catch (error: any) {
      setErrors({ submit: error.message || 'Error al actualizar la historia' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Historia"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Vista previa"
                className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-teal-100 border-4 border-gray-200 flex items-center justify-center">
                <User className="h-16 w-16 text-blue-400" />
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full justify-center px-4">
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors text-gray-700 font-medium"
            >
              <Upload className="h-5 w-5" />
              <span>Galería</span>
            </button>

            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors text-gray-700 font-medium"
            >
              <Camera className="h-5 w-5" />
              <span>Cámara</span>
            </button>
          </div>

          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Seleccionar imagen de galería"
          />

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Tomar foto con cámara"
          />

          {errors.photo && (
            <p className="text-sm text-red-600">{errors.photo}</p>
          )}
        </div>

        <div className="space-y-4">
          <Input
            label="Título de la Historia"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            error={errors.title}
            placeholder="Ej: Los recuerdos de mi abuela Elena"
            required
            maxLength={100}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Relación *
            </label>
            <select
              value={formData.relationship}
              onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                errors.relationship ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            >
              <option value="">Seleccionar relación</option>
              {RELATIONSHIPS.map((relation) => (
                <option key={relation} value={relation}>
                  {relation}
                </option>
              ))}
            </select>
            {errors.relationship && (
              <p className="mt-1 text-sm text-red-600">{errors.relationship}</p>
            )}
          </div>

          <DatePicker
            label="Fecha de Nacimiento"
            value={formData.dateOfBirth}
            onChange={(date) => setFormData({ ...formData, dateOfBirth: date })}
            error={errors.dateOfBirth}
          />

          <FamilySelector
            availableFamilies={familyGroups}
            selectedFamilyIds={selectedFamilyIds}
            onChange={setSelectedFamilyIds}
            maxSelections={4}
            error={errors.families}
            mode="tags"
            label="Familias Asociadas"
            required
          />
        </div>

        {errors.submit && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            fullWidth
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            fullWidth
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditStoryModal;
