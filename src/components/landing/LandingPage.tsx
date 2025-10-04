import React, { useState } from 'react';
import { BookHeart, ChevronDown, HelpCircle, Smile, Mic, Feather, Star, Heart, Shield, Users, Clock, Camera } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { validateEmail } from '../../lib/utils';

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

const LoginModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      setError('Email inválido');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    const result = await signIn(email, password);
    
    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'Error al iniciar sesión');
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-[#424B54]">Iniciar Sesión</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C57B57]"
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C57B57]"
            required
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C57B57] text-white py-2 rounded-lg hover:bg-[#B86A4A] transition-colors disabled:opacity-50"
          >
            {loading ? 'Iniciando...' : 'Iniciar Sesión'}
          </button>
        </form>
        <button
          onClick={onClose}
          className="mt-4 w-full text-gray-600 hover:text-gray-800"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

const RegisterModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      setError('Email inválido');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    const result = await signUp(email, password);
    
    if (result.success) {
      setError('Cuenta creada exitosamente. Puedes iniciar sesión ahora.');
      setTimeout(() => {
        onClose();
        setError('');
      }, 2000);
    } else {
      setError(result.error || 'Error al crear cuenta');
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-[#424B54]">Crear Cuenta</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C57B57]"
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C57B57]"
            required
          />
          <input
            type="password"
            placeholder="Confirmar Contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C57B57]"
            required
          />
          {error && (
            <p className={`text-sm ${error.includes('exitosamente') ? 'text-green-600' : 'text-red-600'}`}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C57B57] text-white py-2 rounded-lg hover:bg-[#B86A4A] transition-colors disabled:opacity-50"
          >
            {loading ? 'Creando...' : 'Crear Cuenta'}
          </button>
        </form>
        <button
          onClick={onClose}
          className="mt-4 w-full text-gray-600 hover:text-gray-800"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

const LandingPage: React.FC = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

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
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.pexels.com/photos/3184306/pexels-photo-3184306.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1280&fit=crop)'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 via-blue-800/60 to-teal-800/80" />
        </div>

        {/* Logo - Top Left */}
        <div className="absolute top-6 left-6 z-20">
          <span className="text-2xl font-bold text-white">Ethernal</span>
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
              onClick={() => setIsRegisterModalOpen(true)}
              className="bg-[#C57B57] text-white text-xl px-8 py-4 rounded-lg hover:bg-[#B86A4A] transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Empezar
            </button>
            
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="text-white hover:text-blue-200 underline"
            >
              ¿Ya tienes una cuenta? Inicia sesión
            </button>
          </div>
        </div>

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
            onClick={() => setIsRegisterModalOpen(true)}
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

      {/* Modals */}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <RegisterModal isOpen={isRegisterModalOpen} onClose={() => setIsRegisterModalOpen(false)} />

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