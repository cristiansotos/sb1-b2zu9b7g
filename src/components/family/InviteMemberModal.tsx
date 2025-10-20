import React, { useState, useEffect } from 'react';
import { X, Mail, UserPlus } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useFamilyGroupStore } from '../../store/familyGroupStore';
import { FamilyRole } from '../../types';
import { toast } from 'sonner';
import { getAvailableRolesToInvite, getRoleDisplayName, getRoleColor } from '../../lib/permissions';
import { useFamilyPermissions } from '../../hooks/usePermissions';
import { useAuthStore } from '../../store/authStore';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyGroupId: string;
  userRole: FamilyRole;
}

const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  familyGroupId,
  userRole,
}) => {
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<FamilyRole>('editor');
  const [loading, setLoading] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<FamilyRole[]>([]);
  const { inviteMember } = useFamilyGroupStore();
  const { user } = useAuthStore();

  useEffect(() => {
    async function loadAvailableRoles() {
      const roles = await getAvailableRolesToInvite(userRole);
      setAvailableRoles(roles);

      if (roles.length > 0 && !roles.includes(selectedRole)) {
        setSelectedRole(roles[0]);
      }
    }

    if (isOpen) {
      loadAvailableRoles();
    }
  }, [userRole, isOpen, selectedRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Por favor, introduce una dirección de correo');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('Por favor, introduce una dirección de correo válida');
      return;
    }

    setLoading(true);

    const result = await inviteMember(familyGroupId, email.trim(), selectedRole);

    if (result.success) {
      toast.success(`Invitación enviada a ${email}`);
      setEmail('');
      setSelectedRole('editor');
      onClose();
    } else {
      toast.error(result.error || 'Error al enviar invitación');
    }

    setLoading(false);
  };

  const handleClose = () => {
    if (!loading) {
      setEmail('');
      setSelectedRole('editor');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserPlus className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Invitar Miembro</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dirección de Correo *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="miembro@ejemplo.com"
                disabled={loading}
                className="pl-10"
                autoFocus
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Rol *
            </label>
            <div className="space-y-2">
              {availableRoles.map((role) => (
                <label
                  key={role}
                  className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedRole === role
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    checked={selectedRole === role}
                    onChange={(e) => setSelectedRole(e.target.value as FamilyRole)}
                    disabled={loading}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">
                        {getRoleDisplayName(role)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(role)}`}>
                        {role}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {role === 'owner' && 'Control total sobre el grupo familiar y todo el contenido'}
                      {role === 'editor' && 'Puede crear historias, añadir grabaciones e invitar miembros'}
                      {role === 'viewer' && 'Puede ver todo el contenido pero no puede hacer cambios'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
            <p className="text-xs text-blue-800">
              <strong>Nota:</strong> La persona invitada recibirá un correo con un enlace para unirse a este grupo familiar.
              La invitación expirará en 7 días.
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
              loading={loading}
              fullWidth
              className="sm:w-auto"
            >
              Enviar Invitación
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default InviteMemberModal;
