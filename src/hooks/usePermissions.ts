import { useState, useEffect } from 'react';
import { FamilyRole, PermissionKey } from '../types';
import { checkPermission, getUserRoleInFamily, hasPermissionInFamily } from '../lib/permissions';

export function usePermissions(role: FamilyRole | null) {
  const [permissions, setPermissions] = useState<Record<PermissionKey, boolean>>({} as Record<PermissionKey, boolean>);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPermissions() {
      if (!role) {
        setPermissions({} as Record<PermissionKey, boolean>);
        setLoading(false);
        return;
      }

      setLoading(true);

      const allPermissions: PermissionKey[] = [
        'story.create',
        'story.edit.own',
        'story.edit.all',
        'story.delete.own',
        'story.delete.all',
        'story.associate',
        'recording.add',
        'recording.edit',
        'recording.delete',
        'image.add',
        'image.delete',
        'member.invite',
        'member.invite.owner',
        'member.invite.editor',
        'member.invite.viewer',
        'member.remove',
        'member.change_role',
        'family.edit',
        'family.delete',
        'content.view',
        'content.export',
      ];

      const permissionResults: Record<PermissionKey, boolean> = {} as Record<PermissionKey, boolean>;

      for (const permission of allPermissions) {
        permissionResults[permission] = await checkPermission(role, permission);
      }

      setPermissions(permissionResults);
      setLoading(false);
    }

    loadPermissions();
  }, [role]);

  const can = (permission: PermissionKey): boolean => {
    return permissions[permission] ?? false;
  };

  return {
    permissions,
    loading,
    can,
  };
}

export function useFamilyPermissions(familyGroupId: string | null, userId: string | null) {
  const [role, setRole] = useState<FamilyRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRole() {
      if (!familyGroupId || !userId) {
        setRole(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const userRole = await getUserRoleInFamily(familyGroupId, userId);
      setRole(userRole);
      setLoading(false);
    }

    loadRole();
  }, [familyGroupId, userId]);

  const { permissions, loading: permissionsLoading, can } = usePermissions(role);

  const hasPermission = async (permission: PermissionKey): Promise<boolean> => {
    if (!familyGroupId || !userId) {
      return false;
    }

    return hasPermissionInFamily(familyGroupId, userId, permission);
  };

  return {
    role,
    permissions,
    loading: loading || permissionsLoading,
    can,
    hasPermission,
  };
}
