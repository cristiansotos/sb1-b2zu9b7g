import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Mic, 
  Camera, 
  Upload, 
  Ruler, 
  MapPin, 
  Award, 
  Quote, 
  Trash2,
  Play,
  Pause,
  X,
  Plus
} from 'lucide-react';
import Layout from '../layout/Layout';
import Button from '../ui/Button';
import Input from '../ui/Input';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useChildMemoryStore } from '../../store/childMemoryStore';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { CreateMemoryData } from '../../types/child';
import { formatDuration } from '../../lib/utils';

// Predefined tags and achievements
const COMMON_TAGS = [
  { name: 'Primera vez', type: 'category' },
  { name: 'Sonrisa', type: 'category' },
  { name: 'Juego', type: 'category' },
  { name: 'Comida', type: 'category' },
  { name: 'Sueño', type: 'category' },
  { name: 'Palabra nueva', type: 'category' },
  { name: 'Logro', type: 'achievement' },
  { name: 'Habilidad nueva', type: 'achievement' }
];

const DEVELOPMENTAL_ACHIEVEMENTS = [
  'Primera sonrisa',
  'Primer paso',
  'Primera palabra',
  'Primer diente',
  'Gatear',
  'Sentarse solo',
  'Caminar',
  'Hablar en frases',
  'Control de esfínteres',
  'Dormir toda la noche'
];

const DEVELOPMENTAL_STAGES = [
  '0-3 meses',
  '3-6 meses',
  '6-12 meses',
  '1-2 años',
  '2-3 años',
  '3-5 años',
  '5-8 años',
  '8-12 años',
  '12+ años'
];

interface ExpandableSectionProps {
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const ExpandableSection: React.FC<ExpandableSectionProps> = ({
  title,
  icon,
  isExpanded,
  onToggle,
  children
}) => (
  <div className="border border-gray-200 rounded-lg">
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center space-x-3">
        {icon}
        <span className="font-medium text-gray-900">{title}</span>
      </div>
      <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </button>
    
    {isExpanded && (
      <div className="border-t border-gray-200 p-4">
        {children}
      </div>
    )}
  </div>
);

const AddMemoryScreen: React.FC = () => {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const editMemory = location.state?.editMemory;

  const { createMemory, updateMemory } = useChildMemoryStore();
  
  const [formData, setFormData] = useState<CreateMemoryData>({
    title: '',
    memory_date: new Date().toISOString().split('T')[0],
    notes: '',
    is_quote: false,
    quote_text: '',
    place: '',
    developmental_stage: '',
    images: [],
    tags: [],
    measurements: undefined
  });

  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<{ name: string; type: string }[]>([]);
  const [selectedAchievements, setSelectedAchievements] = useState<string[]>([]);
  const [customAchievement, setCustomAchievement] = useState('');
  const [measurements, setMeasurements] = useState({
    height_cm: '',
    weight_kg: '',
    measurement_date: new Date().toISOString().split('T')[0]
  });

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    isRecording,
    recordingTime,
    audioBlob,
    startRecording,
    stopRecording,
    clearRecording,
    playRecording,
    stopPlayback,
    isPlaying
  } = useAudioRecorder();

