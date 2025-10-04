import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useAuthStore } from '../../store/authStore';
import { validateEmail } from '../../lib/utils';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'register';
  onSwitchMode: (mode: 'login' | 'register') => void;
}

const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  mode,
  onSwitchMode
}) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const { signIn, signUp } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!validateEmail(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    
    if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    
    if (mode === 'register' && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    
    try {
      const result = mode === 'login' 
        ? await signIn(formData.email, formData.password)
        : await signUp(formData.email, formData.password);

      if (result.success) {
        if (mode === 'register') {
          // For registration, show success message
          setErrors({ submit: 'Cuenta creada exitosamente. Puedes iniciar sesión ahora.' });
          // Switch to login mode after successful registration
          setTimeout(() => {
            onSwitchMode('login');
            setErrors({});
          }, 2000);
        } else {
          // For login, close modal and redirect will happen automatically via auth state change
          onClose();
          setFormData({ email: '', password: '', confirmPassword: '' });
        }
      } else {
        setErrors({ submit: result.error || 'Error desconocido' });
      }
    } catch (error) {
      setErrors({ submit: 'Error de conexión' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setFormData({ email: '', password: '', confirmPassword: '' });
    setErrors({});
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="email"
          label="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          error={errors.email}
          required
        />

        <Input
          type="password"
          label="Contraseña"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          error={errors.password}
          required
        />

        {mode === 'register' && (
          <Input
            type="password"
            label="Confirmar Contraseña"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            error={errors.confirmPassword}
            required
          />
        )}

        {errors.submit && (
          <div className={`text-sm ${errors.submit.includes('exitosamente') ? 'text-green-600' : 'text-red-600'}`}>
            {errors.submit}
          </div>
        )}

        <Button
          type="submit"
          loading={loading}
          fullWidth
        >
          {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
        </Button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => onSwitchMode(mode === 'login' ? 'register' : 'login')}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {mode === 'login' 
              ? '¿No tienes cuenta? Regístrate'
              : '¿Ya tienes cuenta? Inicia sesión'
            }
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AuthModal;