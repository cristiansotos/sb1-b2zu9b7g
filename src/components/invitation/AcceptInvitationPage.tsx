import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookHeart, CheckCircle, XCircle, AlertCircle, Mail } from 'lucide-react';
import { useFamilyGroupStore } from '../../store/familyGroupStore';
import { useAuthStore } from '../../store/authStore';
import LoadingSpinner from '../ui/LoadingSpinner';
import Button from '../ui/Button';
import AuthModal from '../auth/AuthModal';
import { FamilyInvitation } from '../../types';
import { toast } from 'sonner';

const AcceptInvitationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const { user } = useAuthStore();
  const { acceptInvitation, getInvitationByToken } = useFamilyGroupStore();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [invitation, setInvitation] = useState<FamilyInvitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot-password'>('register');

  useEffect(() => {
    if (!token) {
      setError('Token de invitación no válido');
      setLoading(false);
      return;
    }

    loadInvitation();
  }, [token]);

  const loadInvitation = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const invitationData = await getInvitationByToken(token);

      if (!invitationData) {
        setError('Invitación no encontrada');
      } else if (invitationData.status === 'accepted') {
        setError('Esta invitación ya ha sido aceptada');
      } else if (invitationData.status === 'expired') {
        setError('Esta invitación ha expirado');
      } else if (invitationData.status === 'cancelled') {
        setError('Esta invitación ha sido cancelada');
      } else if (new Date(invitationData.expires_at) < new Date()) {
        setError('Esta invitación ha expirado');
      } else {
        setInvitation(invitationData);
      }
    } catch (err: any) {
      console.error('Error loading invitation:', err);
      setError('Error al cargar la invitación');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!token || !user) {
      setAuthModalOpen(true);
      return;
    }

    setProcessing(true);
    const result = await acceptInvitation(token);

    if (result.success) {
      setSuccess(true);
      toast.success('¡Te has unido al grupo familiar!');

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } else {
      toast.error(result.error || 'Error al aceptar la invitación');
      setError(result.error || 'Error al aceptar la invitación');
    }
    setProcessing(false);
  };

  const getRoleDisplayName = (role: string) => {
    const roleNames: Record<string, string> = {
      owner: 'Propietario',
      editor: 'Editor',
      viewer: 'Visualizador'
    };
    return roleNames[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      owner: 'bg-purple-100 text-purple-800 border-purple-300',
      editor: 'bg-blue-100 text-blue-800 border-blue-300',
      viewer: 'bg-green-100 text-green-800 border-green-300'
    };
    return colors[role] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5EFE0] via-white to-[#F5EFE0] flex items-center justify-center p-4">
        <LoadingSpinner size="lg" message="Cargando invitación..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5EFE0] via-white to-[#F5EFE0] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <BookHeart className="h-12 w-12 text-[#C57B57]" strokeWidth={2} />
            <span className="text-4xl font-bold text-[#424B54] tracking-tight">Ethernal</span>
          </div>
          <p className="text-gray-600">Preservando las historias de tu familia</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12">
          {success ? (
            <div className="text-center">
              <div className="mb-6">
                <CheckCircle className="h-20 w-20 text-green-500 mx-auto" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                ¡Bienvenido al grupo familiar!
              </h1>
              <p className="text-lg text-gray-600 mb-6">
                Te estamos redirigiendo al dashboard...
              </p>
              <LoadingSpinner size="md" />
            </div>
          ) : error ? (
            <div className="text-center">
              <div className="mb-6">
                <XCircle className="h-20 w-20 text-red-500 mx-auto" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Invitación No Válida
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                {error}
              </p>
              <Button
                onClick={() => navigate('/')}
                className="bg-[#C57B57] hover:bg-[#B86A4A]"
              >
                Volver al Inicio
              </Button>
            </div>
          ) : invitation ? (
            <div>
              <div className="text-center mb-8">
                <div className="mb-6">
                  <Mail className="h-16 w-16 text-[#C57B57] mx-auto" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                  Invitación al Grupo Familiar
                </h1>
              </div>

              <div className="bg-gradient-to-br from-[#F5EFE0] to-white rounded-xl p-6 mb-6 border-2 border-[#C57B57]/20">
                <p className="text-lg text-gray-700 mb-4 text-center">
                  Has sido invitado a unirte al grupo familiar
                </p>
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-bold text-[#C57B57] mb-2">
                    {invitation.family?.name || 'Grupo Familiar'}
                  </h2>
                  <div className="flex items-center justify-center space-x-2 text-gray-600">
                    <span>como</span>
                    <span className={`px-4 py-1 rounded-full text-sm font-semibold border-2 ${getRoleColor(invitation.role)}`}>
                      {getRoleDisplayName(invitation.role)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5 mb-6">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
                  <span className="mr-2">🎉</span>
                  Al unirte podrás:
                </h3>
                <ul className="space-y-2 text-blue-800 text-sm">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Ver y contribuir a las historias y recuerdos familiares</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Añadir grabaciones e imágenes al contenido compartido</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Colaborar con otros miembros de la familia</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Preservar el legado familiar para las futuras generaciones</span>
                  </li>
                </ul>
              </div>

              {new Date(invitation.expires_at).getTime() - Date.now() < 24 * 60 * 60 * 1000 && (
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 mb-6">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-yellow-900 mb-1">
                        ⏰ Esta invitación expira pronto
                      </p>
                      <p className="text-sm text-yellow-800">
                        Expira el {new Date(invitation.expires_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!user ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 text-center">
                    <p className="text-gray-700 mb-1">
                      Para aceptar esta invitación, necesitas una cuenta
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={() => {
                        setAuthMode('register');
                        setAuthModalOpen(true);
                      }}
                      className="flex-1 bg-[#C57B57] hover:bg-[#B86A4A] text-lg py-3"
                    >
                      Crear Cuenta
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAuthMode('login');
                        setAuthModalOpen(true);
                      }}
                      className="flex-1 border-2 border-[#C57B57] text-[#C57B57] hover:bg-[#C57B57] hover:text-white text-lg py-3"
                    >
                      Iniciar Sesión
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button
                    onClick={handleAcceptInvitation}
                    loading={processing}
                    className="w-full bg-gradient-to-r from-[#C57B57] to-[#f59e0b] hover:from-[#B86A4A] hover:to-[#d97706] text-white text-lg py-4 shadow-lg"
                    size="lg"
                  >
                    Aceptar Invitación
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/')}
                    className="w-full border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                    disabled={processing}
                  >
                    Cancelar
                  </Button>
                </div>
              )}

              <div className="mt-6 text-center text-sm text-gray-500">
                <p className="flex items-center justify-center">
                  <span className="mr-1">🔒</span>
                  Esta es una invitación segura para unirte a un grupo familiar
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="text-center mt-8 text-sm text-gray-600">
          <p>&copy; 2024 Ethernal. Preservando las historias de tu familia</p>
        </div>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        onSwitchMode={setAuthMode}
      />
    </div>
  );
};

export default AcceptInvitationPage;
