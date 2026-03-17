'use client'

import { useState, useEffect } from 'react'
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

  useEffect(() => {
    if (assignment?.id) {
      checkExistingSubmission()
    }
  }, [assignment?.id])

  const checkExistingSubmission = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('task_id', task.id)
        .eq('student_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Error checking submission:', error)
        return
      }

      if (data && data.length > 0) {
        setExistingSubmission(data[0])
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

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

  const getDeadlineStatus = () => {
    const deadline = new Date(assignment.deadline)
    const now = new Date()
    const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))
    
    if (daysLeft < 0) return 'overdue'
    if (daysLeft <= 2) return 'urgent'
    return 'normal'
  }

  const deadlineStatus = getDeadlineStatus()
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

  const isDeadlinePassed = () => {
    const deadline = new Date(assignment.deadline)
    const now = new Date()
    return now > deadline
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return ''
    const mb = bytes / (1024 * 1024)
    return mb.toFixed(2) + ' MB'
  }

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

  const getFileIcon = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    
    if (ext === 'pdf') {
      return (
        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    } else if (ext === 'zip' || ext === 'rar' || ext === '7z') {
      return (
        <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      );
    }
  };

  const renderActionButton = () => {
    if (isDeadlinePassed() && assignment.status !== 'completed') {
      return (
        <div className="w-full px-4 py-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium text-center border border-red-200">
          ⚠ Deadline Passed - Cannot Submit
        </div>
      );
    }

    if (existingSubmission) {
      return (
        <div className="space-y-2">
          <button
            onClick={() => setShowViewSubmission(true)}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            View My Submission
          </button>
          {assignment.status === 'rejected' && (
            <button
              onClick={() => setShowSubmission(true)}
              className="w-full bg-orange-600 text-white px-4 py-3 rounded-lg hover:bg-orange-700 transition-colors font-medium"
            >
              ✗ Resubmit (Needs Revision)
            </button>
          )}
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
            Submit Your Work (ZIP File)
          </button>
        );
      
      default:
        return (
          <button
            onClick={handleViewTask}
            disabled={loading}
            className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-green-300"
          >
            {loading ? 'Starting...' : 'Start Task'}
          </button>
        );
    }
  };

  // Debug log to see what's in task.reference_links
  console.log('Task reference_links:', task?.reference_links);

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
          {/* Deadline with status */}
          <div className={`flex items-center justify-between text-sm p-3 rounded-lg border ${statusColors[deadlineStatus]}`}>
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">Deadline:</span> {new Date(assignment.deadline).toLocaleDateString()}
            </div>
            <div className="text-xs">
              {deadlineStatus === 'overdue' && <span className="font-bold">(Overdue!)</span>}
              {deadlineStatus === 'urgent' && <span className="font-bold">(Urgent!)</span>}
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

          {/* Existing Submission Info */}
          {existingSubmission && (
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <p className="text-xs font-medium text-green-700 mb-1">📤 Your Submission:</p>
              <p className="text-sm text-green-600">
                Submitted on: {new Date(existingSubmission.submitted_at).toLocaleString()}
              </p>
              {existingSubmission.submission_zip_name && (
                <div className="mt-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  <span className="text-sm text-gray-700">{existingSubmission.submission_zip_name}</span>
                  {existingSubmission.submission_zip_size && (
                    <span className="text-xs text-gray-500">
                      ({formatFileSize(existingSubmission.submission_zip_size)})
                    </span>
                  )}
                </div>
              )}
              <p className="text-xs text-green-500 mt-1">
                Status: {existingSubmission.status}
              </p>
            </div>
          )}

          {/* Admin Notes */}
          {assignment.admin_notes && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
              <p className="text-xs font-medium text-blue-700 mb-1">📝 Notes from Admin:</p>
              <p className="text-sm text-blue-800">{assignment.admin_notes}</p>
            </div>
          )}

          {/* Resource ZIP Files */}
          {task.zip_files?.length > 0 && (
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <p className="text-xs font-medium text-yellow-700 mb-2 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                Resource Files (ZIP):
              </p>
              <div className="flex flex-col gap-2">
                {task.zip_files.map((zip, idx) => {
                  let zipData = zip;
                  if (typeof zip === 'string') {
                    try {
                      zipData = JSON.parse(zip);
                    } catch (e) {
                      zipData = { url: zip, name: `Resource-${idx + 1}.zip` };
                    }
                  }
                  
                  const fileUrl = zipData.url || zipData.directUrl || zipData;
                  const fileName = zipData.name || `Resource-${idx + 1}.zip`;
                  const fileSize = zipData.size || 0;
                  
                  return (
                    <div key={idx} className="flex items-center gap-2 w-full">
                      <a
                        href={fileUrl}
                        download
                        className="flex-1 flex items-center gap-2 px-3 py-2 bg-white border border-yellow-200 rounded-lg hover:bg-yellow-100 hover:border-yellow-300 transition-all group"
                      >
                        <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        <span className="text-sm text-gray-700 group-hover:text-yellow-700 truncate">
                          {fileName}
                        </span>
                        {fileSize > 0 && (
                          <span className="ml-auto text-xs bg-yellow-100 px-2 py-1 rounded-full text-yellow-700">
                            {formatFileSize(fileSize)}
                          </span>
                        )}
                      </a>
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = fileUrl;
                          link.download = fileName;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="p-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
                        title="Download ZIP"
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

          {/* Reference Links - FIXED SECTION */}
         {/* Reference Links - FIXED VERSION */}
          {task.reference_links && task.reference_links.length > 0 && (
            <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <h4 className="font-medium text-purple-800">Reference Links</h4>
                <span className="text-xs bg-purple-200 text-purple-700 px-2 py-1 rounded-full">
                  {task.reference_links.length}
                </span>
              </div>
              
              <div className="space-y-3">
                {task.reference_links.map((link, index) => {
                  // Parse the link data
                  let url = '';
                  let description = '';
                  
                  try {
                    // If it's a string, try to parse as JSON
                    if (typeof link === 'string') {
                      // Check if it looks like JSON
                      if (link.trim().startsWith('{') && link.trim().endsWith('}')) {
                        const parsed = JSON.parse(link);
                        url = parsed.url || '';
                        description = parsed.description || '';
                      } else {
                        // Plain URL
                        url = link;
                      }
                    } 
                    // If it's already an object
                    else if (typeof link === 'object' && link !== null) {
                      url = link.url || '';
                      description = link.description || '';
                    }
                  } catch (e) {
                    console.error('Error parsing link:', e);
                    url = link;
                  }
                  
                  // Don't render if no URL
                  if (!url) return null;
                  
                  return (
                    <div key={index} className="bg-white p-3 rounded-lg border border-purple-100">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block hover:bg-purple-50 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-purple-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-sm text-blue-600 hover:text-blue-800 hover:underline break-all">
                              {url}
                            </p>
                            {description && (
                              <p className="text-xs text-gray-600 mt-1">
                                📝 {description}
                              </p>
                            )}
                          </div>
                          <svg className="w-4 h-4 text-gray-400 group-hover:text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                      </a>
                    </div>
                  );
                })}
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

        {renderActionButton()}
      </div>

      {showSubmission && (
        <SubmissionForm
          task={task}
          assignment={assignment}
          onClose={() => setShowSubmission(false)}
          onSubmit={() => {
            setShowSubmission(false)
            checkExistingSubmission()
            if (onTaskUpdate) onTaskUpdate()
          }}
        />
      )}

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