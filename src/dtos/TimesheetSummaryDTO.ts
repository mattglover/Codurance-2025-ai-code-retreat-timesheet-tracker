export class TimesheetSummaryDTO {
  employeeId: string;
  employeeName: string;
  weekOf: string; // ISO 8601 format
  totalHours: number;
  totalBillableHours: number;
  entriesCount: number;
  status: string;

  constructor(data: {
    employeeId: string;
    employeeName: string;
    weekOf: Date;
    totalHours: number;
    totalBillableHours: number;
    entriesCount: number;
    status: string;
  }) {
    this.employeeId = data.employeeId;
    this.employeeName = data.employeeName;
    this.weekOf = data.weekOf.toISOString();
    this.totalHours = data.totalHours;
    this.totalBillableHours = data.totalBillableHours;
    this.entriesCount = data.entriesCount;
    this.status = data.status;
  }
}
