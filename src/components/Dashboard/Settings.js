import React, { useState, useEffect } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';

const Settings = ({ user, onClose, darkMode, setDarkMode }) => {
  const [settings, setSettings] = useLocalStorage('studysync_settings', {
    notifications: true,
    defaultView: 'week',
    timeFormat: '12h',
    notificationTime: 10,
    soundEnabled: true
  });

  const [tempSettings, setTempSettings] = useState({
    ...settings,
    darkMode
  });

  useEffect(() => {
    setTempSettings({
      ...settings,
      darkMode
    });
  }, [settings, darkMode]);

  const handleSettingChange = (setting, value) => {
    setTempSettings(prev => ({ ...prev, [setting]: value }));
  };

  const handleSave = () => {
    const { darkMode: tempDarkMode, ...otherSettings } = tempSettings;
    
    setSettings(otherSettings);
    setDarkMode(tempDarkMode);
    
    onClose();
  };

  const handleCancel = () => {
    setTempSettings({
      ...settings,
      darkMode
    });
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

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ Settings</h2>
          <button className="modal-close" onClick={handleCancel}>×</button>
        </div>
        
        <div className="settings-content">
          <div className="settings-section">
            <h3>👤 Profile</h3>
            <div className="setting-item">
              <div className="setting-info">
                <label>Name</label>
                <p className="setting-description">{user?.displayName || 'No name set'}</p>
              </div>
            </div>
            <div className="setting-item">
              <div className="setting-info">
                <label>Email</label>
                <p className="setting-description">{user?.email || 'No email'}</p>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>🎨 Appearance</h3>
            <div className="setting-item">
              <div className="setting-info">
                <label htmlFor="darkMode">Dark Mode</label>
                <p className="setting-description">Use dark theme for better eye comfort</p>
              </div>
              <div className="setting-control">
                <label className="toggle-switch">
                  <input
                    id="darkMode"
                    type="checkbox"
                    checked={tempSettings.darkMode}
                    onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
            
            <div className="setting-item">
              <div className="setting-info">
                <label htmlFor="defaultView">Default Calendar View</label>
                <p className="setting-description">Your preferred calendar view on startup</p>
              </div>
              <div className="setting-control">
                <select
                  id="defaultView"
                  value={tempSettings.defaultView}
                  onChange={(e) => handleSettingChange('defaultView', e.target.value)}
                  className="form-select"
                >
                  <option value="day">Day View</option>
                  <option value="week">Week View</option>
                  <option value="month">Month View</option>
                </select>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>🔔 Notifications</h3>
            <div className="setting-item">
              <div className="setting-info">
                <label htmlFor="notifications">Enable Notifications</label>
                <p className="setting-description">Get reminders for high-priority tasks</p>
              </div>
              <div className="setting-control">
                {Notification.permission !== 'granted' ? (
                  <button 
                    className="btn btn--primary btn--sm"
                    onClick={requestNotificationPermission}
                  >
                    Enable
                  </button>
                ) : (
                  <label className="toggle-switch">
                    <input
                      id="notifications"
                      type="checkbox"
                      checked={tempSettings.notifications}
                      onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                )}
              </div>
            </div>
            
            {tempSettings.notifications && (
              <>
                <div className="setting-item">
                  <div className="setting-info">
                    <label htmlFor="notificationTime">Reminder Time</label>
                    <p className="setting-description">Minutes before task starts</p>
                  </div>
                  <div className="setting-control">
                    <select
                      id="notificationTime"
                      value={tempSettings.notificationTime}
                      onChange={(e) => handleSettingChange('notificationTime', parseInt(e.target.value))}
                      className="form-select"
                    >
                      <option value={5}>5 minutes</option>
                      <option value={10}>10 minutes</option>
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                    </select>
                  </div>
                </div>
                
                <div className="setting-item">
                  <div className="setting-info">
                    <label htmlFor="soundEnabled">Sound Alerts</label>
                    <p className="setting-description">Play sound with notifications</p>
                  </div>
                  <div className="setting-control">
                    <label className="toggle-switch">
                      <input
                        id="soundEnabled"
                        type="checkbox"
                        checked={tempSettings.soundEnabled}
                        onChange={(e) => handleSettingChange('soundEnabled', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="settings-section">
            <h3>⏰ Time & Format</h3>
            <div className="setting-item">
              <div className="setting-info">
                <label htmlFor="timeFormat">Time Format</label>
                <p className="setting-description">Display time in 12 or 24 hour format</p>
              </div>
              <div className="setting-control">
                <select
                  id="timeFormat"
                  value={tempSettings.timeFormat}
                  onChange={(e) => handleSettingChange('timeFormat', e.target.value)}
                  className="form-select"
                >
                  <option value="12h">12 Hour (AM/PM)</option>
                  <option value="24h">24 Hour</option>
                </select>
              </div>
            </div>
          </div>

          <div className="settings-actions">
            <button onClick={handleCancel} className="btn btn--secondary">
              Cancel
            </button>
            <button onClick={handleSave} className="btn btn--primary">
              💾 Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
