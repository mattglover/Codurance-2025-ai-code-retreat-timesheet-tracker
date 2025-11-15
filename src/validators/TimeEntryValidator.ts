import { TimeEntry } from '../models/TimeEntry';
import { IValidator, ValidationResult } from '../interfaces/IValidator';
import * as moment from 'moment';

export class TimeEntryValidator implements IValidator<TimeEntry> {
  validate(timeEntry: TimeEntry): ValidationResult {
    const errors: string[] = [];

    // Validate employee ID
    if (!timeEntry.employeeId || timeEntry.employeeId.trim().length === 0) {
      errors.push('Employee ID is required');
    }

    // Validate project ID
    if (!timeEntry.projectId || timeEntry.projectId.trim().length === 0) {
      errors.push('Project ID is required');
    }

    // Validate dates exist
    if (!timeEntry.startTime) {
      errors.push('Start time is required');
    }

    if (!timeEntry.endTime) {
      errors.push('End time is required');
    }

    // Validate end time is after start time
    if (timeEntry.startTime && timeEntry.endTime) {
      if (timeEntry.endTime <= timeEntry.startTime) {
        errors.push('End time must be after start time');
      }
    }

    // Validate dates are valid
    if (timeEntry.startTime && isNaN(timeEntry.startTime.getTime())) {
      errors.push('Start time is not a valid date');
    }

    if (timeEntry.endTime && isNaN(timeEntry.endTime.getTime())) {
      errors.push('End time is not a valid date');
    }

    // Validate reasonable time range (not more than 24 hours)
    if (timeEntry.startTime && timeEntry.endTime && timeEntry.endTime > timeEntry.startTime) {
      const hours = moment(timeEntry.endTime).diff(moment(timeEntry.startTime), 'hours', true);
      if (hours > 24) {
        errors.push('Time entry cannot exceed 24 hours');
      }
      if (hours < 0) {
        errors.push('Time entry cannot have negative hours');
      }
    }

    // Validate description
    if (timeEntry.description && timeEntry.description.length > 500) {
      errors.push('Description cannot exceed 500 characters');
    }

    // Validate status
    const validStatuses = ['draft', 'submitted', 'approved', 'rejected'];
    if (timeEntry.status && !validStatuses.includes(timeEntry.status)) {
      errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
    }

    // Validate billable hours
    if (timeEntry.billableHours < 0) {
      errors.push('Billable hours cannot be negative');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
}
