import React, { useState } from 'react';
import { Check, X, Plus } from 'lucide-react';
import { FamilyGroup } from '../../types';

interface FamilySelectorProps {
  availableFamilies: FamilyGroup[];
  selectedFamilyIds: string[];
  onChange: (familyIds: string[]) => void;
  maxSelections?: number;
  error?: string;
  mode?: 'checkbox' | 'tags';
  label?: string;
  required?: boolean;
}

const FamilySelector: React.FC<FamilySelectorProps> = ({
  availableFamilies,
  selectedFamilyIds,
  onChange,
  maxSelections = 4,
  error,
  mode = 'checkbox',
  label = 'Familias',
  required = false
}) => {
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const handleToggleFamily = (familyId: string) => {
    if (selectedFamilyIds.includes(familyId)) {
      // Don't allow removing if only one family in tags mode
      if (mode === 'tags' && selectedFamilyIds.length === 1) {
        return;
      }
      onChange(selectedFamilyIds.filter(id => id !== familyId));
    } else {
      if (selectedFamilyIds.length < maxSelections) {
        onChange([...selectedFamilyIds, familyId]);
      }
    }
    setShowAddDropdown(false);
  };

  const selectedFamilies = availableFamilies.filter(f => selectedFamilyIds.includes(f.id));
  const availableToAdd = availableFamilies.filter(f => !selectedFamilyIds.includes(f.id));

  if (mode === 'tags') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            {label} {required && '*'}
          </label>
          <span className="text-xs text-gray-500">
            {selectedFamilyIds.length} de {maxSelections}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {selectedFamilies.map((family) => (
            <div
              key={family.id}
              className="inline-flex items-center space-x-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
            >
              <span>{family.name}</span>
              {selectedFamilyIds.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleToggleFamily(family.id)}
                  className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                  aria-label={`Eliminar de ${family.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}

          {selectedFamilyIds.length < maxSelections && availableToAdd.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAddDropdown(!showAddDropdown)}
                className="inline-flex items-center space-x-1 px-3 py-1.5 border-2 border-dashed border-gray-300 text-gray-600 rounded-full text-sm font-medium hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Añadir familia</span>
              </button>

              {showAddDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowAddDropdown(false)}
                  />
                  <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 max-h-60 overflow-y-auto">
                    {availableToAdd.map((family) => (
                      <button
                        key={family.id}
                        type="button"
                        onClick={() => handleToggleFamily(family.id)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors text-sm"
                      >
                        {family.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {selectedFamilyIds.length === 0 && (
          <p className="text-sm text-gray-500 italic">
            Esta historia debe estar asociada al menos a una familia
          </p>
        )}

        {selectedFamilyIds.length >= maxSelections && (
          <p className="text-xs text-amber-600">
            Has alcanzado el límite máximo de {maxSelections} familias por historia
          </p>
        )}

        {selectedFamilyIds.length === 1 && (
          <p className="text-xs text-gray-500">
            Una historia debe pertenecer al menos a una familia
          </p>
        )}
      </div>
    );
  }

  // Checkbox mode (for creating new stories)
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && '*'}
        </label>
        <span className="text-xs text-gray-500">
          {selectedFamilyIds.length} de {maxSelections} seleccionadas
        </span>
      </div>

      <div className="space-y-2">
        {availableFamilies.map((family) => {
          const isSelected = selectedFamilyIds.includes(family.id);
          const isDisabled = !isSelected && selectedFamilyIds.length >= maxSelections;

          return (
            <button
              key={family.id}
              type="button"
              onClick={() => handleToggleFamily(family.id)}
              disabled={isDisabled}
              className={`w-full flex items-center justify-between p-3 border-2 rounded-lg transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : isDisabled
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <span className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
                {family.name}
              </span>
              {isSelected && (
                <div className="flex items-center justify-center w-5 h-5 bg-blue-500 rounded-full">
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {availableFamilies.length === 0 && (
        <p className="text-sm text-gray-500 italic py-2">
          No tienes familias disponibles. Crea una familia primero.
        </p>
      )}

      {selectedFamilyIds.length === 0 && availableFamilies.length > 0 && (
        <p className="text-xs text-gray-500">
          Selecciona al menos una familia para la historia
        </p>
      )}

      {selectedFamilyIds.length >= maxSelections && (
        <p className="text-xs text-amber-600">
          Has alcanzado el límite máximo de {maxSelections} familias
        </p>
      )}
    </div>
  );
};

export default FamilySelector;
