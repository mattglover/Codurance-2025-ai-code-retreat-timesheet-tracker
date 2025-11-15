export class UpdateTimeEntryDTO {
  id: number;
  employeeId?: string;
  projectId?: string;
  startTime?: string; // ISO 8601 format
  endTime?: string;   // ISO 8601 format
  description?: string;
  billableHours?: number;
  status?: string;

  constructor(data: any) {
    this.id = data.id;
    this.employeeId = data.employeeId;
    this.projectId = data.projectId;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.description = data.description;
    this.billableHours = data.billableHours;
    this.status = data.status;
  }
}
