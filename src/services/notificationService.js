class NotificationService {
  constructor() {
    this.activeNotifications = new Map();
    this.reminderIntervals = new Map();
    this.duringTaskIntervals = new Map();
    this.isTimerActive = false;
    this.settings = this.getSettings();
    this.showInAppNotification = null; // Will be set by App component
  }

  getSettings() {
    try {
      return JSON.parse(localStorage.getItem('studysync_settings')) || {
        notifications: true,
        notificationTime: 10,
        soundEnabled: true
      };
    } catch {
      return { notifications: true, notificationTime: 10, soundEnabled: true };
    }
  }

  updateSettings(newSettings) {
    this.settings = newSettings;
  }

  setInAppNotificationCallback(callback) {
    this.showInAppNotification = callback;
  }

  setTimerActive(active, taskId = null) {
    this.isTimerActive = active;
    if (active && taskId) {
      // Stop notifications for this specific task when timer starts
      this.clearTaskNotifications(taskId);
    }
  }

  async requestPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  async scheduleTaskNotifications(tasks) {
    if (!this.settings.notifications) {
      return;
    }

    // Clear existing notifications
    this.clearAllNotifications();

    // Filter high priority tasks that haven't started yet
    const priorityTasks = tasks.filter(task => 
      task.priority === 'high' && 
      !task.completed
    );

    priorityTasks.forEach(task => {
      this.scheduleTaskReminders(task);
    });
  }

  scheduleTaskReminders(task) {
    const taskStart = task.start?.toDate ? task.start.toDate() : new Date(task.start);
    const taskEnd = task.end?.toDate ? task.end.toDate() : new Date(task.end);
    const now = new Date();

    // Don't schedule if task has already ended
    if (taskEnd <= now) return;

    // Schedule pre-task notification (if task hasn't started)
    if (taskStart > now) {
      const reminderTime = new Date(taskStart.getTime() - (this.settings.notificationTime * 60 * 1000));
      
      if (reminderTime > now) {
        const timeUntilReminder = reminderTime.getTime() - now.getTime();
        
        setTimeout(() => {
          this.showNotification(
            '🔔 Upcoming High Priority Task',
            `"${task.title}" starts in ${this.settings.notificationTime} minutes`,
            { 
              taskId: task.id, 
              type: 'reminder',
              priority: 'high',
              actions: [
                { title: 'Start Timer', action: 'start-timer' },
                { title: 'View Task', action: 'view-task' }
              ]
            }
          );
        }, timeUntilReminder);
      }
    }

    // Schedule during-task notifications (every 5 minutes)
    const timeUntilTask = Math.max(0, taskStart.getTime() - now.getTime());
    
    setTimeout(() => {
      this.startDuringTaskNotifications(task);
    }, timeUntilTask);
  }

  startDuringTaskNotifications(task) {
    const taskEnd = task.end?.toDate ? task.end.toDate() : new Date(task.end);
    const now = new Date();

    // Don't start if task has ended or timer is active
    if (taskEnd <= now || this.isTimerActive) return;

    // Show initial notification when task starts
    this.showNotification(
      '🔥 High Priority Task Started!',
      `Time for "${task.title}". Start your Pomodoro timer to stop these reminders.`,
      { 
        taskId: task.id, 
        type: 'during-task', 
        priority: 'urgent',
        persistent: true,
        actions: [
          { title: 'Start Timer', action: 'start-timer' },
          { title: 'Mark Complete', action: 'complete-task' },
          { title: 'Snooze 5min', action: 'snooze' }
        ]
      }
    );

    // Set up recurring 5-minute notifications
    const intervalId = setInterval(() => {
      const currentTime = new Date();
      
      // Stop if task has ended or timer is active
      if (currentTime >= taskEnd || this.isTimerActive) {
        this.clearTaskNotifications(task.id);
        return;
      }

      this.showNotification(
        '⏰ Task Still In Progress',
        `"${task.title}" is ongoing. Start your Pomodoro timer to focus and stop these reminders.`,
        { 
          taskId: task.id, 
          type: 'during-task-reminder', 
          priority: 'high',
          requiresAction: true,
          actions: [
            { title: 'Start Timer', action: 'start-timer' },
            { title: 'Stop Reminders', action: 'stop-reminders' }
          ]
        }
      );
    }, 5 * 60 * 1000); // Every 5 minutes

    this.duringTaskIntervals.set(task.id, intervalId);
  }

  showNotification(title, body, options = {}) {
    // Always play sound first
    if (this.settings.soundEnabled) {
      this.playNotificationSound(options.type);
    }

    // Always show in-app notification
    if (this.showInAppNotification) {
      this.showInAppNotification({
        id: `${options.taskId}_${Date.now()}`,
        title,
        body,
        type: options.type,
        priority: options.priority || 'normal',
        actions: options.actions || [],
        taskId: options.taskId,
        persistent: options.persistent || false,
        timestamp: new Date()
      });
    }

    // Try browser notification as backup
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: options.taskId || 'studysync',
        requireInteraction: options.requiresAction || false,
        silent: !this.settings.soundEnabled,
        data: options
      });

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // Dispatch custom event to handle action
        if (options.type === 'during-task' || options.type === 'during-task-reminder') {
          window.dispatchEvent(new CustomEvent('switchToTimer', { 
            detail: { taskId: options.taskId } 
          }));
        }
      };

      // Auto-close non-persistent browser notifications
      if (!options.persistent) {
        setTimeout(() => {
          notification.close();
        }, 8000);
      }

      // Store notification reference
      if (options.taskId) {
        this.activeNotifications.set(options.taskId, notification);
      }
    }

    // Vibrate on mobile
    if (navigator.vibrate && options.priority === 'urgent') {
      navigator.vibrate([200, 100, 200, 100, 200]);
    } else if (navigator.vibrate && options.priority === 'high') {
      navigator.vibrate([200, 100, 200]);
    }
  }

  playNotificationSound(type) {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Different sounds for different notification types
      if (type === 'during-task' || type === 'during-task-reminder') {
        // Urgent sound sequence
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(1108, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.2);
        oscillator.frequency.setValueAtTime(1108, audioContext.currentTime + 0.3);
      } else {
        // Gentle reminder sound
        oscillator.frequency.setValueAtTime(659, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.15);
      }
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.6);
    } catch (error) {
      console.log('Audio notification not supported:', error);
    }
  }

  clearTaskNotifications(taskId) {
    // Clear active browser notification
    if (this.activeNotifications.has(taskId)) {
      this.activeNotifications.get(taskId).close();
      this.activeNotifications.delete(taskId);
    }

    // Clear during-task interval
    if (this.duringTaskIntervals.has(taskId)) {
      clearInterval(this.duringTaskIntervals.get(taskId));
      this.duringTaskIntervals.delete(taskId);
    }
  }

  clearAllNotifications() {
    // Clear all active browser notifications
    this.activeNotifications.forEach(notification => notification.close());
    this.activeNotifications.clear();

    // Clear all intervals
    this.duringTaskIntervals.forEach(interval => clearInterval(interval));
    this.duringTaskIntervals.clear();
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;
