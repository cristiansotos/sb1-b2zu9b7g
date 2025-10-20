import { supabase } from './supabase';
import { FamilyRole, PermissionKey, RolePermission } from '../types';

const defaultPermissions: Record<FamilyRole, Record<PermissionKey, boolean>> = {
  owner: {
    'story.create': true,
    'story.edit.own': true,
    'story.edit.all': true,
    'story.delete.own': true,
    'story.delete.all': true,
    'story.associate': true,
    'recording.add': true,
    'recording.edit': true,
    'recording.delete': true,
    'image.add': true,
    'image.delete': true,
    'member.invite': true,
    'member.invite.owner': true,
    'member.invite.editor': true,
    'member.invite.viewer': true,
    'member.remove': true,
    'member.change_role': true,
    'family.edit': true,
    'family.delete': true,
    'content.view': true,
    'content.export': true,
  },
  editor: {
    'story.create': true,
    'story.edit.own': true,
    'story.edit.all': false,
    'story.delete.own': true,
    'story.delete.all': false,
    'story.associate': true,
    'recording.add': true,
    'recording.edit': true,
    'recording.delete': false,
    'image.add': true,
    'image.delete': false,
    'member.invite': true,
    'member.invite.owner': false,
    'member.invite.editor': true,
    'member.invite.viewer': true,
    'member.remove': false,
    'member.change_role': false,
    'family.edit': false,
    'family.delete': false,
    'content.view': true,
    'content.export': true,
  },
  viewer: {
    'story.create': false,
    'story.edit.own': false,
    'story.edit.all': false,
    'story.delete.own': false,
    'story.delete.all': false,
    'story.associate': false,
    'recording.add': false,
    'recording.edit': false,
    'recording.delete': false,
    'image.add': false,
    'image.delete': false,
    'member.invite': false,
    'member.invite.owner': false,
    'member.invite.editor': false,
    'member.invite.viewer': false,
    'member.remove': false,
    'member.change_role': false,
    'family.edit': false,
    'family.delete': false,
    'content.view': true,
    'content.export': true,
  },
};

let permissionsCache: RolePermission[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function loadPermissions(): Promise<RolePermission[]> {
  const now = Date.now();

  if (permissionsCache && now - cacheTimestamp < CACHE_DURATION) {
    return permissionsCache;
  }

  const { data, error } = await supabase
    .from('role_permissions')
    .select('*');

  if (error) {
    console.error('Error loading permissions:', error);
    return [];
  }

  permissionsCache = data || [];
  cacheTimestamp = now;

  return permissionsCache;
}

export function clearPermissionsCache(): void {
  permissionsCache = null;
  cacheTimestamp = 0;
}

export async function checkPermission(
  role: FamilyRole,
  permission: PermissionKey
): Promise<boolean> {
  const permissions = await loadPermissions();

  const customPermission = permissions.find(
    p => p.role_name === role && p.permission_key === permission
  );

  if (customPermission) {
    return customPermission.is_enabled;
  }

  return defaultPermissions[role][permission] ?? false;
}

export async function getUserRoleInFamily(
  familyGroupId: string,
  userId: string
): Promise<FamilyRole | null> {
  const { data, error } = await supabase
    .from('family_members')
    .select('role')
    .eq('family_group_id', familyGroupId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.role as FamilyRole;
}

export async function hasPermissionInFamily(
  familyGroupId: string,
  userId: string,
  permission: PermissionKey
): Promise<boolean> {
  const role = await getUserRoleInFamily(familyGroupId, userId);

  if (!role) {
    return false;
  }

  return checkPermission(role, permission);
}

export async function canInviteRole(
  userRole: FamilyRole,
  targetRole: FamilyRole
): Promise<boolean> {
  if (targetRole === 'owner') {
    return checkPermission(userRole, 'member.invite.owner');
  }

  if (targetRole === 'editor') {
    return checkPermission(userRole, 'member.invite.editor');
  }

  return checkPermission(userRole, 'member.invite.viewer');
}

export async function getAvailableRolesToInvite(
  userRole: FamilyRole
): Promise<FamilyRole[]> {
  const roles: FamilyRole[] = [];

  if (await checkPermission(userRole, 'member.invite.owner')) {
    roles.push('owner');
  }

  if (await checkPermission(userRole, 'member.invite.editor')) {
    roles.push('editor');
  }

  if (await checkPermission(userRole, 'member.invite.viewer')) {
    roles.push('viewer');
  }

  return roles;
}

export function getPermissionDescription(permission: PermissionKey): string {
  const descriptions: Record<PermissionKey, string> = {
    'story.create': 'Crear nuevas historias',
    'story.edit.own': 'Editar historias propias',
    'story.edit.all': 'Editar todas las historias',
    'story.delete.own': 'Eliminar historias propias',
    'story.delete.all': 'Eliminar todas las historias',
    'story.associate': 'Añadir historias a múltiples familias',
    'recording.add': 'Añadir grabaciones a cualquier historia',
    'recording.edit': 'Editar grabaciones y transcripciones',
    'recording.delete': 'Eliminar grabaciones',
    'image.add': 'Añadir imágenes a cualquier historia',
    'image.delete': 'Eliminar imágenes',
    'member.invite': 'Invitar nuevos miembros',
    'member.invite.owner': 'Invitar miembros como Propietario',
    'member.invite.editor': 'Invitar miembros como Editor',
    'member.invite.viewer': 'Invitar miembros como Observador',
    'member.remove': 'Eliminar miembros de la familia',
    'member.change_role': 'Cambiar roles de miembros',
    'family.edit': 'Editar nombre y configuración del grupo familiar',
    'family.delete': 'Eliminar grupo familiar',
    'content.view': 'Ver todo el contenido',
    'content.export': 'Exportar contenido',
  };

  return descriptions[permission] || permission;
}

export function getRoleDisplayName(role: FamilyRole): string {
  const names: Record<FamilyRole, string> = {
    owner: 'Propietario',
    editor: 'Editor',
    viewer: 'Observador',
  };

  return names[role];
}

export function getRoleColor(role: FamilyRole): string {
  const colors: Record<FamilyRole, string> = {
    owner: 'bg-yellow-100 text-yellow-800',
    editor: 'bg-blue-100 text-blue-800',
    viewer: 'bg-gray-100 text-gray-800',
  };

  return colors[role];
}
