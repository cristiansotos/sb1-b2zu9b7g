import React, { useState, useEffect, useRef } from 'react';
import { X, Eye, EyeOff, Mail, Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import Button from '../ui/Button';
import { useAuthStore } from '../../store/authStore';
import { validateEmail } from '../../lib/utils';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'register' | 'forgot-password';
  onSwitchMode: (mode: 'login' | 'register' | 'forgot-password') => void;
  initialEmail?: string;
  isInvitationFlow?: boolean;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  mode,
  onSwitchMode,
  initialEmail,
  isInvitationFlow = false
}) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuthStore();

  useEffect(() => {
    if (isOpen && emailInputRef.current) {
      setTimeout(() => emailInputRef.current?.focus(), 100);
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (!isOpen) {
      setFormData({ email: '', password: '', confirmPassword: '' });
      setErrors({});
      setShowPassword(false);
      setShowConfirmPassword(false);
      setPasswordStrength(null);
      setResetEmailSent(false);
    }
  }, [isOpen]);

  // Pre-populate email if provided (for invitation flow)
  useEffect(() => {
    if (initialEmail && isOpen && mode === 'register') {
      setFormData(prev => ({ ...prev, email: initialEmail }));
    }
  }, [initialEmail, isOpen, mode]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, loading]);

  useEffect(() => {
    if (mode === 'register' && formData.password) {
      const strength = calculatePasswordStrength(formData.password);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength(null);
    }
  }, [formData.password, mode]);

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    };

    const score = Object.values(checks).filter(Boolean).length;

    let label = 'Muy débil';
    let color = 'bg-red-500';

    if (score >= 5) {
      label = 'Fuerte';
      color = 'bg-green-500';
    } else if (score >= 3) {
      label = 'Media';
      color = 'bg-yellow-500';
    } else if (score >= 1) {
      label = 'Débil';
      color = 'bg-orange-500';
    }

    return { score, label, color, checks };
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrors({});

    try {
      const result = await signInWithGoogle();
      if (!result.success) {
        setErrors({ submit: result.error || 'Error al iniciar sesión con Google' });
      }
    } catch (error) {
      setErrors({ submit: 'Error de conexión con Google' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};

    if (!validateEmail(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (mode !== 'forgot-password') {
      if (formData.password.length < 6) {
        newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
      }

      if (mode === 'register') {
        if (passwordStrength && passwordStrength.score < 3) {
          newErrors.password = 'La contraseña es demasiado débil. Cumple al menos 3 requisitos.';
        }

        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Las contraseñas no coinciden';
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      if (mode === 'forgot-password') {
        const result = await resetPassword(formData.email);
        if (result.success) {
          setResetEmailSent(true);
        } else {
          setErrors({ submit: result.error || 'Error al enviar el correo' });
        }
      } else {
        const result = mode === 'login'
          ? await signIn(formData.email, formData.password)
          : await signUp(formData.email, formData.password, isInvitationFlow);

        if (result.success) {
          if (mode === 'register') {
            setErrors({ submit: 'success:Cuenta creada exitosamente. ¡Bienvenido!' });
            setTimeout(() => {
              handleClose();
            }, 1500);
          } else {
            handleClose();
          }
        } else {
          // Check if error is about user already existing
          const errorMessage = result.error || 'Error desconocido';
          if (mode === 'register' && (errorMessage.includes('already') || errorMessage.includes('existe') || errorMessage.includes('registered'))) {
            setErrors({
              submit: 'userExists:Este correo ya tiene una cuenta. Por favor, inicia sesión en su lugar.'
            });
          } else {
            setErrors({ submit: errorMessage });
          }
        }
      }
    } catch (error) {
      setErrors({ submit: 'Error de conexión' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-gray-100">
          <button
            onClick={handleClose}
            disabled={loading}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 touch-manipulation"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>

          <h2 id="auth-modal-title" className="text-2xl font-bold text-gray-900">
            {mode === 'forgot-password' ? 'Recuperar Contraseña' : mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {mode === 'forgot-password'
              ? 'Te enviaremos un enlace para restablecer tu contraseña'
              : mode === 'login'
              ? 'Accede a tus historias familiares'
              : 'Comienza a preservar tus memorias'
            }
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {resetEmailSent ? (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ¡Correo enviado!
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Revisa tu correo electrónico y sigue las instrucciones para restablecer tu contraseña.
              </p>
              <Button
                onClick={() => onSwitchMode('login')}
                fullWidth
              >
                Volver al inicio de sesión
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Google Sign In Button - Only for login and register */}
              {mode !== 'forgot-password' && (
                <>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full flex items-center justify-center space-x-3 px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[48px] group"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="text-gray-700 font-medium group-hover:text-gray-900">
                      Continuar con Google
                    </span>
                  </button>

                  <div className="relative flex items-center">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="flex-shrink mx-4 text-sm text-gray-500">o</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                  </div>
                </>
              )}

              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    ref={emailInputRef}
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[48px] ${
                      errors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="tu@email.com"
                    required
                    autoComplete="email"
                  />
                </div>
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password Input - Hidden for forgot password */}
              {mode !== 'forgot-password' && (
                <>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      Contraseña
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className={`w-full pl-10 pr-12 py-3 border rounded-lg shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[48px] ${
                          errors.password ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="••••••••"
                        required
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors touch-manipulation"
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.password}
                      </p>
                    )}

                    {/* Password Strength Indicator */}
                    {mode === 'register' && formData.password && passwordStrength && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Fortaleza de contraseña</span>
                          <span className={`font-medium ${
                            passwordStrength.score >= 4 ? 'text-green-600' :
                            passwordStrength.score >= 3 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="flex space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                i < passwordStrength.score ? passwordStrength.color : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="space-y-1 pt-2">
                          {[
                            { key: 'length', label: 'Al menos 8 caracteres' },
                            { key: 'uppercase', label: 'Una letra mayúscula' },
                            { key: 'lowercase', label: 'Una letra minúscula' },
                            { key: 'number', label: 'Un número' },
                            { key: 'special', label: 'Un carácter especial' }
                          ].map(({ key, label }) => (
                            <div key={key} className="flex items-center text-xs">
                              <CheckCircle2
                                className={`h-3.5 w-3.5 mr-2 ${
                                  passwordStrength.checks[key as keyof typeof passwordStrength.checks]
                                    ? 'text-green-500'
                                    : 'text-gray-300'
                                }`}
                              />
                              <span className={
                                passwordStrength.checks[key as keyof typeof passwordStrength.checks]
                                  ? 'text-gray-700'
                                  : 'text-gray-500'
                              }>
                                {label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password - Only for register */}
                  {mode === 'register' && (
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                        Confirmar Contraseña
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          className={`w-full pl-10 pr-12 py-3 border rounded-lg shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[48px] ${
                            errors.confirmPassword ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="••••••••"
                          required
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors touch-manipulation"
                          aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {errors.confirmPassword}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Forgot Password Link - Only for login */}
                  {mode === 'login' && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => onSwitchMode('forgot-password')}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Submit Error/Success Message */}
              {errors.submit && (
                <div className={`p-3 rounded-lg ${
                  errors.submit.startsWith('success:')
                    ? 'bg-green-50 text-green-800'
                    : errors.submit.startsWith('userExists:')
                    ? 'bg-blue-50 border-2 border-blue-200'
                    : 'bg-red-50 text-red-800'
                }`}>
                  <div className="flex items-start space-x-2">
                    {errors.submit.startsWith('success:') ? (
                      <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                        errors.submit.startsWith('userExists:') ? 'text-blue-600' : ''
                      }`} />
                    )}
                    <div className="flex-1">
                      <span className={`text-sm ${
                        errors.submit.startsWith('userExists:') ? 'text-blue-900' : ''
                      }`}>
                        {errors.submit.replace('success:', '').replace('userExists:', '')}
                      </span>
                      {errors.submit.startsWith('userExists:') && (
                        <Button
                          type="button"
                          onClick={() => {
                            setErrors({});
                            onSwitchMode('login');
                          }}
                          className="mt-3 w-full bg-blue-600 hover:bg-blue-700"
                        >
                          Ir a Iniciar Sesión
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                loading={loading}
                fullWidth
                icon={ArrowRight}
                iconPosition="right"
                size="lg"
              >
                {mode === 'forgot-password'
                  ? 'Enviar enlace de recuperación'
                  : mode === 'login'
                  ? 'Iniciar Sesión'
                  : 'Crear Cuenta'
                }
              </Button>

              {/* Mode Switch Links */}
              <div className="text-center pt-2">
                {mode === 'forgot-password' ? (
                  <button
                    type="button"
                    onClick={() => onSwitchMode('login')}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Volver al inicio de sesión
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSwitchMode(mode === 'login' ? 'register' : 'login')}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {mode === 'login'
                      ? '¿No tienes cuenta? '
                      : '¿Ya tienes cuenta? '
                    }
                    <span className="text-blue-600 hover:text-blue-700 font-medium">
                      {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
                    </span>
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
