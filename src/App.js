import React, { useState, useEffect } from 'react';
import { auth } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Auth from './components/Auth/Auth';
import Dashboard from './components/Dashboard/Dashboard';
import NotificationContainer from './components/Notifications/NotificationContainer';
import notificationService from './services/notificationService';
import { useLocalStorage } from './hooks/useLocalStorage';
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
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    // Set up notification callback
    notificationService.setInAppNotificationCallback((notification) => {
      setNotifications(prev => {
        // Prevent duplicate notifications
        const exists = prev.find(n => n.id === notification.id);
        if (exists) return prev;
        
        return [...prev, notification];
      });
    });

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleCloseNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleNotificationAction = (taskId, action) => {
    console.log('Notification action:', action, 'for task:', taskId);
    
    if (action === 'start-timer') {
      window.dispatchEvent(new CustomEvent('switchToTimer', {
        detail: { taskId }
      }));
    } else if (action === 'stop-reminders') {
      notificationService.clearTaskNotifications(taskId);
    } else if (action === 'view-task') {
      window.dispatchEvent(new CustomEvent('viewTask', {
        detail: { taskId }
      }));
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
        <>
          <Dashboard user={user} darkMode={darkMode} setDarkMode={setDarkMode} />
          
          <NotificationContainer
            notifications={notifications}
            onCloseNotification={handleCloseNotification}
            onNotificationAction={handleNotificationAction}
          />
        </>
      ) : (
        <Auth onAuthenticated={setUser} />
      )}
    </div>
  );
}

export default App;
