import { TimeEntry } from '../models/TimeEntry';
import { Database } from '../database/Database';
import { ITimeEntryRepository } from '../interfaces/ITimeEntryRepository';

export class TimeEntryRepository implements ITimeEntryRepository {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  async save(timeEntry: TimeEntry): Promise<TimeEntry> {
    timeEntry.lastModified = new Date();

    if (timeEntry.id === 0) {
      // Insert new entry
      const query = `
        INSERT INTO time_entries
        (employee_id, project_id, start_time, end_time, description, billable_hours, status, created_at, last_modified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const result = await this.db.run(query, [
        timeEntry.employeeId,
        timeEntry.projectId,
        timeEntry.startTime.toISOString(),
        timeEntry.endTime.toISOString(),
        timeEntry.description,
        timeEntry.billableHours,
        timeEntry.status,
        timeEntry.createdAt.toISOString(),
        timeEntry.lastModified.toISOString()
      ]);

      timeEntry.id = result.lastID;
    } else {
      // Update existing entry
      const query = `
        UPDATE time_entries
        SET employee_id = ?, project_id = ?, start_time = ?, end_time = ?,
            description = ?, billable_hours = ?, status = ?, last_modified = ?
        WHERE id = ?
      `;

      await this.db.run(query, [
        timeEntry.employeeId,
        timeEntry.projectId,
        timeEntry.startTime.toISOString(),
        timeEntry.endTime.toISOString(),
        timeEntry.description,
        timeEntry.billableHours,
        timeEntry.status,
        timeEntry.lastModified.toISOString(),
        timeEntry.id
      ]);
    }

    return timeEntry;
  }

  async findById(id: number): Promise<TimeEntry | null> {
    const query = `SELECT * FROM time_entries WHERE id = ?`;
    const row = await this.db.get(query, [id]);

    if (row) {
      return new TimeEntry(row);
    }

    return null;
  }

  async findByEmployee(employeeId: string, weekOf?: Date): Promise<TimeEntry[]> {
    let query = `SELECT * FROM time_entries WHERE employee_id = ?`;
    let params: any[] = [employeeId];

    if (weekOf) {
      const moment = require('moment');
      const startOfWeek = moment(weekOf).startOf('week').format('YYYY-MM-DD');
      const endOfWeek = moment(weekOf).endOf('week').format('YYYY-MM-DD');
      query += ` AND start_time BETWEEN ? AND ?`;
      params.push(startOfWeek, endOfWeek);
    }

    const rows = await this.db.all(query, params);
    return rows.map((row: any) => new TimeEntry(row));
  }

  async delete(id: number): Promise<void> {
    const query = `DELETE FROM time_entries WHERE id = ?`;
    await this.db.run(query, [id]);
  }
}
