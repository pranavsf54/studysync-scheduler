import React, { useState, useEffect } from 'react';
import './TaskForm.css';

const TaskForm = ({ task, onSave, onCancel, onDelete, isRecurringEdit = false, onRecurringEditChoice }) => {
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
  
  // NEW: Delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // State to control Advanced Options visibility
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  // State to control dropdown visibility
  const [showDropdowns, setShowDropdowns] = useState({
    category: false,
    priority: false,
    recurrence: false
  });

  // Dropdown options
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

      // Auto-show advanced options if task has non-default values
      if (task.category !== 'study' || task.priority !== 'normal' || task.recurrence !== 'none') {
        setShowAdvancedOptions(true);
      }

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
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
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

  // Toggle dropdown visibility
  const toggleDropdown = (dropdownType) => {
    setShowDropdowns(prev => ({
      ...prev,
      [dropdownType]: !prev[dropdownType]
    }));
  };

  // Select option and close dropdown
  const selectOption = (dropdownType, value) => {
    handleChange(dropdownType, value);
    setShowDropdowns(prev => ({
      ...prev,
      [dropdownType]: false
    }));
  };

  // Get label for current value
  const getOptionLabel = (options, value) => {
    const option = options.find(opt => opt.value === value);
    return option ? option.label : '';
  };

  // Toggle Advanced Options
  const toggleAdvancedOptions = () => {
    setShowAdvancedOptions(prev => !prev);
    // Close any open dropdowns when collapsing
    if (showAdvancedOptions) {
      setShowDropdowns({
        category: false,
        priority: false,
        recurrence: false
      });
    }
  };

  // NEW: Handle delete confirmation
  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    if (onDelete && task?.id) {
      onDelete(task.id);
    }
    setShowDeleteModal(false);
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
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
      editScope: editScope
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
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="delete-modal">
            <div className="modal-header">
              <h3>🗑️ Delete Task</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete <strong>"{formData.title}"</strong>?</p>
              <p className="warning-text">This action cannot be undone.</p>
              {formData.recurrence !== 'none' && (
                <div className="recurring-warning">
                  <p><strong>⚠️ This is a recurring task!</strong></p>
                  <p>Deleting will remove this specific instance only.</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={handleDeleteCancel}>
                Cancel
              </button>
              <button className="btn-delete" onClick={handleDeleteConfirm}>
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recurring Edit Choice Modal */}
      {showRecurringModal && (
        <div className="modal-overlay">
          <div className="recurring-modal">
            <div className="modal-header">
              <h3>Edit Recurring Task</h3>
            </div>
            <div className="modal-body">
              <p>This is a recurring task. How would you like to edit it?</p>
              <div className="recurring-choices">
                <button
                  className="choice-btn"
                  onClick={() => handleRecurringChoice('this')}
                >
                  <span className="choice-icon">📅</span>
                  <div className="choice-content">
                    <strong>Edit this event only</strong>
                    <small>Changes will only apply to this specific instance</small>
                  </div>
                </button>
                <button
                  className="choice-btn"
                  onClick={() => handleRecurringChoice('future')}
                >
                  <span className="choice-icon">🔄</span>
                  <div className="choice-content">
                    <strong>Edit this and future events</strong>
                    <small>Changes will apply to this event and all future occurrences</small>
                  </div>
                </button>
                <button
                  className="choice-btn"
                  onClick={() => handleRecurringChoice('all')}
                >
                  <span className="choice-icon">📋</span>
                  <div className="choice-content">
                    <strong>Edit all events in series</strong>
                    <small>Changes will apply to all past and future occurrences</small>
                  </div>
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={onCancel}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Task Form */}
      <div className="task-form-overlay" onClick={onCancel}>
        <div className="task-form-modal" onClick={(e) => e.stopPropagation()}>
          <div className="task-form-header">
            <h2>{task ? 'Edit Task' : 'Add New Task'}</h2>
            <div className="header-actions">
              {/* NEW: Delete button (only show when editing) */}
              {task && onDelete && (
                <button 
                  className="delete-btn" 
                  onClick={handleDeleteClick}
                  title="Delete Task"
                >
                  🗑️
                </button>
              )}
              <button className="close-btn" onClick={onCancel}>×</button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="form-content">
            {/* Basic Fields */}
            {/* Title */}
            <div className="form-group">
              <label>Task Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Enter task title"
                className={errors.title ? 'error' : ''}
              />
              {errors.title && <span className="error-text">{errors.title}</span>}
            </div>

            {/* Description */}
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Enter task description..."
                rows="3"
                className="form-textarea"
              />
              <span className="form-help">Optional description for your task</span>
            </div>

            {/* Time Range */}
            <div className="form-row">
              <div className="form-group">
                <label>Start Time *</label>
                <input
                  type="datetime-local"
                  value={formData.start}
                  onChange={(e) => handleChange('start', e.target.value)}
                  className={errors.start ? 'error' : ''}
                />
                {errors.start && <span className="error-text">{errors.start}</span>}
              </div>
              <div className="form-group">
                <label>End Time *</label>
                <input
                  type="datetime-local"
                  value={formData.end}
                  onChange={(e) => handleChange('end', e.target.value)}
                  className={errors.end ? 'error' : ''}
                />
                {errors.end && <span className="error-text">{errors.end}</span>}
              </div>
            </div>

            {/* Advanced Options Toggle */}
            <div className="advanced-options-toggle">
              <button
                type="button"
                className="advanced-toggle-btn"
                onClick={toggleAdvancedOptions}
              >
                <span className="toggle-icon">
                  {showAdvancedOptions ? '▼' : '▶'}
                </span>
                Advanced Options
                <span className="toggle-hint">
                  Category, Priority, Recurrence
                </span>
              </button>
            </div>

            {/* Advanced Options Section (Collapsible) */}
            {showAdvancedOptions && (
              <div className="advanced-options-section">
                {/* Category Dropdown */}
                <div className="form-group">
                  <label>Category</label>
                  <div className="dropdown-container">
                    <button
                      type="button"
                      className="dropdown-trigger"
                      onClick={() => toggleDropdown('category')}
                    >
                      {getOptionLabel(categoryOptions, formData.category)}
                      <span className="dropdown-arrow">{showDropdowns.category ? '▲' : '▼'}</span>
                    </button>
                    
                    {showDropdowns.category && (
                      <div className="dropdown-menu">
                        {categoryOptions.map(option => (
                          <button
                            key={option.value}
                            type="button"
                            className={`dropdown-option ${formData.category === option.value ? 'selected' : ''}`}
                            onClick={() => selectOption('category', option.value)}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Priority Dropdown */}
                <div className="form-group">
                  <label>Priority</label>
                  <div className="dropdown-container">
                    <button
                      type="button"
                      className="dropdown-trigger"
                      onClick={() => toggleDropdown('priority')}
                    >
                      {getOptionLabel(priorityOptions, formData.priority)}
                      <span className="dropdown-arrow">{showDropdowns.priority ? '▲' : '▼'}</span>
                    </button>
                    
                    {showDropdowns.priority && (
                      <div className="dropdown-menu">
                        {priorityOptions.map(option => (
                          <button
                            key={option.value}
                            type="button"
                            className={`dropdown-option ${formData.priority === option.value ? 'selected' : ''}`}
                            onClick={() => selectOption('priority', option.value)}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Recurrence Dropdown */}
                <div className="form-group">
                  <label>Recurrence</label>
                  <div className="dropdown-container">
                    <button
                      type="button"
                      className="dropdown-trigger"
                      onClick={() => toggleDropdown('recurrence')}
                    >
                      {getOptionLabel(recurrenceOptions, formData.recurrence)}
                      <span className="dropdown-arrow">{showDropdowns.recurrence ? '▲' : '▼'}</span>
                    </button>
                    
                    {showDropdowns.recurrence && (
                      <div className="dropdown-menu">
                        {recurrenceOptions.map(option => (
                          <button
                            key={option.value}
                            type="button"
                            className={`dropdown-option ${formData.recurrence === option.value ? 'selected' : ''}`}
                            onClick={() => selectOption('recurrence', option.value)}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Custom Days Selection (only show if custom recurrence is selected) */}
                {formData.recurrence === 'custom' && (
                  <div className="form-group">
                    <label>Select Days</label>
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

                {/* Recurring End Date (only show if recurrence is not 'none') */}
                {formData.recurrence !== 'none' && (
                  <div className="form-group">
                    <label>Recurrence End Date</label>
                    <input
                      type="date"
                      value={formData.recurringEndDate}
                      onChange={(e) => handleChange('recurringEndDate', e.target.value)}
                    />
                    <span className="form-help">Optional - leave empty for indefinite recurrence</span>
                  </div>
                )}
              </div>
            )}
          </form>

          <div className="form-footer">
            <button type="button" className="btn-cancel" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-save" onClick={handleSubmit}>
              {task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TaskForm;
