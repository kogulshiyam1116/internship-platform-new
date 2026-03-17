'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { holidayService } from '@/lib/holidayService'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

export default function TaskManager() {
  const [tasks, setTasks] = useState([])
  const [students, setStudents] = useState([])
  const [taskGroups, setTaskGroups] = useState([])
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [showMultiAssignForm, setShowMultiAssignForm] = useState(false)
  const [showViewAssignments, setShowViewAssignments] = useState(false)
  const [showEditTask, setShowEditTask] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDeleteGroupConfirm, setShowDeleteGroupConfirm] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [selectedTasks, setSelectedTasks] = useState([])
  const [groupToDelete, setGroupToDelete] = useState(null)
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
    zip_files: [], // Changed to zip_files
    reference_links: [{ url: '', description: '' }],
    readme_content: ''
  })

  const [groupFormData, setGroupFormData] = useState({
    name: '',
    description: ''
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
      
      const expanded = {}
      data?.forEach(group => {
        expanded[group.id] = true
      })
      expanded['ungrouped'] = true
      setExpandedGroups(expanded)
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
        .order('display_order', { ascending: true })
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

  // ZIP file upload function
  const handleZipUpload = async (files) => {
    const uploadedZips = []
    
    for (const file of files) {
      try {
        // Validate file is ZIP
        if (!file.name.toLowerCase().endsWith('.zip')) {
          alert(`File ${file.name} is not a ZIP file. Please upload only ZIP files.`)
          continue
        }

        // Check file size (max 100MB)
        if (file.size > 100 * 1024 * 1024) {
          alert(`File ${file.name} is too large. Maximum size is 100MB.`)
          continue
        }

        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const filePath = `task-zips/${fileName}`

        console.log('📤 Uploading ZIP:', file.name, 'Size:', (file.size / 1024 / 1024).toFixed(2), 'MB')

        const fileOptions = {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/zip'
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

        uploadedZips.push({
          url: publicUrl,
          directUrl: directUrl,
          path: filePath,
          name: file.name,
          size: file.size,
          uploadedAt: new Date().toISOString()
        })

        console.log('✅ ZIP uploaded:', file.name)
      } catch (error) {
        console.error('❌ Error uploading ZIP:', error)
        throw error
      }
    }
    
    return uploadedZips
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  const handleZipChange = async (e) => {
    const files = Array.from(e.target.files)
    setUploading(true)
    
    try {
      const uploadedZips = await handleZipUpload(files)
      setFormData({
        ...formData,
        zip_files: [...formData.zip_files, ...uploadedZips]
      })
      alert(`✅ ${uploadedZips.length} ZIP file(s) uploaded successfully!`)
    } catch (error) {
      console.error('Error uploading ZIPs:', error)
      alert('Error uploading ZIP files: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const removeZipFile = (index) => {
    const newZips = [...formData.zip_files]
    newZips.splice(index, 1)
    setFormData({
      ...formData,
      zip_files: newZips
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

  const handleCreateGroup = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase
        .from('task_groups')
        .insert([{
          name: groupFormData.name,
          description: groupFormData.description || null,
          created_by: user.id,
          is_active: true
        }])

      if (error) throw error

      alert('Task group created successfully!')
      setShowGroupForm(false)
      setGroupFormData({ name: '', description: '' })
      fetchTaskGroups()
    } catch (error) {
      console.error('Error creating group:', error)
      alert('Error creating group: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteGroup = async (group) => {
    if (!confirm(`Are you sure you want to delete group "${group.name}"? Tasks in this group will become ungrouped.`)) {
      return
    }

    setLoading(true)
    try {
      await supabase
        .from('tasks')
        .update({ group_id: null })
        .eq('group_id', group.id)

      const { error } = await supabase
        .from('task_groups')
        .update({ is_active: false })
        .eq('id', group.id)

      if (error) throw error

      alert('Group deleted successfully!')
      fetchTaskGroups()
      fetchTasks()
    } catch (error) {
      console.error('Error deleting group:', error)
      alert('Error deleting group: ' + error.message)
    } finally {
      setLoading(false)
      setShowDeleteGroupConfirm(false)
      setGroupToDelete(null)
    }
  }

  const handleCreateTask = async (e) => {
    e.preventDefault()
    setLoading(true)
    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const groupTasks = tasks.filter(t => t.group_id === formData.group_id)
      const maxOrder = groupTasks.length > 0 
        ? Math.max(...groupTasks.map(t => t.display_order || 0)) 
        : 0

      const reference_links = formData.reference_links.filter(link => link.url.trim() !== '')

      const { error } = await supabase
        .from('tasks')
        .insert([{
          title: formData.title,
          description: formData.description,
          group_id: formData.group_id || null,
          working_duration: formData.working_duration,
          use_holiday_calendar: formData.use_holiday_calendar,
          zip_files: formData.zip_files, // Store ZIP files
          reference_links,
          readme_content: formData.readme_content,
          created_by: user.id,
          status: 'active',
          is_deleted: false,
          display_order: maxOrder + 1
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
        zip_files: [],
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
          zip_files: formData.zip_files,
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

  const handleDragEnd = async (result) => {
    if (!result.destination) return

    const sourceGroup = result.source.droppableId
    const destinationGroup = result.destination.droppableId
    const taskId = result.draggableId

    const sourceTasks = tasks
      .filter(t => t.group_id === sourceGroup && !t.is_deleted)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))

    if (sourceGroup === destinationGroup) {
      const reorderedTasks = Array.from(sourceTasks)
      const [removed] = reorderedTasks.splice(result.source.index, 1)
      reorderedTasks.splice(result.destination.index, 0, removed)

      const updates = reorderedTasks.map((task, index) => ({
        id: task.id,
        display_order: index + 1
      }))

      for (const update of updates) {
        await supabase
          .from('tasks')
          .update({ display_order: update.display_order })
          .eq('id', update.id)
      }
    } else {
      const destinationTasks = tasks
        .filter(t => t.group_id === destinationGroup && !t.is_deleted)
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))

      await supabase
        .from('tasks')
        .update({ 
          group_id: destinationGroup === 'ungrouped' ? null : destinationGroup,
          display_order: result.destination.index + 1
        })
        .eq('id', taskId)

      const updatedDestinationTasks = [...destinationTasks]
      updatedDestinationTasks.splice(result.destination.index, 0, { id: taskId })
      
      for (let i = 0; i < updatedDestinationTasks.length; i++) {
        if (updatedDestinationTasks[i].id === taskId) continue
        await supabase
          .from('tasks')
          .update({ display_order: i + 1 })
          .eq('id', updatedDestinationTasks[i].id)
      }
    }

    fetchTasks()
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

      let currentDate = new Date(multiAssignmentData.start_date)
      const assignments = []
      const taskDetails = []

      for (const taskId of multiAssignmentData.task_ids) {
        const task = tasks.find(t => t.id === taskId)
        
        let deadline = new Date(currentDate)
        if (task.use_holiday_calendar) {
          deadline = await holidayService.calculateSubmissionDate(
            currentDate, 
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
          deadline: deadline.toLocaleDateString(),
          duration: task.working_duration
        })

        currentDate = new Date(deadline)
        currentDate.setDate(currentDate.getDate() + 1)
      }

      const { error: insertError } = await supabase
        .from('task_assignments')
        .insert(assignments)

      if (insertError) throw insertError

      const student = students.find(s => s.id === multiAssignmentData.student_id)
      
      let summary = '\n'
      taskDetails.forEach((detail, index) => {
        summary += `${index + 1}. ${detail.title} (${detail.duration} days): ${detail.deadline}\n`
      })
      
      alert(`✅ Successfully assigned ${assignments.length} tasks to ${student?.full_name || student?.email}!\n${summary}`)
      
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
      zip_files: task.zip_files || [],
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
          <button
            onClick={() => setShowGroupForm(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Group
          </button>
          {selectedTasks.length > 0 && (
            <>
              <button
                onClick={openMultiAssign}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
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
                Clear
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
            New Task
          </button>
        </div>
      </div>

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

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="space-y-6">
          {taskGroups.map(group => {
            const groupTasks = tasks
              .filter(t => t.group_id === group.id && !t.is_deleted)
              .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
            
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
                  <div className="flex items-center gap-2">
                    {isExpanded && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          selectAllTasksInGroup(group.id)
                        }}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Select All
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setGroupToDelete(group)
                        setShowDeleteGroupConfirm(true)
                      }}
                      className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Delete Group
                    </button>
                  </div>
                </div>
                
                {isExpanded && (
                  <Droppable droppableId={group.id}>
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="p-4 space-y-2 min-h-[100px]"
                      >
                        {groupTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`bg-white p-4 rounded-lg border ${
                                  snapshot.isDragging ? 'border-blue-500 shadow-lg' : 'border-gray-200'
                                } hover:shadow-md transition-shadow`}
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    {...provided.dragHandleProps}
                                    className="mt-1 cursor-move text-gray-400 hover:text-gray-600"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                    </svg>
                                  </div>
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

                                    {/* ZIP Files Display */}
                                    {task.zip_files?.length > 0 && (
                                      <div className="mb-2">
                                        <p className="text-xs font-medium text-gray-700 mb-1">📦 Resource ZIP Files:</p>
                                        <div className="flex flex-wrap gap-2">
                                          {task.zip_files.map((zip, idx) => (
                                            <a
                                              key={idx}
                                              href={zip.url || zip.directUrl}
                                              download
                                              className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100 flex items-center gap-1 border border-yellow-200"
                                              title={`Size: ${(zip.size / 1024 / 1024).toFixed(2)} MB`}
                                            >
                                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                              </svg>
                                              {zip.name}
                                            </a>
                                          ))}
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
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                )}
              </div>
            )
          })}

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
                <Droppable droppableId="ungrouped">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="p-4 space-y-2 min-h-[100px]"
                    >
                      {tasks
                        .filter(t => !t.group_id && !t.is_deleted)
                        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                        .map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`bg-white p-4 rounded-lg border ${
                                  snapshot.isDragging ? 'border-blue-500 shadow-lg' : 'border-gray-200'
                                } hover:shadow-md transition-shadow`}
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    {...provided.dragHandleProps}
                                    className="mt-1 cursor-move text-gray-400 hover:text-gray-600"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                    </svg>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={selectedTasks.includes(task.id)}
                                    onChange={() => toggleTaskSelection(task.id)}
                                    className="mt-1 w-4 h-4"
                                  />
                                  <div className="flex-1">
                                    <h4 className="font-medium text-gray-800 mb-2">{task.title}</h4>
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
                                        onClick={() => openEditTask(task)}
                                        className="text-xs px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              )}
            </div>
          )}
        </div>
      </DragDropContext>

      {/* Create Group Modal */}
      {showGroupForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Create New Task Group</h3>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Group Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={groupFormData.name}
                    onChange={handleGroupInputChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., Embedded Wizard, NXP Board, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                  <textarea
                    name="description"
                    value={groupFormData.description}
                    onChange={handleGroupInputChange}
                    rows="3"
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Brief description of this task group..."
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                  >
                    {loading ? 'Creating...' : 'Create Group'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGroupForm(false)}
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

      {/* Delete Group Confirmation Modal */}
      {showDeleteGroupConfirm && groupToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Group</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete group "{groupToDelete.name}"?
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Tasks in this group will become ungrouped but will not be deleted.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDeleteGroup(groupToDelete)}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Delete Group
              </button>
              <button
                onClick={() => setShowDeleteGroupConfirm(false)}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Task Confirmation Modal */}
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

                {/* ZIP Files Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Resource ZIP Files (Max 100MB each)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept=".zip"
                    onChange={handleZipChange}
                    className="w-full px-3 py-2 border rounded-lg"
                    disabled={loading || uploading}
                  />
                  {uploading && (
                    <p className="text-sm text-blue-600 mt-1">Uploading ZIP files...</p>
                  )}
                  
                  {/* Display uploaded ZIPs */}
                  {formData.zip_files.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-medium text-gray-700">Uploaded ZIPs:</p>
                      {formData.zip_files.map((zip, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                            <span className="text-sm text-gray-700">{zip.name}</span>
                            <span className="text-xs text-gray-500">
                              ({(zip.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeZipFile(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reference Links with Descriptions */}
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

                {/* ZIP Files Display (Read-only in edit) */}
                {formData.zip_files?.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Resource ZIP Files</label>
                    <div className="space-y-2">
                      {formData.zip_files.map((zip, index) => (
                        <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                          <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                          <span className="text-sm text-gray-700">{zip.name}</span>
                          <span className="text-xs text-gray-500">
                            ({(zip.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">To add new ZIP files, use the task creation form.</p>
                  </div>
                )}

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
                  ⏱️ Tasks will be assigned sequentially. Each task starts after the previous task's deadline.
                </p>
              </div>

              {/* Selected Tasks List */}
              <div className="mb-4 border rounded-lg p-3 bg-gray-50">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Tasks (in this order):</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedTasks.map((taskId, index) => {
                    const task = tasks.find(t => t.id === taskId)
                    if (!task) return null
                    
                    return (
                      <div key={taskId} className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                        <span className="text-gray-800">
                          {index + 1}. {task.title}
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
                </div>

                {/* Sequential Deadline Preview */}
                {multiAssignmentData.start_date && multiAssignmentData.student_id && (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-green-700 mb-2">📅 Sequential Deadlines:</p>
                    <div className="space-y-1 text-xs">
                      {selectedTasks.map((taskId, index) => {
                        const task = tasks.find(t => t.id === taskId)
                        if (!task) return null
                        
                        let previewDate = new Date(multiAssignmentData.start_date)
                        for (let i = 0; i < index; i++) {
                          const prevTask = tasks.find(t => t.id === selectedTasks[i])
                          if (prevTask) {
                            previewDate.setDate(previewDate.getDate() + prevTask.working_duration + 1)
                          }
                        }
                        
                        const deadline = new Date(previewDate)
                        deadline.setDate(deadline.getDate() + task.working_duration)
                        
                        return (
                          <div key={taskId} className="flex justify-between text-green-600">
                            <span>{index + 1}. {task.title}:</span>
                            <span className="font-medium">{deadline.toLocaleDateString()}</span>
                          </div>
                        )
                      })}
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