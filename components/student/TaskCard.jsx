'use client'

import { useState } from 'react'
import SubmissionForm from './SubmissionForm'
import ViewSubmission from './ViewSubmission'
import { createClient } from '@/lib/supabase'

export default function TaskCard({ assignment, task, onTaskUpdate }) {
  const [showSubmission, setShowSubmission] = useState(false)
  const [showViewSubmission, setShowViewSubmission] = useState(false)
  const [existingSubmission, setExistingSubmission] = useState(null)
  const [expandedReadme, setExpandedReadme] = useState(false)
  const [viewed, setViewed] = useState(assignment.viewed_at || false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  // Get deadline status from assignment (calculated in parent)
  const deadlineStatus = assignment.deadlineStatus || 'normal'
  
  const statusColors = {
    overdue: 'text-red-600 bg-red-50 border-red-200',
    urgent: 'text-orange-600 bg-orange-50 border-orange-200',
    normal: 'text-green-600 bg-green-50 border-green-200'
  }

  const getAssignmentStatusBadge = () => {
    switch(assignment.status) {
      case 'completed':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">✓ Completed</span>
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">✗ Needs Revision</span>
      case 'submitted':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">⏳ Submitted</span>
      case 'in_progress':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">▶ In Progress</span>
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">⏰ Pending</span>
    }
  }

  // Mark task as viewed when student opens it
  const handleViewTask = async () => {
    if (!viewed) {
      setLoading(true)
      try {
        await supabase
          .from('task_assignments')
          .update({ 
            viewed_at: new Date().toISOString(),
            status: 'in_progress'
          })
          .eq('id', assignment.id)
        
        setViewed(true)
        if (onTaskUpdate) onTaskUpdate()
      } catch (error) {
        console.error('Error marking task as viewed:', error)
      } finally {
        setLoading(false)
      }
    }
  }

  // Check if deadline has passed
  const isDeadlinePassed = () => {
    const deadline = new Date(assignment.deadline)
    const now = new Date()
    return now > deadline
  }

  // Handle file download
  const handleFileDownload = (doc) => {
    const fileUrl = doc.directUrl || doc.url || doc;
    const fileName = doc.name || 'document';
    
    const link = document.createElement('a');
    link.href = fileUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get file icon based on extension
  const getFileIcon = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    
    if (ext === 'pdf') {
      return (
        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return (
        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h14a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
  };

  // Determine what to show based on status
  const renderActionButton = () => {
    // If deadline passed and not completed
    if (isDeadlinePassed() && assignment.status !== 'completed' && assignment.status !== 'submitted') {
      return (
        <div className="w-full px-4 py-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium text-center border border-red-200">
          ⚠ Deadline Passed - Cannot Submit
        </div>
      );
    }

    switch(assignment.status) {
      case 'completed':
        return (
          <div className="w-full px-4 py-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium text-center border border-green-200">
            ✓ Task Completed Successfully
          </div>
        );
      
      case 'submitted':
        return (
          <div className="w-full px-4 py-3 bg-yellow-50 text-yellow-700 rounded-lg text-sm font-medium text-center border border-yellow-200">
            ⏳ Submitted - Awaiting Review
          </div>
        );
      
      case 'in_progress':
        return (
          <button
            onClick={() => setShowSubmission(true)}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Submit Your Work
          </button>
        );
      
      case 'pending':
        return (
          <button
            onClick={handleViewTask}
            disabled={loading}
            className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-green-300"
          >
            {loading ? 'Starting...' : 'Start Task'}
          </button>
        );
      
      default:
        return null;
    }
  };

  return (
    <>
      <div 
        className={`bg-white rounded-lg shadow border p-6 hover:shadow-md transition-shadow ${
          assignment.status === 'completed' ? 'border-green-200' :
          assignment.status === 'submitted' ? 'border-yellow-200' :
          assignment.status === 'rejected' ? 'border-red-200' :
          isDeadlinePassed() ? 'border-red-200 bg-red-50' :
          'border-gray-200'
        }`}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{task.title}</h3>
            {task.task_groups?.name && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                {task.task_groups.name}
              </span>
            )}
          </div>
          {getAssignmentStatusBadge()}
        </div>
        
        <p className="text-gray-600 mb-4 line-clamp-3">{task.description}</p>
        
        <div className="space-y-3 mb-4">
          {/* Deadline with status and working days info */}
          <div className={`flex items-center justify-between text-sm p-3 rounded-lg border ${statusColors[deadlineStatus]}`}>
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">Deadline:</span> {new Date(assignment.deadline).toLocaleDateString()}
            </div>
            <div className="text-xs">
              {assignment.deadlineStatus === 'overdue' && <span className="font-bold">(Overdue!)</span>}
              {assignment.deadlineStatus === 'urgent' && <span className="font-bold">(Urgent!)</span>}
            </div>
          </div>

          {/* Working Duration Info */}
          {task.working_duration && (
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <span>⏱️ Duration: {task.working_duration} working days</span>
              {task.use_holiday_calendar && (
                <span title="Excludes Sri Lanka holidays">📅 (Excluding holidays)</span>
              )}
            </div>
          )}

          {/* Viewed/Accessed info */}
          {assignment.viewed_at && (
            <div className="text-xs text-gray-400">
              First accessed: {new Date(assignment.viewed_at).toLocaleString()}
            </div>
          )}

          {/* Admin Notes */}
          {assignment.admin_notes && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
              <p className="text-xs font-medium text-blue-700 mb-1">📝 Notes from Admin:</p>
              <p className="text-sm text-blue-800">{assignment.admin_notes}</p>
            </div>
          )}

          {/* Documentation Files */}
          {task.documentation_urls?.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs font-medium text-gray-700 mb-2">📎 Task Documents:</p>
              <div className="flex flex-col gap-2">
                {task.documentation_urls.map((doc, idx) => {
                  const fileData = typeof doc === 'string' ? { url: doc } : doc;
                  const fileUrl = fileData.url || fileData.directUrl || fileData;
                  const fileName = fileData.name || `Document-${idx + 1}.pdf`;
                  
                  return (
                    <div key={idx} className="flex items-center gap-2 w-full">
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all group"
                      >
                        {getFileIcon(fileName)}
                        <span className="text-sm text-gray-700 group-hover:text-blue-700 truncate">
                          {fileName}
                        </span>
                        <span className="ml-auto text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-700">
                          View
                        </span>
                      </a>
                      <button
                        onClick={() => handleFileDownload(fileData)}
                        className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors"
                        title="Download file"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reference Links with Descriptions */}
          {task.reference_links?.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs font-medium text-gray-700 mb-2">🔗 Reference Links:</p>
              <div className="space-y-2">
                {task.reference_links.map((link, idx) => (
                  <div key={idx} className="text-sm">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-start gap-1"
                    >
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <span className="flex-1 break-all">{link.url}</span>
                    </a>
                    {link.description && (
                      <p className="text-gray-600 mt-1 ml-5 text-xs">{link.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* README Content */}
          {task.readme_content && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs font-medium text-gray-700 mb-1">📖 Instructions:</p>
              <div className="text-sm text-gray-600 whitespace-pre-wrap">
                {expandedReadme 
                  ? task.readme_content 
                  : task.readme_content.slice(0, 300) + (task.readme_content.length > 300 ? '...' : '')
                }
              </div>
              {task.readme_content.length > 300 && (
                <button
                  onClick={() => setExpandedReadme(!expandedReadme)}
                  className="text-xs text-blue-600 hover:text-blue-800 mt-2 font-medium"
                >
                  {expandedReadme ? 'Show less' : 'Read more...'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Action Button based on status */}
        {renderActionButton()}
      </div>

      {/* Submission Modal */}
      {showSubmission && (
        <SubmissionForm
          task={task}
          assignment={assignment}
          onClose={() => setShowSubmission(false)}
          onSubmit={() => {
            setShowSubmission(false)
            if (onTaskUpdate) onTaskUpdate()
          }}
        />
      )}

      {/* View Submission Modal */}
      {showViewSubmission && existingSubmission && (
        <ViewSubmission
          submission={existingSubmission}
          task={task}
          onClose={() => setShowViewSubmission(false)}
        />
      )}
    </>
  )
}