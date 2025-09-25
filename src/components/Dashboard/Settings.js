import React, { useState, useEffect } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { collection, addDoc, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Timestamp } from 'firebase/firestore';
import icsService from '../../services/icsService';
import './Settings.css';

const Settings = ({ user, onClose, darkMode, setDarkMode, tasks, onTasksImported }) => {
  const [settings, setSettings] = useLocalStorage('studysync_settings', {
    notifications: true,
    defaultView: 'week',
    timeFormat: '12h',
    notificationTime: 10,
    soundEnabled: true
  });

  const [tempSettings, setTempSettings] = useState({ ...settings, darkMode });
  const [importStatus, setImportStatus] = useState({ show: false, message: '', type: '' });
  const [exportStatus, setExportStatus] = useState({ show: false, message: '', type: '' });
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setTempSettings({ ...settings, darkMode });
  }, [settings, darkMode]);

  const handleSettingChange = (setting, value) => {
    setTempSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleSave = () => {
    const { darkMode: tempDarkMode, ...otherSettings } = tempSettings;
    setSettings(otherSettings);
    setDarkMode(tempDarkMode);
    onClose();
  };

  const handleCancel = () => {
    setTempSettings({ ...settings, darkMode });
    onClose();
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        handleSettingChange('notifications', true);
        new Notification('StudySync Notifications Enabled!', {
          body: 'You will now receive task reminders.',
          icon: '/favicon.ico'
        });
      }
    }
  };

  // Export tasks to ICS
  const handleExportICS = async () => {
    if (!tasks || tasks.length === 0) {
      setExportStatus({
        show: true,
        message: 'No tasks to export. Add some tasks first!',
        type: 'error'
      });
      return;
    }

    setIsExporting(true);
    
    try {
      const icsContent = icsService.exportTasks(tasks, user?.email || 'user@studysync.com');
      const filename = `studysync-tasks-${new Date().toISOString().split('T')[0]}.ics`;
      
      icsService.downloadICSFile(icsContent, filename);
      
      setExportStatus({
        show: true,
        message: `✅ Successfully exported ${tasks.length} tasks to ${filename}`,
        type: 'success'
      });

      console.log(`📤 Exported ${tasks.length} tasks to ICS file`);

    } catch (error) {
      console.error('Export error:', error);
      setExportStatus({
        show: true,
        message: `❌ Export failed: ${error.message}`,
        type: 'error'
      });
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportStatus({ show: false, message: '', type: '' }), 5000);
    }
  };

  // Import tasks from ICS
  const handleImportICS = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ics,.ical,.ifb,.icalendar';
    input.multiple = false;
    
    input.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      setIsImporting(true);
      setImportStatus({ show: true, message: 'Reading ICS file...', type: 'info' });

      try {
        const fileContent = await readFile(file);
        
        // Validate file format
        const validation = icsService.validateICSFile(fileContent);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        setImportStatus({ show: true, message: 'Parsing calendar events...', type: 'info' });
        
        // Parse ICS file
        const result = await icsService.importICS(fileContent);
        
        if (!result.success) {
          throw new Error(result.error);
        }

        if (result.tasks.length === 0) {
          setImportStatus({
            show: true,
            message: '⚠️ No valid events found in the ICS file.',
            type: 'warning'
          });
          return;
        }

        setImportStatus({ show: true, message: 'Saving tasks to your account...', type: 'info' });

        // Save imported tasks to Firestore
        await saveImportedTasks(result.tasks);
        
        setImportStatus({
          show: true,
          message: `✅ Successfully imported ${result.count} tasks from ${file.name}!`,
          type: 'success'
        });

        // Notify parent component about imported tasks
        if (onTasksImported) {
          onTasksImported(result.tasks);
        }

        console.log(`📥 Successfully imported ${result.count} tasks`);

      } catch (error) {
        console.error('Import error:', error);
        setImportStatus({
          show: true,
          message: `❌ Import failed: ${error.message}`,
          type: 'error'
        });
      } finally {
        setIsImporting(false);
        setTimeout(() => setImportStatus({ show: false, message: '', type: '' }), 8000);
      }
    };

    input.click();
  };

  // Read file content
  const readFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  // Save imported tasks to Firestore
  const saveImportedTasks = async (importedTasks) => {
    try {
      const batch = writeBatch(db);
      
      importedTasks.forEach(task => {
        const docRef = doc(collection(db, 'users', user.uid, 'tasks'));
        batch.set(docRef, {
          ...task,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          importedFrom: 'ics'
        });
      });

      await batch.commit();
    } catch (error) {
      throw new Error(`Failed to save tasks: ${error.message}`);
    }
  };

  const getStatusIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '';
    }
  };

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={handleCancel}>×</button>
        </div>

        <div className="settings-content">
          
          {/* User Profile */}
          <div className="settings-section">
            <h3>👤 Profile</h3>
            <div className="settings-group">
              <div className="user-info">
                <div className="user-detail">
                  <label>Name:</label>
                  <span>{user?.displayName || 'No name set'}</span>
                </div>
                <div className="user-detail">
                  <label>Email:</label>
                  <span>{user?.email || 'No email'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="settings-section">
            <h3>🎨 Appearance</h3>
            <div className="settings-group">
              <div className="setting-item">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={tempSettings.darkMode}
                    onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
                  />
                  <span className="setting-text">Dark Theme</span>
                </label>
                <span className="setting-description">Use dark theme for better eye comfort</span>
              </div>

              <div className="setting-item">
                <label className="setting-label">Default Calendar View</label>
                <select
                  value={tempSettings.defaultView}
                  onChange={(e) => handleSettingChange('defaultView', e.target.value)}
                  className="setting-select"
                >
                  <option value="week">Week View</option>
                  <option value="month">Month View</option>
                  <option value="day">Day View</option>
                </select>
                <span className="setting-description">Your preferred calendar view on startup</span>
              </div>

              <div className="setting-item">
                <label className="setting-label">Time Format</label>
                <select
                  value={tempSettings.timeFormat}
                  onChange={(e) => handleSettingChange('timeFormat', e.target.value)}
                  className="setting-select"
                >
                  <option value="12h">12 Hour (AM/PM)</option>
                  <option value="24h">24 Hour</option>
                </select>
                <span className="setting-description">Display time in 12 or 24 hour format</span>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="settings-section">
            <h3>🔔 Notifications</h3>
            <div className="settings-group">
              <div className="setting-item">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={tempSettings.notifications}
                    onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                  />
                  <span className="setting-text">Enable Notifications</span>
                </label>
                <span className="setting-description">Get reminders for high-priority tasks</span>
              </div>

              {!tempSettings.notifications && (
                <button 
                  className="permission-button"
                  onClick={requestNotificationPermission}
                >
                  🔔 Enable Browser Notifications
                </button>
              )}

              <div className="setting-item">
                <label className="setting-label">Notification Timing</label>
                <div className="number-input-container">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={tempSettings.notificationTime}
                    onChange={(e) => handleSettingChange('notificationTime', parseInt(e.target.value))}
                    className="setting-number"
                    disabled={!tempSettings.notifications}
                  />
                  <span className="number-suffix">minutes before task starts</span>
                </div>
                <span className="setting-description">Minutes before task starts</span>
              </div>

              <div className="setting-item">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={tempSettings.soundEnabled}
                    onChange={(e) => handleSettingChange('soundEnabled', e.target.checked)}
                    disabled={!tempSettings.notifications}
                  />
                  <span className="setting-text">Notification Sounds</span>
                </label>
                <span className="setting-description">Play sound with notifications</span>
              </div>
            </div>
          </div>

          {/* Data Import/Export */}
          <div className="settings-section">
            <h3>📅 Calendar Import/Export</h3>
            <div className="settings-group">
              <div className="import-export-container">
                
                {/* Export Section */}
                <div className="import-export-item">
                  <h4>📤 Export Tasks</h4>
                  <p className="feature-description">
                    Export your StudySync tasks to an ICS file that can be imported into Google Calendar, 
                    Outlook, Apple Calendar, and other calendar applications.
                  </p>
                  <button
                    className="import-export-button export-button"
                    onClick={handleExportICS}
                    disabled={isExporting || !tasks || tasks.length === 0}
                  >
                    {isExporting ? (
                      <span>
                        <div className="spinner"></div>
                        Exporting...
                      </span>
                    ) : (
                      <span>📤 Export to ICS File</span>
                    )}
                  </button>
                  {tasks && (
                    <span className="task-count">
                      {tasks.length} task{tasks.length !== 1 ? 's' : ''} available for export
                    </span>
                  )}
                </div>

                {/* Import Section */}
                <div className="import-export-item">
                  <h4>📥 Import Tasks</h4>
                  <p className="feature-description">
                    Import events from external calendars (Google Calendar, Outlook, Apple Calendar) 
                    by uploading an ICS file. Events will be added as StudySync tasks.
                  </p>
                  <button
                    className="import-export-button import-button"
                    onClick={handleImportICS}
                    disabled={isImporting}
                  >
                    {isImporting ? (
                      <span>
                        <div className="spinner"></div>
                        Importing...
                      </span>
                    ) : (
                      <span>📥 Import ICS File</span>
                    )}
                  </button>
                  <span className="file-info">
                    Supports .ics, .ical, and .ifb files
                  </span>
                </div>
              </div>

              {/* Status Messages */}
              {(importStatus.show || exportStatus.show) && (
                <div className="status-messages">
                  {importStatus.show && (
                    <div className={`status-message ${importStatus.type}`}>
                      <span className="status-icon">{getStatusIcon(importStatus.type)}</span>
                      <span>{importStatus.message}</span>
                    </div>
                  )}
                  {exportStatus.show && (
                    <div className={`status-message ${exportStatus.type}`}>
                      <span className="status-icon">{getStatusIcon(exportStatus.type)}</span>
                      <span>{exportStatus.message}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button className="button-secondary" onClick={handleCancel}>
            Cancel
          </button>
          <button className="button-primary" onClick={handleSave}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
