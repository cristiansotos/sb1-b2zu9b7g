import React, { useState, useRef, useEffect } from 'react';
import { Save, X, Edit as EditIcon, Trash2, AlertTriangle } from 'lucide-react';
import Button from './Button';
import { NO_SPEECH_MESSAGE } from '../../lib/filteredPhrases';

export interface EditableTranscriptionDisplayProps {
  html?: string;
  plainText?: string;
  onSave: (html: string, plain: string) => Promise<{ success: boolean; error?: string }>;
  onDelete: () => void;
  isEditable?: boolean;
  recordingDate?: string;
  qualityWarnings?: string[];
}

const groupIntoParagraphs = (text: string): string[] => {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const paragraphs: string[] = [];

  for (let i = 0; i < sentences.length; i += 4) {
    const paragraph = sentences.slice(i, i + 4).join(' ').trim();
    if (paragraph) {
      paragraphs.push(paragraph);
    }
  }

  return paragraphs;
};

const formatTextWithParagraphs = (text: string): string => {
  const paragraphs = groupIntoParagraphs(text);
  return paragraphs.map(p => `<p>${p}</p>`).join('\n');
};

const EditableTranscriptionDisplay: React.FC<EditableTranscriptionDisplayProps> = ({
  html,
  plainText,
  onSave,
  onDelete,
  isEditable = true,
  recordingDate,
  qualityWarnings
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [localHtml, setLocalHtml] = useState('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const displayText = plainText || (html ? html.replace(/<[^>]*>/g, '') : '');
  const isNoSpeechDetected = displayText.trim() === NO_SPEECH_MESSAGE;
  const hasQualityWarnings = qualityWarnings && qualityWarnings.length > 0;

  useEffect(() => {
    if (html) {
      setLocalHtml(html);
    } else if (plainText) {
      setLocalHtml(formatTextWithParagraphs(plainText));
    }
  }, [html, plainText]);

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleEdit = () => {
    setIsEditing(true);
    setSaveError(null);
    setSaveSuccess(false);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = localHtml;
        editorRef.current.focus();
      }
    }, 0);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!editorRef.current) return;

    const editedHtml = editorRef.current.innerHTML;
    const editedPlain = editorRef.current.innerText;

    if (!editedPlain.trim()) {
      setSaveError('La transcripción no puede estar vacía');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const saveStartTime = performance.now();

    try {
      const result = await onSave(editedHtml, editedPlain);

      const saveDuration = performance.now() - saveStartTime;
      console.log(`[UI] Transcript save completed in ${saveDuration.toFixed(2)}ms`);

      if (result.success) {
        setLocalHtml(editedHtml);
        setIsEditing(false);
        setSaveSuccess(true);

        // Auto-hide success message after 3 seconds
        saveTimeoutRef.current = setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
      } else {
        setSaveError(result.error || 'Error al guardar la transcripción');
      }
    } catch (error: any) {
      console.error('Error saving transcription:', error);
      setSaveError('Error al guardar la transcripción. Por favor, intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!displayText) {
    return null;
  }

  return (
    <div className="mt-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-gray-700">Transcripción</h4>
          {recordingDate && (
            <span className="text-xs text-gray-500 hidden sm:inline">
              {new Date(recordingDate).toLocaleDateString('es-ES')}
            </span>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-1 sm:gap-2">
            {isEditable && (
              <>
                <Button
                  onClick={handleEdit}
                  icon={EditIcon}
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <span className="hidden sm:inline">Editar</span>
                </Button>

                <Button
                  onClick={onDelete}
                  icon={Trash2}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <span className="hidden sm:inline">Eliminar transcripción</span>
                </Button>
              </>
            )}
          </div>
        )}

        {isEditing && (
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              onClick={handleSave}
              icon={Save}
              variant="primary"
              size="sm"
              loading={isSaving}
              disabled={isSaving}
            >
              <span className="hidden sm:inline">Guardar</span>
            </Button>

            <Button
              onClick={handleCancel}
              icon={X}
              variant="ghost"
              size="sm"
              disabled={isSaving}
            >
              <span className="hidden sm:inline">Cancelar</span>
            </Button>
          </div>
        )}
      </div>

      {saveError && (
        <div className="px-4 sm:px-5 py-3 bg-red-50 border-b border-red-200">
          <div className="flex items-start">
            <AlertTriangle className="h-4 w-4 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{saveError}</p>
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="px-4 sm:px-5 py-3 bg-green-50 border-b border-green-200">
          <div className="flex items-start">
            <svg className="h-4 w-4 text-green-600 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-green-800">Transcripción guardada correctamente</p>
          </div>
        </div>
      )}

      {isNoSpeechDetected && hasQualityWarnings && !isEditing && (
        <div className="px-5 sm:px-6 md:px-8 py-4 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h5 className="text-sm font-medium text-yellow-900 mb-2">
                Posibles causas de la detección fallida:
              </h5>
              <ul className="text-sm text-yellow-800 space-y-1">
                {qualityWarnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
              <p className="text-xs text-yellow-700 mt-2">
                Intenta grabar de nuevo con mejor calidad de audio o vuelve a transcribir si crees que hay un error.
              </p>
            </div>
          </div>
        </div>
      )}

      {!isEditing ? (
        <div
          className="px-5 sm:px-6 md:px-8 py-5 sm:py-6 text-gray-800 text-sm sm:text-[15px] md:text-base leading-relaxed"
          style={{
            lineHeight: '1.75',
            letterSpacing: '0.01em',
          }}
        >
          <div
            dangerouslySetInnerHTML={{ __html: localHtml }}
            className="prose prose-sm sm:prose max-w-none"
          />
        </div>
      ) : (
        <div className="p-4 sm:p-5 bg-white">
          <div
            ref={editorRef}
            contentEditable={!isSaving}
            className="min-h-[200px] sm:min-h-[250px] max-h-[400px] sm:max-h-[500px] overflow-y-auto focus:outline-none text-gray-800 text-sm sm:text-base leading-relaxed p-3 border border-gray-300 rounded-lg"
            style={{
              lineHeight: '1.7',
              letterSpacing: '0.01em',
            }}
            suppressContentEditableWarning
          />
          <p className="text-xs text-gray-500 mt-2">
            Cada 4 frases se agrupan en un párrafo para mejor lectura.
          </p>
        </div>
      )}

      <style>{`
        .prose p {
          margin-bottom: 1em;
        }

        .prose p:last-child {
          margin-bottom: 0;
        }

        .prose strong,
        .prose b {
          font-weight: 700;
          color: #1f2937;
        }

        [contenteditable] {
          -webkit-user-select: text;
          user-select: text;
        }

        [contenteditable]:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        [contenteditable] p {
          margin-bottom: 0.75em;
        }

        [contenteditable] p:last-child {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
};

export default EditableTranscriptionDisplay;
