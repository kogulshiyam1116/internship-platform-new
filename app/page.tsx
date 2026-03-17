'use client'

import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="text-2xl font-bold text-blue-600">INTERNPORTAL</div>
            <div className="space-x-6 hidden md:flex">
            </div>
            <Link
              href="/login"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <div className="mb-4 text-blue-600 font-semibold tracking-wider">ADVANCED RESEARCH COMPUTING</div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to{' '}
            <span className="text-blue-600">InternPortal ✨</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            We are a technological company specializing in Embedded System Design & 
            Development, Enterprise Software Development and Data Science & Machine 
            Learning Solutions.
          </p>
          
          {/* Single Login Button */}
          <Link
            href="/login"
            className="inline-block bg-blue-600 text-white px-10 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
          >
           Start your Journy
          </Link>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-blue-600 text-2xl mb-4">📋</div>
            <h3 className="text-xl font-semibold mb-2">Task Management</h3>
            <p className="text-gray-600">
              View and complete assigned tasks with clear instructions and deadlines.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-blue-600 text-2xl mb-4">📤</div>
            <h3 className="text-xl font-semibold mb-2">Easy Submissions</h3>
            <p className="text-gray-600">
              Upload your work, documentation, and screenshots all in one place.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-blue-600 text-2xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">Track Progress</h3>
            <p className="text-gray-600">
              Get feedback from admins and track your internship progress.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}