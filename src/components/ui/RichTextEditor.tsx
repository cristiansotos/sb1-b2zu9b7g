import React, { useState, useRef, useEffect } from 'react';
import { Bold, Palette, Save, X } from 'lucide-react';
import Button from './Button';

export interface RichTextEditorProps {
  initialValue: string;
  onSave: (html: string, plain: string) => void;
  onCancel: () => void;
  disabled?: boolean;
}

const HIGHLIGHT_COLORS = [
  { name: 'Sin color', class: 'bg-transparent', value: 'none' },
  { name: 'Yellow', class: 'bg-yellow-200', value: 'yellow' },
  { name: 'Green', class: 'bg-green-200', value: 'green' },
  { name: 'Blue', class: 'bg-blue-200', value: 'blue' },
  { name: 'Pink', class: 'bg-pink-200', value: 'pink' },
  { name: 'Orange', class: 'bg-orange-200', value: 'orange' },
];

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  initialValue,
  onSave,
  onCancel,
  disabled = false
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = initialValue || '';
    }
  }, [initialValue]);

  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const applyHighlight = (color: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (range.collapsed) return;

    if (color === 'none') {
      const container = range.commonAncestorContainer;
      const parentElement = container.nodeType === Node.TEXT_NODE
        ? container.parentElement
        : container as HTMLElement;

      if (parentElement && parentElement.classList.contains('highlight-yellow') ||
          parentElement?.classList.contains('highlight-green') ||
          parentElement?.classList.contains('highlight-blue') ||
          parentElement?.classList.contains('highlight-pink') ||
          parentElement?.classList.contains('highlight-orange')) {
        const text = parentElement.textContent || '';
        const textNode = document.createTextNode(text);
        parentElement.parentNode?.replaceChild(textNode, parentElement);
      }
    } else {
      const span = document.createElement('span');
      span.className = `highlight-${color} px-1 rounded`;
      span.style.backgroundColor = getBackgroundColor(color);

      try {
        range.surroundContents(span);
      } catch (e) {
        console.error('Failed to apply highlight:', e);
      }
    }

    setShowColorPicker(false);
    editorRef.current?.focus();
  };

  const getBackgroundColor = (color: string): string => {
    const colorMap: Record<string, string> = {
      yellow: '#fef08a',
      green: '#bbf7d0',
      blue: '#bfdbfe',
      pink: '#fbcfe8',
      orange: '#fed7aa',
    };
    return colorMap[color] || '#fef08a';
  };

  const handleSave = () => {
    if (!editorRef.current) return;

    const html = editorRef.current.innerHTML;
    const plain = editorRef.current.innerText;

    onSave(html, plain);
  };

  const getPlainText = (): string => {
    return editorRef.current?.innerText || '';
  };

  return (
    <div className="border border-gray-300 rounded-lg bg-white">
      <div className="border-b border-gray-200 p-2 sm:p-3 flex flex-wrap items-center gap-2 bg-gray-50">
        <button
          type="button"
          onClick={() => applyFormat('bold')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Bold (Ctrl+B)"
          disabled={disabled}
        >
          <Bold className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Highlight"
            disabled={disabled}
          >
            <Palette className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" />
          </button>

          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10 flex flex-col gap-1 min-w-[120px]">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => applyHighlight(color.value)}
                  className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded text-sm"
                >
                  <div className={`w-6 h-6 ${color.class} rounded border border-gray-300`} />
                  <span className="text-gray-700">{color.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            onClick={handleSave}
            icon={Save}
            variant="primary"
            size="sm"
            disabled={disabled}
          >
            <span className="hidden sm:inline">Guardar</span>
          </Button>

          <Button
            onClick={onCancel}
            icon={X}
            variant="ghost"
            size="sm"
            disabled={disabled}
          >
            <span className="hidden sm:inline">Cancelar</span>
          </Button>
        </div>
      </div>

      <div
        ref={editorRef}
        contentEditable={!disabled}
        className="p-4 sm:p-5 md:p-6 min-h-[200px] sm:min-h-[250px] md:min-h-[300px] max-h-[400px] sm:max-h-[500px] overflow-y-auto focus:outline-none text-gray-800 text-sm sm:text-base leading-relaxed"
        style={{
          lineHeight: '1.7',
          letterSpacing: '0.01em',
        }}
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
        suppressContentEditableWarning
      />

      <style>{`
        [contenteditable] {
          -webkit-user-select: text;
          user-select: text;
        }

        [contenteditable] strong,
        [contenteditable] b {
          font-weight: 700;
        }

        [contenteditable] .highlight-yellow { background-color: #fef08a; }
        [contenteditable] .highlight-green { background-color: #bbf7d0; }
        [contenteditable] .highlight-blue { background-color: #bfdbfe; }
        [contenteditable] .highlight-pink { background-color: #fbcfe8; }
        [contenteditable] .highlight-orange { background-color: #fed7aa; }

        [contenteditable]:focus {
          outline: none;
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

export default RichTextEditor;
