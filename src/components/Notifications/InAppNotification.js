import React, { useState, useEffect } from 'react';
import './InAppNotification.css';

const InAppNotification = ({ notification, onClose, onAction }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);

    // Update time display
    const updateTime = () => {
      const now = new Date();
      const diff = Math.floor((now - notification.timestamp) / 1000);
      if (diff < 60) {
        setTimeAgo('now');
      } else if (diff < 3600) {
        setTimeAgo(`${Math.floor(diff / 60)}m ago`);
      } else {
        setTimeAgo(`${Math.floor(diff / 3600)}h ago`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);

    // Auto-close non-persistent notifications
    if (!notification.persistent) {
      setTimeout(() => {
        handleClose();
      }, 10000);
    }

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [notification]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(notification.id), 300);
  };

  const handleAction = (action) => {
    onAction(notification.taskId, action);
    handleClose();
  };

  const getPriorityIcon = () => {
    switch (notification.priority) {
      case 'urgent': return '🚨';
      case 'high': return '🔥';
      default: return '🔔';
    }
  };

  const getPriorityClass = () => {
    switch (notification.priority) {
      case 'urgent': return 'urgent';
      case 'high': return 'high';
      default: return 'normal';
    }
  };

  return (
    <div className={`in-app-notification ${getPriorityClass()} ${isVisible ? 'visible' : ''}`}>
      <div className="notification-header">
        <div className="notification-icon">
          {getPriorityIcon()}
        </div>
        <div className="notification-content">
          <h4 className="notification-title">{notification.title}</h4>
          <p className="notification-body">{notification.body}</p>
          <span className="notification-time">{timeAgo}</span>
        </div>
        <button className="notification-close" onClick={handleClose}>
          ×
        </button>
      </div>
      
      {notification.actions && notification.actions.length > 0 && (
        <div className="notification-actions">
          {notification.actions.map((action, index) => (
            <button
              key={index}
              className={`notification-action ${action.action === 'start-timer' ? 'primary' : 'secondary'}`}
              onClick={() => handleAction(action.action)}
            >
              {action.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default InAppNotification;
