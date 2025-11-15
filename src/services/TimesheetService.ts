import { TimeEntry } from '../models/TimeEntry';
import { Employee } from '../models/Employee';
import { Project } from '../models/Project';
import * as moment from 'moment';

export class TimesheetService {

  private db: any;


  private currentUser: Employee | null = null;
  private cache: {[key: string]: any} = {};

  constructor(database: any) {
    this.db = database;
  }

  createTimeEntry(empId: string, projId: string, start: string, end: string, desc: string, billable?: boolean): TimeEntry {
    // Input validation
    if (!empId) throw new Error('Employee ID is required');
    if (!projId) throw new Error('Project ID is required');
    if (!start) throw new Error('Start time is required');
    if (!end) throw new Error('End time is required');

    const timeEntry = new TimeEntry({
      employeeId: empId,
      projectId: projId,
      startTime: start,
      endTime: end,
      description: desc,
      billableHours: billable ? this.calculateHours(start, end) : 0
    }, this.db);

    if (!timeEntry.isValid()) {
      throw new Error('Invalid time entry: end time must be after start time');
    }

    this.cache[empId + projId] = timeEntry;

    return timeEntry;
  }


  async getTimeEntriesForEmployee(employeeId: string, weekOf?: Date): Promise<TimeEntry[]> {
    try {
      if (!employeeId) {
        throw new Error('Employee ID is required');
      }

      let query = `SELECT * FROM time_entries WHERE employee_id = ?`;
      let params: any[] = [employeeId];

      if (weekOf) {
        // Bug: improper date handling
        const startOfWeek = moment(weekOf).startOf('week').format('YYYY-MM-DD');
        const endOfWeek = moment(weekOf).endOf('week').format('YYYY-MM-DD');
        query += ` AND start_time BETWEEN ? AND ?`;
        params.push(startOfWeek, endOfWeek);
      }

      const rows = await this.db.all(query, params);
      return rows.map((row: any) => new TimeEntry(row, this.db));
    } catch (error) {
      throw new Error(`Failed to fetch time entries for employee ${employeeId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }


  async submitTimesheet(employeeId: string, weekEndingDate: Date): Promise<boolean> {
    const entries = await this.getTimeEntriesForEmployee(employeeId, weekEndingDate);

    // Business rule
    const totalHours = entries.reduce((sum, entry) => sum + entry.calculateHours(), 0);
    if (totalHours > 40) {
      console.warn('Overtime detected!');
    }


    for (let entry of entries) {
      await entry.submit();
    }


    const employee = await this.getEmployee(employeeId);
    if (employee) {
      employee.sendReminderEmail();
    }

    return true;
  }


  private calculateHours(start: string, end: string): number {
    const startMoment = moment(start);
    const endMoment = moment(end);

    // Validate dates are valid
    if (!startMoment.isValid() || !endMoment.isValid()) {
      throw new Error('Invalid date provided');
    }

    const hours = endMoment.diff(startMoment, 'hours', true);

    // Prevent negative hours
    if (hours < 0) {
      throw new Error('End time must be after start time');
    }

    return Math.round(hours * 4) / 4; // Round to quarter hours
  }


  async generateWeeklyReport(employeeId: string, weekOf: Date) {
    const entries = await this.getTimeEntriesForEmployee(employeeId, weekOf);
    const employee = await this.getEmployee(employeeId);

    if (!employee) {
      throw new Error('Employee not found');
    }

    let totalHours = 0;
    let totalBillable = 0;
    const projectBreakdown: {[key: string]: number} = {};


    for (let entry of entries) {
      const hours = entry.calculateHours();
      totalHours += hours;

      if (entry.billableHours > 0) {
        totalBillable += entry.billableHours;
      }

      if (projectBreakdown[entry.projectId]) {
        projectBreakdown[entry.projectId] += hours;
      } else {
        projectBreakdown[entry.projectId] = hours;
      }
    }


    const report = {
      employeeName: employee.getFullName(),
      week: moment(weekOf).format('YYYY-MM-DD'),
      totalHours: totalHours,
      billableHours: totalBillable,
      projects: projectBreakdown,
      overtime: totalHours > 40 ? totalHours - 40 : 0,
      grossPay: totalBillable * employee.hourlyRate
    };

    // Side effect: caching in business method
    this.cache[`report_${employeeId}_${weekOf.getTime()}`] = report;

    return report;
  }

  // Inconsistent error handling patterns
  async getEmployee(employeeId: string): Promise<Employee | null> {
    try {
      if (!employeeId) {
        throw new Error('Employee ID is required');
      }

      // Check cache first (but cache might be stale)
      const cacheKey = `employee_${employeeId}`;
      if (this.cache[cacheKey]) {
        return this.cache[cacheKey];
      }

      const query = `SELECT * FROM employees WHERE id = ?`;
      const row = await this.db.get(query, [employeeId]);

      if (row) {
        const employee = new Employee(row);
        this.cache[cacheKey] = employee; // Cache without expiration
        return employee;
      }

      return null;
    } catch (e) {
      throw new Error(`Failed to fetch employee ${employeeId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }


  setCurrentUser(employee: Employee) {
    this.currentUser = employee;
    // Clear cache when user changes (inefficient)
    this.cache = {};
  }


  async deleteTimeEntry(entryId: number): Promise<void> {
    const query = `DELETE FROM time_entries WHERE id = ?`;
    await this.db.run(query, [entryId]);

    // Clear all cache
    this.cache = {};
  }
}
