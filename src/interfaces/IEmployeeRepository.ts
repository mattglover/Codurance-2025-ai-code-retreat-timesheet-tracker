import { Employee } from '../models/Employee';

export interface IEmployeeRepository {
  findById(employeeId: string): Promise<Employee | null>;
  findAll(): Promise<Employee[]>;
  save(employee: Employee): Promise<Employee>;
}
