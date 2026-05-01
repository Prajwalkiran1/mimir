import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Upload, 
  FileVideo, 
  Clock, 
  FileText, 
  Download, 
  Settings,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  X,
  ChevronRight,
  Brain,
  Languages,
  Image,
  Search
} from 'lucide-react';
import { apiService } from '../services/api';

const VideoUpload = () => {
  const [videoFile, setVideoFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [results, setResults] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({
    subtitles: true,
    transcript: true,
    summary: true,
    keyframes: false,
    rag: false,
    topicBased: false
  });
  const [selectedTopic, setSelectedTopic] = useState('');
  const [downloadFormat, setDownloadFormat] = useState('srt');
  const [taskId, setTaskId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setResults(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setResults(null);
    }
  };

  const handleOptionChange = (option) => {
    setSelectedOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  const handleProcess = async () => {
    if (!videoFile) return;
    
    setIsProcessing(true);
    setResults(null);
    setError(null);
    setProgress(0);
    
    // Add fallback progress display in case of network issues
    const fallbackInterval = setInterval(() => {
      setProcessingStep(prev => {
        if (prev.includes('Processing')) {
          return 'Processing...';
        }
        return 'Processing...';
      });
    }, 5000);
    
    try {
      // Prepare processing options
      const options = {
        transcript: selectedOptions.transcript,
        summary: selectedOptions.summary,
        subtitles: selectedOptions.subtitles,
        keyframes: selectedOptions.keyframes,
        rag: selectedOptions.rag,
        topic_based: selectedOptions.topicBased,
        topic: selectedOptions.topicBased ? selectedTopic : null,
        download_format: downloadFormat,
        use_gpu: true
      };

      // Upload video and start processing
      const response = await apiService.uploadVideo(videoFile, options);
      setTaskId(response.task_id);
      
      // Start polling for status updates
      apiService.pollStatus(response.task_id, (status) => {
        console.log('Frontend received status update:', status);
        
        // Always update progress and step to maintain UI state
        setProcessingStep(status.current_step || 'Processing...');
        setProgress(status.progress || 0);
        
        // Handle different status scenarios
        if (status.status === 'completed') {
          console.log('Task completed, setting results:', status.results);
          
          // Format results for display
          const rawSummary = status.results?.summary;
          const formattedResults = {
            transcript: status.results?.transcript?.segments
              ? status.results.transcript.segments.map(seg => seg.text).join(' ')
              : status.results?.transcript || 'No transcript available',
            summary: {
              text: rawSummary?.summary || (typeof rawSummary === 'string' ? rawSummary : 'No summary available'),
              key_points: rawSummary?.key_points || [],
              summary_type: rawSummary?.summary_type || 'extractive',
              topic: rawSummary?.topic,
              method: rawSummary?.method,
              relevant_segments_found: rawSummary?.relevant_segments_found,
              total_segments_analyzed: rawSummary?.total_segments_analyzed,
            },
            subtitles: status.results?.subtitles?.subtitles || status.results?.subtitles || 'No subtitles available',
            keyframes: status.results?.keyframes?.keyframes
              ? status.results.keyframes.keyframes.map(kf => ({
                  ...kf,
                  path: kf.frame_path || kf.path || 'unknown'
                }))
              : [],
            rag: status.results?.rag || null
          };
          
          console.log('Formatted results:', formattedResults);
          setResults(formattedResults);
          setIsProcessing(false);
        } else if (status.status === 'failed') {
          console.log('Task failed:', status.error);
          setError(status.error || 'Processing failed');
          setIsProcessing(false);
        } else if (status.status === 'error') {
          console.log('Task error:', status.error);
          setError(status.error || 'Processing error occurred');
          setIsProcessing(false);
        }
        // For 'processing' and 'queued' status, just keep the current state
      });
      
    } catch (error) {
      console.error('Processing error:', error);
      setError(error.message || 'Failed to start processing');
      setIsProcessing(false);
    } finally {
      // Clean up fallback interval
      clearInterval(fallbackInterval);
    }
  };

  const handleDownload = (type) => {
    let content = '';
    let filename = '';
    
    switch(type) {
      case 'transcript':
        content = typeof results.transcript === 'string' 
          ? results.transcript 
          : results.transcript?.segments?.map(seg => seg.text).join(' ') || 'No transcript available';
        filename = `transcript_${videoFile.name.replace(/\.[^/.]+$/, '')}.txt`;
        break;
      case 'subtitles':
        content = typeof results.subtitles === 'string' 
          ? results.subtitles 
          : results.subtitles?.subtitles || 'No subtitles available';
        filename = `subtitles_${videoFile.name.replace(/\.[^/.]+$/, '')}.srt`;
        break;
      case 'summary':
        content = typeof results.summary === 'string'
          ? results.summary
          : (results.summary?.text || 'No summary available');
        if (results.summary?.key_points?.length) {
          content += '\n\nKey Points:\n' + results.summary.key_points.map(p => `• ${p}`).join('\n');
        }
        filename = `summary_${videoFile.name.replace(/\.[^/.]+$/, '')}.txt`;
        break;
      case 'keyframes':
        const keyframes = Array.isArray(results.keyframes) 
          ? results.keyframes 
          : results.keyframes?.keyframes || [];
        content = keyframes.map(kf => `${kf.timestamp || kf.time}: ${kf.description || 'Keyframe'} (${kf.path || kf.frame_path || 'unknown path'})`).join('\n');
        filename = `keyframes_${videoFile.name.replace(/\.[^/.]+$/, '')}.txt`;
        break;
      case 'rag':
        content = results.rag?.summary?.summary || results.rag?.summary || 'No RAG summary available';
        filename = `rag_summary_${videoFile.name.replace(/\.[^/.]+$/, '')}.txt`;
        break;
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetUpload = () => {
    setVideoFile(null);
    setResults(null);
    setSelectedOptions({
      subtitles: true,
      transcript: true,
      summary: true,
      keyframes: false,
      rag: false,
      topicBased: false
    });
  };

  return (
    <div className="min-h-screen bg-blue-200">
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
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-mimir-blue mb-4">Video Processing Studio</h1>
          <p className="text-xl text-gray-600">Upload your video and choose processing options</p>
        </div>

        {!videoFile && (
          <div className="max-w-2xl mx-auto">
            <div
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
                isDragging ? 'border-yellow-400 bg-yellow-50' : 'border-blue-400 bg-white hover:bg-gray-50'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <Upload className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Upload Your Video</h3>
              <p className="text-gray-600 mb-4">Drag and drop or click to select</p>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                className="hidden"
                id="video-upload"
              />
              <label
                htmlFor="video-upload"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer inline-flex items-center shadow-lg"
              >
                <FileVideo className="w-5 h-5 mr-2" />
                Choose Video File
              </label>
            </div>
          </div>
        )}

        {videoFile && !results && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <FileVideo className="w-8 h-8 text-mimir-blue" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{videoFile.name}</h3>
                    <p className="text-gray-600">{(videoFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  onClick={resetUpload}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Processing Options</h3>
              <div className="space-y-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedOptions.subtitles}
                    onChange={() => handleOptionChange('subtitles')}
                    className="w-5 h-5 text-mimir-blue border-gray-300 rounded focus:ring-mimir-gold"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-5 h-5 text-mimir-gold" />
                      <span className="font-medium">Time-Synchronized Subtitles</span>
                    </div>
                    <p className="text-gray-600 text-sm">Generate accurate subtitles with timestamps</p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedOptions.transcript}
                    onChange={() => handleOptionChange('transcript')}
                    className="w-5 h-5 text-mimir-blue border-gray-300 rounded focus:ring-mimir-gold"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-mimir-gold" />
                      <span className="font-medium">Full Transcript</span>
                    </div>
                    <p className="text-gray-600 text-sm">Complete text transcription with speaker identification</p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedOptions.summary}
                    onChange={() => handleOptionChange('summary')}
                    className="w-5 h-5 text-mimir-blue border-gray-300 rounded focus:ring-mimir-gold"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Brain className="w-5 h-5 text-mimir-gold" />
                      <span className="font-medium">AI Summary</span>
                    </div>
                    <p className="text-gray-600 text-sm">Intelligent summary with key insights</p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedOptions.keyframes}
                    onChange={() => handleOptionChange('keyframes')}
                    className="w-5 h-5 text-mimir-blue border-gray-300 rounded focus:ring-mimir-gold"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Image className="w-5 h-5 text-mimir-gold" />
                      <span className="font-medium">Keyframe Extraction</span>
                    </div>
                    <p className="text-gray-600 text-sm">Extract important frames from the video</p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedOptions.rag}
                    onChange={() => handleOptionChange('rag')}
                    className="w-5 h-5 text-mimir-blue border-gray-300 rounded focus:ring-mimir-gold"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Brain className="w-5 h-5 text-mimir-gold" />
                      <span className="font-medium">RAG Processing</span>
                    </div>
                    <p className="text-gray-600 text-sm">Enable semantic search and Q&A capabilities</p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedOptions.topicBased}
                    onChange={() => handleOptionChange('topicBased')}
                    className="w-5 h-5 text-mimir-blue border-gray-300 rounded focus:ring-mimir-gold"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Languages className="w-5 h-5 text-mimir-gold" />
                      <span className="font-medium">Topic-Based Analysis</span>
                    </div>
                    <p className="text-gray-600 text-sm">Analyze content based on specific topics</p>
                  </div>
                </label>
              </div>

              {selectedOptions.topicBased && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Specify Topic (Optional)
                  </label>
                  <input
                    type="text"
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    placeholder="e.g., machine learning, business strategy, etc."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mimir-gold focus:border-transparent"
                  />
                </div>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-100 border border-red-400 rounded-xl p-4 mb-6">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                  <h3 className="text-lg font-semibold text-red-800">Processing Error</h3>
                </div>
                <p className="text-red-700 mt-2">{error}</p>
              </div>
            )}

            {/* Progress Bar */}
            {isProcessing && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-800">Processing Progress</h4>
                  <span className="text-sm text-gray-600 font-bold">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                  <div 
                    className="bg-gradient-to-r from-mimir-blue to-mimir-gold h-4 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.max(progress, 5)}%` }}
                  ></div>
                </div>
                <p className="text-gray-700 text-center font-medium">{processingStep}</p>
                <div className="flex justify-between text-xs mt-3 px-1">
                  {[['Transcribing', 10], ['Summarizing', 45], ['Extracting', 60], ['Indexing', 80]].map(([label, threshold]) => (
                    <span key={label} className={progress >= threshold ? 'text-mimir-blue font-semibold' : 'text-gray-400'}>{label}</span>
                  ))}
                </div>
                <div className="mt-3 text-center">
                  <div className="inline-flex items-center space-x-2 text-sm text-gray-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Processing in progress...</span>
                  </div>
                </div>
              </div>
            )}

            <div className="text-center">
              <button
                onClick={handleProcess}
                disabled={isProcessing}
                className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center mx-auto shadow-lg"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {processingStep}
                  </>
                ) : (
                  <>
                    <Settings className="w-5 h-5 mr-2" />
                    Start Processing
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {results && (
          <div className="max-w-6xl mx-auto">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-semibold text-green-700">Processing Complete!</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {selectedOptions.transcript && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-mimir-blue flex items-center">
                      <FileText className="w-5 h-5 mr-2" />
                      Transcript
                    </h4>
                    <button
                      onClick={() => handleDownload('transcript')}
                      className="text-mimir-gold hover:text-yellow-600 transition-colors"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">{results.transcript}</pre>
                  </div>
                </div>
              )}

              {selectedOptions.subtitles && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-mimir-blue flex items-center">
                      <Clock className="w-5 h-5 mr-2" />
                      Subtitles (SRT)
                    </h4>
                    <button
                      onClick={() => handleDownload('subtitles')}
                      className="text-mimir-gold hover:text-yellow-600 transition-colors"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">{results.subtitles}</pre>
                  </div>
                </div>
              )}

              {(selectedOptions.summary || selectedOptions.topicBased) && results.summary && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Brain className="w-5 h-5 mr-2 text-mimir-blue" />
                      <div>
                        <h4 className="text-lg font-semibold text-mimir-blue">
                          {selectedOptions.topicBased ? 'Topic-Based Analysis' : 'AI Summary'}
                        </h4>
                        {results.summary.topic && (
                          <p className="text-xs text-gray-500 mt-1">Topic: {results.summary.topic}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        results.summary.summary_type === 'gemini'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {results.summary.summary_type === 'gemini' ? 'Gemini AI' : 'Extractive'}
                      </span>
                      <button
                        onClick={() => handleDownload('summary')}
                        className="text-mimir-gold hover:text-yellow-600 transition-colors"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {results.summary.text}
                    </p>
                    {results.summary.key_points?.length > 0 && (
                      <ul className="mt-3 space-y-1 border-t border-gray-200 pt-3">
                        {results.summary.key_points.map((point, i) => (
                          <li key={i} className="flex items-start text-sm text-gray-700">
                            <span className="text-mimir-gold font-bold mr-2 mt-0.5">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {selectedOptions.keyframes && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-mimir-blue flex items-center">
                      <Image className="w-5 h-5 mr-2" />
                      Keyframes
                    </h4>
                    <button
                      onClick={() => handleDownload('keyframes')}
                      className="text-mimir-gold hover:text-yellow-600 transition-colors"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                    {results.keyframes.map((kf, index) => (
                      <div key={index} className="mb-2">
                        <span className="font-medium text-mimir-blue">{kf.timestamp}</span>
                        <span className="text-gray-700 ml-2">{kf.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedOptions.rag && results.rag && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Brain className="w-5 h-5 mr-2 text-mimir-blue" />
                      <div>
                        <h4 className="text-lg font-semibold text-mimir-blue">RAG Summary</h4>
                        {results.rag.summary?.video_title && (
                          <p className="text-xs text-gray-500 mt-1">{results.rag.summary.video_title}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {results.rag.summary?.method && (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          results.rag.summary.method === 'gemini'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {results.rag.summary.method === 'gemini' ? 'Gemini AI' : 'Extractive'}
                        </span>
                      )}
                      <Link
                        to="/search"
                        className="text-mimir-gold hover:text-yellow-600 transition-colors inline-flex items-center text-sm"
                      >
                        <Search className="w-4 h-4 mr-1" />
                        Search
                      </Link>
                      <button
                        onClick={() => handleDownload('rag')}
                        className="text-mimir-gold hover:text-yellow-600 transition-colors"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {results.rag.summary?.summary || results.rag.summary || 'No RAG summary available'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="text-center space-x-4">
              <button
                onClick={resetUpload}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
              >
                <RotateCcw className="w-5 h-5 inline mr-2" />
                Process Another Video
              </button>
              <Link
                to="/profile"
                className="bg-yellow-500 text-blue-900 px-6 py-3 rounded-lg font-semibold hover:bg-yellow-600 transition-colors inline-flex items-center shadow-lg"
              >
                View History
                <ChevronRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoUpload;
