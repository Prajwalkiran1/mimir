import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Calendar, 
  FileVideo, 
  Download, 
  Clock,
  Search,
  Filter,
  Eye,
  Trash2,
  Settings,
  LogOut,
  ChevronRight,
  Brain,
  FileText,
  Image,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Profile = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [tasks, setTasks] = useState([]);
  const { user, logout } = useAuth();

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('http://localhost:8000/api/v1/tasks', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(data => setTasks(data.tasks || []))
      .catch(() => {});
  }, []);

  const userData = {
    name: user?.username || 'User',
    email: user?.email || 'user@example.com',
    joinDate: user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }) : 'Recently',
    totalVideos: tasks.filter(t => t.status === 'completed').length,
    totalMinutes: 0,
    storageUsed: '0 MB',
  };

  const pastGenerations = tasks.map(t => ({
    id: t.task_id,
    filename: t.video_path || t.task_id,
    date: t.created_at ? new Date(t.created_at).toLocaleDateString() : '',
    duration: '-',
    size: '-',
    type: t.results?.transcript ? 'transcript' : t.results?.summary ? 'summary' : t.results?.subtitles ? 'subtitles' : t.results?.keyframes ? 'keyframes' : 'full',
    status: t.status,
    thumbnail: '📹',
  }));

  const filteredGenerations = pastGenerations.filter(gen => {
    const matchesSearch = gen.filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || gen.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const getTypeIcon = (type) => {
    switch(type) {
      case 'transcript': return <FileText className="w-4 h-4" />;
      case 'summary': return <Brain className="w-4 h-4" />;
      case 'subtitles': return <Clock className="w-4 h-4" />;
      case 'keyframes': return <Image className="w-4 h-4" />;
      case 'full': return <FileVideo className="w-4 h-4" />;
      default: return <FileVideo className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'transcript': return 'text-blue-600 bg-blue-100';
      case 'summary': return 'text-purple-600 bg-purple-100';
      case 'subtitles': return 'text-green-600 bg-green-100';
      case 'keyframes': return 'text-orange-600 bg-orange-100';
      case 'full': return 'text-indigo-600 bg-indigo-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-mimir-white">
      {/* Navigation */}
      <nav className="bg-blue-950 border border-blue-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/landing" className="flex items-center space-x-4">
                <img src="/logo.png" alt="Mimir" className="w-12 h-12 rounded-full border-4" style={{borderColor: '#0f172a'}} />
                <span className="text-3xl font-bold text-yellow-400" style={{fontFamily: '"Cinzel Decorative", cursive'}}>Mimir</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/upload" className="text-white hover:text-yellow-400 transition-colors">
                Upload
              </Link>
              <Link to="/landing" className="text-white hover:text-yellow-400 transition-colors">
                Home
              </Link>
              <button 
                onClick={logout}
                className="flex items-center space-x-2 text-white hover:text-red-400 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-6">
            <div className="w-24 h-24 bg-mimir-blue rounded-full flex items-center justify-center">
              <User className="w-12 h-12 text-mimir-gold" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-mimir-blue mb-2">{userData.name}</h1>
              <div className="flex items-center space-x-4 text-gray-600">
                <div className="flex items-center space-x-1">
                  <Mail className="w-4 h-4" />
                  <span>{userData.email}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>Member since {userData.joinDate}</span>
                </div>
              </div>
            </div>
            <button className="bg-mimir-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
              <Settings className="w-4 h-4 mr-2" />
              Edit Profile
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-mimir-blue">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Videos</p>
                <p className="text-2xl font-bold text-mimir-blue">{userData.totalVideos}</p>
              </div>
              <FileVideo className="w-8 h-8 text-mimir-gold" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-mimir-gold">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Minutes</p>
                <p className="text-2xl font-bold text-mimir-blue">{userData.totalMinutes}</p>
              </div>
              <Clock className="w-8 h-8 text-mimir-gold" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Storage Used</p>
                <p className="text-2xl font-bold text-mimir-blue">{userData.storageUsed}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-mimir-gold" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Downloads</p>
                <p className="text-2xl font-bold text-mimir-blue">128</p>
              </div>
              <Download className="w-8 h-8 text-mimir-gold" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'overview'
                    ? 'border-mimir-blue text-mimir-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'history'
                    ? 'border-mimir-blue text-mimir-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Processing History
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'settings'
                    ? 'border-mimir-blue text-mimir-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Settings
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-mimir-blue mb-4">Account Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Account Information</h4>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Email:</dt>
                        <dd className="font-medium">{userData.email}</dd>
                      </div>
                                            <div className="flex justify-between">
                        <dt className="text-gray-600">Member Since:</dt>
                        <dd className="font-medium">{userData.joinDate}</dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Usage Statistics</h4>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Videos Processed:</dt>
                        <dd className="font-medium">{userData.totalVideos}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Total Duration:</dt>
                        <dd className="font-medium">{userData.totalMinutes} minutes</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Storage Used:</dt>
                        <dd className="font-medium">{userData.storageUsed}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="text-xl font-semibold text-mimir-blue">Processing History</h3>
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search files..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mimir-gold focus:border-transparent w-full sm:w-64"
                      />
                    </div>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mimir-gold focus:border-transparent"
                    >
                      <option value="all">All Types</option>
                      <option value="transcript">Transcripts</option>
                      <option value="summary">Summaries</option>
                      <option value="subtitles">Subtitles</option>
                      <option value="keyframes">Keyframes</option>
                      <option value="full">Full Processing</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredGenerations.map((generation) => (
                    <div key={generation.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-2xl">{generation.thumbnail}</div>
                          <div>
                            <h4 className="font-medium text-mimir-blue">{generation.filename}</h4>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span>{generation.date}</span>
                              <span>•</span>
                              <span>{generation.duration}</span>
                              <span>•</span>
                              <span>{generation.size}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getTypeColor(generation.type)}`}>
                            {getTypeIcon(generation.type)}
                            <span>{generation.type}</span>
                          </span>
                          <button className="text-mimir-gold hover:text-yellow-600 transition-colors">
                            <Eye className="w-5 h-5" />
                          </button>
                          <button className="text-mimir-blue hover:text-blue-700 transition-colors">
                            <Download className="w-5 h-5" />
                          </button>
                          <button className="text-red-500 hover:text-red-700 transition-colors">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-mimir-blue mb-4">Account Settings</h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Notification Preferences</h4>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" defaultChecked className="w-4 h-4 text-mimir-blue border-gray-300 rounded focus:ring-mimir-gold" />
                        <span className="text-gray-700">Email notifications for processing completion</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" defaultChecked className="w-4 h-4 text-mimir-blue border-gray-300 rounded focus:ring-mimir-gold" />
                        <span className="text-gray-700">Weekly usage reports</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="w-4 h-4 text-mimir-blue border-gray-300 rounded focus:ring-mimir-gold" />
                        <span className="text-gray-700">Product updates and new features</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Processing Preferences</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Default Language</label>
                        <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mimir-gold focus:border-transparent">
                          <option>English</option>
                          <option>Spanish</option>
                          <option>French</option>
                          <option>German</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Default Output Format</label>
                        <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mimir-gold focus:border-transparent">
                          <option>SRT</option>
                          <option>VTT</option>
                          <option>TXT</option>
                          <option>PDF</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4">
                    <button className="bg-mimir-blue text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
