// Unit tests for TimeEntry model
const moment = require('moment');

// Mock the TimeEntry class
class TimeEntry {
  constructor(data, db) {
    this.id = data.id || 0;
    this.employeeId = data.employeeId || data.employee_id || '';
    this.projectId = data.projectId || data.project_id || '';
    this.startTime = new Date(data.startTime || data.start_time);
    this.endTime = new Date(data.endTime || data.end_time);
    this.description = data.description || '';
    this.billableHours = data.billableHours || data.billable_hours || 0;
    this.status = data.status || 'draft';
    this.createdAt = data.createdAt || data.created_at || new Date();
    this.lastModified = data.lastModified || data.last_modified || new Date();
    this.dbConnection = db;
  }

  calculateHours() {
    const start = moment(this.startTime);
    const end = moment(this.endTime);
    let hours = end.diff(start, 'hours', true);

    // Prevent negative hours - if negative, return 0
    if (hours < 0) {
      return 0;
    }

    return Math.round(hours * 100) / 100;
  }

  isValid() {
    if (!this.employeeId || this.employeeId.length === 0) return false;
    if (!this.projectId || this.projectId.length === 0) return false;
    if (!this.startTime || !this.endTime) return false;

    // Validate that end time is after start time (no negative hours)
    if (this.endTime <= this.startTime) return false;

    return true;
  }

