import React, { useState } from 'react';
import { Save, X, Settings as SettingsIcon, Info } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { supabase } from '../../lib/supabase';

interface AudioQualitySettingsProps {
  settings: {
    id: string;
    low_energy_threshold: number;
    silence_threshold: number;
    silence_ratio_warning: number;
    max_duration_ms: number;
    min_duration_ms: number;
    updated_at: string;
  };
  onUpdate: () => void;
}

export const AudioQualitySettings: React.FC<AudioQualitySettingsProps> = ({ settings, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    low_energy_threshold: settings.low_energy_threshold.toString(),
    silence_threshold: settings.silence_threshold.toString(),
    silence_ratio_warning: settings.silence_ratio_warning.toString(),
    max_duration_ms: (settings.max_duration_ms / 60000).toString(),
    min_duration_ms: (settings.min_duration_ms / 1000).toString()
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('audio_quality_settings')
        .update({
          low_energy_threshold: parseFloat(formData.low_energy_threshold),
          silence_threshold: parseFloat(formData.silence_threshold),
          silence_ratio_warning: parseFloat(formData.silence_ratio_warning),
          max_duration_ms: parseFloat(formData.max_duration_ms) * 60000,
          min_duration_ms: parseFloat(formData.min_duration_ms) * 1000,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id);

      if (error) throw error;

      alert('Audio quality settings updated successfully');
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating audio quality settings:', error);
      alert('Error al actualizar la configuración de calidad de audio');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      low_energy_threshold: settings.low_energy_threshold.toString(),
      silence_threshold: settings.silence_threshold.toString(),
      silence_ratio_warning: settings.silence_ratio_warning.toString(),
      max_duration_ms: (settings.max_duration_ms / 60000).toString(),
      min_duration_ms: (settings.min_duration_ms / 1000).toString()
    });
    setIsEditing(false);
  };

  const handleReset = () => {
    setFormData({
      low_energy_threshold: '0.02',
      silence_threshold: '0.005',
      silence_ratio_warning: '0.85',
      max_duration_ms: '20',
      min_duration_ms: '1'
    });
  };

  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="font-medium text-gray-900 text-lg">
            Audio Quality Validation Settings
          </h4>
          <p className="text-sm text-gray-600 mt-1">
            Configure thresholds for audio recording quality validation
          </p>
        </div>

        {!isEditing && (
          <Button
            onClick={() => setIsEditing(true)}
            icon={SettingsIcon}
            variant="outline"
            size="sm"
          >
            Edit
          </Button>
        )}
      </div>

      {!isEditing ? (
        <div className="space-y-3 bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Low Energy Threshold</p>
              <p className="text-sm font-mono font-semibold text-gray-900 mt-1">{settings.low_energy_threshold.toFixed(3)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Silence Threshold</p>
              <p className="text-sm font-mono font-semibold text-gray-900 mt-1">{settings.silence_threshold.toFixed(3)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Silence Ratio Warning</p>
              <p className="text-sm font-mono font-semibold text-gray-900 mt-1">{(settings.silence_ratio_warning * 100).toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Max Duration</p>
              <p className="text-sm font-mono font-semibold text-gray-900 mt-1">{(settings.max_duration_ms / 60000).toFixed(0)} min</p>
            </div>
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last Updated</p>
            <p className="text-sm text-gray-900 mt-1">{new Date(settings.updated_at).toLocaleString('es-ES')}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Audio Energy Reference Values:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Normal speech: 0.10 - 0.30</li>
                  <li>Quiet but clear: 0.05 - 0.10</li>
                  <li>Very quiet: 0.02 - 0.05</li>
                  <li>Too quiet: below 0.02</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Low Energy Threshold
                <span className="text-xs text-gray-500 ml-2 font-normal">
                  (0.000 - 1.000)
                </span>
              </label>
              <Input
                type="number"
                min="0"
                max="1"
                step="0.001"
                value={formData.low_energy_threshold}
                onChange={(e) => setFormData({ ...formData, low_energy_threshold: e.target.value })}
                placeholder="0.02"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum average audio energy. Recommended: 0.02 for less false positives
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Silence Threshold
                <span className="text-xs text-gray-500 ml-2 font-normal">
                  (0.000 - 1.000)
                </span>
              </label>
              <Input
                type="number"
                min="0"
                max="1"
                step="0.001"
                value={formData.silence_threshold}
                onChange={(e) => setFormData({ ...formData, silence_threshold: e.target.value })}
                placeholder="0.005"
              />
              <p className="text-xs text-gray-500 mt-1">
                Sample amplitude below this is considered silence. Recommended: 0.005
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Silence Ratio Warning
                <span className="text-xs text-gray-500 ml-2 font-normal">
                  (0.00 - 1.00)
                </span>
              </label>
              <Input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={formData.silence_ratio_warning}
                onChange={(e) => setFormData({ ...formData, silence_ratio_warning: e.target.value })}
                placeholder="0.85"
              />
              <p className="text-xs text-gray-500 mt-1">
                Warn if this percentage of the recording is silence. Recommended: 0.85 (85%)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Duration (minutes)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="60"
                  step="1"
                  value={formData.max_duration_ms}
                  onChange={(e) => setFormData({ ...formData, max_duration_ms: e.target.value })}
                  placeholder="20"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum recording duration
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Duration (seconds)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  step="1"
                  value={formData.min_duration_ms}
                  onChange={(e) => setFormData({ ...formData, min_duration_ms: e.target.value })}
                  placeholder="1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum recording duration
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-4 border-t">
            <Button
              onClick={handleSave}
              icon={Save}
              variant="primary"
              loading={loading}
              disabled={loading}
            >
              Save Changes
            </Button>
            <Button
              onClick={handleCancel}
              icon={X}
              variant="outline"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              disabled={loading}
            >
              Reset to Defaults
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
