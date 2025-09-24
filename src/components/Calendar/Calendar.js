import React, { useState, useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, isAfter, isBefore } from 'date-fns';
import './Calendar.css';

const Calendar = ({ tasks, onTaskClick, onSelectSlot, currentView, onViewChange }) => {
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

  const TaskAbstract = ({ task, isSmall = false }) => (
    <div 
      className={`task-abstract ${task.priority} ${isSmall ? 'small' : ''}`}
      style={{ borderLeftColor: task.color || '#3b82f6' }}
      onClick={() => onTaskClick(task.id)}
      title={`${task.title} - ${task.description || 'No description'}`}
    >
      <span className="task-title">{task.title}</span>
      {task.priority === 'high' && <span className="priority-fire">🔥</span>}
    </div>
  );

  const DayCell = ({ date, dayTasks, isCurrentMonth = true }) => {
    const isToday = isSameDay(date, new Date());
    const maxVisible = currentView === 'month' ? 3 : currentView === 'week' ? 6 : 12;
    const visibleTasks = dayTasks.slice(0, maxVisible);
    const hiddenCount = dayTasks.length - maxVisible;

    return (
      <div 
        className={`day-cell ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
        onClick={() => onSelectSlot(date)}
      >
        <div className="day-header">
          <span className="day-number">{format(date, 'd')}</span>
          {dayTasks.length > 0 && (
            <span className="task-count">{dayTasks.length}</span>
          )}
        </div>
        
        <div className="day-tasks">
          {visibleTasks.map((task, index) => (
            <TaskAbstract 
              key={task.id} 
              task={task} 
              isSmall={currentView === 'month' || dayTasks.length > 4}
            />
          ))}
          {hiddenCount > 0 && (
            <div className="more-tasks">+{hiddenCount} more</div>
          )}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = addDays(startOfWeek(monthEnd), 41);
    
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd }).slice(0, 42);
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="month-view">
        <div className="weekday-headers">
          {weekDays.map(day => (
            <div key={day} className="weekday-header">{day}</div>
          ))}
        </div>
        <div className="month-grid">
          {days.map(day => {
            const dayTasks = getTasksForDay(day);
            return (
              <DayCell
                key={day.toISOString()}
                date={day}
                dayTasks={dayTasks}
                isCurrentMonth={isSameMonth(day, currentDate)}
              />
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const weekDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="week-view">
        <div className="week-headers">
          {weekDays.map((day, index) => (
            <div key={day.toISOString()} className="week-header">
              <div className="week-day-name">{weekDayNames[index]}</div>
              <div className="week-day-number">{format(day, 'd')}</div>
            </div>
          ))}
        </div>
        <div className="week-grid">
          {weekDays.map(day => {
            const dayTasks = getTasksForDay(day);
            return (
              <DayCell
                key={day.toISOString()}
                date={day}
                dayTasks={dayTasks}
              />
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
        <div className="day-header-large">
          <h2>{format(currentDate, 'EEEE, MMMM d')}</h2>
          <div className="day-stats">
            {dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}
          </div>
        </div>
        
        <div className="day-tasks-list">
          {dayTasks.length === 0 ? (
            <div className="no-tasks">
              <p>No tasks scheduled for this day</p>
              <button 
                className="btn btn--primary"
                onClick={() => onSelectSlot(currentDate)}
              >
                Add Task
              </button>
            </div>
          ) : (
            dayTasks
              .sort((a, b) => {
                const timeA = a.start?.toDate ? a.start.toDate() : new Date(a.start);
                const timeB = b.start?.toDate ? b.start.toDate() : new Date(b.start);
                return timeA - timeB;
              })
              .map(task => (
                <div 
                  key={task.id} 
                  className={`day-task-item ${task.priority}`}
                  style={{ borderLeftColor: task.color || '#3b82f6' }}
                  onClick={() => onTaskClick(task.id)}
                >
                  <div className="task-time">
                    {format(task.start?.toDate ? task.start.toDate() : new Date(task.start), 'h:mm a')}
                  </div>
                  <div className="task-content">
                    <h4>{task.title} {task.priority === 'high' && '🔥'}</h4>
                    {task.description && <p>{task.description}</p>}
                    <div className="task-meta">
                      <span className="task-category">{task.category}</span>
                      {task.recurrence && task.recurrence !== 'none' && (
                        <span className="task-recurrence">🔄 {task.recurrence}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    );
  };

  const renderAgendaView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const monthTasks = getTasksForDateRange(monthStart, monthEnd);
    
    // Group tasks by date
    const tasksByDate = monthTasks.reduce((acc, task) => {
      const taskDate = task.start?.toDate ? task.start.toDate() : new Date(task.start);
      const dateKey = format(taskDate, 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(task);
      return acc;
    }, {});

    return (
      <div className="agenda-view">
        <div className="agenda-header">
          <h3>📋 Agenda for {format(currentDate, 'MMMM yyyy')}</h3>
          <div className="agenda-stats">
            {monthTasks.length} task{monthTasks.length !== 1 ? 's' : ''} scheduled
          </div>
        </div>
        
        <div className="agenda-content">
          {Object.keys(tasksByDate).length === 0 ? (
            <div className="no-tasks">
              <p>No tasks scheduled this month</p>
              <button 
                className="btn btn--primary"
                onClick={() => onSelectSlot(new Date())}
              >
                Add Your First Task
              </button>
            </div>
          ) : (
            Object.entries(tasksByDate).map(([dateKey, dateTasks]) => {
              const date = new Date(dateKey + 'T00:00:00');
              const isToday = isSameDay(date, new Date());
              
              return (
                <div key={dateKey} className={`agenda-date-section ${isToday ? 'today' : ''}`}>
                  <div className="agenda-date-header">
                    <h4>{format(date, 'EEEE, MMMM d, yyyy')}</h4>
                    <span className="task-count">{dateTasks.length} task{dateTasks.length !== 1 ? 's' : ''}</span>
                  </div>
                  
                  <div className="agenda-tasks">
                    {dateTasks.map(task => (
                      <div 
                        key={task.id} 
                        className={`agenda-task-item ${task.priority}`}
                        onClick={() => onTaskClick(task.id)}
                      >
                        <div className="task-time">
                          {format(task.start?.toDate ? task.start.toDate() : new Date(task.start), 'h:mm a')}
                        </div>
                        <div className="task-content">
                          <div className="task-header">
                            <h5>{task.title} {task.priority === 'high' && '🔥'}</h5>
                            <span className="task-category">{task.category}</span>
                          </div>
                          {task.description && <p>{task.description}</p>}
                          {task.recurrence && task.recurrence !== 'none' && (
                            <div className="task-recurrence">🔄 Repeats {task.recurrence}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="custom-calendar">
      <div className="calendar-toolbar">
        <div className="calendar-nav">
          <button onClick={() => navigate('prev')} className="nav-btn">‹</button>
          <div className="calendar-title">{formatDateHeader()}</div>
          <button onClick={() => navigate('next')} className="nav-btn">›</button>
        </div>
        
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
