import { TimeEntry } from '../models/TimeEntry';
import { Employee } from '../models/Employee';
import { ITimeEntryRepository } from '../interfaces/ITimeEntryRepository';
import { IEmployeeRepository } from '../interfaces/IEmployeeRepository';
import { IValidator } from '../interfaces/IValidator';

/**
 * Service responsible for timesheet submission logic
 */
export class TimesheetSubmissionService {
  constructor(
    private timeEntryRepository: ITimeEntryRepository,
    private employeeRepository: IEmployeeRepository,
    private timeEntryValidator: IValidator<TimeEntry>
  ) {}

  async submitTimesheet(employeeId: string, weekEndingDate: Date): Promise<boolean> {
    // Fetch employee
    const employee = await this.employeeRepository.findById(employeeId);
    if (!employee) {
      throw new Error(`Employee with ID ${employeeId} not found`);
    }

    // Check if employee can submit
    if (!employee.isActive) {
      throw new Error('Inactive employees cannot submit timesheets');
    }

    // Fetch time entries for the week
    const entries = await this.timeEntryRepository.findByEmployee(employeeId, weekEndingDate);

    if (entries.length === 0) {
      throw new Error('No time entries found for the specified week');
    }

    // Validate all entries
    const invalidEntries: string[] = [];
    for (const entry of entries) {
      const validationResult = this.timeEntryValidator.validate(entry);
      if (!validationResult.isValid) {
        invalidEntries.push(`Entry ${entry.id}: ${validationResult.errors.join(', ')}`);
      }
    }

    if (invalidEntries.length > 0) {
      throw new Error(`Cannot submit timesheet with invalid entries: ${invalidEntries.join('; ')}`);
    }

    // Check for already submitted entries
    const alreadySubmitted = entries.filter(e => e.status === 'submitted');
    if (alreadySubmitted.length === entries.length) {
      throw new Error('All entries have already been submitted');
    }

    // Calculate total hours and check for overtime
    const totalHours = entries.reduce((sum, entry) => sum + entry.calculateHours(), 0);
    if (totalHours > 40) {
      console.warn(`Overtime detected for employee ${employeeId}: ${totalHours - 40} hours`);
    }

    // Submit all entries
    for (const entry of entries) {
      if (entry.status !== 'submitted') {
        entry.status = 'submitted';
        await this.timeEntryRepository.save(entry);
      }
    }

    // Send notification email
    try {
      employee.sendReminderEmail();
    } catch (error) {
      console.error('Failed to send notification email:', error);
      // Don't fail the submission if email fails
    }

    return true;
  }

  async approveTimesheet(employeeId: string, weekEndingDate: Date, approverId: string): Promise<boolean> {
    // Fetch approver
    const approver = await this.employeeRepository.findById(approverId);
    if (!approver) {
      throw new Error(`Approver with ID ${approverId} not found`);
    }

    // Fetch time entries
    const entries = await this.timeEntryRepository.findByEmployee(employeeId, weekEndingDate);

    if (entries.length === 0) {
      throw new Error('No time entries found for the specified week');
    }

    // Check all entries are submitted
    const notSubmitted = entries.filter(e => e.status !== 'submitted');
    if (notSubmitted.length > 0) {
      throw new Error('Cannot approve timesheet with unsubmitted entries');
    }

    // Approve all entries
    for (const entry of entries) {
      entry.status = 'approved';
      await this.timeEntryRepository.save(entry);
    }

    return true;
  }

  async rejectTimesheet(
    employeeId: string,
    weekEndingDate: Date,
    approverId: string,
    reason: string
  ): Promise<boolean> {
    // Fetch approver
    const approver = await this.employeeRepository.findById(approverId);
    if (!approver) {
      throw new Error(`Approver with ID ${approverId} not found`);
    }

    // Fetch time entries
    const entries = await this.timeEntryRepository.findByEmployee(employeeId, weekEndingDate);

    if (entries.length === 0) {
      throw new Error('No time entries found for the specified week');
    }

    // Reject all entries
    for (const entry of entries) {
      entry.status = 'rejected';
      entry.description = `${entry.description}\n[REJECTED: ${reason}]`;
      await this.timeEntryRepository.save(entry);
    }

    return true;
  }
}
