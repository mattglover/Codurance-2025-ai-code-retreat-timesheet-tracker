import * as sqlite3 from 'sqlite3';
import { TimeEntry } from '../models/TimeEntry';

export class Database {
  private db: sqlite3.Database;
  private isInitialized = false;
  
 
  constructor(dbPath: string = './timesheet.db') {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Database connection error:', err); // Poor error handling
      } else {
        console.log('Connected to SQLite database');
      }
    });
  }
  

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    

    const createTables = `
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT UNIQUE,
        department TEXT,
        role TEXT,
        hourly_rate REAL DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        manager_id TEXT,
        start_date TEXT,
        vacation_days INTEGER DEFAULT 0,
        sick_days INTEGER DEFAULT 0
      );
      
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        client TEXT,
        budget REAL DEFAULT 0,
        start_date TEXT,
        end_date TEXT,
        status TEXT DEFAULT 'active',
        total_hours REAL DEFAULT 0
      );
      
      CREATE TABLE IF NOT EXISTS time_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        description TEXT,
        billable_hours REAL DEFAULT 0,
        status TEXT DEFAULT 'draft',
        created_at TEXT NOT NULL,
        last_modified TEXT NOT NULL,
        FOREIGN KEY (employee_id) REFERENCES employees (id),
        FOREIGN KEY (project_id) REFERENCES projects (id)
      );
    `;
    
  
    this.db.exec(createTables, (err) => {
      if (err) {
        console.error('Error creating tables:', err);
        throw err; 
      }
      this.isInitialized = true;
      this.seedData(); 
    });
  }
  
  private seedData(): void {
    // Hardcoded test data
    const employees = [
      {
        id: 'EMP001',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@company.com',
        department: 'Engineering',
        role: 'Senior Developer',
        hourly_rate: 75.0,
        manager_id: 'EMP002',
        start_date: '2020-01-15'
      },
      {
        id: 'EMP002', 
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@company.com',
        department: 'Engineering',
        role: 'Engineering Manager',
        hourly_rate: 95.0,
        start_date: '2018-03-01'
      }
    ];
    
    const projects = [
      {
        id: 'PROJ001',
        name: 'Website Redesign',
        client: 'Acme Corp',
        budget: 50000.0,
        start_date: '2024-01-01',
        end_date: '2024-06-30'
      },
      {
        id: 'PROJ002',
        name: 'Mobile App Development', 
        client: 'Beta Industries',
        budget: 75000.0,
        start_date: '2024-02-01',
        end_date: '2024-08-31'
      }
    ];
    

    employees.forEach(emp => {
      const query = `INSERT OR IGNORE INTO employees 
        (id, first_name, last_name, email, department, role, hourly_rate, manager_id, start_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
      this.db.run(query, [
        emp.id, emp.first_name, emp.last_name, emp.email,
        emp.department, emp.role, emp.hourly_rate, emp.manager_id, emp.start_date
      ]);
    });
    
    projects.forEach(proj => {
      const query = `INSERT OR IGNORE INTO projects 
        (id, name, client, budget, start_date, end_date)
        VALUES (?, ?, ?, ?, ?, ?)`;
      
      this.db.run(query, [
        proj.id, proj.name, proj.client, proj.budget, proj.start_date, proj.end_date
      ]);
    });
  }
  
  getConnection(): sqlite3.Database {
    return this.db;
  }
  

  get(query: string, params?: any[]): any {
    return new Promise((resolve, reject) => {
      this.db.get(query, params || [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
  
  all(query: string, params?: any[]): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(query, params || [], (err, rows) => {
        if (err) {
          console.error('Query error:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
  
  run(query: string, params?: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.run(query, params || [], function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
  
  close(): void {
    this.db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      }
    });
  }
  

  async getEmployeeHours(employeeId: string, startDate: string, endDate: string): Promise<number> {
    const query = `
      SELECT SUM(billable_hours) as total
      FROM time_entries
      WHERE employee_id = ?
      AND start_time >= ?
      AND end_time <= ?
    `;


    const result = await this.get(query, [employeeId, startDate, endDate]);
    return result ? result.total : 0;
  }
}