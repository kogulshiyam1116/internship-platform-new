'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { emailService } from '@/lib/emailService'  // Add this import

export default function SubmissionReview() {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [filter, setFilter] = useState('pending') // pending, approved, rejected, all
  const [feedback, setFeedback] = useState('')
  const [processing, setProcessing] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    fetchSubmissions()
  }, [filter])

  const fetchSubmissions = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('submissions')
        .select(`
          *,
          tasks (*),
          profiles!submissions_student_id_fkey (*)
        `)
        .order('submitted_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error
      setSubmissions(data || [])
    } catch (error) {
      console.error('Error fetching submissions:', error)
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
      // Get submission details with student info before updating
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

      // Update submission status
      const { error: updateError } = await supabase
        .from('submissions')
        .update({
          status: status,
          admin_feedback: feedback
        })
        .eq('id', submissionId)

      if (updateError) throw updateError

      // Send email notification to student
      const studentEmail = submission.profiles.email
      const studentName = submission.profiles.full_name || studentEmail
      const taskTitle = submission.tasks.title

      console.log('Sending email to:', studentEmail) // Debug log

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

      alert(`Submission ${status} successfully! Email notification sent to student.`)
      setSelectedSubmission(null)
      setFeedback('')
      fetchSubmissions()
    } catch (error) {
      console.error('Error updating submission:', error)
      alert('Error updating submission: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }

  // ... rest of your component code (getStatusBadge, formatDate, return statement)
  // Keep all the existing JSX code below this line

  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Approved</span>
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">Rejected</span>
      default:
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Pending</span>
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-600">Loading submissions...</div>
  }

  return (
    <div>
      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 ${filter === 'pending' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
        >
          Pending Review
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 ${filter === 'approved' ? 'border-b-2 border-green-500 text-green-600' : 'text-gray-500'}`}
        >
          Approved
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-4 py-2 ${filter === 'rejected' ? 'border-b-2 border-red-500 text-red-600' : 'text-gray-500'}`}
        >
          Rejected
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 ${filter === 'all' ? 'border-b-2 border-gray-500 text-gray-600' : 'text-gray-500'}`}
        >
          All Submissions
        </button>
      </div>

      {/* Submissions List */}
      {submissions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">No submissions found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <div key={submission.id} className="bg-white rounded-lg shadow border p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {submission.tasks?.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Student: {submission.profiles?.full_name || submission.profiles?.email}
                  </p>
                  <p className="text-sm text-gray-500">
                    Submitted: {formatDate(submission.submitted_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(submission.status)}
                  <button
                    onClick={() => setSelectedSubmission(submission)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Review
                  </button>
                </div>
              </div>

              {/* Quick Preview */}
              <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Documents:</span>{' '}
                  <span className="text-gray-600">{submission.documentation_urls?.length || 0} files</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Screenshots:</span>{' '}
                  <span className="text-gray-600">{submission.screenshots?.length || 0} files</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Links:</span>{' '}
                  <span className="text-gray-600">{submission.links?.length || 0} links</span>
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
                  Review Submission
                </h3>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {/* Task Info */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-800">{selectedSubmission.tasks?.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{selectedSubmission.tasks?.description}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Student: {selectedSubmission.profiles?.full_name || selectedSubmission.profiles?.email}
                </p>
              </div>

              {/* Submitted Files */}
              <div className="space-y-6">
                {/* Documentation Files */}
                {selectedSubmission.documentation_urls?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Documentation Files</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedSubmission.documentation_urls.map((url, index) => (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100"
                        >
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm text-blue-600 truncate">Document {index + 1}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Screenshots */}
                {selectedSubmission.screenshots?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Screenshots</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedSubmission.screenshots.map((url, index) => (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block aspect-video bg-gray-100 rounded-lg overflow-hidden hover:opacity-75"
                        >
                          <img
                            src={url}
                            alt={`Screenshot ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null
                              e.target.src = 'https://via.placeholder.com/300x200?text=Image+Not+Found'
                            }}
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Links */}
                {selectedSubmission.links?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Additional Links</h4>
                    <div className="space-y-1">
                      {selectedSubmission.links.map((link, index) => (
                        <a
                          key={index}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-blue-600 hover:underline truncate"
                        >
                          {link}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Notes */}
                {selectedSubmission.additional_notes && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Student Notes</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {selectedSubmission.additional_notes}
                    </p>
                  </div>
                )}

                {/* Feedback Form */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Your Feedback</h4>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-800"
                    rows="4"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Provide feedback to the student..."
                    disabled={processing}
                  />
                  
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleReview(selectedSubmission.id, 'approved')}
                      disabled={processing}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-green-300"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReview(selectedSubmission.id, 'rejected')}
                      disabled={processing}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-red-300"
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
    </div>
  )
}