import React, { useState } from 'react';
import { 
  format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks, 
  startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, 
  addMonths, subMonths, isAfter, isBefore, isToday 
} from 'date-fns';
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
      onClick={(e) => {
        e.stopPropagation();
        onTaskClick(task.id);
      }}
    >
      <span className="task-title">{task.title}</span>
      {task.priority === 'high' && <span className="priority-fire">🔥</span>}
    </div>
  );

  const DayCell = ({ date, dayTasks, isCurrentMonth = true }) => {
    const isCurrentDay = isToday(date);
    
    return (
      <div
        className={`day-cell ${isCurrentDay ? 'today' : ''} ${!isCurrentMonth ? 'other-month' : ''}`}
        onClick={() => onSelectSlot(date)}
      >
        <div className="day-header">
          <span className="day-number">{format(date, 'd')}</span>
          {dayTasks.length > 0 && (
            <span className="task-count">{dayTasks.length}</span>
          )}
        </div>
        <div className="day-tasks">
          {dayTasks.slice(0, 3).map(task => (
            <TaskAbstract key={task.id} task={task} isSmall={dayTasks.length > 2} />
          ))}
          {dayTasks.length > 3 && (
            <div className="more-tasks">
              +{dayTasks.length - 3} more
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = addDays(startOfWeek(monthEnd), 41); // Ensure 6 full weeks
    
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="month-view">
        <div className="month-calendar-container">
          {/* Header cells - first row of grid */}
          {weekdays.map(day => (
            <div key={day} className="month-header-cell">
              {day}
            </div>
          ))}
          
          {/* Day cells - remaining rows */}
          {days.slice(0, 42).map(day => {
            const dayTasks = getTasksForDay(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentDate);
            
            return (
              <div
                key={day.toString()}
                className={`month-day-cell ${isToday ? 'today' : ''} ${!isCurrentMonth ? 'other-month' : ''}`}
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
                  {dayTasks.slice(0, 3).map(task => (
                    <TaskAbstract
                      key={task.id}
                      task={task}
                      onClick={() => onTaskClick && onTaskClick(task)}
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

  if (currentView === 'month') {
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
          {renderMonthView()}
        </div>
      </div>
    );
  }

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
          {weekDays.map((day, index) => {
            const dayTasks = getTasksForDay(day);
            const isCurrentDay = isToday(day);
            
            return (
              <div
                key={day.toISOString()}
                className={`week-day-cell ${isCurrentDay ? 'today' : ''}`}
                onClick={() => onSelectSlot(day)}
                data-day-name={weekDayNames[index]}
                data-day-number={format(day, 'd')}
              >
                <div className="week-day-tasks">
                  {dayTasks.map(task => (
                    <TaskAbstract key={task.id} task={task} />
                  ))}
                </div>
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
        <div className="day-header-large">
          <h2>{format(currentDate, 'EEEE, MMMM d')}</h2>
          <div className="day-stats">
            {dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''} scheduled
          </div>
        </div>
        
        <div className="day-tasks-list">
          {dayTasks.length === 0 ? (
            <div className="no-tasks">
              <p>No tasks scheduled for this day</p>
            </div>
          ) : (
            dayTasks.map(task => (
              <div
                key={task.id}
                className={`day-task-item ${task.priority}`}
                onClick={() => onTaskClick(task.id)}
              >
                <div className="task-time">
                  {format(task.start?.toDate ? task.start.toDate() : new Date(task.start), 'h:mm a')}
                </div>
                <div className="task-content">
                  <h4>{task.title}</h4>
                  {task.description && <p>{task.description}</p>}
                  <div className="task-meta">
                    <span className="task-category">{task.category || 'GENERAL'}</span>
                    {task.recurrence && task.recurrence !== 'none' && (
                      <span className="task-recurrence">
                        Repeats {task.recurrence}
                      </span>
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

    const sortedDates = Object.keys(tasksByDate).sort();

    return (
      <div className="agenda-view">
        <div className="agenda-header">
          <h3>📅 Agenda for {format(currentDate, 'MMMM yyyy')}</h3>
          <div className="agenda-stats">
            {monthTasks.length} tasks scheduled
          </div>
        </div>

        <div className="agenda-content">
          {sortedDates.length === 0 ? (
            <div className="no-tasks">
              <p>No tasks scheduled this month</p>
            </div>
          ) : (
            sortedDates.map(dateKey => {
              const date = new Date(dateKey);
              const dateTasks = tasksByDate[dateKey];
              const isCurrentDay = isToday(date);

              return (
                <div
                  key={dateKey}
                  className={`agenda-date-section ${isCurrentDay ? 'today' : ''}`}
                >
                  <div className="agenda-date-header">
                    <h4>{format(date, 'EEEE, MMMM d')}</h4>
                    <span className="task-count">{dateTasks.length}</span>
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
                            <h5>{task.title}</h5>
                          </div>
                          {task.description && <p>{task.description}</p>}
                          <div className="task-meta">
                            <span className="task-category">{task.category || 'GENERAL'}</span>
                            {task.recurrence && task.recurrence !== 'none' && (
                              <span className="task-recurrence">
                                Repeats {task.recurrence}
                              </span>
                            )}
                          </div>
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

  const renderCurrentView = () => {
    switch (currentView) {
      case 'month':
        return renderMonthView();
      case 'week':
        return renderWeekView();
      case 'day':
        return renderDayView();
      case 'agenda':
        return renderAgendaView();
      default:
        return renderMonthView();
    }
  };

  return (
    <div className="custom-calendar">
      <div className="calendar-toolbar">
        <div className="calendar-nav">
          <button className="nav-btn" onClick={() => navigate('prev')}>
            ‹
          </button>
          <button className="nav-btn" onClick={() => navigate('next')}>
            ›
          </button>
        </div>
        
        <h1 className="calendar-title">
          {formatDateHeader()}
        </h1>
        
        <button 
          className="nav-btn"
          onClick={() => setCurrentDate(new Date())}
        >
          Today
        </button>
      </div>
      
      <div className="calendar-content">
        {renderCurrentView()}
      </div>
    </div>
  );
};

export default Calendar;
