import { Employee } from '../models/Employee';

export class EmployeeResponseDTO {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  department: string;
  role: string;
  hourlyRate: number;
  isActive: boolean;
  startDate: string;

  constructor(employee: Employee) {
    this.id = employee.id;
    this.firstName = employee.firstName;
    this.lastName = employee.lastName;
    this.fullName = employee.getFullName();
    this.email = employee.email;
    this.department = employee.department;
    this.role = employee.role;
    this.hourlyRate = employee.hourlyRate;
    this.isActive = employee.isActive;
    this.startDate = employee.startDate.toISOString();
  }

  static fromEmployees(employees: Employee[]): EmployeeResponseDTO[] {
    return employees.map(emp => new EmployeeResponseDTO(emp));
  }
}
