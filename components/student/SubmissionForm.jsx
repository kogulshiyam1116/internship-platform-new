'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function SubmissionForm({ task, assignment, onClose, onSubmit }) {
  // Debug logging to see what's received
  console.log('📋 SubmissionForm received:', {
    taskId: task?.id,
    taskTitle: task?.title,
    assignmentId: assignment?.id,
    assignmentStatus: assignment?.status,
    hasAssignment: !!assignment
  })

  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    documentation_files: [],
    screenshot_files: [],
    additional_links: [''],
    additional_notes: ''
  })
  
  const supabase = createClient()

  // Validate props on mount
  useEffect(() => {
    if (!task) {
      setError('No task data received')
      console.error('❌ No task data in SubmissionForm')
    }
    if (!assignment) {
      setError('No assignment data received')
      console.error('❌ No assignment data in SubmissionForm')
    } else if (!assignment.id) {
      setError('Assignment ID is missing')
      console.error('❌ Assignment ID missing:', assignment)
    }
  }, [task, assignment])

  // If no assignment, show error
  if (!assignment) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold text-red-600 mb-2">Configuration Error</h3>
          <p className="text-gray-700 mb-4">Assignment data is missing. Please close and try again.</p>
          <div className="bg-gray-50 p-3 rounded-lg mb-4">
            <p className="text-xs font-mono">
              Task: {task ? '✅' : '❌'}<br/>
              Assignment: ❌<br/>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  // If assignment has no ID, show error
  if (!assignment.id) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold text-red-600 mb-2">Configuration Error</h3>
          <p className="text-gray-700 mb-4">Assignment ID is missing. Please close and try again.</p>
          <div className="bg-gray-50 p-3 rounded-lg mb-4">
            <p className="text-xs font-mono">
              Task: {task ? '✅' : '❌'}<br/>
              Assignment: ✅<br/>
              Assignment ID: ❌
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  const handleFileUpload = async (files, folder) => {
    const uploadedUrls = []
    
    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${folder}/${fileName}`

        console.log('📤 Uploading file to:', filePath)

        const { error: uploadError } = await supabase.storage
          .from('submissions')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('submissions')
          .getPublicUrl(filePath)

        uploadedUrls.push({
          url: publicUrl,
          name: file.name,
          type: file.type,
          path: filePath
        })
      } catch (error) {
        console.error('❌ Error uploading file:', error)
        throw error
      }
    }
    
    return uploadedUrls
  }

  const handleDocumentationChange = (e) => {
    setFormData({
      ...formData,
      documentation_files: Array.from(e.target.files)
    })
  }

  const handleScreenshotsChange = (e) => {
    setFormData({
      ...formData,
      screenshot_files: Array.from(e.target.files)
    })
  }

  const handleAddLink = () => {
    setFormData({
      ...formData,
      additional_links: [...formData.additional_links, '']
    })
  }

  const handleRemoveLink = (index) => {
    const newLinks = formData.additional_links.filter((_, i) => i !== index)
    setFormData({
      ...formData,
      additional_links: newLinks
    })
  }

  const handleLinkChange = (index, value) => {
    const newLinks = [...formData.additional_links]
    newLinks[index] = value
    setFormData({
      ...formData,
      additional_links: newLinks
    })
  }

  // Check if deadline has passed
  const isDeadlinePassed = () => {
    if (!assignment?.deadline) return false
    const deadline = new Date(assignment.deadline)
    const now = new Date()
    return now > deadline
  }

  // Check if already submitted
  const hasSubmitted = assignment?.status === 'submitted' || assignment?.status === 'completed'

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Double-check assignment ID
    if (!assignment || !assignment.id) {
      alert('Error: Assignment ID is missing. Please try again.')
      console.error('❌ No assignment ID in handleSubmit')
      return
    }

    console.log('📝 handleSubmit called with assignment ID:', assignment.id)
    
    // Prevent multiple submissions
    if (hasSubmitted) {
      alert('You have already submitted this task!')
      onClose()
      return
    }

    // Check deadline
    if (isDeadlinePassed()) {
      alert('Deadline has passed! You cannot submit this task.')
      onClose()
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) throw userError
      if (!user) throw new Error('No user found')

      setUploading(true)

      // Upload documentation files
      const documentationUrls = formData.documentation_files.length > 0 
        ? await handleFileUpload(formData.documentation_files, 'documentation')
        : []

      // Upload screenshot files
      const screenshotUrls = formData.screenshot_files.length > 0
        ? await handleFileUpload(formData.screenshot_files, 'screenshots')
        : []

      setUploading(false)

      // Filter out empty links
      const additional_links = formData.additional_links.filter(link => link.trim() !== '')

      const submissionData = {
        task_id: task.id,
        student_id: user.id,
        documentation_urls: documentationUrls,
        screenshots: screenshotUrls,
        links: additional_links,
        additional_notes: formData.additional_notes,
        status: 'pending'
      }

      console.log('📝 Inserting submission for task:', task.id)

      // Insert submission
      const { error, data } = await supabase
        .from('submissions')
        .insert([submissionData])
        .select()

      if (error) throw error

      console.log('✅ Submission created with ID:', data[0]?.id)

      // Update assignment status to 'submitted'
      console.log('🔄 Attempting to update assignment:', {
        id: assignment.id,
        currentStatus: assignment.status
      })
      
      // First check if the assignment exists
      const { data: checkAssignment, error: checkError } = await supabase
        .from('task_assignments')
        .select('id, status')
        .eq('id', assignment.id)
        .single()

      if (checkError) {
        console.error('❌ Assignment not found in database:', checkError)
        // Still continue - submission was successful
      } else {
        console.log('✅ Assignment found in database:', checkAssignment)
        
        const { error: updateError, data: updateData } = await supabase
          .from('task_assignments')
          .update({ 
            status: 'submitted',
            submitted_at: new Date().toISOString()
          })
          .eq('id', assignment.id)
          .select()

        if (updateError) {
          console.error('❌ Error updating assignment:', updateError)
        } else {
          console.log('✅ Assignment status updated successfully:', updateData)
        }
      }

      // Record task timing
      await supabase
        .from('task_timing')
        .insert([{
          task_id: task.id,
          student_id: user.id,
          completed_at: new Date().toISOString()
        }])

      // Get student info for email
      const { data: studentProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single()

      // Send email notification to admin
      fetch('/api/notify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: studentProfile?.full_name || studentProfile?.email,
          taskTitle: task.title,
          submissionId: data[0]?.id
        })
      }).catch(err => console.error('Failed to notify admin:', err))

      alert('✅ Submission successful! Your work has been submitted for review.')
      onSubmit()
    } catch (error) {
      console.error('❌ Error submitting work:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Show message if already submitted
  if (hasSubmitted) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <div className="text-center">
            <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Already Submitted</h3>
            <p className="text-gray-600 mb-4">
              You have already submitted this task. Please wait for admin review.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show message if deadline passed
  if (isDeadlinePassed()) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <div className="text-center">
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Deadline Passed</h3>
            <p className="text-gray-600 mb-4">
              The deadline for this task has passed. You cannot submit it now.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Submit Work: {task.title || 'Untitled Task'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              <p className="font-medium">Error:</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {(loading || uploading) && (
            <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded-lg flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
              <span>{uploading ? 'Uploading files...' : 'Submitting...'}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Documentation Files */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Documentation Files (PDF, DOC, TXT, etc.)
              </label>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.md"
                onChange={handleDocumentationChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading || uploading}
              />
              {formData.documentation_files.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  {formData.documentation_files.length} file(s) selected
                </p>
              )}
            </div>

            {/* Screenshot Files */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Screenshots (PNG, JPG, GIF)
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleScreenshotsChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading || uploading}
              />
              {formData.screenshot_files.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  {formData.screenshot_files.length} screenshot(s) selected
                </p>
              )}
            </div>

            {/* Additional Links */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Links (GitHub, live demo, etc.)
              </label>
              {formData.additional_links.map((link, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="url"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={link}
                    onChange={(e) => handleLinkChange(index, e.target.value)}
                    placeholder="https://..."
                    disabled={loading || uploading}
                  />
                  {formData.additional_links.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLink(index)}
                      className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      disabled={loading || uploading}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddLink}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-2"
                disabled={loading || uploading}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add another link
              </button>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes / Comments
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="4"
                value={formData.additional_notes}
                onChange={(e) => setFormData({...formData, additional_notes: e.target.value})}
                placeholder="Any additional information you'd like to share..."
                disabled={loading || uploading}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading || uploading}
                className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors font-medium"
              >
                {loading ? 'Submitting...' : uploading ? 'Uploading...' : 'Submit Work'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                disabled={loading || uploading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}