'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { holidayService } from '@/lib/holidayService'

export default function TaskManager() {
  const [tasks, setTasks] = useState([])
  const [students, setStudents] = useState([])
  const [taskGroups, setTaskGroups] = useState([])
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [showMultiAssignForm, setShowMultiAssignForm] = useState(false)
  const [showViewAssignments, setShowViewAssignments] = useState(false)
  const [showEditTask, setShowEditTask] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [selectedTasks, setSelectedTasks] = useState([])
  const [taskToDelete, setTaskToDelete] = useState(null)
  const [taskAssignments, setTaskAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showDeletedTasks, setShowDeletedTasks] = useState(false)
  const [calculatedDeadline, setCalculatedDeadline] = useState('')
  const [expandedGroups, setExpandedGroups] = useState({})
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    group_id: '',
    working_duration: 7,
    use_holiday_calendar: true,
    documentation_files: [],
    reference_links: [{ url: '', description: '' }],
    readme_content: ''
  })
  
  const [assignmentData, setAssignmentData] = useState({
    student_id: '',
    admin_notes: '',
    start_date: new Date().toISOString().split('T')[0]
  })

  const [multiAssignmentData, setMultiAssignmentData] = useState({
    student_id: '',
    admin_notes: '',
    start_date: new Date().toISOString().split('T')[0],
    task_ids: []
  })
  
  const supabase = createClient()

  useEffect(() => {
    fetchTasks()
    fetchStudents()
    fetchTaskGroups()
  }, [showDeletedTasks])

  useEffect(() => {
    if (formData.working_duration && formData.use_holiday_calendar) {
      calculateDeadline()
    }
  }, [formData.working_duration, formData.use_holiday_calendar])

  const calculateDeadline = async () => {
    if (formData.working_duration) {
      const startDate = new Date()
      const deadline = await holidayService.calculateSubmissionDate(
        startDate, 
        parseInt(formData.working_duration)
      )
      setCalculatedDeadline(deadline.toLocaleDateString())
    }
  }

  const fetchTaskGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('task_groups')
        .select('*')
        .eq('is_active', true)
        .order('name')
      
      if (error) throw error
      setTaskGroups(data || [])
    } catch (error) {
      console.error('Error fetching task groups:', error)
    }
  }

  const fetchTasks = async () => {
    try {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          task_groups (name, description)
        `)
        .order('created_at', { ascending: false });
      
      if (!showDeletedTasks) {
        query = query.eq('is_deleted', false);
      }
      
      const { data, error } = await query
      
      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'student')
        .order('full_name')
      
      if (error) throw error
      setStudents(data || [])
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }

  const fetchTaskAssignments = async (taskId) => {
    try {
      const { data, error } = await supabase
        .from('task_assignments')
        .select(`
          *,
          profiles:student_id (full_name, email),
          assigned_by_profile:assigned_by (full_name)
        `)
        .eq('task_id', taskId)
        .order('assigned_at', { ascending: false })

      if (error) throw error
      setTaskAssignments(data || [])
      setShowViewAssignments(true)
    } catch (error) {
      console.error('Error fetching assignments:', error)
    }
  }

  const handleFileUpload = async (files, folder) => {
    const uploadedUrls = []
    
    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${folder}/${fileName}`

        const fileOptions = {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || (fileExt === 'pdf' ? 'application/pdf' : 'application/octet-stream')
        }

        const { error: uploadError } = await supabase.storage
          .from('task-documents')
          .upload(filePath, file, fileOptions)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('task-documents')
          .getPublicUrl(filePath)

        const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const directUrl = `${baseUrl}/storage/v1/object/public/task-documents/${filePath}`

        uploadedUrls.push({
          url: publicUrl,
          directUrl: directUrl,
          path: filePath,
          name: file.name,
          type: file.type,
          isPdf: file.type === 'application/pdf' || fileExt === 'pdf'
        })
      } catch (error) {
        console.error('Error uploading file:', error)
        throw error
      }
    }
    
    return uploadedUrls
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  const handleDocumentationChange = (e) => {
    setFormData({
      ...formData,
      documentation_files: Array.from(e.target.files)
    })
  }

  const handleReferenceLinkChange = (index, field, value) => {
    const newLinks = [...formData.reference_links]
    newLinks[index] = { ...newLinks[index], [field]: value }
    setFormData({
      ...formData,
      reference_links: newLinks
    })
  }

  const addReferenceLink = () => {
    setFormData({
      ...formData,
      reference_links: [...formData.reference_links, { url: '', description: '' }]
    })
  }

  const removeReferenceLink = (index) => {
    const newLinks = formData.reference_links.filter((_, i) => i !== index)
    setFormData({
      ...formData,
      reference_links: newLinks
    })
  }

  const handleCreateTask = async (e) => {
    e.preventDefault()
    setLoading(true)
    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      let documentationUrls = []
      if (formData.documentation_files.length > 0) {
        documentationUrls = await handleFileUpload(formData.documentation_files, 'documentation')
      }

      const reference_links = formData.reference_links.filter(link => link.url.trim() !== '')

      const { error } = await supabase
        .from('tasks')
        .insert([{
          title: formData.title,
          description: formData.description,
          group_id: formData.group_id || null,
          working_duration: formData.working_duration,
          use_holiday_calendar: formData.use_holiday_calendar,
          documentation_urls: documentationUrls,
          reference_links,
          readme_content: formData.readme_content,
          created_by: user.id,
          status: 'active',
          is_deleted: false
        }])

      if (error) throw error

      alert('Task created successfully!')
      setShowTaskForm(false)
      setFormData({
        title: '',
        description: '',
        group_id: '',
        working_duration: 7,
        use_holiday_calendar: true,
        documentation_files: [],
        reference_links: [{ url: '', description: '' }],
        readme_content: ''
      })
      fetchTasks()
    } catch (error) {
      console.error('Error creating task:', error)
      alert('Error creating task: ' + error.message)
    } finally {
      setLoading(false)
      setUploading(false)
    }
  }

  const handleUpdateTask = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: formData.title,
          description: formData.description,
          group_id: formData.group_id,
          working_duration: formData.working_duration,
          use_holiday_calendar: formData.use_holiday_calendar,
          reference_links: formData.reference_links.filter(link => link.url.trim() !== ''),
          readme_content: formData.readme_content,
          status: formData.status
        })
        .eq('id', selectedTask.id)

      if (error) throw error

      alert('Task updated successfully!')
      setShowEditTask(false)
      fetchTasks()
    } catch (error) {
      console.error('Error updating task:', error)
      alert('Error updating task: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAssignTask = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) throw userError
      if (!user) throw new Error('No authenticated user found')

      const startDate = new Date(assignmentData.start_date)
      const task = tasks.find(t => t.id === selectedTask.id)
      
      let deadline = new Date(startDate)
      if (task.use_holiday_calendar) {
        deadline = await holidayService.calculateSubmissionDate(
          startDate, 
          task.working_duration
        )
      } else {
        deadline.setDate(deadline.getDate() + task.working_duration)
      }

      const { data: student, error: studentError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', assignmentData.student_id)
        .single()

      if (studentError) throw new Error('Selected student not found')

      const { data, error } = await supabase
        .from('task_assignments')
        .insert([{
          task_id: selectedTask.id,
          student_id: assignmentData.student_id,
          assigned_by: user.id,
          deadline: deadline.toISOString(),
          admin_notes: assignmentData.admin_notes || null,
          status: 'pending',
          task_deleted: false,
          viewed_at: null,
          started_at: null
        }])
        .select()

      if (error) {
        if (error.code === '23505') {
          throw new Error('This task is already assigned to the student')
        } else {
          throw error
        }
      }

      alert(`✅ Task assigned successfully to ${student.full_name || student.email}!\nDeadline: ${deadline.toLocaleDateString()}`)
      setShowAssignForm(false)
      setAssignmentData({
        student_id: '',
        admin_notes: '',
        start_date: new Date().toISOString().split('T')[0]
      })
      
    } catch (error) {
      console.error('Error assigning task:', error)
      alert('Error assigning task: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMultiAssign = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) throw userError
      if (!user) throw new Error('No authenticated user found')

      if (multiAssignmentData.task_ids.length === 0) {
        throw new Error('Please select at least one task')
      }

      const startDate = new Date(multiAssignmentData.start_date)
      const assignments = []
      const taskDetails = []

      for (const taskId of multiAssignmentData.task_ids) {
        const task = tasks.find(t => t.id === taskId)
        
        let deadline = new Date(startDate)
        if (task.use_holiday_calendar) {
          deadline = await holidayService.calculateSubmissionDate(
            startDate, 
            task.working_duration
          )
        } else {
          deadline.setDate(deadline.getDate() + task.working_duration)
        }

        assignments.push({
          task_id: taskId,
          student_id: multiAssignmentData.student_id,
          assigned_by: user.id,
          deadline: deadline.toISOString(),
          admin_notes: multiAssignmentData.admin_notes || null,
          status: 'pending',
          task_deleted: false
        })

        taskDetails.push({
          title: task.title,
          deadline: deadline.toLocaleDateString()
        })
      }

      const { error: insertError } = await supabase
        .from('task_assignments')
        .insert(assignments)

      if (insertError) throw insertError

      const student = students.find(s => s.id === multiAssignmentData.student_id)
      
      // Show summary of assignments with deadlines
      const summary = taskDetails.slice(0, 3).map(t => `\n• ${t.title}: ${t.deadline}`).join('')
      const more = taskDetails.length > 3 ? `\n...and ${taskDetails.length - 3} more tasks` : ''
      
      alert(`✅ Successfully assigned ${assignments.length} tasks to ${student?.full_name || student?.email}!${summary}${more}`)
      
      setShowMultiAssignForm(false)
      setSelectedTasks([])
      setMultiAssignmentData({
        student_id: '',
        admin_notes: '',
        start_date: new Date().toISOString().split('T')[0],
        task_ids: []
      })
      
    } catch (error) {
      console.error('Error in multi-task assignment:', error)
      alert('Error assigning tasks: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSoftDelete = async (task) => {
    setTaskToDelete(task);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          is_deleted: true, 
          deleted_at: new Date().toISOString(),
          status: 'deleted'
        })
        .eq('id', taskToDelete.id);

      if (error) throw error;

      await supabase
        .from('task_assignments')
        .update({ task_deleted: true })
        .eq('task_id', taskToDelete.id);

      alert(`Task "${taskToDelete.title}" has been deleted.`);
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Error deleting task: ' + error.message);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setTaskToDelete(null);
    }
  };

  const handleRestore = async (task) => {
    if (!confirm(`Restore task "${task.title}"?`)) return;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          is_deleted: false, 
          deleted_at: null,
          status: 'active'
        })
        .eq('id', task.id);

      if (error) throw error;

      await supabase
        .from('task_assignments')
        .update({ task_deleted: false })
        .eq('task_id', task.id);

      alert('Task restored successfully!');
      fetchTasks();
    } catch (error) {
      console.error('Error restoring task:', error);
      alert('Error restoring task: ' + error.message);
    }
  };

  const handlePermanentDelete = async (task) => {
    if (!confirm(`⚠️ PERMANENTLY delete "${task.title}"? This CANNOT be undone!`)) return;
    
    try {
      await supabase
        .from('task_assignments')
        .delete()
        .eq('task_id', task.id);

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id);

      if (error) throw error;

      alert('Task permanently deleted!');
      fetchTasks();
    } catch (error) {
      console.error('Error permanently deleting task:', error);
      alert('Error: ' + error.message);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)

      if (error) throw error
      fetchTasks()
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const openEditTask = (task) => {
    setSelectedTask(task)
    setFormData({
      title: task.title,
      description: task.description,
      group_id: task.group_id || '',
      working_duration: task.working_duration || 7,
      use_holiday_calendar: task.use_holiday_calendar !== false,
      documentation_files: [],
      reference_links: task.reference_links || [{ url: '', description: '' }],
      readme_content: task.readme_content || '',
      status: task.status
    })
    setShowEditTask(true)
  }

  const toggleTaskSelection = (taskId) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
  }

  const selectAllTasksInGroup = (groupId) => {
    const groupTaskIds = tasks
      .filter(t => t.group_id === groupId && !t.is_deleted)
      .map(t => t.id)
    
    setSelectedTasks(prev => {
      const newSelection = [...prev]
      groupTaskIds.forEach(id => {
        if (!newSelection.includes(id)) {
          newSelection.push(id)
        }
      })
      return newSelection
    })
  }

  const clearTaskSelection = () => {
    setSelectedTasks([])
  }

  const toggleGroupExpand = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }))
  }

  const openMultiAssign = () => {
    if (selectedTasks.length === 0) {
      alert('Please select at least one task first')
      return
    }
    setMultiAssignmentData(prev => ({
      ...prev,
      task_ids: selectedTasks
    }))
    setShowMultiAssignForm(true)
  }

  if (loading && tasks.length === 0) {
    return <div className="text-center py-8 text-gray-600">Loading tasks...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Task Management</h2>
        <div className="flex gap-2">
          {selectedTasks.length > 0 && (
            <>
              <button
                onClick={openMultiAssign}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Assign Selected ({selectedTasks.length})
              </button>
              <button
                onClick={clearTaskSelection}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
              >
                Clear Selection
              </button>
            </>
          )}
          <button
            onClick={() => setShowTaskForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Task
          </button>
        </div>
      </div>

      {/* Show Deleted Toggle */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Show deleted tasks:</label>
          <input
            type="checkbox"
            checked={showDeletedTasks}
            onChange={(e) => {
              setShowDeletedTasks(e.target.checked);
              fetchTasks();
            }}
            className="w-4 h-4"
          />
        </div>
        <div className="text-sm text-gray-500">
          {selectedTasks.length} task(s) selected
        </div>
      </div>

      {/* Tasks by Group */}
      <div className="space-y-6">
        {taskGroups.map(group => {
          const groupTasks = tasks.filter(t => t.group_id === group.id && !t.is_deleted)
          if (groupTasks.length === 0) return null
          
          const isExpanded = expandedGroups[group.id] !== false
          
          return (
            <div key={group.id} className="border rounded-lg overflow-hidden">
              <div 
                className="bg-gray-50 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-100"
                onClick={() => toggleGroupExpand(group.id)}
              >
                <div className="flex items-center gap-3">
                  <svg className={`w-5 h-5 text-gray-500 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <h3 className="font-semibold text-gray-800">{group.name}</h3>
                  <span className="text-sm text-gray-500">{groupTasks.length} tasks</span>
                </div>
                {isExpanded && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      selectAllTasksInGroup(group.id)
                    }}
                    className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Select All in Group
                  </button>
                )}
              </div>
              
              {isExpanded && (
                <div className="p-4 space-y-4">
                  {groupTasks.map(task => (
                    <div key={task.id} className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedTasks.includes(task.id)}
                          onChange={() => toggleTaskSelection(task.id)}
                          className="mt-1 w-4 h-4"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium text-gray-800">{task.title}</h4>
                            <select
                              value={task.status}
                              onChange={(e) => handleStatusChange(task.id, e.target.value)}
                              className={`px-2 py-1 rounded-full text-xs font-medium border-0 ${
                                task.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              <option value="active">Active</option>
                              <option value="archived">Archived</option>
                            </select>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {task.working_duration} working days
                            </span>
                            {task.use_holiday_calendar && (
                              <span className="flex items-center gap-1" title="Excludes Sri Lanka holidays">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Excluding holidays
                              </span>
                            )}
                          </div>

                          {/* Documentation Files */}
                          {task.documentation_urls?.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-gray-700 mb-1">📎 Documents:</p>
                              <div className="flex flex-wrap gap-2">
                                {task.documentation_urls.map((doc, idx) => {
                                  const fileData = typeof doc === 'string' ? { url: doc } : doc;
                                  const fileUrl = fileData.url || fileData.directUrl || fileData;
                                  const fileName = fileData.name || `Document ${idx + 1}`;
                                  
                                  return (
                                    <a
                                      key={idx}
                                      href={fileUrl}
                                      target="_blank"
                                      className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 flex items-center gap-1"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                      </svg>
                                      {fileName}
                                    </a>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => {
                                setSelectedTask(task)
                                setShowAssignForm(true)
                              }}
                              className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Assign
                            </button>
                            <button
                              onClick={() => fetchTaskAssignments(task.id)}
                              className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View
                            </button>
                            <button
                              onClick={() => openEditTask(task)}
                              className="text-xs px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => handleSoftDelete(task)}
                              className="text-xs px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Ungrouped Tasks */}
        {tasks.filter(t => !t.group_id && !t.is_deleted).length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div 
              className="bg-gray-50 px-4 py-3 flex items-center cursor-pointer hover:bg-gray-100"
              onClick={() => toggleGroupExpand('ungrouped')}
            >
              <svg className={`w-5 h-5 text-gray-500 mr-2 transform transition-transform ${expandedGroups.ungrouped ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <h3 className="font-semibold text-gray-800">Ungrouped Tasks</h3>
              <span className="ml-2 text-sm text-gray-500">
                {tasks.filter(t => !t.group_id && !t.is_deleted).length} tasks
              </span>
            </div>
            
            {expandedGroups.ungrouped && (
              <div className="p-4 space-y-4">
                {tasks.filter(t => !t.group_id && !t.is_deleted).map(task => (
                  <div key={task.id} className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedTasks.includes(task.id)}
                        onChange={() => toggleTaskSelection(task.id)}
                        className="mt-1 w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-gray-800">{task.title}</h4>
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                            className={`px-2 py-1 rounded-full text-xs font-medium border-0 ${
                              task.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            <option value="active">Active</option>
                            <option value="archived">Archived</option>
                          </select>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => {
                              setSelectedTask(task)
                              setShowAssignForm(true)
                            }}
                            className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Assign
                          </button>
                          <button
                            onClick={() => fetchTaskAssignments(task.id)}
                            className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            View
                          </button>
                          <button
                            onClick={() => openEditTask(task)}
                            className="text-xs px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleSoftDelete(task)}
                            className="text-xs px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && taskToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Task</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "{taskToDelete.title}"?
            </p>
            <p className="text-sm text-gray-500 mb-4">
              This task will be hidden from students but can be restored later.
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Soft Delete
              </button>
              <button
                onClick={() => handlePermanentDelete(taskToDelete)}
                className="flex-1 bg-red-800 text-white px-4 py-2 rounded-lg hover:bg-red-900"
              >
                Permanent Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Create New Task</h3>
                <button onClick={() => setShowTaskForm(false)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Task Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Enter task title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Task Group</label>
                  <select
                    name="group_id"
                    value={formData.group_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Select a group (optional)</option>
                    {taskGroups.map(group => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Working Days Allowed *
                  </label>
                  <input
                    type="number"
                    name="working_duration"
                    value={formData.working_duration}
                    onChange={handleInputChange}
                    min="1"
                    max="365"
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  {calculatedDeadline && (
                    <p className="text-sm text-gray-500 mt-1">
                      If assigned today, deadline would be: {calculatedDeadline}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="use_holiday_calendar"
                    checked={formData.use_holiday_calendar}
                    onChange={handleInputChange}
                    className="w-4 h-4"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Exclude Sri Lanka holidays (Poya days, etc.)
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows="4"
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Enter task description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attach Documents (PDF, Images, etc.)
                  </label>
                  <input
                    type="file"
                    multiple
                    onChange={handleDocumentationChange}
                    className="w-full px-3 py-2 border rounded-lg"
                    accept=".pdf,.doc,.docx,.txt,.md,.jpg,.jpeg,.png"
                  />
                  {formData.documentation_files.length > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      {formData.documentation_files.length} file(s) selected
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reference Links</label>
                  {formData.reference_links.map((link, index) => (
                    <div key={index} className="mb-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-600">Link {index + 1}</span>
                        {formData.reference_links.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeReferenceLink(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <input
                        type="url"
                        value={link.url}
                        onChange={(e) => handleReferenceLinkChange(index, 'url', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg mb-2"
                        placeholder="https://..."
                      />
                      <input
                        type="text"
                        value={link.description}
                        onChange={(e) => handleReferenceLinkChange(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="What is this link for? (e.g., 'Official Documentation', 'Tutorial Video')"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addReferenceLink}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Another Reference Link
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">README / Instructions</label>
                  <textarea
                    name="readme_content"
                    value={formData.readme_content}
                    onChange={handleInputChange}
                    rows="6"
                    className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                    placeholder="Enter detailed instructions, setup guide, requirements, etc..."
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    disabled={loading || uploading}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    {uploading ? 'Uploading...' : loading ? 'Creating...' : 'Create Task'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTaskForm(false)}
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

      {/* Edit Task Modal */}
      {showEditTask && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Edit Task: {selectedTask.title}</h3>
                <button onClick={() => setShowEditTask(false)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>

              <form onSubmit={handleUpdateTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Task Title</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Task Group</label>
                  <select
                    name="group_id"
                    value={formData.group_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Select a group</option>
                    {taskGroups.map(group => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Working Days</label>
                  <input
                    type="number"
                    name="working_duration"
                    value={formData.working_duration}
                    onChange={handleInputChange}
                    min="1"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="use_holiday_calendar"
                    checked={formData.use_holiday_calendar}
                    onChange={handleInputChange}
                    className="w-4 h-4"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Exclude Sri Lanka holidays
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows="4"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reference Links</label>
                  {formData.reference_links.map((link, index) => (
                    <div key={index} className="mb-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-600">Link {index + 1}</span>
                        {formData.reference_links.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeReferenceLink(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <input
                        type="url"
                        value={link.url}
                        onChange={(e) => handleReferenceLinkChange(index, 'url', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg mb-2"
                        placeholder="https://..."
                      />
                      <input
                        type="text"
                        value={link.description}
                        onChange={(e) => handleReferenceLinkChange(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="What is this link for?"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addReferenceLink}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Another Reference Link
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">README / Instructions</label>
                  <textarea
                    name="readme_content"
                    value={formData.readme_content}
                    onChange={handleInputChange}
                    rows="6"
                    className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    {loading ? 'Updating...' : 'Update Task'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditTask(false)}
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

      {/* Single Task Assignment Modal */}
      {showAssignForm && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Assign Task: {selectedTask.title}</h3>
                <button onClick={() => setShowAssignForm(false)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>

              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  ⏱️ Duration: <strong>{selectedTask.working_duration}</strong> working days
                  {selectedTask.use_holiday_calendar && ' (Sri Lanka holidays excluded)'}
                </p>
              </div>

              <form onSubmit={handleAssignTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Student *</label>
                  <select
                    value={assignmentData.student_id}
                    onChange={(e) => setAssignmentData({...assignmentData, student_id: e.target.value})}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Choose a student...</option>
                    {students.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.full_name || student.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                  <input
                    type="date"
                    value={assignmentData.start_date}
                    onChange={(e) => setAssignmentData({...assignmentData, start_date: e.target.value})}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes for Student</label>
                  <textarea
                    value={assignmentData.admin_notes}
                    onChange={(e) => setAssignmentData({...assignmentData, admin_notes: e.target.value})}
                    rows="3"
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Any specific instructions for this student..."
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-green-300"
                  >
                    {loading ? 'Assigning...' : 'Assign Task'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAssignForm(false)}
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

      {/* Multi-Task Assignment Modal */}
      {showMultiAssignForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Assign Multiple Tasks</h3>
                <button onClick={() => setShowMultiAssignForm(false)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>

              <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-800">
                  📋 Assigning <strong>{selectedTasks.length}</strong> tasks to one student
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  Each task will keep its own duration. Deadlines will be calculated from the start date.
                </p>
              </div>

              {/* Selected Tasks List with Durations */}
              <div className="mb-4 border rounded-lg p-3 bg-gray-50">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Tasks:</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedTasks.map(taskId => {
                    const task = tasks.find(t => t.id === taskId)
                    if (!task) return null
                    
                    return (
                      <div key={taskId} className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                        <span className="text-gray-800 truncate max-w-xs" title={task.title}>
                          {task.title}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                            {task.working_duration} days
                          </span>
                          {task.use_holiday_calendar && (
                            <span className="text-xs text-gray-500" title="Excludes Sri Lanka holidays">
                              📅
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <form onSubmit={handleMultiAssign} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Student *</label>
                  <select
                    value={multiAssignmentData.student_id}
                    onChange={(e) => setMultiAssignmentData({...multiAssignmentData, student_id: e.target.value})}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Choose a student...</option>
                    {students.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.full_name || student.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Common Start Date *</label>
                  <input
                    type="date"
                    value={multiAssignmentData.start_date}
                    onChange={(e) => setMultiAssignmentData({...multiAssignmentData, start_date: e.target.value})}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    All tasks will start on this date, but deadlines will vary based on each task's duration.
                  </p>
                </div>

                {/* Example Deadline Preview */}
                {multiAssignmentData.start_date && multiAssignmentData.student_id && (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-green-700 mb-2">📅 Example Deadlines:</p>
                    <div className="space-y-1 text-xs">
                      {selectedTasks.slice(0, 3).map(taskId => {
                        const task = tasks.find(t => t.id === taskId)
                        if (!task) return null
                        
                        const startDate = new Date(multiAssignmentData.start_date)
                        const deadline = new Date(startDate)
                        deadline.setDate(deadline.getDate() + task.working_duration)
                        
                        return (
                          <div key={taskId} className="flex justify-between text-green-600">
                            <span className="truncate max-w-xs">{task.title}:</span>
                            <span className="font-medium">{deadline.toLocaleDateString()}</span>
                          </div>
                        )
                      })}
                      {selectedTasks.length > 3 && (
                        <p className="text-green-500 italic">...and {selectedTasks.length - 3} more tasks</p>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Common Notes for All Tasks</label>
                  <textarea
                    value={multiAssignmentData.admin_notes}
                    onChange={(e) => setMultiAssignmentData({...multiAssignmentData, admin_notes: e.target.value})}
                    rows="3"
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="These notes will apply to all assigned tasks..."
                  />
                </div>

                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-xs text-yellow-700">
                    ⚠️ Each task will have its own deadline based on its individual duration.
                    {selectedTasks.some(t => {
                      const task = tasks.find(task => task.id === t)
                      return task?.use_holiday_calendar
                    }) && (
                      <span className="block mt-1">
                        📅 Tasks with holiday calendar enabled will exclude Sri Lanka public holidays and Poya days.
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    disabled={loading || !multiAssignmentData.student_id}
                    className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-purple-300"
                  >
                    {loading ? 'Assigning...' : `Assign ${selectedTasks.length} Tasks`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMultiAssignForm(false)}
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

      {/* View Assignments Modal */}
      {showViewAssignments && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Task Assignments</h3>
                <button onClick={() => setShowViewAssignments(false)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>

              {taskAssignments.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No assignments yet for this task.</p>
              ) : (
                <div className="space-y-4">
                  {taskAssignments.map((assignment) => (
                    <div key={assignment.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-gray-800">
                            Student: {assignment.profiles?.full_name || assignment.profiles?.email}
                          </p>
                          <p className="text-sm text-gray-600">
                            Assigned by: {assignment.assigned_by_profile?.full_name || 'Admin'}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          assignment.status === 'completed' ? 'bg-green-100 text-green-800' :
                          assignment.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          assignment.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {assignment.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Deadline: {new Date(assignment.deadline).toLocaleDateString()}
                      </p>
                      {assignment.admin_notes && (
                        <p className="text-sm text-gray-600 mt-2">
                          <span className="font-medium">Notes:</span> {assignment.admin_notes}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}