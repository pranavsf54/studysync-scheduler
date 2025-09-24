import React, { useState, useEffect } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';

const Timer = ({ tasks }) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes default
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [sessions, setSessions] = useLocalStorage('studysync_sessions_today', 0);
  const [timerType, setTimerType] = useState('focus'); // 'focus', 'break'
  const [settings] = useLocalStorage('studysync_settings', { soundEnabled: true });

  // Reset sessions count daily
  useEffect(() => {
    const today = new Date().toDateString();
    const lastSessionDate = localStorage.getItem('studysync_last_session_date');
    
    if (lastSessionDate !== today) {
      setSessions(0);
      localStorage.setItem('studysync_last_session_date', today);
    }
  }, [setSessions]);

  useEffect(() => {
    let interval = null;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft => timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }
    
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    
    if (timerType === 'focus') {
      setSessions(prev => prev + 1);
      
      // Notification
      if (Notification.permission === 'granted') {
        new Notification('Focus Session Complete! 🎉', {
          body: selectedTask ? `Great work on ${selectedTask.title}! Time for a break.` : 'Time for a break!',
          icon: '/favicon.ico'
        });
      }
      
      // Sound notification
      if (settings.soundEnabled) {
        playNotificationSound();
      }
      
      // Vibration
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
      
      // Auto-switch to break timer
      setTimerType('break');
      const breakTime = (sessions + 1) % 4 === 0 ? 15 * 60 : 5 * 60; // Long break every 4 sessions
      setTimeLeft(breakTime);
    } else {
      // Break complete
      if (Notification.permission === 'granted') {
        new Notification('Break Over! ⏰', {
          body: 'Ready for another focus session?',
          icon: '/favicon.ico'
        });
      }
      
      setTimerType('focus');
      setTimeLeft(25 * 60);
    }
  };

  const playNotificationSound = () => {
    // Create audio context for notification sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    setIsRunning(true);
    
    // Request notification permission if not granted
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    if (timerType === 'focus') {
      setTimeLeft(25 * 60);
    } else {
      const breakTime = sessions % 4 === 0 ? 15 * 60 : 5 * 60;
      setTimeLeft(breakTime);
    }
  };

  const handleTaskSelect = (task) => {
    setSelectedTask(task);
  };

  const switchToFocus = () => {
    setTimerType('focus');
    setTimeLeft(25 * 60);
    setIsRunning(false);
  };

  const switchToBreak = () => {
    setTimerType('break');
    const breakTime = sessions % 4 === 0 ? 15 * 60 : 5 * 60;
    setTimeLeft(breakTime);
    setIsRunning(false);
  };

  const presetDurations = [
    { name: 'Pomodoro', duration: 25 * 60, type: 'focus' },
    { name: 'Short Break', duration: 5 * 60, type: 'break' },
    { name: 'Long Break', duration: 15 * 60, type: 'break' },
    { name: 'Deep Work', duration: 45 * 60, type: 'focus' }
  ];

  const setPreset = (duration, type) => {
    if (!isRunning) {
      setTimeLeft(duration);
      setTimerType(type);
    }
  };

  const progress = timerType === 'focus' 
    ? ((25 * 60) - timeLeft) / (25 * 60)
    : ((15 * 60) - timeLeft) / (15 * 60);

  const priorityTasks = tasks?.filter(task => task.priority === 'high') || [];

  return (
    <div className="timer-container">
      <div className="timer-header">
        <h2>🍅 Pomodoro Timer</h2>
        <p>Stay focused with the Pomodoro technique</p>
      </div>

      <div className="timer-mode-switcher">
        <button 
          className={`mode-btn ${timerType === 'focus' ? 'active' : ''}`}
          onClick={switchToFocus}
        >
          Focus
        </button>
        <button 
          className={`mode-btn ${timerType === 'break' ? 'active' : ''}`}
          onClick={switchToBreak}
        >
          Break
        </button>
      </div>

      <div className="timer-main">
        <div className="timer-display">
          <div className="timer-circle" style={{ background: `conic-gradient(#3b82f6 ${progress * 360}deg, #e5e7eb 0deg)` }}>
            <div className="timer-inner">
              <div className="timer-time">{formatTime(timeLeft)}</div>
              <div className="timer-label">
                {timerType === 'focus' 
                  ? (selectedTask ? selectedTask.title : 'Focus Time')
                  : sessions % 4 === 0 ? 'Long Break' : 'Short Break'
                }
              </div>
            </div>
          </div>
        </div>

        <div className="timer-controls">
          {!isRunning ? (
            <button onClick={handleStart} className="btn btn--primary btn--large">
              ▶️ Start {timerType === 'focus' ? 'Focus' : 'Break'}
            </button>
          ) : (
            <button onClick={handlePause} className="btn btn--secondary btn--large">
              ⏸️ Pause
            </button>
          )}
          <button onClick={handleReset} className="btn btn--outline">
            🔄 Reset
          </button>
        </div>

        <div className="timer-presets">
          <h3>Quick Timers</h3>
          <div className="preset-buttons">
            {presetDurations.map(preset => (
              <button
                key={preset.name}
                onClick={() => setPreset(preset.duration, preset.type)}
                className={`preset-btn ${timeLeft === preset.duration && timerType === preset.type ? 'active' : ''}`}
                disabled={isRunning}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {priorityTasks.length > 0 && (
          <div className="task-selection">
            <h3>🔥 Focus on Priority Task</h3>
            <div className="task-list">
              {priorityTasks.slice(0, 5).map(task => (
                <button
                  key={task.id}
                  onClick={() => handleTaskSelect(task)}
                  className={`task-btn ${selectedTask?.id === task.id ? 'active' : ''}`}
                >
                  <span className="task-emoji">🔥</span>
                  <span className="task-title">{task.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="timer-stats">
          <div className="stat">
            <div className="stat-value">{sessions}</div>
            <div className="stat-label">Focus Sessions Today</div>
          </div>
          <div className="stat">
            <div className="stat-value">{Math.floor(sessions * 25 / 60)}h {(sessions * 25) % 60}m</div>
            <div className="stat-label">Time Focused Today</div>
          </div>
          <div className="stat">
            <div className="stat-value">{Math.floor(sessions / 4)}</div>
            <div className="stat-label">Cycles Completed</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timer;
