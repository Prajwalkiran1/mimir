import React, { useState } from 'react';

const Profile = ({ isLogin }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
      <div className="max-w-4xl w-full flex bg-white rounded-2xl shadow-2xl overflow-hidden border border-blue-100">
        {/* Left Side: Branding */}
        <div className="hidden md:flex md:w-1/2 bg-blue-900 p-12 flex-col justify-between text-white">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">MIMIR</h1>
            <p className="mt-4 text-blue-200">The Eye of Wisdom: Advanced Multimodal Video RAG.</p>
          </div>
          <div className="border-l-4 border-gold-500 pl-4 italic text-sm text-blue-100">
            "Knowledge is synchronized, wisdom is synthesized."
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-1/2 p-12">
          <h2 className="text-2xl font-bold text-blue-900 mb-8">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <form className="space-y-4">
            {!isLogin && (
              <input type="text" placeholder="Full Name" className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none" />
            )}
            <input type="email" placeholder="Email" className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none" />
            <input type="password" placeholder="Password" className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none" />
            
            <button className="w-full bg-blue-900 text-white font-bold py-3 rounded-lg hover:bg-blue-800 transition-colors shadow-lg shadow-blue-200">
              {isLogin ? 'Sign In' : 'Join Mimir'}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-500">
            {isLogin ? "Don't have an account?" : "Already a member?"} 
            <span className="text-blue-900 font-bold cursor-pointer ml-1 underline decoration-gold-500">
              {isLogin ? 'Sign up' : 'Log in'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Profile;