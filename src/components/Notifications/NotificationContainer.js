import React from 'react';
import InAppNotification from './InAppNotification';

const NotificationContainer = ({ notifications, onCloseNotification, onNotificationAction }) => {
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
