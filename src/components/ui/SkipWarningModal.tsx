import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export type SkipWarningContext = 'question' | 'chapter' | 'remaining';

interface SkipWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  context: SkipWarningContext;
  showDontShowAgain?: boolean;
  onDontShowAgainChange?: (checked: boolean) => void;
}

const SkipWarningModal: React.FC<SkipWarningModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  context,
  showDontShowAgain = true,
  onDontShowAgainChange
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setDontShowAgain(checked);
    onDontShowAgainChange?.(checked);
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const getContent = () => {
    switch (context) {
      case 'question':
        return {
          title: 'Saltar pregunta con contenido',
          message: 'Esta pregunta tiene grabaciones o imágenes adjuntas. Si la saltas, este contenido no se incluirá en las memorias escritas posteriormente.',
          warning: 'El contenido se mantendrá guardado pero no se utilizará para generar las memorias.'
        };
      case 'chapter':
        return {
          title: 'Saltar capítulo completo',
          message: 'Estás a punto de saltar todas las preguntas de este capítulo. El capítulo completo no se incluirá en las memorias escritas posteriormente.',
          warning: 'Podrás reactivar las preguntas más adelante si cambias de opinión.'
        };
      case 'remaining':
        return {
          title: 'Saltar preguntas restantes',
          message: 'Estás a punto de saltar todas las preguntas restantes de la historia. Este contenido no se incluirá en las memorias escritas posteriormente.',
          warning: 'La historia se marcará como progresada pero no aparecerá en la fase de generación de memorias.'
        };
    }
  };

  const content = getContent();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={content.title}
      maxWidth="lg"
      showCloseButton={false}
    >
      <div className="space-y-4">
        <div className="flex items-start space-x-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="text-sm text-gray-700 leading-relaxed">
              {content.message}
            </p>
            <p className="text-sm text-amber-800 font-medium">
              {content.warning}
            </p>
          </div>
        </div>

        {showDontShowAgain && (
          <div className="flex items-center space-x-2 py-2">
            <input
              type="checkbox"
              id="dontShowAgain"
              checked={dontShowAgain}
              onChange={handleCheckboxChange}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label
              htmlFor="dontShowAgain"
              className="text-sm text-gray-700 cursor-pointer select-none"
            >
              No volver a mostrar
            </label>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="secondary"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
          >
            Confirmar y saltar
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SkipWarningModal;
