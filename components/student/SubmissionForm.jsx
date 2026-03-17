'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function SubmissionForm({ task, assignment, onClose, onSubmit }) {
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [isLate, setIsLate] = useState(false)
  const [zipFile, setZipFile] = useState(null)
  const [links, setLinks] = useState(['']) // Start with one empty link
  const [additionalNotes, setAdditionalNotes] = useState('')
  
  const supabase = createClient()

  useEffect(() => {
    if (assignment?.deadline) {
      const deadline = new Date(assignment.deadline)
      const now = new Date()
      setIsLate(now > deadline)
    }
  }, [assignment])

  if (!assignment || !assignment.id) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold text-red-600 mb-2">Error</h3>
          <p className="text-gray-700">Assignment data is missing. Please try again.</p>
          <button onClick={onClose} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg">Close</button>
        </div>
      </div>
    )
  }

  const handleZipChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.zip')) {
      alert('Please upload only ZIP files.')
      e.target.value = ''
      return
    }

    if (file.size > 100 * 1024 * 1024) {
      alert('File is too large. Maximum size is 100MB.')
      e.target.value = ''
      return
    }

    setZipFile(file)
  }

  const handleAddLink = () => {
    setLinks([...links, ''])
  }

  const handleRemoveLink = (index) => {
    const newLinks = links.filter((_, i) => i !== index)
    setLinks(newLinks.length ? newLinks : ['']) // Keep at least one empty field
  }

  const handleLinkChange = (index, value) => {
    const newLinks = [...links]
    newLinks[index] = value
    setLinks(newLinks)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!assignment?.id) {
      alert('Error: Assignment ID is missing.')
      return
    }

    if (!zipFile) {
      alert('Please select a ZIP file to submit.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) throw userError
      if (!user) throw new Error('No user found')

      setUploading(true)

      // Upload ZIP file
      const fileExt = zipFile.name.split('.').pop()
      const fileName = `${Date.now()}-${user.id}-${zipFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const filePath = `submissions/${fileName}`

      const fileOptions = {
        cacheControl: '3600',
        upsert: false,
        contentType: 'application/zip'
      }

      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(filePath, zipFile, fileOptions)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('submissions')
        .getPublicUrl(filePath)

      setUploading(false)

      // Filter out empty links
      const validLinks = links.filter(link => link.trim() !== '')

      const now = new Date()
      const deadline = new Date(assignment.deadline)
      const isLateSubmission = now > deadline

      const submissionData = {
        task_id: task.id,
        student_id: user.id,
        submission_zip_url: publicUrl,
        submission_zip_name: zipFile.name,
        submission_zip_size: zipFile.size,
        links: validLinks, // Store links as array
        additional_notes: additionalNotes,
        status: 'pending'
      }

      const { error, data } = await supabase
        .from('submissions')
        .insert([submissionData])
        .select()

      if (error) throw error

      // Update assignment status
      const { error: updateError } = await supabase
        .from('task_assignments')
        .update({ 
          status: 'submitted',
          submitted_at: now.toISOString(),
          is_late: isLateSubmission,
          late_notified: false
        })
        .eq('id', assignment.id)

      if (updateError) {
        console.error('Assignment update error:', updateError)
      }

      // Record task timing
      await supabase
        .from('task_timing')
        .insert([{
          task_id: task.id,
          student_id: user.id,
          completed_at: now.toISOString()
        }])

      const message = isLateSubmission 
        ? '⚠️ Submission successful! Note: This submission is LATE. Admin has been notified.'
        : '✅ Submission successful! Your work has been submitted for review.'

      alert(message)
      onSubmit()
    } catch (error) {
      console.error('Error submitting work:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return ''
    const mb = bytes / (1024 * 1024)
    return mb.toFixed(2) + ' MB'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Submit Work: {task?.title}
            </h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>

          {isLate && (
            <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Late Submission Warning</h3>
                  <p className="text-sm text-red-700 mt-1">
                    The deadline for this task was {new Date(assignment.deadline).toLocaleDateString()}. 
                    Your submission will be marked as LATE.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>
          )}

          {(loading || uploading) && (
            <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded-lg">
              {uploading ? 'Uploading ZIP file...' : 'Submitting...'}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ZIP File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Your Work (ZIP File) *
              </label>
              <input
                type="file"
                accept=".zip"
                onChange={handleZipChange}
                className="w-full px-3 py-2 border rounded-lg"
                disabled={loading || uploading}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum file size: 100MB. Please upload your work as a ZIP file.
              </p>
              {zipFile && (
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  <span>{zipFile.name}</span>
                  <span className="text-xs text-gray-500">({formatFileSize(zipFile.size)})</span>
                </div>
              )}
            </div>

            {/* Additional Links Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Links (GitHub, Demo, Documentation, etc.)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Add links to your GitHub repository, live demo, or any relevant documentation.
              </p>
              {links.map((link, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="url"
                    className="flex-1 px-3 py-2 border rounded-lg"
                    value={link}
                    onChange={(e) => handleLinkChange(index, e.target.value)}
                    placeholder="https://..."
                    disabled={loading || uploading}
                  />
                  {links.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLink(index)}
                      className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
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
                className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                disabled={loading || uploading}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Another Link
              </button>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes / Comments (Optional)
              </label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows="4"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Any additional information about your submission..."
                disabled={loading || uploading}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                disabled={loading || uploading || !zipFile}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
              >
                {loading ? 'Submitting...' : uploading ? 'Uploading...' : 'Submit Work'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
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