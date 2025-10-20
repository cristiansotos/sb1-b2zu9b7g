import React, { useState, useEffect } from 'react';
import { BookHeart, ChevronDown, HelpCircle, Smile, Mic, Feather, Star, Heart, Shield, Users, Clock, Camera } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AuthModal from '../auth/AuthModal';

// Reusable Components
const BenefitCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="flex flex-col items-center p-6 text-center bg-white rounded-lg border shadow-md hover:shadow-lg transition-shadow duration-300">
    <div className="mb-4 text-[#C57B57]">{icon}</div>
    <h3 className="text-lg font-semibold mb-2 text-[#424B54]">{title}</h3>
    <p className="text-sm text-gray-600">{description}</p>
  </div>
);

const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center space-x-1">
      {[...Array(fullStars)].map((_, i) => (
        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      ))}
      {hasHalfStar && (
        <div className="relative">
          <Star className="h-4 w-4 text-gray-300" />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          </div>
        </div>
      )}
      {[...Array(emptyStars)].map((_, i) => (
        <Star key={i} className="h-4 w-4 text-gray-300" />
      ))}
    </div>
  );
};


const LandingPage: React.FC = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot-password'>('login');
  const [heroImages, setHeroImages] = useState<any[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [carouselSettings, setCarouselSettings] = useState({
    transition_duration: 5000,
    auto_play: true,
    transition_effect: 'fade'
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHeroCarousel();
  }, []);

  useEffect(() => {
    if (!carouselSettings.auto_play || heroImages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, carouselSettings.transition_duration);

    return () => clearInterval(interval);
  }, [carouselSettings.auto_play, carouselSettings.transition_duration, heroImages.length]);

  const fetchHeroCarousel = async () => {
    try {
      // Fetch active hero images
      const { data: imagesData, error: imagesError } = await supabase
        .from('hero_images')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (imagesError) throw imagesError;

      // Fetch carousel settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('carousel_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

      if (imagesData && imagesData.length > 0) {
        setHeroImages(imagesData);
      }

      if (settingsData) {
        setCarouselSettings(settingsData);
      }
    } catch (error) {
      console.error('Error fetching hero carousel:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const howItWorksSteps = [
    {
      icon: <Mic className="h-8 w-8" />,
      title: "1. Graba",
      description: "Responde preguntas guiadas sobre tu vida o la de tus seres queridos"
    },
    {
      icon: <Feather className="h-8 w-8" />,
      title: "2. Transcribe",
      description: "Nuestra IA convierte automáticamente el audio en texto"
    },
    {
      icon: <BookHeart className="h-8 w-8" />,
      title: "3. Preserva",
      description: "Crea hermosos libros digitales con las historias familiares"
    }
  ];

  const featuresData = [
    {
      icon: <Heart className="h-8 w-8" />,
      title: "Para Toda la Familia",
      description: "Modo especial para documentar el crecimiento de los niños"
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Seguro y Privado",
      description: "Tus recuerdos protegidos con máxima seguridad"
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Colaboración",
      description: "Invita a familiares a contribuir con fotos y audios"
    },
    {
      icon: <Clock className="h-8 w-8" />,
      title: "Fácil de Usar",
      description: "Interfaz intuitiva diseñada para todas las edades"
    }
  ];

  const testimonialsData = [
    {
      rating: 5,
      text: "Gracias a Ethernal, pude documentar toda la historia de mi abuela antes de que fuera demasiado tarde.",
      author: "María González"
    },
    {
      rating: 5,
      text: "Una herramienta increíble para preservar los recuerdos familiares. Muy fácil de usar.",
      author: "Carlos Rodríguez"
    }
  ];

  return (
    <div className="min-h-screen bg-[#F5EFE0] text-[#424B54] font-sans antialiased overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Carousel Background */}
        {!isLoading && heroImages.length > 0 && (
          <>
            {heroImages.map((image, index) => (
              <div
                key={image.id}
                className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
                  index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                }`}
                style={{
                  backgroundImage: `url(${image.image_url})`
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/60" />
              </div>
            ))}
          </>
        )}

        {/* Logo - Top Left */}
        <div className="absolute top-6 left-6 z-20 flex items-center space-x-3">
          <BookHeart className="h-10 w-10 text-white" strokeWidth={2} />
          <span className="text-3xl font-bold text-white tracking-tight">Ethernal</span>
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight animate-fade-in-down">
            El tiempo con tus seres queridos es{' '}
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              limitado
            </span>
          </h1>
          
          <p className="text-xl sm:text-2xl text-blue-100 mb-8 leading-relaxed animate-fade-in-up animation-delay-300">
            Sus historias pueden ser para siempre
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in animation-delay-600">
            <button
              onClick={() => {
                setAuthMode('register');
                setAuthModalOpen(true);
              }}
              className="bg-[#C57B57] text-white text-xl px-8 py-4 rounded-lg hover:bg-[#B86A4A] transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Empezar
            </button>

            <button
              onClick={() => {
                setAuthMode('login');
                setAuthModalOpen(true);
              }}
              className="text-white hover:text-blue-200 underline"
            >
              ¿Ya tienes una cuenta? Inicia sesión
            </button>
          </div>
        </div>

        {/* Carousel Navigation Dots */}
        {!isLoading && heroImages.length > 1 && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20 flex space-x-2">
            {heroImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentImageIndex
                    ? 'bg-white w-8'
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ChevronDown className="h-8 w-8 text-white/80" />
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <HelpCircle className="h-16 w-16 text-[#C57B57] mx-auto mb-6" />
          <h2 className="text-4xl font-bold mb-6 text-[#424B54]">
            ¿Cuántas historias de tus seres queridos no conocerás nunca?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Cada día que pasa, se pierden recuerdos invaluables. Las historias de nuestros abuelos, 
            padres y seres queridos desaparecen para siempre cuando no las documentamos.
          </p>
          <p className="text-lg italic text-gray-500">
            "Ojalá hubiera preguntado más..."
          </p>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#F5EFE0]">
        <div className="max-w-4xl mx-auto text-center">
          <Smile className="h-16 w-16 text-[#C57B57] mx-auto mb-6" />
          <h2 className="text-4xl font-bold mb-6 text-[#424B54]">
            <BookHeart className="inline h-10 w-10 mr-2" />
            Ethernal: Tu puente hacia su legado
          </h2>
          <p className="text-xl text-gray-600">
            Ethernal te ayuda a capturar, organizar y preservar las historias más importantes 
            de tu familia de manera fácil y significativa.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 text-[#424B54]">
            <BookHeart className="inline h-10 w-10 mr-2" />
            Cómo Funciona
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {howItWorksSteps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="bg-[#C57B57] text-white rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  {step.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-[#424B54]">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#F5EFE0]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 text-[#424B54]">
            <BookHeart className="inline h-10 w-10 mr-2" />
            Características
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuresData.map((feature, index) => (
              <BenefitCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 text-[#424B54]">
            <BookHeart className="inline h-10 w-10 mr-2" />
            Lo Que Dicen Nuestros Usuarios
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {testimonialsData.map((testimonial, index) => (
              <blockquote key={index} className="bg-gray-50 p-6 rounded-lg">
                <StarRating rating={testimonial.rating} />
                <p className="text-gray-700 mt-4 mb-4">"{testimonial.text}"</p>
                <cite className="text-[#C57B57] font-semibold">- {testimonial.author}</cite>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-teal-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            ¿Listo para descubrir su historia?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            No esperes más. Cada historia cuenta, cada recuerdo importa.
          </p>
          <button
            onClick={() => {
              setAuthMode('register');
              setAuthModalOpen(true);
            }}
            className="bg-white text-blue-600 hover:bg-gray-100 text-xl font-semibold px-8 py-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Obtén Ethernal Ahora
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 bg-[#424B54] text-white">
        <div className="max-w-6xl mx-auto text-center">
          <p>&copy; 2024 Ethernal. Todos los derechos reservados.</p>
          <div className="mt-4 space-x-4">
            <a href="#" className="hover:text-gray-300">Política de Privacidad</a>
            <a href="#" className="hover:text-gray-300">Términos de Servicio</a>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        onSwitchMode={setAuthMode}
      />

      {/* Global Styles */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fadeIn 1s ease-out;
        }
        
        .animate-fade-in-up {
          animation: fadeInUp 1s ease-out;
        }
        
        .animate-fade-in-down {
          animation: fadeInDown 1s ease-out;
        }
        
        .animation-delay-300 {
          animation-delay: 300ms;
        }
        
        .animation-delay-600 {
          animation-delay: 600ms;
        }
        
        body {
          font-family: 'Montserrat', sans-serif;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;