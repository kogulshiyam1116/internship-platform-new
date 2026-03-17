'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { emailService } from '@/lib/emailService'

export default function SubmissionReview() {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [filter, setFilter] = useState('pending')
  const [feedback, setFeedback] = useState('')
  const [processing, setProcessing] = useState(false)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [submissionToArchive, setSubmissionToArchive] = useState(null)
  const [error, setError] = useState(null)
  
  const supabase = createClient()

  useEffect(() => {
    fetchSubmissions()
  }, [filter])

  const fetchSubmissions = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔍 Fetching submissions with filter:', filter)

      // First, let's test if we can connect
      const { data: testData, error: testError } = await supabase
        .from('submissions')
        .select('count', { count: 'exact', head: true })

      if (testError) {
        console.error('❌ Connection test failed:', testError)
        setError('Database connection error: ' + testError.message)
        return
      }

      console.log('✅ Database connection successful')

      // Build the query step by step for better debugging
      let query = supabase
        .from('submissions')
        .select(`
          *,
          tasks (
            id,
            title,
            description,
            working_duration
          ),
          profiles!submissions_student_id_fkey (
            id,
            email,
            full_name
          )
        `)
        .eq('is_archived', false)

      // Add filter if not 'all'
      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      // Order by submission date
      query = query.order('submitted_at', { ascending: false })

      console.log('📝 Executing query...')
      const { data, error } = await query

      if (error) {
        console.error('❌ Query error:', error)
        setError('Query error: ' + error.message)
        return
      }

      console.log('✅ Raw data received:', data?.length || 0, 'submissions')

      // Now fetch task_assignments separately to get deadline info
      if (data && data.length > 0) {
        const taskIds = [...new Set(data.map(s => s.task_id))]
        const studentIds = [...new Set(data.map(s => s.student_id))]

        console.log('📋 Fetching task assignments for tasks:', taskIds)

        const { data: assignments, error: assignError } = await supabase
          .from('task_assignments')
          .select('task_id, student_id, deadline')
          .in('task_id', taskIds)
          .in('student_id', studentIds)

        if (assignError) {
          console.error('❌ Error fetching assignments:', assignError)
        }

        // Create a lookup map for deadlines
        const deadlineMap = {}
        if (assignments) {
          assignments.forEach(ass => {
            const key = `${ass.task_id}_${ass.student_id}`
            deadlineMap[key] = ass.deadline
          })
        }

        // Add late flag to each submission
        const submissionsWithLate = data.map(sub => {
          const key = `${sub.task_id}_${sub.student_id}`
          const deadline = deadlineMap[key] ? new Date(deadlineMap[key]) : null
          const submittedAt = new Date(sub.submitted_at)
          const isLate = deadline ? deadline < submittedAt : false
          
          return {
            ...sub,
            deadline: deadline,
            isLate
          }
        })

        console.log('✅ Processed submissions:', submissionsWithLate.length)
        setSubmissions(submissionsWithLate)
      } else {
        setSubmissions([])
      }
      
    } catch (error) {
      console.error('❌ Unexpected error:', error)
      setError('Unexpected error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (submissionId, status) => {
    if (!feedback.trim() && status === 'rejected') {
      alert('Please provide feedback when rejecting a submission')
      return
    }

    setProcessing(true)
    try {
      const { data: submission, error: fetchError } = await supabase
        .from('submissions')
        .select(`
          *,
          tasks (title),
          profiles!submissions_student_id_fkey (email, full_name)
        `)
        .eq('id', submissionId)
        .single()

      if (fetchError) throw fetchError

      const { data: userData } = await supabase.auth.getUser()
      
      const { error: updateError } = await supabase
        .from('submissions')
        .update({
          status: status,
          admin_feedback: feedback,
          reviewed_at: new Date().toISOString(),
          reviewed_by: userData.user?.id
        })
        .eq('id', submissionId)

      if (updateError) throw updateError

      // Update task_assignment status if approved
      if (status === 'approved') {
        await supabase
          .from('task_assignments')
          .update({ status: 'completed' })
          .eq('task_id', submission.task_id)
          .eq('student_id', submission.student_id)
      }

      // Send email notification
      const studentEmail = submission.profiles.email
      const studentName = submission.profiles.full_name || studentEmail
      const taskTitle = submission.tasks.title

      if (status === 'approved') {
        await emailService.sendApprovalNotification(
          studentEmail,
          studentName,
          taskTitle,
          feedback
        )
      } else {
        await emailService.sendRejectionNotification(
          studentEmail,
          studentName,
          taskTitle,
          feedback
        )
      }

      alert(`✅ Submission ${status} successfully! Email sent.`)
      setSelectedSubmission(null)
      setFeedback('')
      fetchSubmissions()
    } catch (error) {
      console.error('❌ Error updating submission:', error)
      alert('Error: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleArchiveSubmission = async (submission) => {
    setSubmissionToArchive(submission)
    setShowArchiveConfirm(true)
  }

  const confirmArchive = async () => {
    if (!submissionToArchive) return

    setProcessing(true)
    try {
      const { error } = await supabase
        .from('submissions')
        .update({ is_archived: true })
        .eq('id', submissionToArchive.id)

      if (error) throw error

      alert('✅ Submission archived successfully!')
      fetchSubmissions()
    } catch (error) {
      console.error('❌ Error archiving submission:', error)
      alert('Error archiving: ' + error.message)
    } finally {
      setProcessing(false)
      setShowArchiveConfirm(false)
      setSubmissionToArchive(null)
    }
  }

  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Approved</span>
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Rejected</span>
      default:
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">Pending</span>
    }
  }

  const formatFileSize = (bytes) => {
  if (!bytes) return ''
  const mb = bytes / (1024 * 1024)
  return mb.toFixed(2) + ' MB'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Submissions</h3>
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchSubmissions}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 ${filter === 'pending' ? 'border-b-2 border-blue-500 text-blue-600' : ''}`}
        >
          Pending {submissions.filter(s => s.status === 'pending').length > 0 && 
            `(${submissions.filter(s => s.status === 'pending').length})`}
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 ${filter === 'approved' ? 'border-b-2 border-green-500 text-green-600' : ''}`}
        >
          Approved
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-4 py-2 ${filter === 'rejected' ? 'border-b-2 border-red-500 text-red-600' : ''}`}
        >
          Rejected
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 ${filter === 'all' ? 'border-b-2 border-gray-500 text-gray-600' : ''}`}
        >
          All
        </button>
      </div>

      {/* Submissions List */}
      {submissions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500">No submissions found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <div key={submission.id} className="bg-white rounded-lg shadow border p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {submission.tasks?.title || 'Unknown Task'}
                    </h3>
                    {submission.isLate && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                        ⚠️ Late
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    Student: {submission.profiles?.full_name || submission.profiles?.email || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Submitted: {new Date(submission.submitted_at).toLocaleString()}
                  </p>
                  {submission.isLate && submission.deadline && (
                    <p className="text-sm text-red-500 mt-1">
                      ⏰ Deadline was: {new Date(submission.deadline).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(submission.status)}
                  <button
                    onClick={() => setSelectedSubmission(submission)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Review
                  </button>
                  <button
                    onClick={() => handleArchiveSubmission(submission)}
                    className="text-gray-500 hover:text-red-600 text-sm font-medium"
                    title="Archive submission"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </button>
                </div>
              </div>

              {submission.admin_feedback && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">Feedback:</p>
                  <p className="text-sm text-gray-600">{submission.admin_feedback}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-gray-800">
                  Review Submission {selectedSubmission.isLate && '(Late)'}
                </h3>
                <button onClick={() => setSelectedSubmission(null)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>

              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-800">{selectedSubmission.tasks?.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{selectedSubmission.tasks?.description}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Student: {selectedSubmission.profiles?.full_name || selectedSubmission.profiles?.email}
                </p>
                {selectedSubmission.isLate && selectedSubmission.deadline && (
                  <p className="text-sm text-red-500 mt-2 font-medium">
                    ⚠️ Late submission - Deadline was {new Date(selectedSubmission.deadline).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="space-y-6">
                {selectedSubmission.documentation_urls?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Documentation</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedSubmission.documentation_urls.map((url, index) => (
                        <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          Document {index + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSubmission.screenshots?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Screenshots</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedSubmission.screenshots.map((url, index) => (
                        <img key={index} src={url} alt={`Screenshot ${index + 1}`} className="w-full rounded-lg" />
                      ))}
                    </div>
                  </div>
                )}

                 {/* Links Section */}
                {selectedSubmission.links && selectedSubmission.links.length > 0 && (
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <h4 className="font-medium text-purple-700 mb-3 flex items-center gap-1">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Student Shared Links ({selectedSubmission.links.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedSubmission.links.map((link, idx) => {
                        // Handle different link formats
                        let url = '';
                        let description = '';
                        
                        if (typeof link === 'string') {
                          try {
                            // Try to parse if it's JSON
                            const parsed = JSON.parse(link);
                            url = parsed.url || '';
                            description = parsed.description || '';
                          } catch (e) {
                            // If not JSON, use as URL
                            url = link;
                          }
                        } else if (typeof link === 'object' && link !== null) {
                          url = link.url || '';
                          description = link.description || '';
                        }
                        
                        if (!url) return null;
                        
                        return (
                          <div key={idx} className="flex items-start gap-2 p-2 bg-white rounded border border-purple-100">
                            <svg className="w-4 h-4 text-purple-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            <div className="flex-1">
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 hover:underline text-sm break-all"
                              >
                                {url}
                              </a>
                              {description && (
                                <p className="text-xs text-gray-500 mt-1">{description}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedSubmission.submission_zip_url && (
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Submitted Work (ZIP)</h4>
                      <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{selectedSubmission.submission_zip_name}</p>
                          {selectedSubmission.submission_zip_size && (
                            <p className="text-xs text-gray-500">Size: {formatFileSize(selectedSubmission.submission_zip_size)}</p>
                          )}
                        </div>
                        <a
                          href={selectedSubmission.submission_zip_url}
                          download
                          className="px-3 py-1 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
                        >
                          Download ZIP
                        </a>
                      </div>
                    </div>
                  )}

                {selectedSubmission.additional_notes && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Student Notes</h4>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {selectedSubmission.additional_notes}
                    </p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Your Feedback</h4>
                  <textarea
                    className="w-full px-3 py-2 border rounded-lg"
                    rows="4"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Provide feedback..."
                    disabled={processing}
                  />
                  
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleReview(selectedSubmission.id, 'approved')}
                      disabled={processing}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReview(selectedSubmission.id, 'rejected')}
                      disabled={processing}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => setSelectedSubmission(null)}
                      className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {showArchiveConfirm && submissionToArchive && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Archive Submission</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to archive this submission?
            </p>
            <p className="text-sm text-gray-500 mb-4">
              This will hide it from the main view but keep it in the database.
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmArchive}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Archive
              </button>
              <button
                onClick={() => setShowArchiveConfirm(false)}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      
    </div>
  )
}