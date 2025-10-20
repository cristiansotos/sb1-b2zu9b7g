import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Plus, Users, Crown, Edit2, UserPlus } from 'lucide-react';
import { useFamilyGroupStore } from '../../store/familyGroupStore';
import { getRoleColor, getRoleDisplayName } from '../../lib/permissions';
import Button from '../ui/Button';

interface FamilySelectorProps {
  onManageFamily?: (familyId: string) => void;
  onCreateFamily?: () => void;
}

const FamilySelector: React.FC<FamilySelectorProps> = ({ onManageFamily, onCreateFamily }) => {
  const {
    familyGroups,
    activeFamilyId,
    setActiveFamilyId,
    getActiveFamily,
    loading,
  } = useFamilyGroupStore();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeFamily = getActiveFamily();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectFamily = (familyId: string) => {
    setActiveFamilyId(familyId);
    setIsOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg min-w-[150px] sm:min-w-[200px]">
        <Users className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
        <div className="text-xs sm:text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  if (familyGroups.length === 0) {
    return (
      <div className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-yellow-50 border border-yellow-300 rounded-lg min-w-[150px] sm:min-w-[200px]">
        <Users className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 flex-shrink-0" />
        <div className="flex-1 text-left">
          <div className="text-xs sm:text-sm font-medium text-yellow-800">No Family Groups</div>
          <button
            onClick={() => onCreateFamily?.()}
            className="text-xs text-yellow-600 hover:text-yellow-700 underline"
          >
            Create one now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px] sm:min-w-[200px]"
      >
        <Users className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 flex-shrink-0" />
        <div className="flex-1 text-left min-w-0">
          <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">
            {activeFamily?.name || 'Select Family'}
          </div>
          {activeFamily && (
            <div className="text-xs text-gray-500">
              {activeFamily.member_count} {activeFamily.member_count === 1 ? 'member' : 'members'}
            </div>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform flex-shrink-0 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[400px] overflow-y-auto">
          <div className="py-1">
            {familyGroups.map(family => (
              <div key={family.id}>
                <button
                  onClick={() => handleSelectFamily(family.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                    family.id === activeFamilyId ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm text-gray-900 truncate">
                          {family.name}
                        </span>
                        {family.id === activeFamilyId && (
                          <div className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(
                            family.user_role
                          )}`}
                        >
                          {getRoleDisplayName(family.user_role)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {family.member_count} {family.member_count === 1 ? 'member' : 'members'}
                        </span>
                      </div>
                    </div>
                    {(family.user_role === 'owner' || family.user_role === 'editor') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsOpen(false);
                          onManageFamily?.(family.id);
                        }}
                        className="ml-2 p-1.5 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                      >
                        <Edit2 className="h-4 w-4 text-gray-600" />
                      </button>
                    )}
                  </div>
                </button>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200">
            <button
              onClick={() => {
                setIsOpen(false);
                onCreateFamily?.();
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center space-x-2 text-blue-600 font-medium"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm">Create New Family</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilySelector;
