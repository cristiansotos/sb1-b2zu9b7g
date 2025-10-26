import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookHeart, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useFamilyGroupStore } from '../../store/familyGroupStore';
import { useAuthStore } from '../../store/authStore';
import LoadingSpinner from '../ui/LoadingSpinner';
import Button from '../ui/Button';
import AuthModal from '../auth/AuthModal';
import { toast } from 'sonner';

const INVITATION_TOKEN_KEY = 'pending_invitation_token';

const AcceptInvitationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const { user } = useAuthStore();
  const { acceptInvitation, getInvitationByToken } = useFamilyGroupStore();

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [familyName, setFamilyName] = useState<string | null>(null);
  const [invitationEmail, setInvitationEmail] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot-password'>('register');

  // Store token and fetch invitation email on mount
  useEffect(() => {
    if (!token) {
      setError('Token de invitación no válido');
      return;
    }

    console.log('[AcceptInvitation] Storing token in session storage:', token);
    sessionStorage.setItem(INVITATION_TOKEN_KEY, token);

    // Fetch invitation to get the email
    const fetchInvitationEmail = async () => {
      try {
        const invitation = await getInvitationByToken(token);
        if (invitation?.email) {
          console.log('[AcceptInvitation] Found invitation email:', invitation.email);
          setInvitationEmail(invitation.email);
        }
      } catch (err) {
        console.error('[AcceptInvitation] Error fetching invitation:', err);
      }
    };

    fetchInvitationEmail();

    // Cleanup function to remove token on unmount if not processed
    return () => {
      // Only clean up if we haven't successfully processed
      if (!success) {
        console.log('[AcceptInvitation] Cleaning up token on unmount');
        sessionStorage.removeItem(INVITATION_TOKEN_KEY);
      }
    };
  }, [token, success, getInvitationByToken]);

  // Process invitation after user authenticates
  useEffect(() => {
    const processInvitation = async () => {
      const storedToken = sessionStorage.getItem(INVITATION_TOKEN_KEY);

      if (!user || !storedToken || processing || success || error) {
        return;
      }

      console.log('[AcceptInvitation] User authenticated, processing invitation');
      setProcessing(true);

      try {
        const result = await acceptInvitation(storedToken);

        if (result.success) {
          // Clear the stored token
          sessionStorage.removeItem(INVITATION_TOKEN_KEY);

          // Get family name from the result if available
          if (result.familyGroupId) {
            const { familyGroups } = useFamilyGroupStore.getState();
            const family = familyGroups.find(f => f.id === result.familyGroupId);
            if (family) {
              setFamilyName(family.name);
            }
          }

          setSuccess(true);
          toast.success('¡Te has unido al grupo familiar!');

          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        } else {
          // Clear the stored token on error
          sessionStorage.removeItem(INVITATION_TOKEN_KEY);

          let errorMessage = result.error || 'Error al aceptar la invitación';

          // Provide more specific error messages
          if (errorMessage.includes('not found')) {
            errorMessage = 'Invitación no encontrada';
          } else if (errorMessage.includes('expired')) {
            errorMessage = 'Esta invitación ha expirado';
          } else if (errorMessage.includes('no longer valid')) {
            errorMessage = 'Esta invitación ya ha sido usada o cancelada';
          }

          setError(errorMessage);
          toast.error(errorMessage);
        }
      } catch (err: any) {
        console.error('[AcceptInvitation] Error processing invitation:', err);
        sessionStorage.removeItem(INVITATION_TOKEN_KEY);
        setError('Error al procesar la invitación');
        toast.error('Error al procesar la invitación');
      } finally {
        setProcessing(false);
      }
    };

    processInvitation();
  }, [user, acceptInvitation, navigate, processing, success, error]);

  // Show error state if no token
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5EFE0] via-white to-[#F5EFE0] flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <BookHeart className="h-12 w-12 text-[#C57B57]" strokeWidth={2} />
              <span className="text-4xl font-bold text-[#424B54] tracking-tight">Ethernal</span>
            </div>
            <p className="text-gray-600">Preservando las historias de tu familia</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12">
            <div className="text-center">
              <div className="mb-6">
                <XCircle className="h-20 w-20 text-red-500 mx-auto" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Enlace No Válido
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                El enlace de invitación no es válido. Por favor, solicita un nuevo enlace.
              </p>
              <Button
                onClick={() => navigate('/')}
                className="bg-[#C57B57] hover:bg-[#B86A4A]"
              >
                Volver al Inicio
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5EFE0] via-white to-[#F5EFE0] flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <BookHeart className="h-12 w-12 text-[#C57B57]" strokeWidth={2} />
              <span className="text-4xl font-bold text-[#424B54] tracking-tight">Ethernal</span>
            </div>
            <p className="text-gray-600">Preservando las historias de tu familia</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12">
            <div className="text-center">
              <div className="mb-6">
                <CheckCircle className="h-20 w-20 text-green-500 mx-auto" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                ¡Bienvenido{familyName ? ` a ${familyName}` : ' al grupo familiar'}!
              </h1>
              <p className="text-lg text-gray-600 mb-6">
                Te estamos redirigiendo al dashboard...
              </p>
              <LoadingSpinner size="md" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5EFE0] via-white to-[#F5EFE0] flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <BookHeart className="h-12 w-12 text-[#C57B57]" strokeWidth={2} />
              <span className="text-4xl font-bold text-[#424B54] tracking-tight">Ethernal</span>
            </div>
            <p className="text-gray-600">Preservando las historias de tu familia</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12">
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
                onClick={() => navigate('/dashboard')}
                className="bg-[#C57B57] hover:bg-[#B86A4A]"
              >
                Ir al Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show processing state (after user authenticated)
  if (user && processing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5EFE0] via-white to-[#F5EFE0] flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <BookHeart className="h-12 w-12 text-[#C57B57]" strokeWidth={2} />
              <span className="text-4xl font-bold text-[#424B54] tracking-tight">Ethernal</span>
            </div>
            <p className="text-gray-600">Preservando las historias de tu familia</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12">
            <div className="text-center">
              <div className="mb-6">
                <Loader2 className="h-20 w-20 text-[#C57B57] mx-auto animate-spin" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Procesando Invitación
              </h1>
              <p className="text-lg text-gray-600">
                Estamos añadiéndote al grupo familiar...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default state: Show loading while modal opens
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5EFE0] via-white to-[#F5EFE0] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <BookHeart className="h-12 w-12 text-[#C57B57]" strokeWidth={2} />
            <span className="text-4xl font-bold text-[#424B54] tracking-tight">Ethernal</span>
          </div>
          <p className="text-gray-600">Preservando las historias de tu familia</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <Loader2 className="h-12 w-12 text-[#C57B57] mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Preparando tu invitación...</p>
        </div>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => {
          // When user closes modal without completing, redirect to home
          navigate('/');
        }}
        mode={authMode}
        onSwitchMode={setAuthMode}
        initialEmail={invitationEmail || undefined}
        isInvitationFlow={true}
      />
    </div>
  );
};

export default AcceptInvitationPage;
