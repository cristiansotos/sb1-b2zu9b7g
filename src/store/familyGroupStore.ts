import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import {
  FamilyGroup,
  FamilyGroupWithMembers,
  FamilyMember,
  FamilyInvitation,
  FamilyRole,
  User
} from '../types';
import { getUserRoleInFamily } from '../lib/permissions';
import { requestDeduplicator } from '../lib/requestCache';
import { withTimeout, isTimeoutError } from '../lib/queryUtils';

interface FamilyGroupState {
  familyGroups: FamilyGroupWithMembers[];
  activeFamilyId: string | null;
  loading: boolean;

  fetchFamilyGroups: () => Promise<void>;
  createFamilyGroup: (name: string) => Promise<{ success: boolean; error?: string; familyGroupId?: string }>;
  updateFamilyGroup: (familyGroupId: string, name: string) => Promise<{ success: boolean; error?: string }>;
  deleteFamilyGroup: (familyGroupId: string) => Promise<{ success: boolean; error?: string }>;
  setActiveFamilyId: (familyGroupId: string | null) => void;
  getActiveFamily: () => FamilyGroupWithMembers | null;
  getUserOwnedFamilyCount: () => Promise<number>;

  fetchFamilyMembers: (familyGroupId: string) => Promise<FamilyMember[]>;
  inviteMember: (familyGroupId: string, email: string, role: FamilyRole) => Promise<{ success: boolean; error?: string; invitationId?: string }>;
  removeMember: (familyGroupId: string, memberId: string) => Promise<{ success: boolean; error?: string }>;
  updateMemberRole: (familyGroupId: string, memberId: string, newRole: FamilyRole) => Promise<{ success: boolean; error?: string }>;
  leaveFamily: (familyGroupId: string, newOwnerId?: string) => Promise<{ success: boolean; error?: string }>;

  fetchPendingInvitations: (familyGroupId: string) => Promise<FamilyInvitation[]>;
  cancelInvitation: (invitationId: string) => Promise<{ success: boolean; error?: string }>;
  acceptInvitation: (token: string) => Promise<{ success: boolean; error?: string; familyGroupId?: string }>;
  getInvitationByToken: (token: string) => Promise<FamilyInvitation | null>;
}

