import { Employee } from '../models/Employee';
import { ITimeEntryRepository } from '../interfaces/ITimeEntryRepository';
import { IEmployeeRepository } from '../interfaces/IEmployeeRepository';
import { TimesheetSummaryDTO } from '../dtos/TimesheetSummaryDTO';
import * as moment from 'moment';

/**
 * Service responsible for timesheet reporting and analytics
 */
export class TimesheetReportingService {
  constructor(
    private timeEntryRepository: ITimeEntryRepository,
    private employeeRepository: IEmployeeRepository
  ) {}

  async generateWeeklyReport(employeeId: string, weekOf: Date): Promise<any> {
    const employee = await this.employeeRepository.findById(employeeId);
    if (!employee) {
      throw new Error(`Employee with ID ${employeeId} not found`);
    }

    const entries = await this.timeEntryRepository.findByEmployee(employeeId, weekOf);

    let totalHours = 0;
    let totalBillable = 0;
    const projectBreakdown: { [key: string]: number } = {};

    for (const entry of entries) {
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

    return {
      employeeName: employee.getFullName(),
      week: moment(weekOf).format('YYYY-MM-DD'),
      totalHours: totalHours,
      billableHours: totalBillable,
      projects: projectBreakdown,
      overtime: totalHours > 40 ? totalHours - 40 : 0,
      grossPay: totalBillable * employee.hourlyRate
    };
  }

  async generateTimesheetSummary(employeeId: string, weekOf: Date): Promise<TimesheetSummaryDTO> {
    const employee = await this.employeeRepository.findById(employeeId);
    if (!employee) {
      throw new Error(`Employee with ID ${employeeId} not found`);
    }

    const entries = await this.timeEntryRepository.findByEmployee(employeeId, weekOf);

    let totalHours = 0;
    let totalBillableHours = 0;

    for (const entry of entries) {
      totalHours += entry.calculateHours();
      totalBillableHours += entry.billableHours;
    }

    // Determine overall status
    let status = 'draft';
    if (entries.length > 0) {
      const allSubmitted = entries.every(e => e.status === 'submitted' || e.status === 'approved');
      const anyApproved = entries.some(e => e.status === 'approved');
      const anyRejected = entries.some(e => e.status === 'rejected');

      if (anyRejected) {
        status = 'rejected';
      } else if (anyApproved) {
        status = 'approved';
      } else if (allSubmitted) {
        status = 'submitted';
      }
    }

    return new TimesheetSummaryDTO({
      employeeId: employeeId,
      employeeName: employee.getFullName(),
      weekOf: weekOf,
      totalHours: totalHours,
      totalBillableHours: totalBillableHours,
      entriesCount: entries.length,
      status: status
    });
  }

  async generateDepartmentReport(department: string, weekOf: Date): Promise<any[]> {
    const employees = await this.employeeRepository.findAll();
    const departmentEmployees = employees.filter(e => e.department === department);

    const reports = [];
    for (const employee of departmentEmployees) {
      const summary = await this.generateTimesheetSummary(employee.id, weekOf);
      reports.push(summary);
    }

    return reports;
  }

  async generatePayrollReport(employeeId: string, startDate: Date, endDate: Date): Promise<any> {
    const employee = await this.employeeRepository.findById(employeeId);
    if (!employee) {
      throw new Error(`Employee with ID ${employeeId} not found`);
    }

    // Get all approved entries within date range
    const allEntries = await this.timeEntryRepository.findByEmployee(employeeId);
    const approvedEntries = allEntries.filter(entry => {
      return entry.status === 'approved' &&
        entry.startTime >= startDate &&
        entry.endTime <= endDate;
    });

    const totalHours = approvedEntries.reduce((sum, entry) => entry.calculateHours() + sum, 0);
    const grossPay = totalHours * employee.hourlyRate;

    // Simple tax calculation (this should be more sophisticated in real system)
    const taxRate = 0.25;
    const netPay = grossPay * (1 - taxRate);

    return {
      employeeId: employee.id,
      employeeName: employee.getFullName(),
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      totalHours: totalHours,
      hourlyRate: employee.hourlyRate,
      grossPay: grossPay,
      taxAmount: grossPay * taxRate,
      netPay: netPay
    };
  }
}
