'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { emailService } from '@/lib/emailService'

export default function StudentManager() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    confirmPassword: ''
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [submissionCounts, setSubmissionCounts] = useState({})
  
  const supabase = createClient()

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('created_at', { ascending: false })

      if (error) throw error
      setStudents(data || [])
      
      if (data && data.length > 0) {
        await fetchSubmissionCounts(data.map(s => s.id))
      }
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSubmissionCounts = async (studentIds) => {
    try {
      const counts = {}
      for (const id of studentIds) {
        const { count, error } = await supabase
          .from('submissions')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', id)
        
        if (!error) {
          counts[id] = count || 0
        }
      }
      setSubmissionCounts(counts)
    } catch (error) {
      console.error('Error fetching submission counts:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })

    // Clear email error when user types new email
    if (name === 'email') {
      setEmailError('')
    }
  }

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let password = ''
    for (let i = 0; i < 8; i++) {
      password += chars[Math.floor(Math.random() * chars.length)]
    }
    setFormData({
      ...formData,
      password: password,
      confirmPassword: password
    })
  }

  // Check if email already exists
  const checkEmailExists = async (email) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .maybeSingle()

      if (error) throw error
      return !!data
    } catch (error) {
      console.error('Error checking email:', error)
      return false
    }
  }

  const handleAddStudent = async (e) => {
    e.preventDefault()
    setProcessing(true)
    setEmailError('')

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!')
      setProcessing(false)
      return
    }

    // Validate password length
    if (formData.password.length < 6) {
      alert('Password must be at least 6 characters long!')
      setProcessing(false)
      return
    }

    try {
      console.log('1️⃣ Adding student:', formData.email)
      
      // Check if email already exists
      console.log('2️⃣ Checking if email exists...')
      const emailExists = await checkEmailExists(formData.email)
      
      if (emailExists) {
        setEmailError('This email is already registered')
        alert(`❌ User with email ${formData.email} already exists!`)
        setProcessing(false)
        return
      }

      console.log('3️⃣ Email is available, creating user...')
      
      // Call API route
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createUser',
          data: {
            email: formData.email,
            password: formData.password,
            full_name: formData.full_name
          }
        })
      })

      console.log('4️⃣ API response status:', response.status)
      const result = await response.json()
      console.log('5️⃣ API response data:', result)
      
      if (!response.ok) {
        // Check for specific error messages
        if (result.error?.includes('already exists') || 
            result.error?.includes('already registered') ||
            result.error?.includes('duplicate key')) {
          setEmailError('This email is already registered')
          throw new Error(`User with email ${formData.email} already exists!`)
        }
        throw new Error(result.error)
      }

      // Update profile with full_name
      console.log('6️⃣ Updating profile for user:', result.user.user.id)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: formData.full_name })
        .eq('id', result.user.user.id)

      if (profileError) {
        console.error('7️⃣ Profile update error:', profileError)
        throw profileError
      }
      console.log('7️⃣ Profile updated successfully')

      // Send welcome email
      console.log('8️⃣ Sending welcome email to:', formData.email)
      await emailService.sendWelcomeEmail(
        formData.email,
        formData.full_name,
        formData.password
      )

      alert(`✅ Student ${formData.full_name} added successfully! Welcome email sent.`)
      setShowAddForm(false)
      setFormData({
        email: '',
        full_name: '',
        password: '',
        confirmPassword: ''
      })
      setEmailError('')
      
      console.log('9️⃣ Fetching updated student list')
      await fetchStudents()
      console.log('🔟 Student list updated')
      
    } catch (error) {
      console.error('❌ Error adding student:', error)
      
      // User-friendly error messages
      if (error.message.includes('already exists')) {
        alert(`❌ User with email ${formData.email} already exists!`)
      } else if (error.message.includes('password')) {
        alert('❌ Password error: ' + error.message)
      } else {
        alert('❌ Error adding student: ' + error.message)
      }
    } finally {
      setProcessing(false)
    }
  }

  const handleResetPassword = async (student) => {
    const newPassword = prompt('Enter new password for ' + student.email, '')
    if (!newPassword) return

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long!')
      return
    }

    try {
      setProcessing(true)
      
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resetPassword',
          data: {
            userId: student.id,
            newPassword: newPassword
          }
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      await emailService.sendPasswordResetEmail(
        student.email,
        student.full_name || student.email,
        newPassword
      )

      alert(`✅ Password reset successfully! Email sent to ${student.email}`)
    } catch (error) {
      console.error('Error resetting password:', error)
      alert('❌ Error resetting password: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleDeleteStudent = async (student) => {
    if (!confirm(`Are you sure you want to delete ${student.full_name || student.email}? This action cannot be undone.`)) {
      return
    }

    try {
      setProcessing(true)
      
      console.log('1️⃣ Deleting student:', student.id, student.email)
      
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          action: 'deleteUser',
          data: {
            userId: student.id
          }
        })
      })

      console.log('2️⃣ Response status:', response.status)

      if (!response.ok) {
        const text = await response.text()
        console.log('3️⃣ Error response:', text.substring(0, 200))
        
        try {
          const errorJson = JSON.parse(text)
          throw new Error(errorJson.error || `HTTP error ${response.status}`)
        } catch (e) {
          throw new Error(`Server error (${response.status})`)
        }
      }

      const result = await response.json()
      console.log('4️⃣ Delete success:', result)

      alert('✅ Student deleted successfully!')
      fetchStudents()
    } catch (error) {
      console.error('❌ Error deleting student:', error)
      alert('❌ Error deleting student: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleResendWelcomeEmail = async (student) => {
    try {
      setProcessing(true)
      
      const tempPassword = Math.random().toString(36).slice(-8)
      
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resetPassword',
          data: {
            userId: student.id,
            newPassword: tempPassword
          }
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }
      
      await emailService.sendWelcomeEmail(
        student.email,
        student.full_name || student.email,
        tempPassword
      )

      alert(`✅ Welcome email resent to ${student.email} with new temporary password!`)
    } catch (error) {
      console.error('Error resending welcome email:', error)
      alert('❌ Error resending email: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const filteredStudents = students.filter(student => 
    student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      {/* Header with Add Button and Search */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-xl font-semibold text-gray-800">Student Management</h2>
        <div className="flex gap-4 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Student
          </button>
        </div>
      </div>

      {/* Students Table */}
      {filteredStudents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <p className="text-gray-500">No students found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submissions
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                          {student.full_name?.charAt(0).toUpperCase() || student.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {student.full_name || 'No name'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{student.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(student.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        submissionCounts[student.id] > 0 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {submissionCounts[student.id] || 0} submissions
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleResendWelcomeEmail(student)}
                          className="text-green-600 hover:text-green-900 px-3 py-1 rounded-md hover:bg-green-50"
                          title="Resend welcome email"
                          disabled={processing}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleResetPassword(student)}
                          className="text-blue-600 hover:text-blue-900 px-3 py-1 rounded-md hover:bg-blue-50"
                          title="Reset password"
                          disabled={processing}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student)}
                          className="text-red-600 hover:text-red-900 px-3 py-1 rounded-md hover:bg-red-50"
                          title="Delete student"
                          disabled={processing}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">Add New Student</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    emailError ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="student@example.com"
                />
                {emailError && (
                  <p className="text-sm text-red-600 mt-1">{emailError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Generate
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type="text"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Confirm password"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {processing ? 'Adding...' : 'Add Student'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}