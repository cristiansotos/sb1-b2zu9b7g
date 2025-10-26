import React from 'react';
import { Search, Download, Eye, UserCheck, UserX, Key, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  stories_count: number;
  recordings_count: number;
  images_count: number;
  completion_ratio: number;
  tokens_used: number;
  book_interest: boolean;
  last_activity: string;
  is_active: boolean;
}

interface UserManagementProps {
  users: AdminUser[];
  filteredUsers: AdminUser[];
  searchTerm: string;
  sortField: keyof AdminUser;
  sortDirection: 'asc' | 'desc';
  onSearchChange: (term: string) => void;
  onSort: (field: keyof AdminUser) => void;
  onExport: () => void;
  onViewStories: (userId: string) => void;
  onToggleStatus: (user: AdminUser) => void;
  onResetPassword: (user: AdminUser) => void;
  onDeleteUser: (user: AdminUser) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({
  users,
  filteredUsers,
  searchTerm,
  sortField,
  sortDirection,
  onSearchChange,
  onSort,
  onExport,
  onViewStories,
  onToggleStatus,
  onResetPassword,
  onDeleteUser
}) => {
  const getSortIcon = (field: keyof AdminUser) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ?
      <ChevronUp className="h-4 w-4" /> :
      <ChevronDown className="h-4 w-4" />;
  };

  const SortableHeader: React.FC<{
    field: keyof AdminUser;
    label: string;
    className?: string;
  }> = ({ field, label, className = '' }) => (
    <th className={`px-6 py-3 text-left ${className}`}>
      <button
        onClick={() => onSort(field)}
        className="flex items-center space-x-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
      >
        <span>{label}</span>
        {getSortIcon(field)}
      </button>
    </th>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar por email..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-600">
            {filteredUsers.length} de {users.length} usuarios
          </div>
          <Button
            onClick={onExport}
            icon={Download}
            variant="outline"
            size="sm"
          >
            Exportar CSV
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortableHeader field="email" label="Email" />
                <SortableHeader field="created_at" label="Fecha Registro" className="hidden md:table-cell" />
                <SortableHeader field="stories_count" label="Historias" className="hidden lg:table-cell" />
                <SortableHeader field="recordings_count" label="Grabaciones" className="hidden lg:table-cell" />
                <SortableHeader field="images_count" label="Imágenes" className="hidden xl:table-cell" />
                <SortableHeader field="completion_ratio" label="Progreso" className="hidden lg:table-cell" />
                <SortableHeader field="last_activity" label="Última Act." className="hidden md:table-cell" />
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <p className="text-gray-500">
                      {searchTerm ? 'No se encontraron usuarios con ese criterio' : 'No hay usuarios registrados'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      !user.is_active ? 'opacity-50 bg-gray-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.email}
                          </div>
                          {!user.is_active && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 mt-1">
                              Inactivo
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                      {new Date(user.created_at).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center hidden lg:table-cell">
                      {user.stories_count}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center hidden lg:table-cell">
                      {user.recordings_count}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center hidden xl:table-cell">
                      {user.images_count}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${user.completion_ratio}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 min-w-[3rem] text-right">
                          {user.completion_ratio}%
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                      {new Date(user.last_activity).toLocaleDateString('es-ES', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-1">
                        <Button
                          onClick={() => onViewStories(user.id)}
                          icon={Eye}
                          variant="ghost"
                          size="sm"
                          title="Ver historias"
                        />

                        <Button
                          onClick={() => onToggleStatus(user)}
                          icon={user.is_active ? UserX : UserCheck}
                          variant="ghost"
                          size="sm"
                          title={user.is_active ? 'Desactivar usuario' : 'Activar usuario'}
                        />

                        <Button
                          onClick={() => onResetPassword(user)}
                          icon={Key}
                          variant="ghost"
                          size="sm"
                          title="Resetear contraseña"
                        />

                        <Button
                          onClick={() => onDeleteUser(user)}
                          icon={Trash2}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Eliminar usuario"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filteredUsers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> Los usuarios inactivos no pueden iniciar sesión pero sus datos permanecen en el sistema.
            Para eliminar permanentemente un usuario y todos sus datos, usa el botón de eliminar.
          </p>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
