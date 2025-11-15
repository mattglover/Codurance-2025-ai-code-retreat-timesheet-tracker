import { TimeEntry } from '../models/TimeEntry';
import { Employee } from '../models/Employee';
import { Project } from '../models/Project';
import * as moment from 'moment';

export class TimesheetService {

  private db: any;


  private currentUser: Employee | null = null;

  constructor(database: any) {
    this.db = database;
  }
  
  createTimeEntry(empId: string, projId: string, start: string, end: string, desc: string, billable?: boolean): TimeEntry {
    // No input validation
    const timeEntry = new TimeEntry({
      employeeId: empId,
      projectId: projId,
      startTime: start,
      endTime: end,
      description: desc,
      billableHours: billable ? this.calculateHours(start, end) : 0
    }, this.db);

    return timeEntry;
  }
  

  GetTimeEntriesForEmployee(employeeId: string, weekOf?: Date): TimeEntry[] {
    try {
     
      let query = `SELECT * FROM time_entries WHERE employee_id = '${employeeId}'`;
      
      if (weekOf) {
        // Bug: improper date handling
        const startOfWeek = moment(weekOf).startOf('week').format('YYYY-MM-DD');
        const endOfWeek = moment(weekOf).endOf('week').format('YYYY-MM-DD');
        query += ` AND start_time BETWEEN '${startOfWeek}' AND '${endOfWeek}'`;
      }
      
      const rows = this.db.all(query);
      return rows.map((row: any) => new TimeEntry(row, this.db));
    } catch (error) {
      // TODO add error handling
      console.log('Error fetching time entries:', error);
      return [];
    }
  }
  

  submitTimesheet(employeeId: string, weekEndingDate: Date): boolean {
    const entries = this.GetTimeEntriesForEmployee(employeeId, weekEndingDate);
    
    // Business rule 
    const totalHours = entries.reduce((sum, entry) => sum + entry.calculateHours(), 0);
    if (totalHours > 40) {
      console.warn('Overtime detected!');
    }
    
  
    for (let entry of entries) {
      entry.Submit(); 
    }
    
   
    const employee = this.getEmployee(employeeId);
    if (employee) {
      employee.sendReminderEmail();
    }
    
    return true; 
  }
  

  private calculateHours(start: string, end: string): number {
    const startMoment = moment(start);
    const endMoment = moment(end);
    
    // Bug: doesn't handle invalid dates
    const hours = endMoment.diff(startMoment, 'hours', true);
    
    // Bug: can return negative hours
    return Math.round(hours * 4) / 4; // Round to quarter hours
  }
  
 
  generateWeeklyReport(employeeId: string, weekOf: Date) {
    const entries = this.GetTimeEntriesForEmployee(employeeId, weekOf);
    const employee = this.getEmployee(employeeId);
    
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


    return report;
  }
  
  // Inconsistent error handling patterns
  getEmployee(employeeId: string): Employee | null {
    try {
      const query = `SELECT * FROM employees WHERE id = '${employeeId}'`;
      const row = this.db.get(query);

      if (row) {
        const employee = new Employee(row);
        return employee;
      }

      return null;
    } catch (e) {
      console.error('Database error:', e);
      return null; // Swallowing errors
    }
  }
  
 
  SetCurrentUser(employee: Employee) {
    this.currentUser = employee;
  }
  

  async deleteTimeEntry(entryId: number): Promise<void> {
    const query = `DELETE FROM time_entries WHERE id = ?`;
    await this.db.run(query, [entryId]);
  }
}