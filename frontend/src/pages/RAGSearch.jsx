import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Brain, 
  Clock, 
  FileText, 
  Play,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Network,
  Database
} from 'lucide-react';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const RAGSearch = () => {
  const { user } = useAuth();
  const token = localStorage.getItem('token');
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('hybrid');
  const [results, setResults] = useState([]);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState('all');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [error, setError] = useState(null);
  const [topK, setTopK] = useState(5);

  // Load available videos on component mount
  useEffect(() => {
    loadRAGVideos();
  }, []);

  const loadRAGVideos = async () => {
    try {
      setIsLoadingVideos(true);
      const response = await apiService.get('/api/v1/rag/videos', token);
      setVideos(response.videos || []);
      setError(null);
    } catch (error) {
      console.error('Failed to load RAG videos:', error);
      setError('Failed to load videos. Make sure some videos have been processed with RAG enabled.');
    } finally {
      setIsLoadingVideos(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      let response;
      
      if (selectedVideo === 'all') {
        response = await apiService.post('/api/v1/rag/search', {
          query: query.trim(),
          video_ids: videos.length > 0 ? videos.map(v => v.video_id) : undefined,
          top_k: topK,
          search_type: searchType,
        }, token);
      } else {
        response = await apiService.post('/api/v1/rag/query', {
          query: query.trim(),
          video_id: selectedVideo,
          top_k: topK,
          expand_temporal: true,
          include_explanations: true,
        }, token);
      }

      setResults(response.results || []);
    } catch (error) {
      console.error('Search failed:', error);
      setError(error.message || 'Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getVideoName = (videoId) => {
    const video = videos.find(v => v.video_id === videoId);
    return video ? video.filename : videoId;
  };

  const openVideoAtTime = (videoId, timeStart) => {
    // This would open the video player at the specific timestamp
    // For now, we'll just log it
    console.log(`Opening video ${videoId} at time ${timeStart}`);
    // TODO: Implement video player integration
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center">
            <Brain className="w-10 h-10 mr-3 text-yellow-400" />
            Semantic Video Search
          </h1>
          <p className="text-gray-300 text-lg">
            Search video content using natural language queries powered by AI
          </p>
        </div>

        {/* Back to Upload */}
        <div className="mb-6">
          <Link 
            to="/upload" 
            className="inline-flex items-center text-blue-300 hover:text-blue-200 transition-colors"
          >
            ← Back to Video Upload
          </Link>
        </div>

        {/* Search Form */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8">
          <form onSubmit={handleSearch} className="space-y-6">
            {/* Query Input */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Search Query
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask anything about the video content..."
                  className="w-full pl-10 pr-4 py-3 bg-white/20 border border-gray-400 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                />
              </div>
            </div>

            {/* Search Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Video Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Video
                </label>
                <select
                  value={selectedVideo}
                  onChange={(e) => setSelectedVideo(e.target.value)}
                  className="w-full px-4 py-2 bg-white/20 border border-gray-400 rounded-lg text-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                >
                  <option value="all">All Videos</option>
                  {videos.map((video) => (
                    <option key={video.video_id} value={video.video_id}>
                      {video.filename}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Type */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Search Type
                </label>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="w-full px-4 py-2 bg-white/20 border border-gray-400 rounded-lg text-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                >
                  <option value="hybrid">Hybrid (Recommended)</option>
                  <option value="vector">Semantic Search</option>
                  <option value="graph">Knowledge Graph</option>
                </select>
              </div>

              {/* Number of Results */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Number of Results
                </label>
                <select
                  value={topK}
                  onChange={(e) => setTopK(parseInt(e.target.value))}
                  className="w-full px-4 py-2 bg-white/20 border border-gray-400 rounded-lg text-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                >
                  <option value={3}>3 Results</option>
                  <option value={5}>5 Results</option>
                  <option value={10}>10 Results</option>
                  <option value={20}>20 Results</option>
                </select>
              </div>
            </div>

            {/* Search Button */}
            <button
              type="submit"
              disabled={isSearching || !query.trim()}
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 font-semibold py-3 px-6 rounded-lg hover:from-yellow-500 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5 mr-2" />
                  Search Videos
                </>
              )}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
              <p className="text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* Loading Videos */}
        {isLoadingVideos && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-yellow-400 mx-auto mb-4" />
            <p className="text-gray-300">Loading available videos...</p>
          </div>
        )}

        {/* No Videos Available */}
        {!isLoadingVideos && videos.length === 0 && !error && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center">
            <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No RAG-Processed Videos</h3>
            <p className="text-gray-300 mb-4">
              Upload and process videos with RAG enabled to use semantic search.
            </p>
            <Link
              to="/upload"
              className="inline-flex items-center bg-yellow-400 text-gray-900 px-6 py-2 rounded-lg hover:bg-yellow-500 transition-colors"
            >
              Upload Video
            </Link>
          </div>
        )}

        {/* Search Results */}
        {results.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <CheckCircle className="w-6 h-6 mr-2 text-green-400" />
                Search Results
              </h2>
              <span className="text-gray-300">
                {results.length} result{results.length !== 1 ? 's' : ''} found
              </span>
            </div>

            {results.map((result, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-gray-600">
                {/* Result Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="w-5 h-5 text-yellow-400" />
                      <span className="font-semibold text-white">
                        {getVideoName(result.video_id)}
                      </span>
                      <span className="text-gray-400 text-sm">
                        at {formatTime(result.time_start)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-300">
                      <span className="flex items-center">
                        <BarChart3 className="w-4 h-4 mr-1" />
                        Score: {(result.relevance_score * 100).toFixed(1)}%
                      </span>
                      {result.score_breakdown && (
                        <>
                          <span className="flex items-center">
                            <Brain className="w-4 h-4 mr-1" />
                            Vector: {(result.score_breakdown.vector_score * 100).toFixed(1)}%
                          </span>
                          <span className="flex items-center">
                            <Network className="w-4 h-4 mr-1" />
                            Graph: {(result.score_breakdown.graph_score * 100).toFixed(1)}%
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => openVideoAtTime(result.video_id, result.time_start)}
                    className="flex items-center text-yellow-400 hover:text-yellow-300 transition-colors"
                  >
                    <Play className="w-5 h-5 mr-1" />
                    Play
                  </button>
                </div>

                {/* Result Content */}
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-gray-100 leading-relaxed">
                    {result.text}
                  </p>
                </div>

                {/* Context Type */}
                {result.context_type && (
                  <div className="mt-3">
                    <span className="inline-flex items-center px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                      {result.context_type === 'previous' ? 'Previous Context' : 'Next Context'}
                    </span>
                  </div>
                )}

                {/* Explanation */}
                {result.explanation && (
                  <div className="mt-4 bg-gray-800/30 rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Why this result?</h4>
                    <div className="text-xs text-gray-400 space-y-1">
                      <div>Vector similarity: {(result.explanation.score_breakdown.vector_search.contribution * 100).toFixed(1)}%</div>
                      <div>Graph relevance: {(result.explanation.score_breakdown.graph_search.contribution * 100).toFixed(1)}%</div>
                      <div>Text overlap: {(result.explanation.score_breakdown.text_overlap.contribution * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {!isSearching && !error && query && results.length === 0 && videos.length > 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Results Found</h3>
            <p className="text-gray-300">
              Try rephrasing your query or search with different parameters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RAGSearch;
