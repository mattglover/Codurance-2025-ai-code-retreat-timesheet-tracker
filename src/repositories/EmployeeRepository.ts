import { Employee } from '../models/Employee';
import { Database } from '../database/Database';

export class EmployeeRepository {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  async findById(employeeId: string): Promise<Employee | null> {
    const query = `SELECT * FROM employees WHERE id = ?`;
    const row = await this.db.get(query, [employeeId]);

    if (row) {
      return new Employee(row);
    }

    return null;
  }

  async findAll(): Promise<Employee[]> {
    const query = `SELECT * FROM employees WHERE is_active = 1`;
    const rows = await this.db.all(query);
    return rows.map((row: any) => new Employee(row));
  }

  async save(employee: Employee): Promise<Employee> {
    // Implementation for saving employee (if needed)
    throw new Error('Not implemented yet');
  }
}
