'use client'

export default function ViewSubmission({ submission, task, onClose }) {
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
              Your Submission: {task?.title}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* Submission Status */}
            <div className={`p-4 rounded-lg ${
              submission.status === 'approved' ? 'bg-green-50 border border-green-200' :
              submission.status === 'rejected' ? 'bg-red-50 border border-red-200' :
              'bg-yellow-50 border border-yellow-200'
            }`}>
              <p className="font-medium">Status: {submission.status}</p>
              <p className="text-sm text-gray-600 mt-1">
                Submitted: {new Date(submission.submitted_at).toLocaleString()}
              </p>
            </div>

            {/* Submitted ZIP File */}
            {submission.submission_zip_url && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  Your Submitted Work (ZIP)
                </h4>
                <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{submission.submission_zip_name}</p>
                    {submission.submission_zip_size && (
                      <p className="text-xs text-gray-500">Size: {formatFileSize(submission.submission_zip_size)}</p>
                    )}
                  </div>
                  <a
                    href={submission.submission_zip_url}
                    download
                    className="px-3 py-1 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
                  >
                    Download ZIP
                  </a>
                </div>
              </div>
            )}

            {/* Links Section - Fixed to display properly */}
            {submission.links && submission.links.length > 0 && (
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h4 className="font-medium text-purple-700 mb-3 flex items-center gap-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Shared Links ({submission.links.length})
                </h4>
                <div className="space-y-2">
                  {submission.links.map((link, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-purple-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all text-sm flex-1"
                      >
                        {link}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {submission.additional_notes && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">📝 Your Notes:</h4>
                <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {submission.additional_notes}
                </p>
              </div>
            )}

            {/* Admin Feedback */}
            {submission.admin_feedback && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-700 mb-2">👨‍🏫 Admin Feedback:</h4>
                <p className="text-blue-800">{submission.admin_feedback}</p>
              </div>
            )}
          </div>

          <div className="mt-6">
            <button
              onClick={onClose}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}