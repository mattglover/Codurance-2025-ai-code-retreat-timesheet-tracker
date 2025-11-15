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

  constructor(data: any) {
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

  public submit(): void {
    if (this.status === 'submitted') {
      throw new Error('Time entry has already been submitted');
    }

    // Validate before submission
    if (!this.isValid()) {
      throw new Error('Cannot submit invalid time entry');
    }

    this.status = 'submitted';
  }
}
