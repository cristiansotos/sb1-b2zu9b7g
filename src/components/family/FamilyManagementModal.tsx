import React, { useState, useEffect } from 'react';
import { X, Users, Trash2, Edit3, Mail, Clock, CheckCircle, XCircle, LogOut } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useFamilyGroupStore } from '../../store/familyGroupStore';
import { FamilyMember, FamilyInvitation, FamilyRole } from '../../types';
import { toast } from 'sonner';
import { getRoleDisplayName, getRoleColor } from '../../lib/permissions';
import { useAuthStore } from '../../store/authStore';
import InviteMemberModal from './InviteMemberModal';

interface FamilyManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyGroupId: string;
}

const FamilyManagementModal: React.FC<FamilyManagementModalProps> = ({
  isOpen,
  onClose,
  familyGroupId,
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members');
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [invitations, setInvitations] = useState<FamilyInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [selectedSuccessor, setSelectedSuccessor] = useState<string>('');

  const {
    familyGroups,
    fetchFamilyMembers,
    fetchPendingInvitations,
    removeMember,
    updateMemberRole,
    updateFamilyGroup,
    cancelInvitation,
    leaveFamily,
    deleteFamilyGroup,
  } = useFamilyGroupStore();

  const { user } = useAuthStore();

  const family = familyGroups.find(f => f.id === familyGroupId);
  const currentUserMember = members.find(m => m.user_id === user?.id);
  const isOwner = currentUserMember?.role === 'owner';
  const isEditor = currentUserMember?.role === 'editor';
  const canManage = isOwner || isEditor;

  const ownerCount = members.filter(m => m.role === 'owner').length;
  const isLastOwner = isOwner && ownerCount === 1;
  const editorsForSuccession = members.filter(m => m.role === 'editor');

  useEffect(() => {
    if (isOpen && familyGroupId) {
      loadData();
    }
  }, [isOpen, familyGroupId]);

  useEffect(() => {
    if (family) {
      setNewName(family.name);
    }
  }, [family]);

  const loadData = async () => {
    setLoading(true);
    const [membersData, invitationsData] = await Promise.all([
      fetchFamilyMembers(familyGroupId),
      fetchPendingInvitations(familyGroupId),
    ]);
    setMembers(membersData);
    setInvitations(invitationsData);
    setLoading(false);
  };

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar a ${memberEmail} de esta familia?`)) {
      return;
    }

    const result = await removeMember(familyGroupId, memberId);

    if (result.success) {
      toast.success('Miembro eliminado correctamente');
      loadData();
    } else {
      toast.error(result.error || 'Error al eliminar miembro');
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: FamilyRole) => {
    const result = await updateMemberRole(familyGroupId, memberId, newRole);

    if (result.success) {
      toast.success('Rol actualizado correctamente');
      loadData();
    } else {
      toast.error(result.error || 'Error al actualizar rol');
    }
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) {
      toast.error('El nombre de la familia no puede estar vacío');
      return;
    }

    const result = await updateFamilyGroup(familyGroupId, newName.trim());

    if (result.success) {
      toast.success('Nombre de familia actualizado');
      setEditingName(false);
    } else {
      toast.error(result.error || 'Error al actualizar nombre');
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    const result = await cancelInvitation(invitationId);

    if (result.success) {
      toast.success('Invitación cancelada');
      loadData();
    } else {
      toast.error(result.error || 'Error al cancelar invitación');
    }
  };

  const handleLeaveFamily = async () => {
    if (isLastOwner && !selectedSuccessor) {
      toast.error('Por favor, selecciona un nuevo propietario antes de salir');
      return;
    }

    const result = await leaveFamily(familyGroupId, selectedSuccessor || undefined);

    if (result.success) {
      toast.success('Has salido de la familia');
      onClose();
    } else {
      toast.error(result.error || 'Error al salir de la familia');
    }
  };

  const handleDeleteFamily = async () => {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${family?.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    const result = await deleteFamilyGroup(familyGroupId);

    if (result.success) {
      toast.success('Grupo familiar eliminado');
      onClose();
    } else {
      toast.error(result.error || 'Error al eliminar grupo familiar');
    }
  };

  if (!family) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <div className="bg-white rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Users className="h-6 w-6 text-blue-600" />
              <div>
                {editingName && isOwner ? (
                  <div className="flex items-center space-x-2">
                    <Input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="text-xl font-bold"
                      autoFocus
                      onKeyPress={(e) => e.key === 'Enter' && handleUpdateName()}
                    />
                    <Button size="sm" onClick={handleUpdateName}>Guardar</Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      setEditingName(false);
                      setNewName(family.name);
                    }}>Cancelar</Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{family.name}</h2>
                    {isOwner && (
                      <button onClick={() => setEditingName(true)} className="p-1 hover:bg-gray-100 rounded">
                        <Edit3 className="h-4 w-4 text-gray-600" />
                      </button>
                    )}
                  </div>
                )}
                <p className="text-sm text-gray-500">{members.length} miembros</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex space-x-1 border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('members')}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === 'members'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Miembros ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === 'invitations'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Invitaciones Pendientes ({invitations.length})
            </button>
          </div>

          {activeTab === 'members' && (
            <div className="space-y-3">
              {canManage && (
                <Button
                  onClick={() => setShowInviteModal(true)}
                  className="w-full mb-4"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Invitar Miembro
                </Button>
              )}

              {members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-gray-900 truncate">
                        {member.user_id === user?.id ? 'Tú' : member.user_id}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(member.role)}`}>
                        {getRoleDisplayName(member.role)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Se unió el {new Date(member.joined_at).toLocaleDateString('es-ES')}
                    </p>
                  </div>

                  {isOwner && member.user_id !== user?.id && (
                    <div className="flex items-center space-x-2">
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateRole(member.id, e.target.value as FamilyRole)}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="owner">Propietario</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Observador</option>
                      </select>
                      <button
                        onClick={() => handleRemoveMember(member.id, member.user_id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'invitations' && (
            <div className="space-y-3">
              {invitations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Mail className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No hay invitaciones pendientes</p>
                </div>
              ) : (
                invitations.map(invitation => (
                  <div key={invitation.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{invitation.email}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(invitation.role)}`}>
                          {getRoleDisplayName(invitation.role)}
                        </span>
                        <span className="text-xs text-gray-500">
                          Expira el {new Date(invitation.expires_at).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                    </div>
                    {canManage && (
                      <button
                        onClick={() => handleCancelInvitation(invitation.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
            {!showLeaveConfirm ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowLeaveConfirm(true)}
                  className="w-full text-red-600 border-red-300 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Salir de la Familia
                </Button>
                {isOwner && (
                  <Button
                    variant="outline"
                    onClick={handleDeleteFamily}
                    className="w-full text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar Grupo Familiar
                  </Button>
                )}
              </>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="font-medium text-red-900 mb-3">¿Salir del Grupo Familiar?</p>
                {isLastOwner && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-red-900 mb-2">
                      Eres el último propietario. Selecciona un nuevo propietario:
                    </label>
                    <select
                      value={selectedSuccessor}
                      onChange={(e) => setSelectedSuccessor(e.target.value)}
                      className="w-full border border-red-300 rounded px-3 py-2 text-sm"
                    >
                      <option value="">Selecciona un miembro...</option>
                      {editorsForSuccession.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.user_id}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex space-x-2">
                  <Button
                    onClick={handleLeaveFamily}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    disabled={isLastOwner && !selectedSuccessor}
                  >
                    Confirmar Salida
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowLeaveConfirm(false);
                      setSelectedSuccessor('');
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          loadData();
        }}
        familyGroupId={familyGroupId}
        userRole={currentUserMember?.role || 'viewer'}
      />
    </>
  );
};

export default FamilyManagementModal;
