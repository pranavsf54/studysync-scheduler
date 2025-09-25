import React, { useState } from 'react';
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, isAfter, isBefore, isToday } from 'date-fns';
import './Calendar.css';

const Calendar = ({ tasks, onTaskClick, onSelectSlot, currentView }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const navigate = (direction) => {
    if (currentView === 'month') {
      setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    } else if (currentView === 'week') {
      setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else if (currentView === 'agenda') {
      setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    } else {
      setCurrentDate(direction === 'next' ? addDays(currentDate, 1) : addDays(currentDate, -1));
    }
  };

  const getTasksForDay = (date) => {
    return tasks.filter(task => {
      const taskDate = task.start?.toDate ? task.start.toDate() : new Date(task.start);
      return isSameDay(taskDate, date);
    }).sort((a, b) => {
      const dateA = a.start?.toDate ? a.start.toDate() : new Date(a.start);
      const dateB = b.start?.toDate ? b.start.toDate() : new Date(b.start);
      return dateA - dateB;
    });
  };

  const getTasksForDateRange = (startDate, endDate) => {
    return tasks.filter(task => {
      const taskDate = task.start?.toDate ? task.start.toDate() : new Date(task.start);
      return (isSameDay(taskDate, startDate) || isAfter(taskDate, startDate)) &&
             (isSameDay(taskDate, endDate) || isBefore(taskDate, endDate));
    }).sort((a, b) => {
      const dateA = a.start?.toDate ? a.start.toDate() : new Date(a.start);
      const dateB = b.start?.toDate ? b.start.toDate() : new Date(b.start);
      return dateA - dateB;
    });
  };

  const formatDateHeader = () => {
    if (currentView === 'month') {
      return format(currentDate, 'MMMM yyyy');
    } else if (currentView === 'week') {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = addDays(weekStart, 6);
      return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;
    } else if (currentView === 'agenda') {
      return format(currentDate, 'MMMM yyyy');
    } else {
      return format(currentDate, 'EEEE, MMMM d, yyyy');
    }
  };

  const TaskAbstract = ({ task, onClick, isSmall = false, showTime = false }) => {
    const startTime = task.start?.toDate ? task.start.toDate() : new Date(task.start);
    const endTime = task.end?.toDate ? task.end.toDate() : new Date(task.end);
    
    // CRITICAL: Proper click handler
    const handleClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Task clicked:', task.title); // Debug log
      if (onClick) {
        onClick(); // Call the onClick function passed from parent
      }
    };
    
    return (
      <div
        className={`task-abstract ${task.priority || ''} ${isSmall ? 'small' : ''}`}
        onClick={handleClick}
        onMouseDown={(e) => e.preventDefault()}
        style={{ 
          backgroundColor: task.color || '#3b82f6',
          cursor: 'pointer'
        }}
      >
        <div className="task-content">
          {showTime && (
            <div className="task-time">
              {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
            </div>
          )}
          <div className="task-title">{task.title}</div>
          {task.description && !isSmall && (
            <div className="task-description">{task.description}</div>
          )}
        </div>
        {task.priority === 'high' && <span className="priority-fire">🔥</span>}
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = addDays(startDate, 41);
    
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="month-view">
        <div className="month-calendar-container">
          {weekdays.map(day => (
            <div key={day} className="month-header-cell">
              {day}
            </div>
          ))}
          
          {days.slice(0, 42).map(day => {
            const dayTasks = getTasksForDay(day);
            const isDayToday = isToday(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            
            return (
              <div
                key={day.toString()}
                className={`month-day-cell ${isDayToday ? 'today' : ''} ${!isCurrentMonth ? 'other-month' : ''}`}
                onClick={() => onSelectSlot && onSelectSlot(day)}
              >
                <div className="day-header">
                  <span className="day-number">
                    {format(day, 'd')}
                  </span>
                  {dayTasks.length > 3 && (
                    <span className="task-count">
                      {dayTasks.length}
                    </span>
                  )}
                </div>
                
                <div className="day-tasks">
                  {dayTasks.slice(0, 3).map((task, index) => (
                    <TaskAbstract
                      key={`${task.id}-${index}`}
                      task={task}
                      onClick={() => {
                        onTaskClick && onTaskClick(task.id); // ✅ FIXED: Pass task.id
                      }}
                      isSmall={true}
                    />
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="more-tasks">
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startDate = startOfWeek(currentDate);
    const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

    return (
      <div className="week-view">
        <div className="week-headers">
          {days.map(day => (
            <div key={day.toString()} className="week-header">
              <div className="week-day-name">{format(day, 'EEE')}</div>
              <div className={`week-day-number ${isToday(day) ? 'today' : ''}`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        <div className="week-grid">
          {days.map(day => {
            const dayTasks = getTasksForDay(day);
            return (
              <div
                key={day.toString()}
                className={`week-day-cell ${isToday(day) ? 'today' : ''}`}
                onClick={() => onSelectSlot && onSelectSlot(day)}
              >
                {dayTasks.map(task => (
                  <TaskAbstract
                    key={task.id}
                    task={task}
                    onClick={() => {
                      onTaskClick && onTaskClick(task.id); // ✅ FIXED: Pass task.id
                    }}
                    showTime={true}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayTasks = getTasksForDay(currentDate);

    return (
      <div className="day-view">
        <h3>{format(currentDate, 'EEEE, MMMM d, yyyy')}</h3>
        <div className="day-tasks-list">
          {dayTasks.length > 0 ? (
            dayTasks.map(task => (
              <TaskAbstract
                key={task.id}
                task={task}
                onClick={() => onTaskClick && onTaskClick(task.id)} // ✅ FIXED: Pass task.id
                showTime={true}
              />
            ))
          ) : (
            <div className="no-tasks">
              <p>No tasks scheduled for this day</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAgendaView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const monthTasks = getTasksForDateRange(monthStart, monthEnd);

    return (
      <div className="agenda-view">
        <h3>{format(currentDate, 'MMMM yyyy')} Agenda</h3>
        <div className="agenda-tasks-list">
          {monthTasks.length > 0 ? (
            monthTasks.map(task => (
              <div key={task.id} className="agenda-task">
                <div className="task-date">
                  {format(task.start?.toDate ? task.start.toDate() : new Date(task.start), 'MMM d')}
                </div>
                <TaskAbstract
                  task={task}
                  onClick={() => onTaskClick && onTaskClick(task.id)} // ✅ FIXED: Pass task.id
                  showTime={true}
                />
              </div>
            ))
          ) : (
            <div className="no-tasks">
              <p>No tasks scheduled this month</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="custom-calendar">
      <div className="calendar-toolbar">
        <div className="calendar-nav">
          <button className="nav-btn" onClick={() => navigate('prev')}>‹</button>
          <button className="nav-btn" onClick={() => navigate('next')}>›</button>
        </div>
        <h2 className="calendar-title">{formatDateHeader()}</h2>
        <button className="nav-btn" onClick={() => setCurrentDate(new Date())}>
          Today
        </button>
      </div>

      <div className="calendar-content">
        {currentView === 'month' && renderMonthView()}
        {currentView === 'week' && renderWeekView()}
        {currentView === 'day' && renderDayView()}
        {currentView === 'agenda' && renderAgendaView()}
      </div>
    </div>
  );
};

export default Calendar;
