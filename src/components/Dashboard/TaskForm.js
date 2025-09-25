import React, { useState, useEffect } from 'react';
import './TaskForm.css';

const TaskForm = ({ task, onSave, onCancel, isRecurringEdit = false, onRecurringEditChoice }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    category: 'study',
    priority: 'normal',
    recurrence: 'none',
    recurringDays: [],
    recurringEndDate: ''
  });

  const [errors, setErrors] = useState({});
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [editScope, setEditScope] = useState(null);

  // Dropdown options
  const descriptionOptions = [
    { value: '', label: 'Select description type...' },
    { value: 'Morning routine - Bathroom, breakfast, preparation', label: 'Morning Routine' },
    { value: 'University lecture - Computer Science course', label: 'CS Lecture' },
    { value: 'University lecture - HCI course', label: 'HCI Lecture' },
    { value: 'Data Structures study session', label: 'Study Session' },
    { value: 'Laboratory practical session', label: 'Lab Session' },
    { value: 'University assignments and coursework', label: 'Coursework' },
    { value: 'Professional certifications work', label: 'Certifications' },
    { value: 'Workout session', label: 'Exercise' },
    { value: 'Meal preparation and eating', label: 'Meal Time' },
    { value: 'Personal relaxation time', label: 'Free Time' },
    { value: 'Collaborative work session', label: 'Team Work' },
    { value: 'Job applications and career prep', label: 'Career Prep' },
    { value: 'Daily medication time', label: 'Medication' },
    { value: 'Cleaning and organizing', label: 'Cleaning' },
    { value: 'Other activity', label: 'Other' }
  ];

  const categoryOptions = [
    { value: 'study', label: '📚 Study' },
    { value: 'work', label: '💼 Work' },
    { value: 'personal', label: '🏠 Personal' },
    { value: 'health', label: '💪 Health' },
    { value: 'education', label: '🎓 Education' },
    { value: 'other', label: '📝 Other' }
  ];

  const priorityOptions = [
    { value: 'high', label: '🔥 High Priority' },
    { value: 'medium', label: '⚡ Medium Priority' },
    { value: 'normal', label: '📌 Normal Priority' }
  ];

  const recurrenceOptions = [
    { value: 'none', label: '🚫 No Repeat' },
    { value: 'daily', label: '📅 Daily' },
    { value: 'weekly', label: '📆 Weekly' },
    { value: 'monthly', label: '🗓️ Monthly' },
    { value: 'custom', label: '⚙️ Custom Days' }
  ];

  const weekDays = [
    { value: 'sunday', label: 'Sun' },
    { value: 'monday', label: 'Mon' },
    { value: 'tuesday', label: 'Tue' },
    { value: 'wednesday', label: 'Wed' },
    { value: 'thursday', label: 'Thu' },
    { value: 'friday', label: 'Fri' },
    { value: 'saturday', label: 'Sat' }
  ];

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        start: task.start ? formatDateTimeLocal(task.start) : '',
        end: task.end ? formatDateTimeLocal(task.end) : '',
        category: task.category || 'study',
        priority: task.priority || 'normal',
        recurrence: task.recurrence || 'none',
        recurringDays: task.recurringDays || [],
        recurringEndDate: task.recurringEndDate ? formatDateLocal(task.recurringEndDate) : ''
      });

      // Show recurring edit modal if this is a recurring task being edited
      if (isRecurringEdit && task.recurrence && task.recurrence !== 'none') {
        setShowRecurringModal(true);
      }
    }
  }, [task, isRecurringEdit]);

  const formatDateTimeLocal = (date) => {
    const d = date.toDate ? date.toDate() : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const formatDateLocal = (date) => {
    const d = date.toDate ? date.toDate() : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleDayToggle = (dayValue) => {
    setFormData(prev => ({
      ...prev,
      recurringDays: prev.recurringDays.includes(dayValue)
        ? prev.recurringDays.filter(d => d !== dayValue)
        : [...prev.recurringDays, dayValue]
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.start) {
      newErrors.start = 'Start time is required';
    }

    if (!formData.end) {
      newErrors.end = 'End time is required';
    }

    if (formData.start && formData.end && new Date(formData.start) >= new Date(formData.end)) {
      newErrors.end = 'End time must be after start time';
    }

    if (formData.recurrence === 'custom' && formData.recurringDays.length === 0) {
      newErrors.recurringDays = 'Select at least one day for custom recurrence';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRecurringChoice = (choice) => {
    setEditScope(choice);
    setShowRecurringModal(false);
    
    if (onRecurringEditChoice) {
      onRecurringEditChoice(choice);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const taskData = {
      ...formData,
      start: new Date(formData.start),
      end: new Date(formData.end),
      recurringEndDate: formData.recurringEndDate ? new Date(formData.recurringEndDate) : null,
      color: getCategoryColor(formData.category),
      editScope: editScope // Include edit scope for recurring tasks
    };

    if (task?.id) {
      onSave(task.id, taskData);
    } else {
      onSave(taskData);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      study: '#10b981',
      work: '#3b82f6',
      personal: '#06b6d4',
      health: '#ef4444',
      education: '#8b5cf6',
      other: '#64748b'
    };
    return colors[category] || '#64748b';
  };

  return (
    <>
      {/* Recurring Edit Choice Modal */}
      {showRecurringModal && (
        <div className="modal-overlay">
          <div className="modal-content recurring-modal">
            <div className="modal-header">
              <h3>📅 Edit Recurring Task</h3>
            </div>
            <div className="modal-body">
              <p>This is a recurring task. How would you like to edit it?</p>
              <div className="recurring-choices">
                <button 
                  className="choice-btn single-choice"
                  onClick={() => handleRecurringChoice('single')}
                >
                  <span className="choice-icon">📝</span>
                  <div className="choice-content">
                    <strong>Edit Only This Instance</strong>
                    <small>Changes will only apply to this specific occurrence</small>
                  </div>
                </button>
                
                <button 
                  className="choice-btn all-choice"
                  onClick={() => handleRecurringChoice('all')}
                >
                  <span className="choice-icon">🔄</span>
                  <div className="choice-content">
                    <strong>Edit All Future Instances</strong>
                    <small>Changes will apply to this and all future occurrences</small>
                  </div>
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => {
                  setShowRecurringModal(false);
                  onCancel();
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Task Form */}
      {!showRecurringModal && (
        <div className="task-form-overlay">
          <div className="task-form-modal">
            <div className="task-form-header">
              <h2>{task ? '✏️ Edit Task' : '➕ Add New Task'}</h2>
              <button className="close-btn" onClick={onCancel}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="task-form">
              <div className="form-content">
                {/* Title */}
                <div className="form-group">
                  <label htmlFor="title">📝 Task Title *</label>
                  <input
                    type="text"
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="Enter task title..."
                    className={errors.title ? 'error' : ''}
                  />
                  {errors.title && <span className="error-text">{errors.title}</span>}
                </div>

                {/* Description Dropdown */}
                <div className="form-group">
                  <label htmlFor="description">📄 Description</label>
                  <select
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className="form-select"
                  >
                    {descriptionOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {formData.description && formData.description.includes('Other') && (
                    <input
                      type="text"
                      placeholder="Enter custom description..."
                      value={formData.description === 'Other activity' ? '' : formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      className="custom-input"
                    />
                  )}
                </div>

                {/* Date and Time */}
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="start">🕐 Start Time *</label>
                    <input
                      type="datetime-local"
                      id="start"
                      value={formData.start}
                      onChange={(e) => handleChange('start', e.target.value)}
                      className={errors.start ? 'error' : ''}
                    />
                    {errors.start && <span className="error-text">{errors.start}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="end">🕐 End Time *</label>
                    <input
                      type="datetime-local"
                      id="end"
                      value={formData.end}
                      onChange={(e) => handleChange('end', e.target.value)}
                      className={errors.end ? 'error' : ''}
                    />
                    {errors.end && <span className="error-text">{errors.end}</span>}
                  </div>
                </div>

                {/* Category and Priority */}
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="category">🏷️ Category</label>
                    <select
                      id="category"
                      value={formData.category}
                      onChange={(e) => handleChange('category', e.target.value)}
                      className="form-select"
                    >
                      {categoryOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="priority">⭐ Priority</label>
                    <select
                      id="priority"
                      value={formData.priority}
                      onChange={(e) => handleChange('priority', e.target.value)}
                      className="form-select"
                    >
                      {priorityOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Recurrence */}
                <div className="form-group">
                  <label htmlFor="recurrence">🔄 Recurrence</label>
                  <select
                    id="recurrence"
                    value={formData.recurrence}
                    onChange={(e) => handleChange('recurrence', e.target.value)}
                    className="form-select"
                  >
                    {recurrenceOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Days Selection */}
                {formData.recurrence === 'custom' && (
                  <div className="form-group">
                    <label>📅 Select Days</label>
                    <div className="days-selector">
                      {weekDays.map(day => (
                        <button
                          key={day.value}
                          type="button"
                          className={`day-btn ${formData.recurringDays.includes(day.value) ? 'selected' : ''}`}
                          onClick={() => handleDayToggle(day.value)}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                    {errors.recurringDays && <span className="error-text">{errors.recurringDays}</span>}
                  </div>
                )}

                {/* Recurring End Date */}
                {formData.recurrence !== 'none' && (
                  <div className="form-group">
                    <label htmlFor="recurringEndDate">📆 End Recurrence (Optional)</label>
                    <input
                      type="date"
                      id="recurringEndDate"
                      value={formData.recurringEndDate}
                      onChange={(e) => handleChange('recurringEndDate', e.target.value)}
                    />
                    <small className="form-help">Leave empty for indefinite recurrence</small>
                  </div>
                )}
              </div>

              <div className="form-footer">
                <button type="button" className="btn-cancel" onClick={onCancel}>
                  Cancel
                </button>
                <button type="submit" className="btn-save">
                  {task ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default TaskForm;
