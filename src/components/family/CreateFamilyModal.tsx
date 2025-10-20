import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, AlertCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useFamilyGroupStore } from '../../store/familyGroupStore';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface CreateFamilyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateFamilyModal: React.FC<CreateFamilyModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [familyName, setFamilyName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [secondLastName, setSecondLastName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { createFamilyGroup, fetchFamilyGroups, setActiveFamilyId } = useFamilyGroupStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (isOpen) {
      checkUserProfile();
    }
  }, [isOpen]);

  const checkUserProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_profiles')
      .select('first_name, last_name, second_last_name')
      .eq('id', user.id)
      .maybeSingle();

    if (data?.first_name && data?.last_name) {
      setFirstName(data.first_name);
      setLastName(data.last_name);
      setSecondLastName(data.second_last_name || '');
    }
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!familyName.trim()) {
      setErrors({ familyName: 'Por favor, introduce un nombre de familia' });
      return;
    }

    setStep(2);
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) {
      newErrors.firstName = 'El nombre es requerido';
    }
    if (!lastName.trim()) {
      newErrors.lastName = 'El primer apellido es requerido';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      await supabase
        .from('user_profiles')
        .upsert({
          id: user?.id,
          email: user?.email!,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          second_last_name: secondLastName.trim() || null
        });

      const result = await createFamilyGroup(familyName.trim());

      if (result.success && result.familyGroupId) {
        toast.success('¡Grupo familiar creado correctamente!');
        setActiveFamilyId(result.familyGroupId);
        await fetchFamilyGroups();
        handleClose();
      } else {
        toast.error(result.error || 'Error al crear el grupo familiar');
      }
    } catch (error) {
      toast.error('Error al guardar la información');
    }

    setLoading(false);
  };

  const handleClose = () => {
    if (!loading) {
      setStep(1);
      setFamilyName('');
      setFirstName('');
      setLastName('');
      setSecondLastName('');
      setErrors({});
      onClose();
    }
  };

  const handleBack = () => {
    setStep(1);
    setErrors({});
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            {step === 2 && (
              <button
                onClick={handleBack}
                disabled={loading}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
            )}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {step === 1 ? 'Crear Grupo Familiar' : 'Tu Información'}
              </h2>
              <p className="text-xs text-gray-500 mt-1">Paso {step} de 2</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {step === 1 ? (
          <form onSubmit={handleStep1Submit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la Familia <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="ej: Sotos Villaescusa"
                disabled={loading}
                maxLength={100}
                autoFocus
              />
              {errors.familyName && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.familyName}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Puedes crear hasta 4 grupos familiares como propietario.
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-2 space-y-reverse sm:space-y-0 sm:space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                fullWidth
                className="sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                fullWidth
                className="sm:w-auto"
              >
                Siguiente
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleStep2Submit}>
            <p className="text-sm text-gray-600 mb-6">
              Para que otros miembros te reconozcan, completa tu información personal.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Juan"
                  disabled={loading}
                  autoFocus
                />
                {errors.firstName && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.firstName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primer Apellido <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Pérez"
                  disabled={loading}
                />
                {errors.lastName && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.lastName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Segundo Apellido <span className="text-gray-400 text-xs">(Opcional)</span>
                </label>
                <Input
                  type="text"
                  value={secondLastName}
                  onChange={(e) => setSecondLastName(e.target.value)}
                  placeholder="García"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-2 space-y-reverse sm:space-y-0 sm:space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={loading}
                fullWidth
                className="sm:w-auto"
              >
                Atrás
              </Button>
              <Button
                type="submit"
                loading={loading}
                fullWidth
                className="sm:w-auto"
              >
                Crear Familia
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default CreateFamilyModal;
