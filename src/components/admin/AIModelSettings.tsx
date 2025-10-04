import React, { useState } from 'react';
import { Save, X, CreditCard as Edit, ChevronDown, ChevronUp } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { supabase } from '../../lib/supabase';

interface AIModelSettingsProps {
  model: {
    id: string;
    service_type: string;
    model_name: string;
    temperature?: number;
    prompt?: string;
    response_format?: string;
    updated_at: string;
  };
  onUpdate: () => void;
}

export const AIModelSettings: React.FC<AIModelSettingsProps> = ({ model, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    model_name: model.model_name,
    temperature: model.temperature?.toString() || '0',
    prompt: model.prompt || '',
    response_format: model.response_format || 'json'
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('ai_model_settings')
        .update({
          model_name: formData.model_name,
          temperature: parseFloat(formData.temperature),
          prompt: formData.prompt,
          response_format: formData.response_format,
          updated_at: new Date().toISOString()
        })
        .eq('id', model.id);

      if (error) throw error;

      alert('Configuration updated successfully');
      setIsEditing(false);
      setShowAdvanced(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating AI model settings:', error);
      alert('Error al actualizar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      model_name: model.model_name,
      temperature: model.temperature?.toString() || '0',
      prompt: model.prompt || '',
      response_format: model.response_format || 'json'
    });
    setIsEditing(false);
    setShowAdvanced(false);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="font-medium text-gray-900 text-lg">
            Audio Transcription Model
          </h4>
          <p className="text-sm text-gray-600 mt-1">
            Select the AI model used to transcribe audio recordings to text
          </p>
        </div>

        {!isEditing && (
          <Button
            onClick={() => setIsEditing(true)}
            icon={Edit}
            variant="outline"
            size="sm"
          >
            Edit
          </Button>
        )}
      </div>

      {!isEditing ? (
        <div className="space-y-3 bg-gray-50 rounded-lg p-4">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Current Model</p>
            <p className="text-sm font-mono font-semibold text-gray-900 mt-1">{model.model_name}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last Updated</p>
            <p className="text-sm text-gray-900 mt-1">{new Date(model.updated_at).toLocaleString('es-ES')}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Model
            </label>
            <select
              value={formData.model_name}
              onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="whisper-1">Whisper-1 (Recommended)</option>
              <option value="gpt-4o-mini-transcribe">GPT-4o Mini Transcribe</option>
              <option value="gpt-4o-transcribe">GPT-4o Transcribe</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Whisper-1 provides the best balance of accuracy and cost for general transcription tasks
            </p>
          </div>

          {/* Advanced Settings Toggle */}
          <div className="border-t pt-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showAdvanced ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
            </button>
          </div>

          {/* Advanced Settings */}
          {showAdvanced && (
            <div className="space-y-4 pl-4 border-l-2 border-blue-200">
              {/* Temperature */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temperature (0-1)
                  <span className="text-xs text-gray-500 ml-2 font-normal">
                    Lower = more deterministic, Higher = more creative
                  </span>
                </label>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                  placeholder="0.0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Recommended: 0 for precise transcriptions
                </p>
              </div>

              {/* Response Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Response Format
                </label>
                <select
                  value={formData.response_format}
                  onChange={(e) => setFormData({ ...formData, response_format: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="json">JSON</option>
                  <option value="text">Text</option>
                  <option value="srt">SRT (Subtitles)</option>
                  <option value="vtt">VTT (Subtitles)</option>
                </select>
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  System Prompt
                </label>
                <textarea
                  value={formData.prompt}
                  onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  placeholder="Instructions for the AI model..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Define model behavior. Be specific about what to include and what to ignore.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 pt-4">
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
          </div>
        </div>
      )}
    </div>
  );
};
