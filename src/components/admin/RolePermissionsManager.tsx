import React, { useState, useEffect } from 'react';
import { Shield, Save, RotateCcw, Check, X } from 'lucide-react';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { supabase } from '../../lib/supabase';
import { FamilyRole, PermissionKey, RolePermission } from '../../types';
import { getPermissionDescription, getRoleDisplayName, clearPermissionsCache } from '../../lib/permissions';
import { toast } from 'sonner';
import { useAuthStore } from '../../store/authStore';

const allPermissions: { category: string; permissions: PermissionKey[] }[] = [
  {
    category: 'Story Management',
    permissions: [
      'story.create',
      'story.edit.own',
      'story.edit.all',
      'story.delete.own',
      'story.delete.all',
      'story.associate',
    ],
  },
  {
    category: 'Content Contributions',
    permissions: [
      'recording.add',
      'recording.edit',
      'recording.delete',
      'image.add',
      'image.delete',
    ],
  },
  {
    category: 'Family Management',
    permissions: [
      'member.invite',
      'member.invite.owner',
      'member.invite.editor',
      'member.invite.viewer',
      'member.remove',
      'member.change_role',
      'family.edit',
      'family.delete',
    ],
  },
  {
    category: 'Viewing & Export',
    permissions: ['content.view', 'content.export'],
  },
];

const roles: FamilyRole[] = ['owner', 'editor', 'viewer'];

const RolePermissionsManager: React.FC = () => {
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<FamilyRole>('owner');
  const [hasChanges, setHasChanges] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('role_permissions').select('*');

      if (error) throw error;

      setPermissions(data || []);
      setHasChanges(false);
    } catch (error) {
      console.error('Error loading permissions:', error);
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const getPermissionValue = (role: FamilyRole, permission: PermissionKey): boolean => {
    const existing = permissions.find(
      (p) => p.role_name === role && p.permission_key === permission
    );

    return existing ? existing.is_enabled : getDefaultPermission(role, permission);
  };

  const getDefaultPermission = (role: FamilyRole, permission: PermissionKey): boolean => {
    const defaults: Record<FamilyRole, Record<string, boolean>> = {
      owner: { default: true },
      editor: {
        'story.edit.all': false,
        'story.delete.all': false,
        'recording.delete': false,
        'image.delete': false,
        'member.invite.owner': false,
        'member.remove': false,
        'member.change_role': false,
        'family.edit': false,
        'family.delete': false,
        default: true,
      },
      viewer: { 'content.view': true, 'content.export': true, default: false },
    };

    return defaults[role][permission] ?? defaults[role].default;
  };

  const togglePermission = async (role: FamilyRole, permission: PermissionKey) => {
    const currentValue = getPermissionValue(role, permission);
    const newValue = !currentValue;

    const existing = permissions.find(
      (p) => p.role_name === role && p.permission_key === permission
    );

    if (existing) {
      setPermissions(
        permissions.map((p) =>
          p.id === existing.id ? { ...p, is_enabled: newValue } : p
        )
      );
    } else {
      const newPermission: RolePermission = {
        id: `temp_${Date.now()}`,
        role_name: role,
        permission_key: permission,
        is_enabled: newValue,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      };
      setPermissions([...permissions, newPermission]);
    }

    setHasChanges(true);
  };

  const saveChanges = async () => {
    setSaving(true);

    try {
      for (const permission of permissions) {
        if (permission.id.startsWith('temp_')) {
          const { error } = await supabase.from('role_permissions').insert({
            role_name: permission.role_name,
            permission_key: permission.permission_key,
            is_enabled: permission.is_enabled,
            updated_by: user?.id,
          });

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('role_permissions')
            .update({
              is_enabled: permission.is_enabled,
              updated_by: user?.id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', permission.id);

          if (error) throw error;
        }
      }

      clearPermissionsCache();
      toast.success('Permissions updated successfully');
      await loadPermissions();
    } catch (error: any) {
      console.error('Error saving permissions:', error);
      toast.error(error.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (!confirm('Reset all permissions to default values? This cannot be undone.')) {
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from('role_permissions').delete().neq('id', '');

      if (error) throw error;

      clearPermissionsCache();
      toast.success('Permissions reset to defaults');
      await loadPermissions();
    } catch (error: any) {
      console.error('Error resetting permissions:', error);
      toast.error(error.message || 'Failed to reset permissions');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner message="Loading permissions..." />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Shield className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Role Permissions</h2>
            <p className="text-sm text-gray-600">
              Customize what each role can do in family groups
            </p>
          </div>
        </div>

        {hasChanges && (
          <div className="flex space-x-2">
            <Button variant="outline" onClick={loadPermissions} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={saveChanges} loading={saving}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        )}
      </div>

      <div className="flex space-x-1 border-b border-gray-200 mb-6">
        {roles.map((role) => (
          <button
            key={role}
            onClick={() => setSelectedRole(role)}
            className={`px-4 py-2 font-medium text-sm transition-colors capitalize ${
              selectedRole === role
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {getRoleDisplayName(role)}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {allPermissions.map((category) => (
          <div key={category.category}>
            <h3 className="font-semibold text-gray-900 mb-3">{category.category}</h3>
            <div className="space-y-2">
              {category.permissions.map((permission) => {
                const isEnabled = getPermissionValue(selectedRole, permission);

                return (
                  <div
                    key={permission}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-900">
                        {getPermissionDescription(permission)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{permission}</p>
                    </div>

                    <button
                      onClick={() => togglePermission(selectedRole, permission)}
                      disabled={saving}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        isEnabled ? 'bg-blue-600' : 'bg-gray-300'
                      } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <Button variant="outline" onClick={resetToDefaults} disabled={saving}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset All to Defaults
        </Button>
      </div>
    </div>
  );
};

export default RolePermissionsManager;
