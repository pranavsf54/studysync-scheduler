import React, { useState, useEffect } from 'react';
import { auth } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Auth from './components/Auth/Auth';
import Dashboard from './components/Dashboard/Dashboard';
import { useLocalStorage } from './hooks/useLocalStorage';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useLocalStorage('studysync_dark_mode', false);

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
  }, []);

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
    </div>
  );
}

export default App;
