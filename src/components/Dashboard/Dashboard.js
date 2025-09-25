import React, { useState, useEffect } from 'react';
import { auth, db } from '../../services/firebase';
import { signOut } from 'firebase/auth';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  doc,
  Timestamp,
  writeBatch 
} from 'firebase/firestore';
import Calendar from '../Calendar/Calendar';
import TaskForm from './TaskForm';
import Timer from './Timer';
import Settings from './Settings';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import notificationService from '../../services/notificationService';
import './Dashboard.css';

const Dashboard = ({ user, darkMode, setDarkMode }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings] = useLocalStorage('studysync_settings', { defaultView: 'week' });
  const [currentView, setCurrentView] = useLocalStorage('studysync_calendar_view', 'week');
  const [activeTab, setActiveTab] = useLocalStorage('studysync_active_tab', 'calendar');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [priorityTasks, setPriorityTasks] = useState([]);
  const [showSettings, setShowSettings] = useState(false);

  // Load tasks from Firestore
  useEffect(() => {
    if (!user?.uid) return;

    const tasksRef = collection(db, 'users', user.uid, 'tasks');
    const tasksQuery = query(tasksRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setTasks(tasksData);
      setPriorityTasks(tasksData.filter(task => task.priority === 'high'));
      setLoading(false);
    }, (error) => {
      console.error('Error loading tasks:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, [user?.uid]);

  useEffect(() => {
    // Only set default view on first load, not on every change
    const storedView = localStorage.getItem('studysync_calendar_view');
    if (!storedView && settings.defaultView) {
      setCurrentView(settings.defaultView);
    }
  }, [settings.defaultView, setCurrentView]);

  useEffect(() => {
    // Initialize notifications
    if (tasks.length > 0 && user) {
      notificationService.scheduleTaskNotifications(tasks);
    }
  
    // Listen for timer events
    const handleSwitchToTimer = (event) => {
      setActiveTab('timer');
      // Optionally set the selected task in timer
      const { taskId } = event.detail;
    };

    const handleViewTask = (event) => {
      const { taskId } = event.detail;
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        setEditingTask(task);
        setShowTaskForm(true);
      }
    };
  
    const handleCompleteTask = (event) => {
      const { taskId } = event.detail;
      // Add your task completion logic here
      handleCompleteTask(taskId);
    };
  
    window.addEventListener('switchToTimer', handleSwitchToTimer);
    window.addEventListener('viewTask', handleViewTask);
    window.addEventListener('completeTask', handleCompleteTask);

    return () => {
      window.removeEventListener('switchToTimer', handleSwitchToTimer);
      window.removeEventListener('viewTask', handleViewTask);
      window.removeEventListener('completeTask', handleCompleteTask);
    };
  }, [tasks, user, setActiveTab]);

  const handleAddTask = async (taskData) => {
    try {
      const baseTask = {
        ...taskData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        completed: false
      };
  
      if (taskData.recurrence === 'none') {
        // Single task
        await addDoc(collection(db, 'users', user.uid, 'tasks'), baseTask);
      } else {
        // Recurring task - generate multiple instances
        const instances = generateRecurringTasks(taskData);
        
        // Add all instances to Firestore
        const batch = writeBatch(db);
        instances.forEach(instance => {
          const docRef = doc(collection(db, 'users', user.uid, 'tasks'));
          batch.set(docRef, {
            ...instance,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            completed: false
          });
        });
        
        await batch.commit();
      }
  
      setShowTaskForm(false);
      setEditingTask(null);
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const generateRecurringTasks = (taskData) => {
    const instances = [];
    const startDate = new Date(taskData.start);
    const endDate = new Date(taskData.end);
    const duration = endDate.getTime() - startDate.getTime();
    
    // Generate up to 52 weeks (1 year) of recurring tasks
    const maxInstances = 52;
    let currentDate = new Date(startDate);
    
    for (let i = 0; i < maxInstances; i++) {
      // Check if we should stop (if recurringEndDate is set)
      if (taskData.recurringEndDate && currentDate > new Date(taskData.recurringEndDate)) {
        break;
      }
      
      const instanceStart = new Date(currentDate);
      const instanceEnd = new Date(currentDate.getTime() + duration);
      
      instances.push({
        ...taskData,
        start: instanceStart,
        end: instanceEnd,
        recurringInstance: i,
        parentRecurringId: taskData.title + '_' + startDate.getTime() // Link recurring tasks
      });
      
      // Calculate next occurrence based on recurrence type
      switch (taskData.recurrence) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'custom':
          currentDate = getNextCustomDate(currentDate, taskData.recurringDays);
          break;
        default:
          return instances; // Stop if unknown recurrence
      }
    }
    
    return instances;
  };

  const getNextCustomDate = (currentDate, selectedDays) => {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    let nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1); // Start checking from tomorrow
    
    // Find the next day that matches our selected days
    for (let i = 0; i < 7; i++) {
      const dayOfWeek = nextDate.getDay();
      const dayName = dayNames[dayOfWeek];
      
      if (selectedDays.includes(dayName)) {
        return nextDate;
      }
      
      nextDate.setDate(nextDate.getDate() + 1);
    }
    
    return nextDate; // Fallback
  };

  const handleUpdateTask = async (taskId, taskData) => {
    try {
      await updateDoc(doc(db, 'users', user.uid, 'tasks', taskId), {
        ...taskData,
        updatedAt: Timestamp.now()
      });
      setEditingTask(null);
      setShowTaskForm(false);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'tasks', taskId));
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const handleTaskClick = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setEditingTask(task);
      setShowTaskForm(true);
    }
  };

  const handleSelectSlot = (date) => {
    setEditingTask({
      start: date,
      end: new Date(date.getTime() + 60 * 60 * 1000), // 1 hour default
      title: '',
      description: '',
      category: 'study',
      priority: 'normal'
    });
    setShowTaskForm(true);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.displayName?.split(' ')[0] || 'there';
    
    if (hour < 12) return `Good morning, ${name}!`;
    if (hour < 17) return `Good afternoon, ${name}!`;
    return `Good evening, ${name}!`;
  };

  // Update settings change handler:
  const handleSettingsChange = (newSettings) => {
    notificationService.updateSettings(newSettings);
    // Re-schedule notifications with new settings
    if (tasks.length > 0) {
      notificationService.scheduleTaskNotifications(tasks);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your schedule...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="app-title">
              <span className="app-icon">📅</span>
              StudySync
            </h1>
            <p className="greeting">{getGreeting()}</p>
          </div>
          <div className="header-actions">
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              ⚙️
            </button>
            <button
              className="btn btn--secondary btn--sm"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-button ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            📅 Calendar
          </button>
          <button
            className={`tab-button ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            📋 Tasks
          </button>
          <button
            className={`tab-button ${activeTab === 'timer' ? 'active' : ''}`}
            onClick={() => setActiveTab('timer')}
          >
            ⏱️ Timer
          </button>


        </div>

        {/* Content Area */}
        <div className="content-area">
          {activeTab === 'calendar' && (
            <div className="calendar-tab">
              <div className="view-controls">
                <div className="view-buttons">
                  {['month', 'week', 'day', 'agenda'].map(view => (
                    <button
                      key={view}
                      className={`view-btn ${currentView === view ? 'active' : ''}`}
                      onClick={() => setCurrentView(view)}
                    >
                      {view.charAt(0).toUpperCase() + view.slice(1)}
                    </button>
                  ))}
                </div>
                <button
                  className="btn btn--primary"
                  onClick={() => setShowTaskForm(true)}
                >
                  + Add Task
                </button>
              </div>
              
              <Calendar
                tasks={tasks}
                onTaskClick={handleTaskClick}
                onSelectSlot={handleSelectSlot}
                currentView={currentView}
                onViewChange={setCurrentView}
              />
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="tasks-tab">
              <div className="tasks-header">
                <h2>Your Tasks</h2>
                <button
                  className="btn btn--primary"
                  onClick={() => setShowTaskForm(true)}
                >
                  + Add Task
                </button>
              </div>
              
              {priorityTasks.length > 0 && (
                <div className="priority-section">
                  <h3>🔥 Priority Tasks</h3>
                  <div className="tasks-grid">
                    {priorityTasks.map(task => (
                      <div key={task.id} className="task-card priority">
                        <h4>{task.title}</h4>
                        <p>{task.description}</p>
                        <div className="task-meta">
                          <span className="task-category">{task.category}</span>
                          <span className="task-date">
                            {task.start?.toDate?.()?.toLocaleDateString()}
                          </span>
                        </div>
                        <div className="task-actions">
                          <button onClick={() => handleTaskClick(task.id)}>Edit</button>
                          <button onClick={() => handleDeleteTask(task.id)}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="all-tasks-section">
                <h3>All Tasks</h3>
                <div className="tasks-grid">
                  {tasks.filter(task => task.priority !== 'high').map(task => (
                    <div key={task.id} className="task-card">
                      <h4>{task.title}</h4>
                      <p>{task.description}</p>
                      <div className="task-meta">
                        <span className="task-category">{task.category}</span>
                        <span className="task-date">
                          {task.start?.toDate?.()?.toLocaleDateString()}
                        </span>
                      </div>
                      <div className="task-actions">
                        <button onClick={() => handleTaskClick(task.id)}>Edit</button>
                        <button onClick={() => handleDeleteTask(task.id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timer' && (
            <Timer tasks={priorityTasks} />
          )}
        </div>
      </main>

      {/* Task Form Modal */}
      {showTaskForm && (
        <TaskForm
          task={editingTask}
          onSave={editingTask?.id ? handleUpdateTask : handleAddTask}
          onCancel={() => {
            setShowTaskForm(false);
            setEditingTask(null);
          }}
          onDelete={handleDeleteTask} // ✅ Add onDelete prop
          isRecurringEdit={editingTask?.recurrence !== 'none'}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <Settings 
          user={user} 
          onClose={() => setShowSettings(false)}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          tasks={tasks}  // Pass tasks for export
          onTasksImported={(importedTasks) => {
            // Handle imported tasks - they'll automatically appear via Firestore listener
            console.log(`📥 Imported ${importedTasks.length} tasks successfully`);
            
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