  // Initialize form data if editing
  useEffect(() => {
    if (editMemory) {
      setFormData({
        title: editMemory.title,
        memory_date: editMemory.memory_date,
        notes: editMemory.notes || '',
        is_quote: editMemory.is_quote,
        quote_text: editMemory.quote_text || '',
        place: editMemory.place || '',
        developmental_stage: editMemory.developmental_stage || '',
        images: [],
        tags: editMemory.tags.map(tag => ({ name: tag.tag_name, type: tag.tag_type })),
        measurements: editMemory.measurements.length > 0 ? {
          height_cm: editMemory.measurements[0].height_cm,
          weight_kg: editMemory.measurements[0].weight_kg,
          measurement_date: editMemory.measurements[0].measurement_date
        } : undefined
      });
      
      setSelectedTags(editMemory.tags.map(tag => ({ name: tag.tag_name, type: tag.tag_type })));
      
      if (editMemory.measurements.length > 0) {
        setMeasurements({
          height_cm: editMemory.measurements[0].height_cm?.toString() || '',
          weight_kg: editMemory.measurements[0].weight_kg?.toString() || '',
          measurement_date: editMemory.measurements[0].measurement_date
        });
      }
    }
  }, [editMemory]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleImageUpload = (files: FileList | null) => {
    if (!files) return;
    
    const newImages = Array.from(files);
    setSelectedImages(prev => [...prev, ...newImages]);
    
    // Create preview URLs
    newImages.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviewUrls(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('No se pudo acceder a la cámara');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (context) {
        context.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
            setSelectedImages(prev => [...prev, file]);
            
            const reader = new FileReader();
            reader.onload = (e) => {
              setImagePreviewUrls(prev => [...prev, e.target?.result as string]);
            };
            reader.readAsDataURL(file);
          }
        }, 'image/jpeg', 0.8);
      }
      
