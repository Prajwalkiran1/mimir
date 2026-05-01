import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Brain,
  Video, 
  FileText, 
  Download, 
  Upload,
  Clock,
  Mic,
  FileVideo,
  Languages,
  Zap, 
  Shield, 
  Globe,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
  Play,
  User,
  LogOut
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const LandingPage = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const features = [
    {
      icon: <Brain className="w-8 h-8" />,
      title: "AI-Powered Transcription",
      description: "Advanced deep learning models provide accurate video transcription with speaker identification"
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Time-Synchronized Subtitles",
      description: "Perfectly timed subtitles that sync with your video content automatically"
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Intelligent Summarization",
      description: "RAG-based summarization with keyframe extraction for comprehensive video understanding"
    },
    {
      icon: <Languages className="w-8 h-8" />,
      title: "Topic-Based Analysis",
      description: "Summarize content based on specific topics with cross-modal reasoning"
    },
    {
      icon: <Download className="w-8 h-8" />,
      title: "Multiple Formats",
      description: "Download transcripts, subtitles, and summaries in various formats"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Secure & Private",
      description: "Enterprise-grade security with end-to-end encryption"
    }
  ];

  
  return (
    <div className="min-h-screen bg-mimir-blue">
      {/* Navigation */}
      <nav className="bg-blue-950 border border-blue-800 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/landing" className="flex items-center space-x-6">
                <img src="/logo.png" alt="Mimir" className="w-12 h-12 rounded-full border-4" style={{borderColor: '#0f172a'}} />
                <span className="text-3xl font-bold text-yellow-400" style={{fontFamily: '"Cinzel Decorative", cursive'}}>Mimir</span>
              </Link>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-white hover:text-yellow-400 transition-colors font-medium">Features</a>
              <a href="#how-it-works" className="text-white hover:text-yellow-400 transition-colors font-medium">How It Works</a>
              <a href="#contact" className="text-white hover:text-yellow-400 transition-colors font-medium">Contact</a>
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <Link 
                    to="/profile" 
                    className="flex items-center space-x-2 text-white hover:text-yellow-400 transition-colors font-medium"
                  >
                    <User className="w-4 h-4" />
                    <span>{user?.username}</span>
                  </Link>
                  <button
                    onClick={logout}
                    className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium shadow-lg"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <Link 
                  to="/login" 
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-mimir-blue to-blue-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl font-bold text-black mb-6">
                Transform Videos into
                <span className="text-black"> Intelligent Content</span>
              </h1>
              <p className="text-xl text-black mb-8">
                Advanced AI-powered video transcription, subtitle generation, and intelligent summarization. 
                Unlock the full potential of your video content with cutting-edge deep learning technology.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  to="/upload"
                  className="bg-yellow-400 text-black px-8 py-4 rounded-lg font-semibold hover:bg-yellow-500 transition-colors flex items-center justify-center shadow-lg"
                >
                  Upload Video Now
                  <Upload className="w-5 h-5 ml-2" />
                </Link>
                <Link 
                  to="/search"
                  className="bg-blue-500 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center shadow-lg"
                >
                  Search Videos
                  <Brain className="w-5 h-5 ml-2" />
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                    <Video className="w-12 h-12 text-black mb-2" />
                    <h3 className="text-black font-semibold">Video Upload</h3>
                    <p className="text-black text-sm">Drag & drop your video files</p>
                  </div>
                  <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                    <Mic className="w-12 h-12 text-black mb-2" />
                    <h3 className="text-black font-semibold">Transcription</h3>
                    <p className="text-black text-sm">99.5% accuracy guaranteed</p>
                  </div>
                  <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                    <FileText className="w-12 h-12 text-black mb-2" />
                    <h3 className="text-black font-semibold">Summarization</h3>
                    <p className="text-black text-sm">AI-powered insights</p>
                  </div>
                  <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                    <Download className="w-12 h-12 text-black mb-2" />
                    <h3 className="text-black font-semibold">Export</h3>
                    <p className="text-black text-sm">Multiple formats available</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      
      {/* Features Section */}
      <section id="features" className="py-20 bg-blue-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-yellow-400 mb-4">
              Powerful Features for Modern Video Analysis
            </h2>
            <p className="text-xl text-white max-w-3xl mx-auto">
              Leverage cutting-edge AI technology to extract maximum value from your video content
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-blue-900 rounded-xl shadow-lg p-8 border border-blue-700 hover:shadow-xl transition-shadow">
                <div className="text-yellow-400 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-200">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-blue-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-yellow-400 mb-4">How Mimir Works</h2>
            <p className="text-xl text-white">Simple three-step process to transform your videos</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileVideo className="w-8 h-8 text-yellow-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">1. Upload Video</h3>
              <p className="text-gray-200">Upload your video file in any format</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-yellow-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">2. AI Processing</h3>
              <p className="text-gray-200">Our AI analyzes and processes your content</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download className="w-8 h-8 text-yellow-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">3. Download Results</h3>
              <p className="text-gray-200">Get your transcripts, subtitles, and summaries</p>
            </div>
          </div>
        </div>
      </section>

      
      {/* Contact Section */}
      <section id="contact" className="py-20 bg-blue-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-yellow-400 mb-4">Get in Touch</h2>
            <p className="text-xl text-white">We'd love to hear from you</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <Mail className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Email</h3>
              <p className="text-gray-200">support@mimir.ai</p>
            </div>
            <div className="text-center">
              <Phone className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Phone</h3>
              <p className="text-gray-200">+1 (555) 123-4567</p>
            </div>
            <div className="text-center">
              <MapPin className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Office</h3>
              <p className="text-gray-200">San Francisco, CA</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-mimir-blue py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <img src="/logo.png" alt="Mimir" className="w-12 h-12 rounded-full border-4" style={{borderColor: '#0f172a'}} />
                <span className="text-xl font-bold text-black">Mimir</span>
              </div>
              <p className="text-black">Transforming video content with AI-powered intelligence.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-black">Quick Links</h4>
              <ul className="space-y-2 text-black">
                <li><a href="#features" className="hover:text-gray-800 transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-gray-800 transition-colors">How It Works</a></li>
                <li><a href="#contact" className="hover:text-gray-800 transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-600 mt-8 pt-8 text-center">
            <p className="text-black">&copy; 2026 Mimir. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
