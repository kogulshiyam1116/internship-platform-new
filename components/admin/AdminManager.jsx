'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { emailService } from '@/lib/emailService'

export default function AdminManager() {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    confirmPassword: '',
    is_super_admin: false,
    permissions: {
      can_create_tasks: true,
      can_manage_students: true,
      can_manage_admins: false
    }
  })
  
  const supabase = createClient()

  useEffect(() => {
    fetchCurrentUser()
    fetchAdmins()
  }, [])

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setCurrentUser(data)
    }
  }

  const fetchAdmins = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'admin')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAdmins(data || [])
    } catch (error) {
      console.error('Error fetching admins:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    if (name.startsWith('perm_')) {
      const permName = name.replace('perm_', '')
      setFormData({
        ...formData,
        permissions: {
          ...formData.permissions,
          [permName]: checked
        }
      })
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      })
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

  const handleAddAdmin = async (e) => {
    e.preventDefault()
    
    if (!currentUser?.is_super_admin) {
      alert('Only super admins can add new admins')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!')
      return
    }

    if (formData.password.length < 6) {
      alert('Password must be at least 6 characters long!')
      return
    }

    setProcessing(true)

    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createUser',
          data: {
            email: formData.email,
            password: formData.password,
            full_name: formData.full_name,
            role: 'admin',
            is_super_admin: formData.is_super_admin,
            admin_permissions: formData.permissions,
            created_by: currentUser.id
          }
        })
      })

      const result = await response.json()
      
      if (!response.ok) throw new Error(result.error)

      // Update profile with admin data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          full_name: formData.full_name,
          is_super_admin: formData.is_super_admin,
          admin_permissions: formData.permissions,
          created_by_admin: currentUser.id
        })
        .eq('id', result.user.user.id)

      if (profileError) throw profileError

      await emailService.sendWelcomeEmail(
        formData.email,
        formData.full_name,
        formData.password
      )

      alert(`✅ Admin ${formData.full_name} added successfully!`)
      setShowAddForm(false)
      setFormData({
        email: '',
        full_name: '',
        password: '',
        confirmPassword: '',
        is_super_admin: false,
        permissions: {
          can_create_tasks: true,
          can_manage_students: true,
          can_manage_admins: false
        }
      })
      fetchAdmins()
    } catch (error) {
      console.error('Error adding admin:', error)
      alert('Error adding admin: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleDeleteAdmin = async (admin) => {
    if (!currentUser?.is_super_admin) {
      alert('Only super admins can delete admins')
      return
    }

    if (admin.id === currentUser.id) {
      alert('You cannot delete yourself!')
      return
    }

    if (!confirm(`Are you sure you want to delete admin ${admin.full_name || admin.email}?`)) {
      return
    }

    try {
      setProcessing(true)
      
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteUser',
          data: { userId: admin.id }
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      alert('Admin deleted successfully!')
      fetchAdmins()
    } catch (error) {
      console.error('Error deleting admin:', error)
      alert('Error deleting admin: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading admins...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Admin Management</h2>
        {currentUser?.is_super_admin && (
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Admin
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Permissions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              {currentUser?.is_super_admin && <th className="px-6 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {admins.map(admin => (
              <tr key={admin.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                      {admin.full_name?.charAt(0).toUpperCase() || admin.email?.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {admin.full_name || 'No name'}
                      </div>
                      <div className="text-sm text-gray-500">{admin.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {admin.is_super_admin ? (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                      Super Admin
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      Admin
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    {admin.admin_permissions?.can_create_tasks && (
                      <span className="inline-block px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs mr-1">
                        Create Tasks
                      </span>
                    )}
                    {admin.admin_permissions?.can_manage_students && (
                      <span className="inline-block px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs mr-1">
                        Manage Students
                      </span>
                    )}
                    {admin.admin_permissions?.can_manage_admins && (
                      <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs">
                        Manage Admins
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(admin.created_at).toLocaleDateString()}
                </td>
                {currentUser?.is_super_admin && admin.id !== currentUser.id && (
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDeleteAdmin(admin)}
                      className="text-red-600 hover:text-red-900"
                      disabled={processing}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Admin Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Add New Admin</h3>
              <form onSubmit={handleAddAdmin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="flex-1 px-3 py-2 border rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                    >
                      Generate
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                  <input
                    type="text"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="is_super_admin"
                    checked={formData.is_super_admin}
                    onChange={handleInputChange}
                    className="w-4 h-4"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Super Admin (can manage other admins)
                  </label>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-3">Permissions</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="perm_can_create_tasks"
                        checked={formData.permissions.can_create_tasks}
                        onChange={handleInputChange}
                        className="w-4 h-4"
                      />
                      <label className="text-sm text-gray-600">Can create tasks</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="perm_can_manage_students"
                        checked={formData.permissions.can_manage_students}
                        onChange={handleInputChange}
                        className="w-4 h-4"
                      />
                      <label className="text-sm text-gray-600">Can manage students</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="perm_can_manage_admins"
                        checked={formData.permissions.can_manage_admins}
                        onChange={handleInputChange}
                        className="w-4 h-4"
                        disabled={!formData.is_super_admin}
                      />
                      <label className="text-sm text-gray-600">Can manage admins</label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    disabled={processing}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    {processing ? 'Adding...' : 'Add Admin'}
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
        </div>
      )}
    </div>
  )
}