      // Stop camera
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setShowCamera(false);
    }
  };

  const toggleTag = (tag: { name: string; type: string }) => {
    setSelectedTags(prev => {
      const exists = prev.find(t => t.name === tag.name && t.type === tag.type);
      if (exists) {
        return prev.filter(t => !(t.name === tag.name && t.type === tag.type));
      } else {
        return [...prev, tag];
      }
    });
  };

  const toggleAchievement = (achievement: string) => {
    setSelectedAchievements(prev => {
      if (prev.includes(achievement)) {
        return prev.filter(a => a !== achievement);
      } else {
        return [...prev, achievement];
      }
    });
  };

  const addCustomAchievement = () => {
    if (customAchievement.trim()) {
      setSelectedAchievements(prev => [...prev, customAchievement.trim()]);
      setCustomAchievement('');
    }
  };

  const handleSubmit = async (saveAndAddAnother = false) => {
    if (!storyId) return;
    
    if (!formData.title.trim()) {
      alert('El título es requerido');
      return;
    }

    setLoading(true);

    try {
      const memoryData: CreateMemoryData = {
        ...formData,
        images: selectedImages,
        audioBlob,
        audioDuration: recordingTime,
        tags: selectedTags,
        measurements: measurements.height_cm || measurements.weight_kg ? {
          height_cm: measurements.height_cm ? parseFloat(measurements.height_cm) : undefined,
          weight_kg: measurements.weight_kg ? parseFloat(measurements.weight_kg) : undefined,
          measurement_date: measurements.measurement_date
        } : undefined
      };

      const result = editMemory 
        ? await updateMemory({ ...memoryData, id: editMemory.id })
        : await createMemory(storyId, memoryData);

      if (result.success) {
        if (saveAndAddAnother && !editMemory) {
          // Reset form for new memory
          setFormData({
            title: '',
            memory_date: new Date().toISOString().split('T')[0],
            notes: '',
            is_quote: false,
            quote_text: '',
            place: '',
            developmental_stage: '',
            images: [],
            tags: [],
            measurements: undefined
          });
          setSelectedImages([]);
          setImagePreviewUrls([]);
          setSelectedTags([]);
          setSelectedAchievements([]);
          setMeasurements({
            height_cm: '',
            weight_kg: '',
            measurement_date: new Date().toISOString().split('T')[0]
          });
          clearRecording();
        } else {
          navigate(`/child-dashboard/${storyId}`);
        }
      } else {
        alert(result.error || 'Error al guardar el recuerdo');
      }
    } catch (error) {
      console.error('Error saving memory:', error);
      alert('Error al guardar el recuerdo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            icon={ArrowLeft}
            onClick={() => navigate(`/child-dashboard/${storyId}`)}
          >
            Volver al Dashboard
          </Button>
          
          <h1 className="text-2xl font-bold text-gray-900">
            {editMemory ? 'Editar Recuerdo' : 'Nuevo Recuerdo'}
          </h1>
        </div>

        <div className="space-y-6">
          {/* Core Fields */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input
                label="Fecha del Recuerdo"
                type="date"
                value={formData.memory_date}
                onChange={(e) => setFormData({ ...formData, memory_date: e.target.value })}
                required
              />
              
              <Input
                label="Título del Recuerdo"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ej: Primera sonrisa"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Describe este momento especial..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Audio Recording Section */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Grabación de Audio</h3>
              
              <div className="flex items-center space-x-3 mb-3">
                {!isRecording && !audioBlob && (
                  <Button
                    type="button"
                    onClick={startRecording}
                    icon={Mic}
                    variant="secondary"
                    size="sm"
                  >
                    Grabar descripción
                  </Button>
                )}

                {isRecording && (
                  <>
                    <Button
                      type="button"
                      onClick={stopRecording}
                      variant="danger"
                      size="sm"
                    >
                      Grabando... (toca para parar)
                    </Button>
                    <span className="text-sm text-gray-600">
                      {formatDuration(recordingTime)}
                    </span>
                  </>
                )}

                {audioBlob && !isRecording && (
                  <>
                    <Button
                      type="button"
                      onClick={isPlaying ? stopPlayback : playRecording}
                      icon={isPlaying ? Pause : Play}
                      variant="secondary"
                      size="sm"
                    >
                      {isPlaying ? 'Pausar' : 'Reproducir'}
                    </Button>
                    
                    <Button
                      type="button"
                      onClick={clearRecording}
                      icon={Trash2}
                      variant="ghost"
                      size="sm"
                    >
                      Descartar
                    </Button>
                    
                    <span className="text-sm text-gray-600">
                      Grabación ({formatDuration(recordingTime)})
                    </span>
                  </>
                )}
              </div>

              {transcribing && (
                <div className="flex items-center space-x-2 text-sm text-blue-600">
                  <LoadingSpinner size="sm" />
                  <span>Transcribiendo...</span>
                </div>
              )}
            </div>
          </div>

          {/* Expandable Sections */}
          <div className="space-y-4">
            {/* Photos Section */}
            <ExpandableSection
              title="Fotos"
              icon={<Camera className="h-5 w-5 text-gray-600" />}
              isExpanded={expandedSections.photos}
              onToggle={() => toggleSection('photos')}
            >
              <div className="space-y-4">
                <div className="flex space-x-3">
                  <Button
                    type="button"
                    onClick={startCamera}
                    icon={Camera}
                    variant="outline"
                    size="sm"
                  >
                    Tomar Foto
                  </Button>
                  
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    icon={Upload}
                    variant="outline"
                    size="sm"
                  >
                    Galería
                  </Button>
                </div>

                {/* Image Previews */}
                {imagePreviewUrls.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {imagePreviewUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImageUpload(e.target.files)}
                  className="hidden"
                />
              </div>
            </ExpandableSection>

            {/* Growth Section */}
            <ExpandableSection
              title="Crecimiento"
              icon={<Ruler className="h-5 w-5 text-gray-600" />}
              isExpanded={expandedSections.growth}
              onToggle={() => toggleSection('growth')}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Altura (cm)"
                  type="number"
                  value={measurements.height_cm}
                  onChange={(e) => setMeasurements({ ...measurements, height_cm: e.target.value })}
                  placeholder="75"
                />
                
                <Input
                  label="Peso (kg)"
                  type="number"
                  step="0.1"
                  value={measurements.weight_kg}
                  onChange={(e) => setMeasurements({ ...measurements, weight_kg: e.target.value })}
                  placeholder="8.5"
                />
                
                <Input
                  label="Fecha de medición"
                  type="date"
                  value={measurements.measurement_date}
                  onChange={(e) => setMeasurements({ ...measurements, measurement_date: e.target.value })}
                />
              </div>
            </ExpandableSection>

            {/* Place Section */}
            <ExpandableSection
              title="Lugar"
              icon={<MapPin className="h-5 w-5 text-gray-600" />}
              isExpanded={expandedSections.place}
              onToggle={() => toggleSection('place')}
            >
              <Input
                label="Lugar donde ocurrió"
                value={formData.place}
                onChange={(e) => setFormData({ ...formData, place: e.target.value })}
                placeholder="Ej: Casa de los abuelos"
              />
            </ExpandableSection>

            {/* Achievement Section */}
            <ExpandableSection
              title="Logros"
              icon={<Award className="h-5 w-5 text-gray-600" />}
              isExpanded={expandedSections.achievement}
              onToggle={() => toggleSection('achievement')}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Etapa de desarrollo
                  </label>
                  <select
                    value={formData.developmental_stage}
                    onChange={(e) => setFormData({ ...formData, developmental_stage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Seleccionar etapa</option>
                    {DEVELOPMENTAL_STAGES.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logros alcanzados
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {DEVELOPMENTAL_ACHIEVEMENTS.map((achievement) => (
                      <label key={achievement} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedAchievements.includes(achievement)}
                          onChange={() => toggleAchievement(achievement)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{achievement}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Input
                    placeholder="Logro personalizado"
                    value={customAchievement}
                    onChange={(e) => setCustomAchievement(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={addCustomAchievement}
                    icon={Plus}
                    variant="outline"
                    size="sm"
                  >
                    Añadir
                  </Button>
                </div>

                {selectedAchievements.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedAchievements.map((achievement) => (
                      <span
                        key={achievement}
                        className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"
                      >
                        {achievement}
                        <button
                          type="button"
                          onClick={() => toggleAchievement(achievement)}
                          className="ml-1 text-green-500 hover:text-green-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </ExpandableSection>

            {/* Quote Section */}
            <ExpandableSection
              title="Cita"
              icon={<Quote className="h-5 w-5 text-gray-600" />}
              isExpanded={expandedSections.quote}
              onToggle={() => toggleSection('quote')}
            >
              <div className="space-y-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.is_quote}
                    onChange={(e) => setFormData({ ...formData, is_quote: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Marcar como cita</span>
                </label>

                {formData.is_quote && (
                  <textarea
                    value={formData.quote_text}
                    onChange={(e) => setFormData({ ...formData, quote_text: e.target.value })}
                    placeholder="Escribe la cita exacta..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}
              </div>
            </ExpandableSection>
          </div>

          {/* Tags Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Etiquetas</h3>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {COMMON_TAGS.map((tag) => (
                <button
                  key={`${tag.name}-${tag.type}`}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedTags.find(t => t.name === tag.name && t.type === tag.type)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>

            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                  >
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className="ml-1 text-blue-500 hover:text-blue-700"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Save Buttons */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <Button
              onClick={() => handleSubmit(false)}
              loading={loading}
              icon={Save}
              fullWidth
            >
              {editMemory ? 'Guardar Cambios' : 'Guardar'}
            </Button>
            
            {!editMemory && (
              <Button
                onClick={() => handleSubmit(true)}
                loading={loading}
                variant="secondary"
                fullWidth
              >
                Guardar y añadir otro
              </Button>
            )}
            
            <Button
              onClick={() => navigate(`/child-dashboard/${storyId}`)}
              variant="outline"
              fullWidth
            >
              Cancelar
            </Button>
          </div>
        </div>

        {/* Camera Modal */}
        {showCamera && (
          <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
            <div className="relative max-w-md w-full">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                <Button
                  onClick={capturePhoto}
                  variant="primary"
                  size="lg"
                  className="rounded-full"
                >
                  Capturar
                </Button>
                
                <Button
                  onClick={() => {
                    const stream = videoRef.current?.srcObject as MediaStream;
                    stream?.getTracks().forEach(track => track.stop());
                    setShowCamera(false);
                  }}
                  variant="outline"
                  size="lg"
                  className="rounded-full"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AddMemoryScreen;