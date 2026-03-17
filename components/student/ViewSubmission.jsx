'use client'

export default function ViewSubmission({ submission, task, onClose }) {
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

            {/* Documentation Files */}
            {submission.documentation_urls?.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">📎 Your Documents:</h4>
                <div className="space-y-2">
                  {submission.documentation_urls.map((doc, idx) => (
                    <a
                      key={idx}
                      href={doc.url || doc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-2 bg-gray-50 rounded-lg hover:bg-gray-100"
                    >
                      {doc.name || `Document ${idx + 1}`}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Screenshots */}
            {submission.screenshots?.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">📸 Your Screenshots:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {submission.screenshots.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Screenshot ${idx + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            {submission.links?.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">🔗 Your Links:</h4>
                <div className="space-y-1">
                  {submission.links.map((link, idx) => (
                    <a
                      key={idx}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-blue-600 hover:underline"
                    >
                      {link}
                    </a>
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