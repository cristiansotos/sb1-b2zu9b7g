import React, { useState, useEffect } from 'react';
import { X, Users, Trash2, Edit3, Mail, Clock, CheckCircle, XCircle, LogOut, AlertCircle, RefreshCw, Send } from 'lucide-react';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import Input from '../ui/Input';
import { useFamilyGroupStore } from '../../store/familyGroupStore';
import { FamilyMember, FamilyInvitation, FamilyRole } from '../../types';
import { toast } from 'sonner';
import { getRoleDisplayName, getRoleColor } from '../../lib/permissions';
import { useAuthStore } from '../../store/authStore';
import InviteMemberModal from './InviteMemberModal';
import { getUserFriendlyError, isTimeoutError } from '../../lib/queryUtils';

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
  const [loadError, setLoadError] = useState<string | null>(null);
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
    setLoadError(null);

    try {
      const [membersData, invitationsData] = await Promise.allSettled([
        fetchFamilyMembers(familyGroupId),
        fetchPendingInvitations(familyGroupId),
      ]);

      if (membersData.status === 'fulfilled') {
        setMembers(membersData.value);
      } else {
        console.error('[FamilyManagementModal] Failed to load members:', membersData.reason);
        setLoadError(getUserFriendlyError(membersData.reason));
        setMembers([]);
      }

      if (invitationsData.status === 'fulfilled') {
        setInvitations(invitationsData.value);
      } else {
        console.error('[FamilyManagementModal] Failed to load invitations:', invitationsData.reason);
        setInvitations([]);
      }
    } catch (error: any) {
      console.error('[FamilyManagementModal] Error loading data:', error);
      setLoadError(getUserFriendlyError(error));
    } finally {
      setLoading(false);
    }
  };

  const getMemberDisplayName = (member: FamilyMember) => {
    if (member.user_id === user?.id) {
      return 'Tú';
    }

    if (member.first_name && member.last_name) {
      const names = [
        member.first_name,
        member.last_name,
        member.second_last_name
      ].filter(Boolean).join(' ');
      return names;
    }

    if (member.full_name) {
      return member.full_name;
    }

    return member.email || member.user_id;
  };

  const getMemberSubtitle = (member: FamilyMember) => {
    if (member.user_id === user?.id) {
      return member.email;
    }

    if (member.first_name && member.email) {
      return member.email;
    }

    return `Se unió el ${new Date(member.joined_at).toLocaleDateString('es-ES')}`;
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar a ${memberName} de esta familia?`)) {
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

  const handleResendInvitation = async (invitationId: string) => {
    try {
      console.log('[FamilyManagement] Resending invitation:', invitationId);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-family-invitation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ invitationId }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to resend invitation');
      }

      toast.success('Invitación reenviada correctamente');
    } catch (error: any) {
      console.error('[FamilyManagement] Error resending invitation:', error);
      toast.error('Error al reenviar invitación');
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

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto animate-fade-in">
        <div
          className="flex min-h-screen items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={handleBackdropClick}
        >
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity backdrop-blur-sm"
            aria-hidden="true"
          />

          <div className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] sm:max-h-[90vh] overflow-hidden transform transition-all animate-slide-up">
            {!family ? (
              <div className="flex items-center justify-center p-12">
                <LoadingSpinner message="Cargando familia..." />
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="bg-blue-100 rounded-full p-2">
                        <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {editingName && isOwner ? (
                          <div className="flex items-center space-x-2">
                            <Input
                              type="text"
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              className="text-lg sm:text-xl font-bold"
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
                            <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{family.name}</h2>
                            {isOwner && (
                              <button
                                onClick={() => setEditingName(true)}
                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                                aria-label="Edit family name"
                              >
                                <Edit3 className="h-4 w-4 text-gray-600" />
                              </button>
                            )}
                          </div>
                        )}
                        <p className="text-xs sm:text-sm text-gray-500">{members.length} miembros</p>
                      </div>
                    </div>
                    <button
                      onClick={onClose}
                      className="flex-shrink-0 ml-2 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                      aria-label="Close modal"
                    >
                      <X className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                  </div>
                </div>

                <div className="flex border-b border-gray-200 px-4 sm:px-6">
                  <button
                    onClick={() => setActiveTab('members')}
                    className={`flex-1 sm:flex-initial px-4 sm:px-6 py-3 sm:py-3.5 font-medium text-xs sm:text-sm transition-all ${
                      activeTab === 'members'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900 hover:border-b-2 hover:border-gray-300'
                    }`}
                  >
                    Miembros ({members.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('invitations')}
                    className={`flex-1 sm:flex-initial px-4 sm:px-6 py-3 sm:py-3.5 font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                      activeTab === 'invitations'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900 hover:border-b-2 hover:border-gray-300'
                    }`}
                  >
                    <span className="hidden sm:inline">Invitaciones Pendientes</span>
                    <span className="sm:hidden">Invitaciones</span>
                    {' '}({invitations.length})
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <LoadingSpinner message="Cargando datos..." />
                    </div>
                  ) : loadError ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
                        <div className="flex items-start space-x-3 mb-4">
                          <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                          <div className="flex-1">
                            <h3 className="font-semibold text-red-900 mb-2">Error al cargar datos</h3>
                            <p className="text-sm text-red-800">{loadError}</p>
                          </div>
                        </div>
                        <Button
                          onClick={loadData}
                          icon={RefreshCw}
                          className="w-full bg-red-600 hover:bg-red-700 text-white"
                        >
                          Reintentar
                        </Button>
                      </div>
                    </div>
                  ) : activeTab === 'members' ? (
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
                        <div key={member.id} className="flex items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <p className="font-semibold text-sm sm:text-base text-gray-900 truncate">
                                {getMemberDisplayName(member)}
                              </p>
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRoleColor(member.role)}`}>
                                {getRoleDisplayName(member.role)}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-500 truncate">
                              {getMemberSubtitle(member)}
                            </p>
                          </div>

                          {isOwner && member.user_id !== user?.id && (
                            <div className="flex items-center space-x-2 ml-2">
                              <select
                                value={member.role}
                                onChange={(e) => handleUpdateRole(member.id, e.target.value as FamilyRole)}
                                className="text-xs sm:text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="owner">Propietario</option>
                                <option value="editor">Editor</option>
                                <option value="viewer">Observador</option>
                              </select>
                              <button
                                onClick={() => handleRemoveMember(member.id, getMemberDisplayName(member))}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                aria-label="Remove member"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (

                    <div className="space-y-3">
                      {invitations.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <Mail className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm sm:text-base">No hay invitaciones pendientes</p>
                        </div>
                      ) : (
                        invitations.map(invitation => (
                          <div key={invitation.id} className="flex items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm sm:text-base text-gray-900 truncate">{invitation.email}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRoleColor(invitation.role)}`}>
                                  {getRoleDisplayName(invitation.role)}
                                </span>
                                <span className="text-xs text-gray-500">
                                  Expira el {new Date(invitation.expires_at).toLocaleDateString('es-ES')}
                                </span>
                              </div>
                            </div>
                            {canManage && (
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleResendInvitation(invitation.id)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                  aria-label="Resend invitation"
                                  title="Reenviar invitación"
                                >
                                  <Send className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleCancelInvitation(invitation.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  aria-label="Cancel invitation"
                                  title="Cancelar invitación"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 sm:px-6 py-4 space-y-3">
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
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="font-semibold text-sm sm:text-base text-red-900 mb-3">¿Salir del Grupo Familiar?</p>
                      {isLastOwner && (
                        <div className="mb-4">
                          <label className="block text-xs sm:text-sm font-medium text-red-900 mb-2">
                            Eres el último propietario. Selecciona un nuevo propietario:
                          </label>
                          <select
                            value={selectedSuccessor}
                            onChange={(e) => setSelectedSuccessor(e.target.value)}
                            className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          >
                            <option value="">Selecciona un miembro...</option>
                            {editorsForSuccession.map(member => (
                              <option key={member.id} value={member.id}>
                                {getMemberDisplayName(member)}
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
            )}
          </div>
        </div>
      </div>

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
