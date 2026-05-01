const Dashboard = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col justify-between">
        <div className="space-y-8">
          <div className="text-2xl font-black text-blue-900 italic">MIMIR</div>
          <nav className="space-y-4">
            <div className="flex items-center text-blue-900 font-bold bg-blue-50 p-3 rounded-lg"><span className="mr-3">📁</span> Dashboard</div>
            <div className="flex items-center text-gray-500 hover:text-blue-900 p-3"><span className="mr-3">👤</span> Profile</div>
            <div className="flex items-center text-gray-500 hover:text-blue-900 p-3"><span className="mr-3">⚙️</span> Settings</div>
          </nav>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 p-10 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-bold text-blue-900">New Generation</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-blue-800 bg-blue-100 px-3 py-1 rounded-full border border-blue-200">RAG Engine: Active</span>
          </div>
        </header>

        {/* Upload & Options Area */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Upload Zone */}
            <div className="border-2 border-dashed border-blue-200 bg-white rounded-3xl p-12 text-center hover:border-gold-500 transition-colors group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🎥</div>
              <p className="text-lg font-semibold text-blue-900">Drag and drop video here</p>
              <p className="text-gray-400 text-sm mb-6">MP4, MKV, AVI (Max 500MB)</p>
              <button className="bg-blue-900 text-white px-6 py-2 rounded-lg font-medium">Browse Files</button>
            </div>

            {/* Processing Controls */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <h3 className="font-bold text-blue-900 mb-6">Select Output Components</h3>
              <div className="grid grid-cols-2 gap-4">
                {['Subtitles (.srt)', 'Transcript (.json)', 'Summary with Keyframes', 'Topic-based Synthesis'].map((item) => (
                  <label key={item} className="flex items-center p-4 border border-gray-100 rounded-xl hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" className="mr-3 h-5 w-5 accent-blue-900" />
                    <span className="text-sm font-medium text-gray-700">{item}</span>
                  </label>
                ))}
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-100">
                <p className="text-sm font-bold text-blue-900 mb-2">Topic-Specific Focus (Optional)</p>
                <input type="text" placeholder="e.g., Explain the financial risks discussed..." className="w-full p-4 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-gold-500" />
              </div>
              
              <button className="w-full mt-8 bg-gradient-to-r from-blue-900 to-blue-700 text-white py-4 rounded-xl font-bold shadow-lg">
                Process with Mimir AI
              </button>
            </div>
          </div>

          {/* Export Sidebar */}
          <div className="bg-white rounded-3xl p-8 border border-blue-100 shadow-sm h-fit">
            <h3 className="font-bold text-blue-900 mb-4 italic">Export Options</h3>
            <div className="space-y-3">
              {['PDF Report', 'Word Document', 'Markdown', 'JSON Data'].map(format => (
                <button key={format} className="w-full text-left p-3 rounded-lg hover:bg-gold-50 text-gray-600 hover:text-blue-900 transition font-medium border border-transparent hover:border-gold-200">
                  ⬇️ Download as {format}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;