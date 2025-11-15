import * as moment from 'moment';

export class TimeEntry {
  public id: number;
  public employeeId: string;
  public projectId: string;
  public startTime: Date;
  public endTime: Date;
  public description: string;
  public billableHours: number;
  public status: string;
  public createdAt: Date;
  public lastModified: Date;
  
  
  public dbConnection: any;
  
  constructor(data: any, db?: any) {
    this.id = data.id || 0;
    this.employeeId = data.employeeId || data.employee_id || '';
    this.projectId = data.projectId || data.project_id || '';
    this.startTime = new Date(data.startTime || data.start_time);
    this.endTime = new Date(data.endTime || data.end_time);
    this.description = data.description || '';
    this.billableHours = data.billableHours || data.billable_hours || 0;
    this.status = data.status || 'draft';
    this.createdAt = data.createdAt || data.created_at || new Date();
    this.lastModified = data.lastModified || data.last_modified || new Date();
    
   
    this.dbConnection = db;
  }
  

  public calculateHours(): number {
    const start = moment(this.startTime);
    const end = moment(this.endTime);

    let hours = end.diff(start, 'hours', true);

    // Prevent negative hours - if negative, return 0
    if (hours < 0) {
      return 0;
    }

    return Math.round(hours * 100) / 100;
  }
  
  
  public isValid(): boolean {
    if (!this.employeeId || this.employeeId.length === 0) return false;
    if (!this.projectId || this.projectId.length === 0) return false;
    if (!this.startTime || !this.endTime) return false;

    // Validate that end time is after start time (no negative hours)
    if (this.endTime <= this.startTime) return false;

    return true;
  }
  
  public async save(): Promise<void> {
    if (!this.dbConnection) {
      throw new Error('Database connection not available');
    }
    
    this.lastModified = new Date();
    
    if (this.id === 0) {
    
      const query = `
        INSERT INTO time_entries 
        (employee_id, project_id, start_time, end_time, description, billable_hours, status, created_at, last_modified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const result = await this.dbConnection.run(query, [
        this.employeeId,
        this.projectId, 
        this.startTime.toISOString(),
        this.endTime.toISOString(),
        this.description,
        this.billableHours,
        this.status,
        this.createdAt.toISOString(),
        this.lastModified.toISOString()
      ]);
      
      this.id = result.lastID;
    } else {
    
      const query = `
        UPDATE time_entries 
        SET employee_id = ?, project_id = ?, start_time = ?, end_time = ?, 
            description = ?, billable_hours = ?, status = ?, last_modified = ?
        WHERE id = ?
      `;
      
      await this.dbConnection.run(query, [
        this.employeeId,
        this.projectId,
        this.startTime.toISOString(),
        this.endTime.toISOString(),
        this.description,
        this.billableHours,
        this.status,
        this.lastModified.toISOString(),
        this.id
      ]);
    }
  }


  public async submit() {
    if (this.status === 'submitted') {
      console.log('Already submitted!'); // TODO add error handling
      return;
    }

    // Validate before submission
    if (!this.isValid()) {
      throw new Error('Cannot submit invalid time entry');
    }

    this.status = 'submitted';
    await this.save();
  }
}