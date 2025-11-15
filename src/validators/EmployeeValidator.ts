import { Employee } from '../models/Employee';
import { IValidator, ValidationResult } from '../interfaces/IValidator';

export class EmployeeValidator implements IValidator<Employee> {
  validate(employee: Employee): ValidationResult {
    const errors: string[] = [];

    // Validate ID
    if (!employee.id || employee.id.trim().length === 0) {
      errors.push('Employee ID is required');
    }

    // Validate first name
    if (!employee.firstName || employee.firstName.trim().length === 0) {
      errors.push('First name is required');
    }

    // Validate last name
    if (!employee.lastName || employee.lastName.trim().length === 0) {
      errors.push('Last name is required');
    }

    // Validate email format
    if (!employee.email || employee.email.trim().length === 0) {
      errors.push('Email is required');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(employee.email)) {
        errors.push('Email must be a valid email address');
      }
    }

    // Validate department
    if (!employee.department || employee.department.trim().length === 0) {
      errors.push('Department is required');
    }

    // Validate role
    if (!employee.role || employee.role.trim().length === 0) {
      errors.push('Role is required');
    }

    // Validate hourly rate
    if (employee.hourlyRate < 0) {
      errors.push('Hourly rate cannot be negative');
    }

    if (employee.hourlyRate > 1000) {
      errors.push('Hourly rate seems unreasonably high (> $1000/hour)');
    }

    // Validate start date
    if (!employee.startDate) {
      errors.push('Start date is required');
    } else if (isNaN(employee.startDate.getTime())) {
      errors.push('Start date is not a valid date');
    }

    // Validate vacation days
    if (employee.vacationDays < 0) {
      errors.push('Vacation days cannot be negative');
    }

    // Validate sick days
    if (employee.sickDays < 0) {
      errors.push('Sick days cannot be negative');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
}
