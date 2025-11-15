// Unit tests for TimesheetService
const moment = require('moment');

// Mock TimesheetService
class TimesheetService {
  constructor(database) {
    this.db = database;
    this.currentUser = null;
  }

  createTimeEntry(empId, projId, start, end, desc, billable) {
    if (!empId) throw new Error('Employee ID is required');
    if (!projId) throw new Error('Project ID is required');
    if (!start) throw new Error('Start time is required');
    if (!end) throw new Error('End time is required');

    // Mock TimeEntry for testing
    const timeEntry = {
      employeeId: empId,
      projectId: projId,
      startTime: new Date(start),
      endTime: new Date(end),
      description: desc,
      billableHours: billable ? this.calculateHours(start, end) : 0,
      isValid: function() {
        return this.endTime > this.startTime && this.employeeId && this.projectId;
      }
    };

    if (!timeEntry.isValid()) {
      throw new Error('Invalid time entry: end time must be after start time');
    }

    return timeEntry;
  }

  calculateHours(start, end) {
    const startMoment = moment(start);
    const endMoment = moment(end);

    if (!startMoment.isValid() || !endMoment.isValid()) {
      throw new Error('Invalid date provided');
    }

    const hours = endMoment.diff(startMoment, 'hours', true);

    if (hours < 0) {
      throw new Error('End time must be after start time');
    }

    return Math.round(hours * 4) / 4;
  }

  async getTimeEntriesForEmployee(employeeId, weekOf) {
    try {
      if (!employeeId) {
        throw new Error('Employee ID is required');
      }

      let query = `SELECT * FROM time_entries WHERE employee_id = ?`;
      let params = [employeeId];

      if (weekOf) {
        const startOfWeek = moment(weekOf).startOf('week').format('YYYY-MM-DD');
        const endOfWeek = moment(weekOf).endOf('week').format('YYYY-MM-DD');
        query += ` AND start_time BETWEEN ? AND ?`;
        params.push(startOfWeek, endOfWeek);
      }

      const rows = await this.db.all(query, params);
      return rows;
    } catch (error) {
      throw new Error(`Failed to fetch time entries for employee ${employeeId}: ${error.message}`);
    }
  }

  async getEmployee(employeeId) {
    try {
      if (!employeeId) {
        throw new Error('Employee ID is required');
      }

      const query = `SELECT * FROM employees WHERE id = ?`;
      const row = await this.db.get(query, [employeeId]);

      if (row) {
        return row;
      }

      return null;
    } catch (e) {
      throw new Error(`Failed to fetch employee ${employeeId}: ${e.message}`);
    }
  }

  setCurrentUser(employee) {
    this.currentUser = employee;
  }

  async deleteTimeEntry(entryId) {
    const query = `DELETE FROM time_entries WHERE id = ?`;
    await this.db.run(query, [entryId]);
  }
}

