import { TimeEntry } from '../models/TimeEntry';

export interface ITimeEntryRepository {
  save(timeEntry: TimeEntry): Promise<TimeEntry>;
  findById(id: number): Promise<TimeEntry | null>;
  findByEmployee(employeeId: string, weekOf?: Date): Promise<TimeEntry[]>;
  delete(id: number): Promise<void>;
}
