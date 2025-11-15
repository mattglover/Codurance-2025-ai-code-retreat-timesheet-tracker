import { TimeEntry } from '../models/TimeEntry';

export class TimeEntryResponseDTO {
  id: number;
  employeeId: string;
  projectId: string;
  startTime: string; // ISO 8601 format
  endTime: string;   // ISO 8601 format
  description: string;
  billableHours: number;
  status: string;
  createdAt: string;
  lastModified: string;

  constructor(timeEntry: TimeEntry) {
    this.id = timeEntry.id;
    this.employeeId = timeEntry.employeeId;
    this.projectId = timeEntry.projectId;
    this.startTime = timeEntry.startTime.toISOString();
    this.endTime = timeEntry.endTime.toISOString();
    this.description = timeEntry.description;
    this.billableHours = timeEntry.billableHours;
    this.status = timeEntry.status;
    this.createdAt = timeEntry.createdAt.toISOString();
    this.lastModified = timeEntry.lastModified.toISOString();
  }

  static fromTimeEntries(timeEntries: TimeEntry[]): TimeEntryResponseDTO[] {
    return timeEntries.map(te => new TimeEntryResponseDTO(te));
  }
}
