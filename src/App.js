import React, { useState, useEffect } from 'react';
import { auth } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Auth from './components/Auth/Auth';
import Dashboard from './components/Dashboard/Dashboard';
import NotificationContainer from './components/Notifications/NotificationContainer';
import { useLocalStorage } from './hooks/useLocalStorage';
import notificationService from './services/notificationService';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useLocalStorage('studysync_dark_mode', false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Apply dark mode to document
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Set up in-app notification callback
    notificationService.setInAppNotificationCallback((notification) => {
      console.log('📱 Showing notification:', notification); // Debug log
      setNotifications(prev => [...prev, notification]);
    });
  }, []);

  const handleCloseNotification = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const handleNotificationAction = (taskId, action) => {
    console.log('🔔 Notification action:', action, 'for task:', taskId); // Debug log
    switch (action) {
      case 'start-timer':
        window.dispatchEvent(new CustomEvent('switchToTimer', { detail: { taskId } }));
        break;
      case 'view-task':
        window.dispatchEvent(new CustomEvent('viewTask', { detail: { taskId } }));
        break;
      case 'complete-task':
        window.dispatchEvent(new CustomEvent('completeTask', { detail: { taskId } }));
        break;
      case 'snooze':
        notificationService.clearTaskNotifications(taskId);
        break;
      case 'stop-reminders':
        notificationService.clearTaskNotifications(taskId);
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading StudySync...</p>
      </div>
    );
  }

  return (
    <div className="App">
      {user ? (
        <Dashboard user={user} darkMode={darkMode} setDarkMode={setDarkMode} />
      ) : (
        <Auth onAuthenticated={setUser} />
      )}
      
      {/* Notification Container - This will show the popups */}
      <NotificationContainer
        notifications={notifications}
        onCloseNotification={handleCloseNotification}
        onNotificationAction={handleNotificationAction}
      />
    </div>
  );
}

export default App;
