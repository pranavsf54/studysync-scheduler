import React, { useState, useEffect } from 'react';

const TaskForm = ({ task, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    category: 'study',
    priority: 'normal',
    recurrence: 'none',
    recurringDays: [], // New field for multiple days
    recurringEndDate: '' // When to stop recurring
  });

  const [errors, setErrors] = useState({});

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
    }
  }, [task]);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const taskData = {
      ...formData,
      start: new Date(formData.start),
      end: new Date(formData.end),
      recurringEndDate: formData.recurringEndDate ? new Date(formData.recurringEndDate) : null,
      color: getCategoryColor(formData.category)
    };
    
    if (task?.id) {
      onSave(task.id, taskData);
    } else {
      onSave(taskData);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      lecture: '#3b82f6',
      study: '#10b981',
      assignment: '#ef4444',
      exam: '#f59e0b',
      project: '#8b5cf6',
      personal: '#06b6d4'
    };
    return colors[category] || '#64748b';
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content task-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{task?.id ? 'Edit Task' : 'Add New Task'}</h2>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="task-form">
          <div className="form-group">
            <label htmlFor="title">Task Title *</label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g., Computer Science Lecture"
              className={errors.title ? 'error' : ''}
            />
            {errors.title && <span className="error-text">{errors.title}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Additional details about the task"
              rows="3"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start">Start Time *</label>
              <input
                id="start"
                type="datetime-local"
                value={formData.start}
                onChange={(e) => handleChange('start', e.target.value)}
                className={errors.start ? 'error' : ''}
              />
              {errors.start && <span className="error-text">{errors.start}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="end">End Time *</label>
              <input
                id="end"
                type="datetime-local"
                value={formData.end}
                onChange={(e) => handleChange('end', e.target.value)}
                className={errors.end ? 'error' : ''}
              />
              {errors.end && <span className="error-text">{errors.end}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
              >
                <option value="lecture">📚 Lecture</option>
                <option value="study">🎓 Study Session</option>
                <option value="assignment">📝 Assignment</option>
                <option value="exam">📊 Exam</option>
                <option value="project">🚀 Project</option>
                <option value="personal">⭐ Personal</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
              >
                <option value="normal">Normal</option>
                <option value="high">🔥 High Priority</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="recurrence">Recurrence</label>
            <select
              id="recurrence"
              value={formData.recurrence}
              onChange={(e) => handleChange('recurrence', e.target.value)}
            >
              <option value="none">No Recurrence</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom Days (Mon, Wed, Fri)</option>
            </select>
          </div>

          {formData.recurrence === 'custom' && (
            <div className="form-group">
              <label>Select Days *</label>
              <div className="day-selector">
                {weekDays.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    className={`day-btn ${formData.recurringDays.includes(day.value) ? 'active' : ''}`}
                    onClick={() => handleDayToggle(day.value)}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              {errors.recurringDays && <span className="error-text">{errors.recurringDays}</span>}
              <div className="help-text">
                Example: Select Mon, Wed, Fri for a class that meets 3 times per week
              </div>
            </div>
          )}

          {formData.recurrence !== 'none' && (
            <div className="form-group">
              <label htmlFor="recurringEndDate">End Recurrence (Optional)</label>
              <input
                id="recurringEndDate"
                type="date"
                value={formData.recurringEndDate}
                onChange={(e) => handleChange('recurringEndDate', e.target.value)}
              />
              <div className="help-text">
                Leave empty to continue indefinitely
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn btn--secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              {task?.id ? 'Update Task' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;
