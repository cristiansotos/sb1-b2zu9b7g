import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CreditCard as Edit, Trash2, AlertTriangle } from 'lucide-react';
import Button from './Button';
import { stripHtmlTags } from '../../lib/textUtils';
import { NO_SPEECH_MESSAGE } from '../../lib/filteredPhrases';

export interface TranscriptionDisplayProps {
  html?: string;
  plainText?: string;
  onEdit: () => void;
  onDelete: () => void;
  isEditable?: boolean;
  recordingDate?: string;
  qualityWarnings?: string[];
}

const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({
  html,
  plainText,
  onEdit,
  onDelete,
  isEditable = true,
  recordingDate,
  qualityWarnings
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const displayHtml = html || plainText || '';
  const displayText = plainText || stripHtmlTags(html || '');

  const shouldTruncate = displayText.length > 300;
  const isNoSpeechDetected = displayText.trim() === NO_SPEECH_MESSAGE;
  const hasQualityWarnings = qualityWarnings && qualityWarnings.length > 0;

  if (!displayHtml && !displayText) {
    return null;
  }

  return (
    <div className="mt-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 overflow-hidden shadow-sm select-none">
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-gray-700">Transcripción</h4>
          {recordingDate && (
            <span className="text-xs text-gray-500 hidden sm:inline">
              {new Date(recordingDate).toLocaleDateString('es-ES')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {isEditable && (
            <>
              <Button
                onClick={onEdit}
                icon={Edit}
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
      </div>

      {/* Quality Warnings for No Speech Detected */}
      {isNoSpeechDetected && hasQualityWarnings && (
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

      <div className="relative">
        <div
          className={`px-5 sm:px-6 md:px-8 py-5 sm:py-6 text-gray-800 text-sm sm:text-[15px] md:text-base leading-relaxed select-none ${
            !isExpanded && shouldTruncate ? 'max-h-[180px] overflow-hidden' : ''
          }`}
          style={{
            lineHeight: '1.75',
            letterSpacing: '0.01em',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none'
          }}
          onContextMenu={(e) => e.preventDefault()}
          onCopy={(e) => e.preventDefault()}
          onCut={(e) => e.preventDefault()}
        >
          <div
            dangerouslySetInnerHTML={{ __html: displayHtml }}
            className="prose prose-sm sm:prose max-w-none"
          />
        </div>

        {!isExpanded && shouldTruncate && (
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-100 via-gray-100/80 to-transparent pointer-events-none" />
        )}
      </div>

      {shouldTruncate && (
        <div className="px-4 py-3 bg-white border-t border-gray-200 flex justify-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            {isExpanded ? (
              <>
                Mostrar menos
                <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                Mostrar más
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}

      <style>{`
        .prose strong,
        .prose b {
          font-weight: 700;
          color: #1f2937;
        }

        .prose .highlight-yellow {
          background-color: #fef08a;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
        }
        .prose .highlight-green {
          background-color: #bbf7d0;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
        }
        .prose .highlight-blue {
          background-color: #bfdbfe;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
        }
        .prose .highlight-pink {
          background-color: #fbcfe8;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
        }
        .prose .highlight-orange {
          background-color: #fed7aa;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
        }

        .prose p {
          margin-bottom: 1em;
        }

        .prose p:last-child {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
};


export default TranscriptionDisplay;
