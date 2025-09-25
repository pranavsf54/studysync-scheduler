import React from 'react';
import InAppNotification from './InAppNotification';
import './NotificationContainer.css';

const NotificationContainer = ({ notifications, onCloseNotification, onNotificationAction }) => {
  if (!notifications || notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <InAppNotification
          key={notification.id}
          notification={notification}
          onClose={onCloseNotification}
          onAction={onNotificationAction}
        />
      ))}
    </div>
  );
};

export default NotificationContainer;
