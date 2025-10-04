import React from 'react';
import { Mic, Heart, BookOpen, Share2, Sparkles, Shield } from 'lucide-react';

const features = [
  {
    icon: Mic,
    title: 'Grabaciones Guiadas',
    description: 'Sistema intuitivo de preguntas que guía la narración de historias familiares de manera natural y estructurada.'
  },
  {
    icon: Sparkles,
    title: 'IA Inteligente',
    description: 'Transcripción automática y generación de memorias cohesivas que preservan la voz auténtica de cada persona.'
  },
  {
    icon: Heart,
    title: 'Para Toda la Familia',
    description: 'Modo especial para documentar el crecimiento de los niños con hitos, medidas y momentos especiales.'
  },
  {
    icon: BookOpen,
    title: 'Memorias Digitales',
    description: 'Transforma las historias en hermosos libros digitales con formato profesional y diseño elegante.'
  },
  {
    icon: Share2,
    title: 'Colaboración Familiar',
    description: 'Invita a familiares a contribuir con fotos y audios sin necesidad de crear una cuenta.'
  },
  {
    icon: Shield,
    title: 'Seguro y Privado',
    description: 'Tus recuerdos están protegidos con encriptación de nivel bancario y controles de privacidad completos.'
  }
];

const FeaturesSection: React.FC = () => {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white" id="caracteristicas">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            ¿Por qué elegir{' '}
            <span className="bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
              Ethernal?
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Una plataforma completa diseñada específicamente para preservar y compartir 
            las historias que más importan en tu familia
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-8 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-gray-50"
            >
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-blue-500 to-teal-500 text-white mb-6 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="h-8 w-8" />
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
              
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;