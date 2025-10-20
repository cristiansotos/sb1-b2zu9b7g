import React, { useState, useRef } from 'react';
import { Camera, Upload, User } from 'lucide-react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import DatePicker from '../ui/DatePicker';
import { RELATIONSHIPS } from '../../lib/constants';
import { useStoryStore } from '../../store/storyStore';
import { useFamilyGroupStore } from '../../store/familyGroupStore';
import { validateDateOfBirth } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import FamilySelector from './FamilySelector';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateStoryModal: React.FC<CreateStoryModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    relationship: '',
    dateOfBirth: ''
  });
  const [selectedFamilyIds, setSelectedFamilyIds] = useState<string[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { createStory } = useStoryStore();
  const { familyGroups } = useFamilyGroupStore();
  const navigate = useNavigate();

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhoto(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    console.log('[CreateStoryModal] Submit started');
    console.log('[CreateStoryModal] Selected families:', selectedFamilyIds);
    console.log('[CreateStoryModal] Form data:', formData);

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

    const dateValidation = validateDateOfBirth(formData.dateOfBirth);
    if (!dateValidation.isValid) {
      newErrors.dateOfBirth = dateValidation.error!;
    }

    if (selectedFamilyIds.length === 0) {
      newErrors.families = 'Debes seleccionar al menos una familia';
    }

    if (Object.keys(newErrors).length > 0) {
      console.log('[CreateStoryModal] Validation errors:', newErrors);
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      console.log('[CreateStoryModal] Calling createStory...');
      const result = await createStory({
        ...formData,
        mode: 'adult',
        photo,
        familyGroupIds: selectedFamilyIds
      });

      console.log('[CreateStoryModal] Create story result:', result);

      if (result.success) {
        console.log('[CreateStoryModal] Story created successfully, navigating to:', result.storyId);
        onClose();
        // Navigate to story recorder
        navigate(`/story-recorder/${result.storyId}`);

        // Reset form
        setFormData({
          title: '',
          relationship: '',
          dateOfBirth: ''
        });
        setSelectedFamilyIds([]);
        setPhoto(null);
        setPhotoPreview('');
      } else {
        console.error('[CreateStoryModal] Story creation failed:', result.error);
        setErrors({ submit: result.error || 'Error desconocido' });
      }
    } catch (error) {
      console.error('[CreateStoryModal] Exception during story creation:', error);
      setErrors({ submit: 'Error de conexión' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setFormData({
      title: '',
      relationship: '',
      dateOfBirth: ''
    });
    setSelectedFamilyIds([]);
    setPhoto(null);
    setPhotoPreview('');
    setErrors({});
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Crear Nueva Historia"
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
          
          <div className="flex flex-col sm:flex-row gap-3 w-full justify-center px-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
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
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
            aria-label="Seleccionar imagen de galería"
          />

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            className="hidden"
            aria-label="Tomar foto con cámara"
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

        <DatePicker
          label="Fecha de Nacimiento"
          value={formData.dateOfBirth}
          onChange={(date) => setFormData({ ...formData, dateOfBirth: date })}
          error={errors.dateOfBirth}
          required
        />

        <FamilySelector
          availableFamilies={familyGroups}
          selectedFamilyIds={selectedFamilyIds}
          onChange={setSelectedFamilyIds}
          maxSelections={4}
          error={errors.families}
          mode="checkbox"
          label="Familias"
          required
        />

        {(errors.submit || errors.general) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {errors.submit || errors.general}
          </div>
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
            Crear Historia
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateStoryModal;