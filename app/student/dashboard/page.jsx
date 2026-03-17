'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import TaskCard from '@/components/student/TaskCard'
import { holidayService } from '@/lib/holidayService'

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [taskGroups, setTaskGroups] = useState([])
  const [expandedGroups, setExpandedGroups] = useState({})
  const [stats, setStats] = useState({
    pending: 0,
    inProgress: 0,
    submitted: 0,
    completed: 0
  })
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('❌ Auth error:', userError)
        router.push('/login')
        return
      }

      if (!user) {
        console.log('🚫 No user found, redirecting to login')
        router.push('/login')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('❌ Profile fetch error:', profileError)
        return
      }

      if (profile?.role !== 'student') {
        console.log('🚫 Not a student, redirecting to admin')
        router.push('/admin/dashboard')
        return
      }

      setProfile(profile)
      
      await Promise.all([
        fetchAssignments(user.id),
        fetchSubmissions(user.id),
        fetchTaskGroups()
      ])
    } catch (error) {
      console.error('❌ Error in checkUser:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTaskGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('task_groups')
        .select('*')
        .eq('is_active', true)
        .order('name')
      
      if (error) throw error
      setTaskGroups(data || [])
      
      // Initialize expanded state for all groups
      const expanded = {}
      data?.forEach(group => {
        expanded[group.id] = true
      })
      expanded['ungrouped'] = true
      setExpandedGroups(expanded)
    } catch (error) {
      console.error('Error fetching task groups:', error)
    }
  }

  const fetchAssignments = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('task_assignments')
        .select(`
          *,
          tasks (
            *,
            task_groups (name, id)
          )
        `)
        .eq('student_id', userId)
        .order('deadline', { ascending: true })

      if (error) throw error
      
      // Calculate deadline status for each assignment
      const assignmentsWithStatus = await Promise.all((data || []).map(async (assignment) => {
        const now = new Date()
        const deadline = new Date(assignment.deadline)
        const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))
        
        let deadlineStatus = 'normal'
        if (daysLeft < 0) deadlineStatus = 'overdue'
        else if (daysLeft <= 2) deadlineStatus = 'urgent'
        
        return {
          ...assignment,
          deadlineStatus,
          daysLeft
        }
      }))
      
      setAssignments(assignmentsWithStatus)
      
      // Calculate stats
      const pending = assignmentsWithStatus.filter(a => a.status === 'pending').length
      const inProgress = assignmentsWithStatus.filter(a => a.status === 'in_progress').length
      const submitted = assignmentsWithStatus.filter(a => a.status === 'submitted').length
      const completed = assignmentsWithStatus.filter(a => a.status === 'completed').length
      
      setStats({ pending, inProgress, submitted, completed })
      
    } catch (error) {
      console.error('❌ Error fetching assignments:', error)
    }
  }

  const fetchSubmissions = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*, tasks(*)')
        .eq('student_id', userId)
        .order('submitted_at', { ascending: false })

      if (error) throw error
      
      setSubmissions(data || [])
    } catch (error) {
      console.error('❌ Error fetching submissions:', error)
    }
  }

  const handleLogout = async () => {
    console.log('🚪 Logging out...')
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Approved ✓</span>
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Rejected ✗</span>
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Pending Review</span>
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">{status}</span>
    }
  }

  const toggleGroupExpand = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }))
  }

  // Group assignments by task group
  const assignmentsByGroup = {}
  const ungroupedAssignments = []
  
  assignments.forEach(assignment => {
    const groupId = assignment.tasks?.task_groups?.id
    if (groupId) {
      if (!assignmentsByGroup[groupId]) {
        assignmentsByGroup[groupId] = {
          group: assignment.tasks.task_groups,
          assignments: []
        }
      }
      assignmentsByGroup[groupId].assignments.push(assignment)
    } else {
      ungroupedAssignments.push(assignment)
    }
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">Loading your dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-800">Student Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {profile?.full_name || profile?.email || 'Student'}</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">Pending Tasks</h3>
            <p className="text-3xl font-bold text-gray-800">{stats.pending}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">In Progress</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.inProgress}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">Submitted</h3>
            <p className="text-3xl font-bold text-yellow-600">{stats.submitted}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">Completed</h3>
            <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
          </div>
        </div>

        {/* My Assigned Tasks by Group */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">My Assigned Tasks</h2>
          
          {assignments.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-500 text-lg">No tasks assigned yet.</p>
              <p className="text-gray-400 text-sm mt-2">When an admin assigns you a task, it will appear here.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Grouped Tasks */}
              {Object.values(assignmentsByGroup).map(({ group, assignments }) => (
                <div key={group.id} className="bg-white rounded-lg shadow overflow-hidden">
                  <div 
                    className="bg-gray-50 px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleGroupExpand(group.id)}
                  >
                    <div className="flex items-center gap-3">
                      <svg className={`w-5 h-5 text-gray-500 transform transition-transform ${expandedGroups[group.id] ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <h3 className="font-semibold text-gray-800">{group.name}</h3>
                      <span className="text-sm text-gray-500">{assignments.length} tasks</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                        {assignments.filter(a => a.status === 'pending').length} pending
                      </span>
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                        {assignments.filter(a => a.status === 'completed').length} done
                      </span>
                    </div>
                  </div>
                  
                  {expandedGroups[group.id] && (
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      {assignments.map((assignment) => (
                        <TaskCard 
                          key={assignment.id}
                          assignment={assignment}
                          task={assignment.tasks}
                          onTaskUpdate={() => {
                            fetchAssignments(profile.id)
                            fetchSubmissions(profile.id)
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Ungrouped Tasks */}
              {ungroupedAssignments.length > 0 && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div 
                    className="bg-gray-50 px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleGroupExpand('ungrouped')}
                  >
                    <div className="flex items-center gap-3">
                      <svg className={`w-5 h-5 text-gray-500 transform transition-transform ${expandedGroups.ungrouped ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <h3 className="font-semibold text-gray-800">Other Tasks</h3>
                      <span className="text-sm text-gray-500">{ungroupedAssignments.length} tasks</span>
                    </div>
                  </div>
                  
                  {expandedGroups.ungrouped && (
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      {ungroupedAssignments.map((assignment) => (
                        <TaskCard 
                          key={assignment.id}
                          assignment={assignment}
                          task={assignment.tasks}
                          onTaskUpdate={() => {
                            fetchAssignments(profile.id)
                            fetchSubmissions(profile.id)
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* My Submissions */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">My Submissions</h2>
          {submissions.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              No submissions yet.
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feedback</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {submissions.map((submission) => (
                    <tr key={submission.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {submission.tasks?.title || 'Unknown Task'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(submission.submitted_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {getStatusBadge(submission.status)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {submission.admin_feedback || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}