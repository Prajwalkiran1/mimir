import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain,
  Upload,
  FileVideo,
  Clock,
  FileText,
  Download,
  BarChart3,
  TrendingUp,
  Users,
  Play,
  ChevronRight,
  Activity,
  Zap,
  Target,
  Languages
} from 'lucide-react';

const Dashboard = () => {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('http://localhost:8000/api/v1/tasks', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(data => setTasks(data.tasks || []))
      .catch(() => {});
  }, []);

  const completedTasks = tasks.filter(t => t.status === 'completed');
  const recentActivity = tasks.slice(0, 5).map(t => ({
    id: t.task_id,
    filename: t.video_path || 'video',
    type: t.status,
    time: t.created_at ? new Date(t.created_at).toLocaleString() : '',
  }));

  const quickStats = [
    { label: 'Videos Processed', value: String(completedTasks.length), icon: <FileVideo className="w-6 h-6" />, color: 'bg-blue-500' },
    { label: 'Total Tasks', value: String(tasks.length), icon: <Clock className="w-6 h-6" />, color: 'bg-green-500' },
    { label: 'Accuracy Rate', value: '99.5%', icon: <Target className="w-6 h-6" />, color: 'bg-purple-500' },
    { label: 'Failed', value: String(tasks.filter(t => t.status === 'failed').length), icon: <Download className="w-6 h-6" />, color: 'bg-orange-500' },
  ];

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
              <Link to="/upload" className="bg-mimir-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                <Upload className="w-4 h-4 mr-2" />
                Upload Video
              </Link>
              <Link to="/profile" className="text-white hover:text-yellow-400 transition-colors">
                Profile
              </Link>
              <Link to="/landing" className="text-white hover:text-yellow-400 transition-colors">
                Home
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-mimir-blue mb-2">Welcome back to Mimir</h1>
          <p className="text-gray-600">Your video intelligence dashboard</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{stat.label}</p>
                  <p className="text-2xl font-bold text-mimir-blue">{stat.value}</p>
                </div>
                <div className={`${stat.color} text-white p-3 rounded-lg`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-mimir-blue to-blue-700 rounded-xl shadow-lg p-8 text-white">
              <h2 className="text-2xl font-bold mb-4">Start Processing Your Video</h2>
              <p className="text-blue-100 mb-6">
                Upload your video to get accurate transcription, time-synchronized subtitles, 
                and AI-powered summaries with keyframe extraction.
              </p>
              <Link
                to="/upload"
                className="bg-mimir-gold text-mimir-blue px-6 py-3 rounded-lg font-semibold hover:bg-yellow-500 transition-colors inline-flex items-center"
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload New Video
                <ChevronRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-mimir-blue mb-4 flex items-center">
              <Activity className="w-6 h-6 mr-2" />
              Recent Activity
            </h3>
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-800">{activity.filename}</p>
                    <p className="text-sm text-gray-600">{activity.type}</p>
                  </div>
                  <span className="text-sm text-gray-500">{activity.time}</span>
                </div>
              ))}
            </div>
            <Link
              to="/profile"
              className="text-mimir-blue hover:text-mimir-gold transition-colors text-sm font-medium mt-3 inline-flex items-center"
            >
              View all activity
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-semibold text-mimir-blue mb-6">Platform Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-12 h-12 bg-mimir-blue rounded-full flex items-center justify-center mx-auto mb-3">
                <Brain className="w-6 h-6 text-mimir-gold" />
              </div>
              <h4 className="font-semibold text-mimir-blue mb-2">AI Transcription</h4>
              <p className="text-gray-600 text-sm">99.5% accuracy with speaker identification</p>
            </div>
            <div className="text-center p-4 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-12 h-12 bg-mimir-blue rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-mimir-gold" />
              </div>
              <h4 className="font-semibold text-mimir-blue mb-2">Time-Synced Subtitles</h4>
              <p className="text-gray-600 text-sm">Perfectly timed subtitles in multiple formats</p>
            </div>
            <div className="text-center p-4 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-12 h-12 bg-mimir-blue rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-mimir-gold" />
              </div>
              <h4 className="font-semibold text-mimir-blue mb-2">Smart Summaries</h4>
              <p className="text-gray-600 text-sm">RAG-based summarization with keyframes</p>
            </div>
            <div className="text-center p-4 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-12 h-12 bg-mimir-blue rounded-full flex items-center justify-center mx-auto mb-3">
                <Languages className="w-6 h-6 text-mimir-gold" />
              </div>
              <h4 className="font-semibold text-mimir-blue mb-2">Multi-Language</h4>
              <p className="text-gray-600 text-sm">Support for 50+ languages</p>
            </div>
            <div className="text-center p-4 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-12 h-12 bg-mimir-blue rounded-full flex items-center justify-center mx-auto mb-3">
                <Download className="w-6 h-6 text-mimir-gold" />
              </div>
              <h4 className="font-semibold text-mimir-blue mb-2">Multiple Formats</h4>
              <p className="text-gray-600 text-sm">Export in SRT, VTT, TXT, PDF formats</p>
            </div>
            <div className="text-center p-4 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-12 h-12 bg-mimir-blue rounded-full flex items-center justify-center mx-auto mb-3">
                <Zap className="w-6 h-6 text-mimir-gold" />
              </div>
              <h4 className="font-semibold text-mimir-blue mb-2">Fast Processing</h4>
              <p className="text-gray-600 text-sm">Quick turnaround with real-time updates</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-mimir-blue mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                to="/upload"
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Upload className="w-5 h-5 text-mimir-gold" />
                  <span className="font-medium">Upload Video</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
              <Link
                to="/profile"
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <FileVideo className="w-5 h-5 text-mimir-gold" />
                  <span className="font-medium">View History</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
              <Link
                to="/landing"
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Play className="w-5 h-5 text-mimir-gold" />
                  <span className="font-medium">View Demo</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
            </div>
          </div>

          <div className="bg-gradient-to-br from-mimir-gold to-yellow-500 rounded-xl shadow-lg p-6 text-mimir-blue">
            <h3 className="text-lg font-semibold mb-4">Upgrade to Pro</h3>
            <p className="text-blue-900 mb-4">
              Get unlimited uploads, advanced features, and priority support with our Pro plan.
            </p>
            <button className="bg-mimir-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
              Learn More
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
