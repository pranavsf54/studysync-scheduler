class NotificationService {
  constructor() {
    this.activeTimers = new Map();
    this.lastNotified = new Map();
    this.isTimerActive = false;
    this.settings = this.getSettings();
    this.showInAppNotification = null;
    this.isBlocked = false;
    
    // NUCLEAR ANTI-SPAM CONTROLS
    this.schedulingInProgress = false;
    this.lastScheduleCall = 0;
    this.scheduleCooldown = 10000; // 10 seconds
    this.maxScheduleCallsPerMinute = 3;
    this.scheduleCallHistory = [];
    this.emergencyLockout = false;
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
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem('studysync_settings', JSON.stringify(this.settings));
  }

  setInAppNotificationCallback(callback) {
    this.showInAppNotification = callback;
  }

  setTimerActive(active, taskId = null) {
    console.log(`[TIMER] ${active ? 'STARTED' : 'STOPPED'}${taskId ? ` for ${taskId}` : ''}`);
    this.isTimerActive = active;
    if (active) {
      this.stopAllNotifications();
    }
  }

  async scheduleTaskNotifications(tasks) {
    const now = Date.now();
    
    // EMERGENCY LOCKOUT CHECK
    if (this.emergencyLockout) {
      console.log('🚫 EMERGENCY LOCKOUT ACTIVE - All scheduling blocked');
      return;
    }

    // CALL FREQUENCY PROTECTION
    this.scheduleCallHistory = this.scheduleCallHistory.filter(time => now - time < 60000); // Keep only last minute
    this.scheduleCallHistory.push(now);
    
    if (this.scheduleCallHistory.length > this.maxScheduleCallsPerMinute) {
      console.error(`🚨 TOO MANY SCHEDULE CALLS (${this.scheduleCallHistory.length} in 1 min) - EMERGENCY LOCKOUT ACTIVATED`);
      this.emergencyLockout = true;
      this.stopAllNotifications();
      
      // Auto-unlock after 30 seconds
      setTimeout(() => {
        this.emergencyLockout = false;
        console.log('🟢 Emergency lockout lifted');
      }, 30000);
      
      return;
    }

    // COOLDOWN CHECK
    if (now - this.lastScheduleCall < this.scheduleCooldown) {
      const remaining = Math.round((this.scheduleCooldown - (now - this.lastScheduleCall)) / 1000);
      console.log(`🚫 SCHEDULE BLOCKED - Cooldown active (${remaining}s remaining)`);
      return;
    }

    // PROGRESS CHECK
    if (this.schedulingInProgress) {
      console.log('🚫 SCHEDULE BLOCKED - Already in progress');
      return;
    }

    // SETTINGS CHECK
    if (!this.settings.notifications) {
      console.log('🚫 SCHEDULE BLOCKED - Notifications disabled');
      return;
    }

    console.log(`[SCHEDULE] ✅ STARTING with ${tasks?.length || 0} tasks (Call #${this.scheduleCallHistory.length})`);
    console.trace('📍 Called from:');

    this.schedulingInProgress = true;
    this.lastScheduleCall = now;

    try {
      // NUCLEAR CLEANUP
      console.log('[SCHEDULE] 🧹 Nuclear cleanup starting...');
      this.stopAllNotifications();
      await new Promise(resolve => setTimeout(resolve, 300));

      // Filter to only active, future tasks
      const currentTime = new Date();
      const validTasks = tasks.filter(task => {
        if (!task || task.completed) return false;
        
        const taskStart = task.start?.toDate ? task.start.toDate() : new Date(task.start);
        const taskEnd = task.end?.toDate ? task.end.toDate() : new Date(task.end);
        
        return taskEnd > currentTime;
      });

      console.log(`[SCHEDULE] 📋 Filtered to ${validTasks.length} valid tasks`);

      // Only schedule tasks that are currently active or starting soon
      const relevantTasks = validTasks.filter(task => {
        const taskStart = task.start?.toDate ? task.start.toDate() : new Date(task.start);
        const taskEnd = task.end?.toDate ? task.end.toDate() : new Date(task.end);
        const now = new Date();
        
        // Only active tasks or tasks starting within next 30 minutes
        const isActive = taskStart <= now && now < taskEnd;
        const startingSoon = taskStart > now && (taskStart.getTime() - now.getTime()) < 30 * 60 * 1000;
        
        return isActive || startingSoon;
      });

      console.log(`[SCHEDULE] 🎯 Scheduling ${relevantTasks.length} relevant tasks`);

      // Schedule with extreme caution
      for (let i = 0; i < relevantTasks.length; i++) {
        const task = relevantTasks[i];
        
        // Check for emergency conditions
        if (this.emergencyLockout || !this.schedulingInProgress) {
          console.log('[SCHEDULE] ⛔ Emergency stop during scheduling');
          break;
        }

        // Skip if already has timer
        if (this.activeTimers.has(task.id)) {
          console.log(`[SCHEDULE] ⏭️ Skipping ${task.id} - already scheduled`);
          continue;
        }

        await this.scheduleTaskNotification(task);
        
        // Mandatory delay between tasks
        if (i < relevantTasks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      console.log(`[SCHEDULE] ✅ COMPLETED - ${this.activeTimers.size} active timers`);

    } catch (error) {
      console.error('[SCHEDULE] ❌ ERROR:', error);
    } finally {
      this.schedulingInProgress = false;
    }
  }

  async scheduleTaskNotification(task) {
    const taskId = task.id;
    const now = new Date();
    const taskStart = task.start?.toDate ? task.start.toDate() : new Date(task.start);
    const taskEnd = task.end?.toDate ? task.end.toDate() : new Date(task.end);

    console.log(`[TASK] ${taskId} - Scheduling (${task.priority})`);

    // Clear any existing timer
    this.clearTaskTimer(taskId);

    // If task is currently active
    if (taskStart <= now && now < taskEnd && !this.isTimerActive && !this.isBlocked) {
      console.log(`[TASK] ${taskId} - Starting immediate notifications`);
      this.startTaskNotifications(task);
    }
    // If task starts soon
    else if (taskStart > now) {
      const msUntilStart = taskStart.getTime() - now.getTime();
      console.log(`[TASK] ${taskId} - Scheduling start in ${Math.round(msUntilStart/1000/60)} minutes`);
      
      const timerId = setTimeout(() => {
        console.log(`[TASK] ${taskId} - Start timer triggered`);
        if (!this.isTimerActive && !this.isBlocked && !this.emergencyLockout) {
          this.startTaskNotifications(task);
        }
      }, msUntilStart);

      this.activeTimers.set(taskId, timerId);
    }
  }

  startTaskNotifications(task) {
    const taskId = task.id;
    
    if (this.isTimerActive || this.isBlocked || this.emergencyLockout) {
      console.log(`[NOTIF] ${taskId} - BLOCKED (timer:${this.isTimerActive} blocked:${this.isBlocked} emergency:${this.emergencyLockout})`);
      return;
    }

    const now = new Date();
    const taskEnd = task.end?.toDate ? task.end.toDate() : new Date(task.end);
    
    if (taskEnd <= now) {
      console.log(`[NOTIF] ${taskId} - Task ended`);
      return;
    }

    console.log(`[NOTIF] ${taskId} - 🔔 STARTING notifications (${task.priority})`);

    // Clear existing timer
    this.clearTaskTimer(taskId);

    // Show immediate notification
    this.sendNotification(task, 'Task Started!', 
      task.priority === 'high' 
        ? `🔥 "${task.title}" - Start your timer to stop reminders.`
        : `📝 Time for "${task.title}".`
    );

    // Set up recurring notifications
    const interval = task.priority === 'high' ? 5 * 60 * 1000 : 15 * 60 * 1000;
    
    const intervalId = setInterval(() => {
      const currentTime = new Date();
      
      // Multiple safety checks
      if (currentTime >= taskEnd || this.isTimerActive || this.isBlocked || this.emergencyLockout) {
        console.log(`[NOTIF] ${taskId} - 🛑 Stopping notifications`);
        this.clearTaskTimer(taskId);
        return;
      }

      // Check timing
      const lastTime = this.lastNotified.get(taskId) || 0;
      const timeSinceLastNotification = currentTime.getTime() - lastTime;
      
      if (timeSinceLastNotification >= interval - 30000) {
        console.log(`[NOTIF] ${taskId} - 🔔 Recurring notification`);
        
        this.sendNotification(task, 
          task.priority === 'high' ? '⏰ High Priority Task' : '📌 Task Reminder',
          task.priority === 'high'
            ? `"${task.title}" is ongoing. Start your timer to focus.`
            : `Don't forget about "${task.title}".`
        );
      }
    }, 60000);

    this.activeTimers.set(taskId, intervalId);
  }

  sendNotification(task, title, message) {
    const taskId = task.id;
    const now = new Date().getTime();
    
    // Emergency checks
    if (this.emergencyLockout) {
      console.log(`[SEND] ${taskId} - BLOCKED by emergency lockout`);
      return;
    }

    // Duplicate prevention
    const lastTime = this.lastNotified.get(taskId) || 0;
    const minGap = 45000; // 45 seconds minimum
    
    if (now - lastTime < minGap) {
      console.log(`[SEND] ${taskId} - BLOCKED duplicate (${Math.round((now - lastTime)/1000)}s ago)`);
      return;
    }

    this.lastNotified.set(taskId, now);
    console.log(`[SEND] ${taskId} - 📢 "${title}"`);

    // Play sound
    if (this.settings.soundEnabled) {
      this.playNotificationSound();
    }

    // Vibrate
    this.vibrateMobile(task.priority);

    // Show in-app notification
    if (this.showInAppNotification) {
      this.showInAppNotification({
        id: `${taskId}_${now}`,
        title,
        body: message,
        type: 'task-reminder',
        priority: task.priority === 'high' ? 'urgent' : 'normal',
        actions: [
          { title: 'Start Timer', action: 'start-timer' },
          { title: 'Stop Reminders', action: 'stop-reminders' }
        ],
        taskId,
        timestamp: new Date()
      });
    }

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        tag: taskId,
        silent: !this.settings.soundEnabled
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      setTimeout(() => notification.close(), 8000);
    }
  }

  playNotificationSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1108, audioContext.currentTime + 0.15);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.4);
    } catch (error) {
      console.log('[AUDIO] Not supported');
    }
  }

  vibrateMobile(priority) {
    if (navigator.vibrate) {
      const patterns = {
        high: [200, 100, 200, 100, 200],
        normal: [100]
      };
      navigator.vibrate(patterns[priority] || patterns.normal);
    }
  }

  clearTaskTimer(taskId) {
    if (this.activeTimers.has(taskId)) {
      const timer = this.activeTimers.get(taskId);
      clearInterval(timer);
      clearTimeout(timer);
      this.activeTimers.delete(taskId);
      console.log(`[CLEAR] ${taskId} - Timer cleared`);
    }
  }

  clearTaskNotifications(taskId) {
    console.log(`[CLEAR] ${taskId} - Clearing notifications`);
    this.clearTaskTimer(taskId);
    this.lastNotified.delete(taskId);
  }

  stopAllNotifications() {
    console.log(`[STOP] 🧹 Clearing all ${this.activeTimers.size} timers`);
    
    this.activeTimers.forEach((timer, taskId) => {
      clearInterval(timer);
      clearTimeout(timer);
    });
    
    this.activeTimers.clear();
    this.lastNotified.clear();
    
    this.isBlocked = true;
    setTimeout(() => {
      this.isBlocked = false;
      console.log('[STOP] 🟢 Unblocked');
    }, 5000);
  }

  clearAllNotifications() {
    this.stopAllNotifications();
  }

  emergencyStop() {
    console.log('🚨 EMERGENCY STOP ACTIVATED');
    this.emergencyLockout = true;
    this.stopAllNotifications();
    this.schedulingInProgress = false;
    this.lastScheduleCall = 0;
    this.scheduleCallHistory = [];
    
    // Extended lockout
    setTimeout(() => {
      this.emergencyLockout = false;
      console.log('🚨 Emergency lockout completely lifted');
    }, 60000); // 1 minute lockout
  }

  // Test methods
  testNotification(priority = 'high') {
    if (this.emergencyLockout) {
      console.log('🚫 Test blocked by emergency lockout');
      return;
    }
    
    const testTask = {
      id: 'test-' + Date.now(),
      title: 'Test Notification',
      priority: priority
    };
    
    this.sendNotification(testTask, '🧪 Test Notification', 
      `This is a test ${priority} priority notification.`);
  }

  showNotification(title, body, options = {}) {
    if (this.emergencyLockout) {
      console.log('🚫 Notification blocked by emergency lockout');
      return;
    }
    
    const tempTask = {
      id: options.taskId || 'temp-' + Date.now(),
      title: options.taskTitle || 'Notification',
      priority: options.priority === 'urgent' ? 'high' : 'normal'
    };
    
    this.sendNotification(tempTask, title, body);
  }

  // Debug methods
  getDebugInfo() {
    return {
      activeTimers: this.activeTimers.size,
      timerIds: [...this.activeTimers.keys()],
      lastNotified: Object.fromEntries(this.lastNotified),
      isTimerActive: this.isTimerActive,
      isBlocked: this.isBlocked,
      emergencyLockout: this.emergencyLockout,
      schedulingInProgress: this.schedulingInProgress,
      lastScheduleCall: new Date(this.lastScheduleCall).toLocaleTimeString(),
      scheduleCallsInLastMinute: this.scheduleCallHistory.length
    };
  }
}

const notificationService = new NotificationService();

// Debug methods
window.notificationService = notificationService;
window.emergencyStop = () => notificationService.emergencyStop();
window.debugNotifications = () => console.log('🔍 Debug Info:', notificationService.getDebugInfo());

export default notificationService;