  async save() {
    if (!this.dbConnection) {
      throw new Error('Database connection not available');
    }

    this.lastModified = new Date();

    if (this.id === 0) {
      const query = `
        INSERT INTO time_entries
        (employee_id, project_id, start_time, end_time, description, billable_hours, status, created_at, last_modified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const result = await this.dbConnection.run(query, [
        this.employeeId,
        this.projectId,
        this.startTime.toISOString(),
        this.endTime.toISOString(),
        this.description,
        this.billableHours,
        this.status,
        this.createdAt.toISOString(),
        this.lastModified.toISOString()
      ]);

      this.id = result.lastID;
    } else {
      const query = `
        UPDATE time_entries
        SET employee_id = ?, project_id = ?, start_time = ?, end_time = ?,
            description = ?, billable_hours = ?, status = ?, last_modified = ?
        WHERE id = ?
      `;

      await this.dbConnection.run(query, [
        this.employeeId,
        this.projectId,
        this.startTime.toISOString(),
        this.endTime.toISOString(),
        this.description,
        this.billableHours,
        this.status,
        this.lastModified.toISOString(),
        this.id
      ]);
    }
  }

  async submit() {
    if (this.status === 'submitted') {
      throw new Error('Time entry has already been submitted');
    }

    if (!this.isValid()) {
      throw new Error('Cannot submit invalid time entry');
    }

    this.status = 'submitted';
    await this.save();
  }
}

describe('TimeEntry Model', () => {
  describe('constructor', () => {
    test('should create a time entry with all fields', () => {
      const data = {
        id: 1,
        employeeId: 'EMP001',
        projectId: 'PROJ001',
        startTime: '2024-01-01T09:00:00Z',
        endTime: '2024-01-01T17:00:00Z',
        description: 'Working on feature',
        billableHours: 8,
        status: 'draft'
      };

      const entry = new TimeEntry(data);

      expect(entry.id).toBe(1);
      expect(entry.employeeId).toBe('EMP001');
      expect(entry.projectId).toBe('PROJ001');
      expect(entry.description).toBe('Working on feature');
      expect(entry.billableHours).toBe(8);
      expect(entry.status).toBe('draft');
    });

    test('should handle snake_case field names from database', () => {
      const data = {
        employee_id: 'EMP002',
        project_id: 'PROJ002',
        start_time: '2024-01-01T09:00:00Z',
        end_time: '2024-01-01T17:00:00Z',
        billable_hours: 5
      };

      const entry = new TimeEntry(data);

      expect(entry.employeeId).toBe('EMP002');
      expect(entry.projectId).toBe('PROJ002');
      expect(entry.billableHours).toBe(5);
    });

    test('should use default values when fields are missing', () => {
      const data = {
        startTime: '2024-01-01T09:00:00Z',
        endTime: '2024-01-01T17:00:00Z'
      };

      const entry = new TimeEntry(data);

      expect(entry.id).toBe(0);
      expect(entry.employeeId).toBe('');
      expect(entry.projectId).toBe('');
      expect(entry.status).toBe('draft');
      expect(entry.billableHours).toBe(0);
    });
  });

  describe('calculateHours', () => {
    test('should calculate hours correctly for same day', () => {
      const entry = new TimeEntry({
        startTime: '2024-01-01T09:00:00Z',
        endTime: '2024-01-01T17:00:00Z'
      });

      expect(entry.calculateHours()).toBe(8);
    });

    test('should calculate partial hours correctly', () => {
      const entry = new TimeEntry({
        startTime: '2024-01-01T09:00:00Z',
        endTime: '2024-01-01T12:30:00Z'
      });

      expect(entry.calculateHours()).toBe(3.5);
    });

    test('should return 0 for negative hours (end before start)', () => {
      const entry = new TimeEntry({
        startTime: '2024-01-01T17:00:00Z',
        endTime: '2024-01-01T09:00:00Z'
      });

      expect(entry.calculateHours()).toBe(0);
    });

    test('should handle overnight shifts correctly', () => {
      const entry = new TimeEntry({
        startTime: '2024-01-01T22:00:00Z',
        endTime: '2024-01-02T06:00:00Z'
      });

      expect(entry.calculateHours()).toBe(8);
    });

    test('should return 0 when start equals end', () => {
      const entry = new TimeEntry({
        startTime: '2024-01-01T09:00:00Z',
        endTime: '2024-01-01T09:00:00Z'
      });

      expect(entry.calculateHours()).toBe(0);
    });
  });

  describe('isValid', () => {
    test('should return true for valid entry', () => {
      const entry = new TimeEntry({
        employeeId: 'EMP001',
        projectId: 'PROJ001',
        startTime: '2024-01-01T09:00:00Z',
        endTime: '2024-01-01T17:00:00Z'
      });

      expect(entry.isValid()).toBe(true);
    });

    test('should return false when employeeId is missing', () => {
      const entry = new TimeEntry({
        projectId: 'PROJ001',
        startTime: '2024-01-01T09:00:00Z',
        endTime: '2024-01-01T17:00:00Z'
      });

      expect(entry.isValid()).toBe(false);
    });

    test('should return false when projectId is missing', () => {
      const entry = new TimeEntry({
        employeeId: 'EMP001',
        startTime: '2024-01-01T09:00:00Z',
        endTime: '2024-01-01T17:00:00Z'
      });

      expect(entry.isValid()).toBe(false);
    });

    test('should return false when endTime is before startTime', () => {
      const entry = new TimeEntry({
        employeeId: 'EMP001',
        projectId: 'PROJ001',
        startTime: '2024-01-01T17:00:00Z',
        endTime: '2024-01-01T09:00:00Z'
      });

      expect(entry.isValid()).toBe(false);
    });

    test('should return false when endTime equals startTime', () => {
      const entry = new TimeEntry({
        employeeId: 'EMP001',
        projectId: 'PROJ001',
        startTime: '2024-01-01T09:00:00Z',
        endTime: '2024-01-01T09:00:00Z'
      });

      expect(entry.isValid()).toBe(false);
    });
  });

  describe('save', () => {
    test('should throw error when database connection is missing', async () => {
      const entry = new TimeEntry({
        employeeId: 'EMP001',
        projectId: 'PROJ001',
        startTime: '2024-01-01T09:00:00Z',
        endTime: '2024-01-01T17:00:00Z'
      });

      await expect(entry.save()).rejects.toThrow('Database connection not available');
    });

    test('should insert new entry when id is 0', async () => {
      const mockDb = {
        run: jest.fn().mockResolvedValue({ lastID: 123 })
      };

      const entry = new TimeEntry({
        employeeId: 'EMP001',
        projectId: 'PROJ001',
        startTime: '2024-01-01T09:00:00Z',
        endTime: '2024-01-01T17:00:00Z',
        description: 'Test work'
      }, mockDb);

      await entry.save();

      expect(mockDb.run).toHaveBeenCalled();
      expect(entry.id).toBe(123);
      const callArgs = mockDb.run.mock.calls[0];
      expect(callArgs[0]).toContain('INSERT INTO time_entries');
    });

    test('should update existing entry when id is not 0', async () => {
      const mockDb = {
        run: jest.fn().mockResolvedValue({})
      };

      const entry = new TimeEntry({
        id: 456,
        employeeId: 'EMP001',
        projectId: 'PROJ001',
        startTime: '2024-01-01T09:00:00Z',
        endTime: '2024-01-01T17:00:00Z'
      }, mockDb);

      await entry.save();

      expect(mockDb.run).toHaveBeenCalled();
      const callArgs = mockDb.run.mock.calls[0];
      expect(callArgs[0]).toContain('UPDATE time_entries');
      expect(callArgs[1]).toContain(456);
    });
  });

  describe('submit', () => {
    test('should throw error when already submitted', async () => {
      const entry = new TimeEntry({
        employeeId: 'EMP001',
        projectId: 'PROJ001',
        startTime: '2024-01-01T09:00:00Z',
        endTime: '2024-01-01T17:00:00Z',
        status: 'submitted'
      });

      await expect(entry.submit()).rejects.toThrow('Time entry has already been submitted');
    });

    test('should throw error when entry is invalid', async () => {
      const mockDb = {
        run: jest.fn()
      };

      const entry = new TimeEntry({
        employeeId: 'EMP001',
        // Missing projectId - invalid!
        startTime: '2024-01-01T09:00:00Z',
        endTime: '2024-01-01T17:00:00Z'
      }, mockDb);

      await expect(entry.submit()).rejects.toThrow('Cannot submit invalid time entry');
    });

    test('should change status to submitted and save', async () => {
      const mockDb = {
        run: jest.fn().mockResolvedValue({ lastID: 1 })
      };

      const entry = new TimeEntry({
        employeeId: 'EMP001',
        projectId: 'PROJ001',
        startTime: '2024-01-01T09:00:00Z',
        endTime: '2024-01-01T17:00:00Z',
        status: 'draft'
      }, mockDb);

      await entry.submit();

      expect(entry.status).toBe('submitted');
      expect(mockDb.run).toHaveBeenCalled();
    });
  });
});
