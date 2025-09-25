import { Timestamp } from 'firebase/firestore';

class ICSService {
  constructor() {
    this.version = '2.0';
    this.prodId = '-//StudySync//StudySync Calendar//EN';
  }

  // Export tasks to ICS format
  exportTasks(tasks, userEmail = 'user@studysync.com') {
    const icsHeader = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      `PRODID:${this.prodId}`,
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:StudySync Tasks',
      'X-WR-CALDESC:Tasks exported from StudySync'
    ].join('\r\n');

    const icsFooter = 'END:VCALENDAR';

    const icsEvents = tasks.map(task => this.taskToICSEvent(task, userEmail)).join('\r\n');

    return `${icsHeader}\r\n${icsEvents}\r\n${icsFooter}`;
  }

  // Convert a single task to ICS event format
  taskToICSEvent(task, userEmail) {
    const startDate = task.start?.toDate ? task.start.toDate() : new Date(task.start);
    const endDate = task.end?.toDate ? task.end.toDate() : new Date(task.end);
    
    // Format dates to ICS format (YYYYMMDDTHHMMSSZ)
    const formatICSDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const uid = task.id || this.generateUID();
    const dtstamp = formatICSDate(new Date());
    const dtstart = formatICSDate(startDate);
    const dtend = formatICSDate(endDate);
    
    // Priority mapping
    const priorityMap = {
      'high': '1',
      'medium': '5', 
      'normal': '9'
    };

    // Category mapping
    const categoryMap = {
      'study': 'EDUCATION',
      'work': 'WORK',
      'personal': 'PERSONAL',
      'health': 'HEALTH',
      'other': 'OTHER'
    };

    const event = [
      'BEGIN:VEVENT',
      `UID:${uid}@studysync.com`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${this.escapeICSText(task.title || 'Untitled Task')}`,
      task.description ? `DESCRIPTION:${this.escapeICSText(task.description)}` : '',
      task.location ? `LOCATION:${this.escapeICSText(task.location)}` : '',
      `CATEGORIES:${categoryMap[task.category] || 'OTHER'}`,
      `PRIORITY:${priorityMap[task.priority] || '9'}`,
      `STATUS:${task.completed ? 'COMPLETED' : 'CONFIRMED'}`,
      `ORGANIZER:mailto:${userEmail}`,
      task.completed ? `COMPLETED:${dtstamp}` : '',
      'TRANSP:OPAQUE',
      'CLASS:PRIVATE',
      'END:VEVENT'
    ].filter(line => line !== ''); // Remove empty lines

    return event.join('\r\n');
  }

  // Import ICS file and parse to tasks
  async importICS(fileContent) {
    try {
      const tasks = [];
      const lines = fileContent.split(/\r?\n/);
      let currentEvent = null;
      let isInEvent = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line === 'BEGIN:VEVENT') {
          isInEvent = true;
          currentEvent = {
            title: '',
            description: '',
            start: null,
            end: null,
            category: 'study',
            priority: 'normal',
            completed: false,
            location: ''
          };
        } else if (line === 'END:VEVENT' && isInEvent) {
          if (currentEvent && currentEvent.title && currentEvent.start && currentEvent.end) {
            tasks.push(currentEvent);
          }
          currentEvent = null;
          isInEvent = false;
        } else if (isInEvent && currentEvent) {
          this.parseICSLine(line, currentEvent);
        }
      }

      console.log(`📥 Imported ${tasks.length} tasks from ICS file`);
      return {
        success: true,
        tasks,
        count: tasks.length
      };

    } catch (error) {
      console.error('Error parsing ICS file:', error);
      return {
        success: false,
        error: error.message,
        tasks: []
      };
    }
  }

  // Parse individual ICS line
  parseICSLine(line, event) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return;

    const property = line.substring(0, colonIndex).toUpperCase();
    const value = line.substring(colonIndex + 1);

    switch (property) {
      case 'SUMMARY':
        event.title = this.unescapeICSText(value);
        break;
      case 'DESCRIPTION':
        event.description = this.unescapeICSText(value);
        break;
      case 'DTSTART':
        event.start = this.parseICSDate(value);
        break;
      case 'DTEND':
        event.end = this.parseICSDate(value);
        break;
      case 'LOCATION':
        event.location = this.unescapeICSText(value);
        break;
      case 'CATEGORIES':
        event.category = this.mapICSCategory(value);
        break;
      case 'PRIORITY':
        event.priority = this.mapICSPriority(value);
        break;
      case 'STATUS':
        event.completed = value.toUpperCase() === 'COMPLETED';
        break;
    }
  }

  // Parse ICS date format to JavaScript Date
  parseICSDate(dateString) {
    // Handle both formats: YYYYMMDDTHHMMSSZ and YYYYMMDDTHHMMSS
    const cleanDate = dateString.replace(/[TZ]/g, '');
    
    if (cleanDate.length >= 14) {
      const year = parseInt(cleanDate.substr(0, 4));
      const month = parseInt(cleanDate.substr(4, 2)) - 1; // Month is 0-based
      const day = parseInt(cleanDate.substr(6, 2));
      const hour = parseInt(cleanDate.substr(8, 2));
      const minute = parseInt(cleanDate.substr(10, 2));
      const second = parseInt(cleanDate.substr(12, 2));

      return new Date(year, month, day, hour, minute, second);
    }

    return new Date(dateString);
  }

  // Map ICS categories to app categories
  mapICSCategory(category) {
    const categoryMap = {
      'EDUCATION': 'study',
      'WORK': 'work', 
      'PERSONAL': 'personal',
      'HEALTH': 'health'
    };
    return categoryMap[category.toUpperCase()] || 'other';
  }

  // Map ICS priority to app priority
  mapICSPriority(priority) {
    const priorityNum = parseInt(priority);
    if (priorityNum <= 3) return 'high';
    if (priorityNum <= 6) return 'medium';
    return 'normal';
  }

  // Escape special characters for ICS format
  escapeICSText(text) {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  }

  // Unescape ICS text
  unescapeICSText(text) {
    return text
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\');
  }

  // Generate unique ID
  generateUID() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Download ICS file
  downloadICSFile(icsContent, filename = 'studysync-tasks.ics') {
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  // Validate ICS file
  validateICSFile(content) {
    const requiredHeaders = ['BEGIN:VCALENDAR', 'END:VCALENDAR'];
    
    const hasRequiredHeaders = requiredHeaders.every(header => 
      content.includes(header)
    );

    if (!hasRequiredHeaders) {
      return {
        valid: false,
        error: 'Invalid ICS file format. Missing required calendar headers.'
      };
    }

    return { valid: true };
  }
}

const icsService = new ICSService();
export default icsService;