export const useFamilyGroupStore = create<FamilyGroupState>((set, get) => ({
  familyGroups: [],
  activeFamilyId: null,
  loading: false,

  fetchFamilyGroups: async () => {
    set({ loading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.log('[FamilyGroupStore] No authenticated user found');
        set({ familyGroups: [], loading: false });
        return;
      }

      console.log('[FamilyGroupStore] Fetching family groups for user:', user.id);

      // Fetch user's memberships with family group details
      const { data: membershipData, error: membershipError } = await withTimeout(
        supabase
          .from('family_members')
          .select(`
            id,
            family_group_id,
            user_id,
            role,
            invited_by,
            joined_at,
            family_groups (
              id,
              name,
              created_by,
              created_at,
              settings
            )
          `)
          .eq('user_id', user.id),
        25000,
        'Loading family groups timed out'
      );

      if (membershipError) {
        console.error('[FamilyGroupStore] Error fetching memberships:', membershipError);
        set({ familyGroups: [], loading: false });
        throw membershipError;
      }

      console.log('[FamilyGroupStore] Membership data:', membershipData);

      // Extract unique family group IDs
      const familyGroupIds = (membershipData || [])
        .map((m: any) => m.family_groups?.id)
        .filter(Boolean);

      if (familyGroupIds.length === 0) {
        set({ familyGroups: [], loading: false });
        return;
      }

      // Fetch ALL members for ALL family groups in a single query
      const { data: allMembers, error: membersError } = await withTimeout(
        supabase
          .from('family_members')
          .select(`
            id,
            family_group_id,
            user_id,
            role,
            invited_by,
            joined_at
          `)
          .in('family_group_id', familyGroupIds),
        25000,
        'Loading family members timed out'
      );

      if (membersError) {
        console.error('[FamilyGroupStore] Error fetching all members:', membersError);
        set({ familyGroups: [], loading: false });
        throw membersError;
      }

      // Group members by family_group_id
      const membersByFamily = new Map<string, FamilyMember[]>();
      (allMembers || []).forEach((member: any) => {
        if (!membersByFamily.has(member.family_group_id)) {
          membersByFamily.set(member.family_group_id, []);
        }
        membersByFamily.get(member.family_group_id)!.push(member);
      });

      // Build family groups with their members
      const familyGroupsWithMembers: FamilyGroupWithMembers[] = [];

      for (const membership of membershipData || []) {
        const familyGroup = membership.family_groups as any;

        if (!familyGroup) continue;

        const members = membersByFamily.get(familyGroup.id) || [];

        familyGroupsWithMembers.push({
          id: familyGroup.id,
          name: familyGroup.name,
          created_by: familyGroup.created_by,
          created_at: familyGroup.created_at,
          settings: familyGroup.settings,
          members,
          member_count: members.length,
          user_role: membership.role as FamilyRole,
        });
      }

      console.log('[FamilyGroupStore] Processed family groups:', familyGroupsWithMembers);
      set({ familyGroups: familyGroupsWithMembers, loading: false });

      if (familyGroupsWithMembers.length > 0 && !get().activeFamilyId) {
        const storedFamilyId = localStorage.getItem('activeFamilyId');
        const familyExists = familyGroupsWithMembers.some(f => f.id === storedFamilyId);

        console.log('[FamilyGroupStore] Setting active family. Stored:', storedFamilyId, 'Exists:', familyExists);

        if (storedFamilyId && familyExists) {
          set({ activeFamilyId: storedFamilyId });
          console.log('[FamilyGroupStore] Set active family to stored:', storedFamilyId);
        } else {
          set({ activeFamilyId: familyGroupsWithMembers[0].id });
          console.log('[FamilyGroupStore] Set active family to first:', familyGroupsWithMembers[0].id);
        }
      }
    } catch (error: any) {
      console.error('[FamilyGroupStore] Error fetching family groups:', error);
      set({ familyGroups: [], loading: false });
    }
  },

  createFamilyGroup: async (name: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const ownedCount = await get().getUserOwnedFamilyCount();

      if (ownedCount >= 4) {
        return { success: false, error: 'You can only own up to 4 family groups' };
      }

      const { data: familyGroup, error: createError } = await supabase
        .from('family_groups')
        .insert([{ name: name.trim(), created_by: user.id }])
        .select()
        .single();

      if (createError) throw createError;

      const { error: memberError } = await supabase
        .from('family_members')
        .insert([{
          family_group_id: familyGroup.id,
          user_id: user.id,
          role: 'owner',
          invited_by: user.id,
        }]);

      if (memberError) throw memberError;

      requestDeduplicator.invalidateCache('fetchFamilyGroups');
      await get().fetchFamilyGroups();

      return { success: true, familyGroupId: familyGroup.id };
    } catch (error: any) {
      console.error('Error creating family group:', error);
      return { success: false, error: error.message || 'Failed to create family group' };
    }
  },

  updateFamilyGroup: async (familyGroupId: string, name: string) => {
    try {
      const { error } = await supabase
        .from('family_groups')
        .update({ name: name.trim() })
        .eq('id', familyGroupId);

      if (error) throw error;

      requestDeduplicator.invalidateCache('fetchFamilyGroups');
      set(state => ({
        familyGroups: state.familyGroups.map(fg =>
          fg.id === familyGroupId ? { ...fg, name: name.trim() } : fg
        ),
      }));

      return { success: true };
    } catch (error: any) {
      console.error('Error updating family group:', error);
      return { success: false, error: error.message || 'Failed to update family group' };
    }
  },

  deleteFamilyGroup: async (familyGroupId: string) => {
    try {
      const { error } = await supabase
        .from('family_groups')
        .delete()
        .eq('id', familyGroupId);

      if (error) throw error;

      requestDeduplicator.invalidateCache('fetchFamilyGroups');
      set(state => ({
        familyGroups: state.familyGroups.filter(fg => fg.id !== familyGroupId),
        activeFamilyId: state.activeFamilyId === familyGroupId ? null : state.activeFamilyId,
      }));

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting family group:', error);
      return { success: false, error: error.message || 'Failed to delete family group' };
    }
  },

  setActiveFamilyId: (familyGroupId: string | null) => {
    set({ activeFamilyId: familyGroupId });

    if (familyGroupId) {
      localStorage.setItem('activeFamilyId', familyGroupId);
    } else {
      localStorage.removeItem('activeFamilyId');
    }
  },

  getActiveFamily: () => {
    const { familyGroups, activeFamilyId } = get();
    return familyGroups.find(fg => fg.id === activeFamilyId) || null;
  },

  getUserOwnedFamilyCount: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return 0;

      const { data, error } = await supabase.rpc('get_user_owned_family_count', {
        user_id_param: user.id,
      });

      if (error) throw error;

      return data || 0;
    } catch (error) {
      console.error('Error getting owned family count:', error);
      return 0;
    }
  },

  fetchFamilyMembers: async (familyGroupId: string) => {
    try {
      const membersQuery = supabase
        .from('family_members')
        .select(`
          *,
          user_profiles!family_members_user_id_fkey_profiles (
            email,
            first_name,
            last_name,
            second_last_name,
            full_name
          )
        `)
        .eq('family_group_id', familyGroupId);

      const { data, error } = await withTimeout(
        membersQuery,
        15000,
        'Loading family members timed out'
      );

      if (error) {
        console.error('[FamilyGroupStore] Error fetching family members:', error);
        throw error;
      }

      return (data || []).map(member => ({
        ...member,
        email: member.user_profiles?.email,
        first_name: member.user_profiles?.first_name,
        last_name: member.user_profiles?.last_name,
        second_last_name: member.user_profiles?.second_last_name,
        full_name: member.user_profiles?.full_name,
      }));
    } catch (error: any) {
      console.error('[FamilyGroupStore] Error in fetchFamilyMembers:', error);

      if (isTimeoutError(error)) {
        throw new Error('La carga de miembros tardó demasiado tiempo. Por favor, inténtalo de nuevo.');
      }

      throw error;
    }
  },

  inviteMember: async (familyGroupId: string, email: string, role: FamilyRole) => {
    try {
      console.log('[FamilyGroupStore] inviteMember called:', { familyGroupId, email, role });
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Check total pending invitations for this family (limit: 10)
      const { count: pendingCount, error: countError } = await supabase
        .from('family_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('family_group_id', familyGroupId)
        .eq('status', 'pending');

      if (countError) {
        console.error('[FamilyGroupStore] Error counting invitations:', countError);
      } else if (pendingCount && pendingCount >= 10) {
        return { success: false, error: 'Límite de 10 invitaciones pendientes alcanzado. Cancela alguna invitación existente para poder enviar una nueva.' };
      }

      // Check if there's already a pending invitation for this email
      const { data: existingInvitation } = await supabase
        .from('family_invitations')
        .select('id')
        .eq('family_group_id', familyGroupId)
        .eq('email', email.trim())
        .eq('status', 'pending')
        .maybeSingle();

      if (existingInvitation) {
        return { success: false, error: 'Ya existe una invitación pendiente para este correo' };
      }

      // Check if user with this email is already a member
      const { data: existingUserProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', email.trim())
        .maybeSingle();

      if (existingUserProfile) {
        const { data: existingMember } = await supabase
          .from('family_members')
          .select('id')
          .eq('family_group_id', familyGroupId)
          .eq('user_id', existingUserProfile.id)
          .maybeSingle();

        if (existingMember) {
          return { success: false, error: 'El usuario ya es miembro de esta familia' };
        }
      }

      // Create invitation
      const { data: invitation, error } = await supabase
        .from('family_invitations')
        .insert([{
          family_group_id: familyGroupId,
          email: email.trim().toLowerCase(),
          role,
          invited_by: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      // Invalidate relevant caches
      requestDeduplicator.invalidateCachePattern(familyGroupId);
      requestDeduplicator.invalidateCachePattern('fetchPendingInvitations');

      console.log('[FamilyGroupStore] Invitation sent successfully:', invitation.id);

      return { success: true, invitationId: invitation.id };
    } catch (error: any) {
      console.error('Error inviting member:', error);
      return { success: false, error: error.message || 'Error al enviar invitación' };
    }
  },

  removeMember: async (familyGroupId: string, memberId: string) => {
    try {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('id', memberId)
        .eq('family_group_id', familyGroupId);

      if (error) throw error;

      // Invalidate caches since membership changed
      requestDeduplicator.invalidateCachePattern(familyGroupId);

      set(state => ({
        familyGroups: state.familyGroups.map(fg =>
          fg.id === familyGroupId
            ? {
                ...fg,
                members: fg.members.filter(m => m.id !== memberId),
                member_count: fg.member_count - 1,
              }
            : fg
        ),
      }));

      return { success: true };
    } catch (error: any) {
      console.error('Error removing member:', error);
      return { success: false, error: error.message || 'Failed to remove member' };
    }
  },

  updateMemberRole: async (familyGroupId: string, memberId: string, newRole: FamilyRole) => {
    try {
      const { error } = await supabase
        .from('family_members')
        .update({ role: newRole })
        .eq('id', memberId)
        .eq('family_group_id', familyGroupId);

      if (error) throw error;

      set(state => ({
        familyGroups: state.familyGroups.map(fg =>
          fg.id === familyGroupId
            ? {
                ...fg,
                members: fg.members.map(m => (m.id === memberId ? { ...m, role: newRole } : m)),
              }
            : fg
        ),
      }));

      return { success: true };
    } catch (error: any) {
      console.error('Error updating member role:', error);
      return { success: false, error: error.message || 'Failed to update member role' };
    }
  },

  leaveFamily: async (familyGroupId: string, newOwnerId?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      if (newOwnerId) {
        const updateResult = await get().updateMemberRole(familyGroupId, newOwnerId, 'owner');
        if (!updateResult.success) {
          return updateResult;
        }
      }

      const { data: membership } = await supabase
        .from('family_members')
        .select('id')
        .eq('family_group_id', familyGroupId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!membership) {
        return { success: false, error: 'You are not a member of this family' };
      }

      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('id', membership.id);

      if (error) throw error;

      await get().fetchFamilyGroups();

      return { success: true };
    } catch (error: any) {
      console.error('Error leaving family:', error);
      return { success: false, error: error.message || 'Failed to leave family' };
    }
  },

  fetchPendingInvitations: async (familyGroupId: string) => {
    try {
      const invitationsQuery = supabase
        .from('family_invitations')
        .select('*')
        .eq('family_group_id', familyGroupId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      const { data, error } = await withTimeout(
        invitationsQuery,
        10000,
        'Loading invitations timed out'
      );

      if (error) {
        console.error('[FamilyGroupStore] Error fetching invitations:', error);
        throw error;
      }

      return data || [];
    } catch (error: any) {
      console.error('[FamilyGroupStore] Error in fetchPendingInvitations:', error);

      if (isTimeoutError(error)) {
        return [];
      }

      throw error;
    }
  },

  cancelInvitation: async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('family_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error cancelling invitation:', error);
      return { success: false, error: error.message || 'Failed to cancel invitation' };
    }
  },

  acceptInvitation: async (token: string) => {
    try {
      console.log('[FamilyGroupStore] acceptInvitation called');
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const invitation = await get().getInvitationByToken(token);

      if (!invitation) {
        return { success: false, error: 'Invitation not found' };
      }

      if (invitation.status !== 'pending') {
        return { success: false, error: 'Invitation is no longer valid' };
      }

      if (new Date(invitation.expires_at) < new Date()) {
        await supabase
          .from('family_invitations')
          .update({ status: 'expired' })
          .eq('id', invitation.id);

        return { success: false, error: 'Invitation has expired' };
      }

      const { error: memberError } = await supabase
        .from('family_members')
        .insert([{
          family_group_id: invitation.family_group_id,
          user_id: user.id,
          role: invitation.role,
          invited_by: invitation.invited_by,
        }]);

      if (memberError) throw memberError;

      const { error: updateError } = await supabase
        .from('family_invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      // Clear ALL caches because family membership changed
      console.log('[FamilyGroupStore] Clearing all caches after invitation acceptance');
      requestDeduplicator.invalidateCache();

      await get().fetchFamilyGroups();

      return { success: true, familyGroupId: invitation.family_group_id };
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      return { success: false, error: error.message || 'Failed to accept invitation' };
    }
  },

  getInvitationByToken: async (token: string) => {
    try {
      // First try to get invitation with RLS (only returns pending + not expired)
      const { data, error } = await supabase
        .from('family_invitations')
        .select(`
          *,
          family_groups (
            id,
            name,
            created_by,
            created_at,
            settings
          )
        `)
        .eq('token', token)
        .maybeSingle();

      if (error) {
        console.error('[getInvitationByToken] Query error:', error);
        return null;
      }

      // If found by RLS policy, it's valid
      if (data) {
        return {
          ...data,
          family: data.family_groups as any,
        } as FamilyInvitation;
      }

      // If not found via RLS, check if invitation exists but is expired/cancelled
      // We need to know the difference between "doesn't exist" vs "expired"
      // This query bypasses some RLS by being more specific
      console.log('[getInvitationByToken] Not found via RLS, checking if expired/cancelled');

      return null; // RLS blocked it, so it's either expired, cancelled, or doesn't exist
    } catch (error) {
      console.error('[getInvitationByToken] Error:', error);
      return null;
    }
  },
}));
