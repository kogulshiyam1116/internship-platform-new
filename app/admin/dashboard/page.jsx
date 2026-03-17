'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import TaskManager from '@/components/admin/TaskManager'
import SubmissionReview from '@/components/admin/SubmissionReview'
import StudentManager from '@/components/admin/StudentManager'
import AdminManager from '@/components/admin/AdminManager' // Add this import

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('tasks')
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeTasks: 0,
    pendingSubmissions: 0,
    totalAdmins: 0
  })
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (profile) {
      fetchStats()
    }
  }, [activeTab, profile])

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setProfile(profile)
      await fetchStats()
    } catch (error) {
      console.error('Error checking user:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      // Get total students
      const { count: students } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student')

      // Get total admins
      const { count: admins } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')

      // Get active tasks
      const { count: tasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('is_deleted', false)

      // Get pending submissions
      const { count: submissions } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      setStats({
        totalStudents: students || 0,
        totalAdmins: admins || 0,
        activeTasks: tasks || 0,
        pendingSubmissions: submissions || 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              {profile?.is_super_admin && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                  Super Admin
                </span>
              )}
              <span className="text-gray-700">Welcome, {profile?.full_name || 'Admin'}</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">Total Students</h3>
            <p className="text-3xl font-bold">{stats.totalStudents}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">Total Admins</h3>
            <p className="text-3xl font-bold">{stats.totalAdmins}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">Active Tasks</h3>
            <p className="text-3xl font-bold">{stats.activeTasks}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">Pending Reviews</h3>
            <p className="text-3xl font-bold">{stats.pendingSubmissions}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b mb-6">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 ${activeTab === 'tasks' ? 'border-b-2 border-blue-500 text-blue-600' : ''}`}
          >
            Task Management
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`px-4 py-2 ${activeTab === 'submissions' ? 'border-b-2 border-blue-500 text-blue-600' : ''}`}
          >
            Review Submissions
            {stats.pendingSubmissions > 0 && (
              <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">
                {stats.pendingSubmissions}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 ${activeTab === 'students' ? 'border-b-2 border-blue-500 text-blue-600' : ''}`}
          >
            Student Management
          </button>
          <button
            onClick={() => setActiveTab('admins')}
            className={`px-4 py-2 ${activeTab === 'admins' ? 'border-b-2 border-blue-500 text-blue-600' : ''}`}
          >
            Admin Management
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow p-6">
          {activeTab === 'tasks' && <TaskManager />}
          {activeTab === 'submissions' && <SubmissionReview />}
          {activeTab === 'students' && <StudentManager onStudentChange={fetchStats} />}
          {activeTab === 'admins' && <AdminManager />}
        </div>
      </div>
    </div>
  )
}