describe('TimesheetService', () => {
  let service;
  let mockDb;

  beforeEach(() => {
    mockDb = {
      all: jest.fn(),
      get: jest.fn(),
      run: jest.fn()
    };
    service = new TimesheetService(mockDb);
  });

  describe('createTimeEntry', () => {
    test('should create valid time entry', () => {
      const entry = service.createTimeEntry(
        'EMP001',
        'PROJ001',
        '2024-01-01T09:00:00Z',
        '2024-01-01T17:00:00Z',
        'Working on feature',
        true
      );

      expect(entry.employeeId).toBe('EMP001');
      expect(entry.projectId).toBe('PROJ001');
      expect(entry.description).toBe('Working on feature');
      expect(entry.billableHours).toBe(8);
    });

    test('should throw error when employeeId is missing', () => {
      expect(() => {
        service.createTimeEntry(
          '',
          'PROJ001',
          '2024-01-01T09:00:00Z',
          '2024-01-01T17:00:00Z',
          'Work'
        );
      }).toThrow('Employee ID is required');
    });

    test('should throw error when projectId is missing', () => {
      expect(() => {
        service.createTimeEntry(
          'EMP001',
          '',
          '2024-01-01T09:00:00Z',
          '2024-01-01T17:00:00Z',
          'Work'
        );
      }).toThrow('Project ID is required');
    });

    test('should throw error when start time is missing', () => {
      expect(() => {
        service.createTimeEntry(
          'EMP001',
          'PROJ001',
          '',
          '2024-01-01T17:00:00Z',
          'Work'
        );
      }).toThrow('Start time is required');
    });

    test('should throw error when end time is missing', () => {
      expect(() => {
        service.createTimeEntry(
          'EMP001',
          'PROJ001',
          '2024-01-01T09:00:00Z',
          '',
          'Work'
        );
      }).toThrow('End time is required');
    });

    test('should throw error when end time is before start time', () => {
      expect(() => {
        service.createTimeEntry(
          'EMP001',
          'PROJ001',
          '2024-01-01T17:00:00Z',
          '2024-01-01T09:00:00Z',
          'Work',
          true
        );
      }).toThrow('End time must be after start time');
    });

    test('should set billableHours to 0 when billable is false', () => {
      const entry = service.createTimeEntry(
        'EMP001',
        'PROJ001',
        '2024-01-01T09:00:00Z',
        '2024-01-01T17:00:00Z',
        'Work',
        false
      );

      expect(entry.billableHours).toBe(0);
    });
  });

  describe('calculateHours', () => {
    test('should calculate 8 hours correctly', () => {
      const hours = service.calculateHours(
        '2024-01-01T09:00:00Z',
        '2024-01-01T17:00:00Z'
      );

      expect(hours).toBe(8);
    });

    test('should round to quarter hours', () => {
      const hours = service.calculateHours(
        '2024-01-01T09:00:00Z',
        '2024-01-01T09:20:00Z'
      );

      // 20 minutes = 0.333... hours, rounded to quarter = 0.25
      expect(hours).toBe(0.25);
    });

    test('should throw error for invalid start date', () => {
      expect(() => {
        service.calculateHours('invalid-date', '2024-01-01T17:00:00Z');
      }).toThrow('Invalid date provided');
    });

    test('should throw error for invalid end date', () => {
      expect(() => {
        service.calculateHours('2024-01-01T09:00:00Z', 'invalid-date');
      }).toThrow('Invalid date provided');
    });

    test('should throw error for negative hours', () => {
      expect(() => {
        service.calculateHours(
          '2024-01-01T17:00:00Z',
          '2024-01-01T09:00:00Z'
        );
      }).toThrow('End time must be after start time');
    });
  });

  describe('getTimeEntriesForEmployee', () => {
    test('should fetch entries for employee without week filter', async () => {
      const mockEntries = [
        { id: 1, employee_id: 'EMP001' },
        { id: 2, employee_id: 'EMP001' }
      ];

      mockDb.all.mockResolvedValue(mockEntries);

      const entries = await service.getTimeEntriesForEmployee('EMP001');

      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM time_entries WHERE employee_id = ?',
        ['EMP001']
      );
      expect(entries).toEqual(mockEntries);
    });

    test('should fetch entries with week filter', async () => {
      const mockEntries = [{ id: 1, employee_id: 'EMP001' }];
      mockDb.all.mockResolvedValue(mockEntries);

      const weekOf = new Date('2024-01-03'); // A Wednesday

      await service.getTimeEntriesForEmployee('EMP001', weekOf);

      expect(mockDb.all).toHaveBeenCalled();
      const callArgs = mockDb.all.mock.calls[0];
      expect(callArgs[0]).toContain('BETWEEN');
      expect(callArgs[1]).toHaveLength(3); // employeeId + startOfWeek + endOfWeek
    });

    test('should throw error when employeeId is missing', async () => {
      await expect(service.getTimeEntriesForEmployee('')).rejects.toThrow(
        'Employee ID is required'
      );
    });

    test('should throw descriptive error on database failure', async () => {
      mockDb.all.mockRejectedValue(new Error('Database error'));

      await expect(service.getTimeEntriesForEmployee('EMP001')).rejects.toThrow(
        'Failed to fetch time entries for employee EMP001'
      );
    });
  });

  describe('getEmployee', () => {
    test('should fetch employee by id', async () => {
      const mockEmployee = { id: 'EMP001', name: 'John Doe' };
      mockDb.get.mockResolvedValue(mockEmployee);

      const employee = await service.getEmployee('EMP001');

      expect(mockDb.get).toHaveBeenCalledWith(
        'SELECT * FROM employees WHERE id = ?',
        ['EMP001']
      );
      expect(employee).toEqual(mockEmployee);
    });

    test('should return null when employee not found', async () => {
      mockDb.get.mockResolvedValue(null);

      const employee = await service.getEmployee('NONEXISTENT');

      expect(employee).toBeNull();
    });

    test('should throw error when employeeId is missing', async () => {
      await expect(service.getEmployee('')).rejects.toThrow(
        'Employee ID is required'
      );
    });

    test('should throw descriptive error on database failure', async () => {
      mockDb.get.mockRejectedValue(new Error('Connection timeout'));

      await expect(service.getEmployee('EMP001')).rejects.toThrow(
        'Failed to fetch employee EMP001'
      );
    });
  });

  describe('setCurrentUser', () => {
    test('should set current user', () => {
      const user = { id: 'EMP001', name: 'John' };

      service.setCurrentUser(user);

      expect(service.currentUser).toEqual(user);
    });

    test('should allow null user', () => {
      service.setCurrentUser({ id: 'EMP001' });
      service.setCurrentUser(null);

      expect(service.currentUser).toBeNull();
    });
  });

  describe('deleteTimeEntry', () => {
    test('should delete time entry by id', async () => {
      mockDb.run.mockResolvedValue({});

      await service.deleteTimeEntry(123);

      expect(mockDb.run).toHaveBeenCalledWith(
        'DELETE FROM time_entries WHERE id = ?',
        [123]
      );
    });

    test('should await database operation', async () => {
      let resolved = false;
      mockDb.run.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolved = true;
            resolve({});
          }, 10);
        });
      });

      await service.deleteTimeEntry(456);

      expect(resolved).toBe(true);
    });
  });
});
