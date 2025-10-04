import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, User } from 'lucide-react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { RELATIONSHIPS } from '../../lib/constants';
import { useStoryStore } from '../../store/storyStore';
import { validateDateOfBirth } from '../../lib/utils';
import { Story } from '../../types';
import { supabase } from '../../lib/supabase';

interface EditStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  story: Story;
}

const EditStoryModal: React.FC<EditStoryModalProps> = ({ isOpen, onClose, story }) => {
  const [formData, setFormData] = useState({
    title: '',
    relationship: '',
    dateOfBirth: '',
    mode: 'adult' as 'adult' | 'child'
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const { updateStoryPhoto, fetchStories } = useStoryStore();

  // Initialize form data when story changes
  useEffect(() => {
    if (story) {
      setFormData({
        title: story.title,
        relationship: story.relationship,
        dateOfBirth: story.date_of_birth || '',
        mode: story.mode
      });
      setPhotoPreview(story.photo_url || '');
    }
  }, [story]);

  const handlePhotoChange = (file: File) => {
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
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

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    
    try {
      // Update story data
      const { error: updateError } = await supabase
        .from('stories')
        .update({
          title: formData.title.trim(),
          relationship: formData.relationship,
          date_of_birth: formData.dateOfBirth || null,
          mode: formData.mode
        })
        .eq('id', story.id);

      if (updateError) throw updateError;

      // Update photo if changed
      if (photo) {
        const result = await updateStoryPhoto(story.id, photo);
        if (!result.success) {
          setErrors({ submit: result.error || 'Error al actualizar la foto' });
          setLoading(false);
          return;
        }
      }

      // Refresh stories
      await fetchStories();
      
      onClose();
      setPhoto(null);
      setPhotoPreview('');
    } catch (error: any) {
      setErrors({ submit: error.message || 'Error al actualizar la historia' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setPhoto(null);
    setPhotoPreview(story?.photo_url || '');
    setErrors({});
    // Reset form data to original story values
    if (story) {
      setFormData({
        title: story.title,
        relationship: story.relationship,
        dateOfBirth: story.date_of_birth || '',
        mode: story.mode
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Editar Historia"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo Upload */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Preview"
                className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-teal-100 border-4 border-gray-200 flex items-center justify-center">
                <User className="h-16 w-16 text-blue-400" />
              </div>
            )}
          </div>
          
          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={Upload}
              onClick={() => fileInputRef.current?.click()}
            >
              Galería
            </Button>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={Camera}
              onClick={() => cameraInputRef.current?.click()}
            >
              Cámara
            </Button>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && handlePhotoChange(e.target.files[0])}
            className="hidden"
          />
          
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => e.target.files?.[0] && handlePhotoChange(e.target.files[0])}
            className="hidden"
          />
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Título de la Historia"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            error={errors.title}
            placeholder="Ej: Los recuerdos de mi abuela Elena"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Relación *
            </label>
            <select
              value={formData.relationship}
              onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
        </div>

        <Input
          label="Fecha de Nacimiento"
          value={formData.dateOfBirth}
          onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
          error={errors.dateOfBirth}
          placeholder="DD/MM/YYYY"
          helperText="Formato: día/mes/año"
        />

        {/* Mode Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Tipo de Historia
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, mode: 'adult' })}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                formData.mode === 'adult'
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <h4 className="font-medium mb-1">Adulto</h4>
              <p className="text-sm text-gray-600">
                Para documentar la historia de vida completa
              </p>
            </button>
            
            <button
              type="button"
              onClick={() => setFormData({ ...formData, mode: 'child' })}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                formData.mode === 'child'
                  ? 'border-orange-500 bg-orange-50 text-orange-900'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <h4 className="font-medium mb-1">Niño</h4>
              <p className="text-sm text-gray-600">
                Para seguir el crecimiento y momentos especiales
              </p>
            </button>
          </div>
        </div>

        {errors.submit && (
          <div className="text-red-600 text-sm">{errors.submit}</div>
        )}

        <div className="flex space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            fullWidth
          >
            Cancelar
          </Button>
          
          <Button
            type="submit"
            loading={loading}
            fullWidth
          >
            Guardar Cambios
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditStoryModal;