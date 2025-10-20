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
      const result = await requestDeduplicator.staleWhileRevalidate(
        'fetchFamilyGroups',
        async () => {
          const { data: { user } } = await supabase.auth.getUser();

          if (!user) {
            console.log('[FamilyGroupStore] No authenticated user found');
            return [];
          }

      console.log('[FamilyGroupStore] Fetching family groups for user:', user.id);

      // Fetch user's memberships with family group details
      const { data: membershipData, error: membershipError } = await supabase
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
        .eq('user_id', user.id);

      if (membershipError) {
        console.error('[FamilyGroupStore] Error fetching memberships:', membershipError);
        throw membershipError;
      }

      console.log('[FamilyGroupStore] Membership data:', membershipData);

      // Extract unique family group IDs
      const familyGroupIds = (membershipData || [])
        .map((m: any) => m.family_groups?.id)
        .filter(Boolean);

          if (familyGroupIds.length === 0) {
            return [];
          }

      // Fetch ALL members for ALL family groups in a single query
      const { data: allMembers, error: membersError } = await supabase
        .from('family_members')
        .select(`
          id,
          family_group_id,
          user_id,
          role,
          invited_by,
          joined_at
        `)
        .in('family_group_id', familyGroupIds);

      if (membersError) {
        console.error('[FamilyGroupStore] Error fetching all members:', membersError);
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
          return familyGroupsWithMembers;
        },
        30000
      );

      set({ familyGroups: result, loading: false });

      if (result.length > 0 && !get().activeFamilyId) {
        const storedFamilyId = localStorage.getItem('activeFamilyId');
        const familyExists = result.some(f => f.id === storedFamilyId);

        console.log('[FamilyGroupStore] Setting active family. Stored:', storedFamilyId, 'Exists:', familyExists);

        if (storedFamilyId && familyExists) {
          set({ activeFamilyId: storedFamilyId });
          console.log('[FamilyGroupStore] Set active family to stored:', storedFamilyId);
        } else {
          set({ activeFamilyId: result[0].id });
          console.log('[FamilyGroupStore] Set active family to first:', result[0].id);
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
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_group_id', familyGroupId);

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      console.error('Error fetching family members:', error);
      return [];
    }
  },

  inviteMember: async (familyGroupId: string, email: string, role: FamilyRole) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data: existingMember } = await supabase
        .from('family_members')
        .select('id, user_id')
        .eq('family_group_id', familyGroupId)
        .eq('user_id', (await supabase.from('auth.users').select('id').eq('email', email).maybeSingle())?.data?.id || '')
        .maybeSingle();

      if (existingMember) {
        return { success: false, error: 'User is already a member of this family' };
      }

      const { data: invitation, error } = await supabase
        .from('family_invitations')
        .insert([{
          family_group_id: familyGroupId,
          email: email.trim(),
          role,
          invited_by: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      return { success: true, invitationId: invitation.id };
    } catch (error: any) {
      console.error('Error inviting member:', error);
      return { success: false, error: error.message || 'Failed to send invitation' };
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
      const { data, error } = await supabase
        .from('family_invitations')
        .select('*')
        .eq('family_group_id', familyGroupId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      console.error('Error fetching invitations:', error);
      return [];
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

      await get().fetchFamilyGroups();

      return { success: true, familyGroupId: invitation.family_group_id };
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      return { success: false, error: error.message || 'Failed to accept invitation' };
    }
  },

  getInvitationByToken: async (token: string) => {
    try {
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

      if (error || !data) {
        return null;
      }

      return {
        ...data,
        family: data.family_groups as any,
      } as FamilyInvitation;
    } catch (error) {
      console.error('Error fetching invitation:', error);
      return null;
    }
  },
}));
