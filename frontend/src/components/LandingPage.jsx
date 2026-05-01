import React from 'react';

const LandingPage = ({ onStart }) => {
  return (
    <div className="bg-white">
      {/* Navbar */}
      <h1 className="bg-red-500 text-white text-9xl">TESTING TAILWIND</h1>
      <nav className="flex justify-between items-center px-10 py-6 border-b border-gray-100 sticky top-0 bg-white z-50">
        <div className="text-2xl font-black text-blue-900 tracking-tighter italic">MIMIR</div>
        <div className="space-x-8 text-blue-900 font-medium">
          <a href="#features" className="hover:text-gold-600 transition">Tech Stack</a>
          <a href="#contact" className="hover:text-gold-600 transition">Contact</a>
          <button className="bg-blue-900 text-white px-6 py-2 rounded-full hover:bg-blue-800">Launch App</button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-10 py-24 text-center bg-gradient-to-b from-slate-50 to-white">
        <h1 className="text-6xl font-bold text-blue-900 mb-6">
          Intelligence Beyond the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-900 to-yellow-600">Timeline.</span>
        </h1>
        <p className="max-w-2xl mx-auto text-gray-600 text-lg mb-10 leading-relaxed">
          Leveraging dual-channel hybrid indexing and graph-based multimodal fusion for deeper video understanding.
        </p>
        <div className="flex justify-center gap-4">
          <button className="bg-blue-900 text-white px-8 py-4 rounded-xl font-bold hover:shadow-xl transition transform hover:-translate-y-1">Start Processing</button>
          <button className="border-2 border-blue-900 text-blue-900 px-8 py-4 rounded-xl font-bold hover:bg-blue-50 transition">View Documentation</button>
        </div>
      </section>

      {/* Technical Features Grid */}
      <section id="features" className="px-10 py-20 bg-blue-900 text-white">
        <div className="grid md:grid-cols-3 gap-12">
          {[
            { title: "Semantic Transcription", desc: "Time-synchronized transcripts with informativeness scoring." },
            { title: "Dual-Channel RAG", desc: "Hybrid indexing engine optimized for long-context cross-modal reasoning." },
            { title: "Graph Fusion", desc: "Multimodal fusion techniques to improve cross-modal summarization." }
          ].map((feature, i) => (
            <div key={i} className="p-8 border-l-2 border-gold-500 bg-blue-800/30">
              <h3 className="text-xl font-bold mb-4 text-gold-400">{feature.title}</h3>
              <p className="text-blue-100 text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <button 
        onClick={onStart} 
        className="bg-blue-900 text-white px-8 py-4 rounded-xl font-bold hover:shadow-xl transition transform hover:-translate-y-1"
      >
        Start Processing
      </button>
    </div>

  );
};

export default LandingPage;