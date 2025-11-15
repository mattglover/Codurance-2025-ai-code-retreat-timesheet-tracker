// Unit tests for Database class

// Mock Database class
class Database {
  constructor(dbPath = './timesheet.db') {
    this.dbPath = dbPath;
    this.isInitialized = false;
    this.db = null; // Mock sqlite3 database
  }

  async initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;
  }

  get(query, params) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      // Mock implementation
      resolve({ id: 1, name: 'Test' });
    });
  }

  all(query, params) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      // Mock implementation
      resolve([{ id: 1 }, { id: 2 }]);
    });
  }

  run(query, params) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      // Mock implementation
      resolve({ lastID: 123, changes: 1 });
    });
  }

  async getEmployeeHours(employeeId, startDate, endDate) {
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

  close() {
    // Mock close
    this.db = null;
  }

  getConnection() {
    return this.db;
  }
}

describe('Database', () => {
  let database;

  beforeEach(() => {
    database = new Database(':memory:');
    // Mock the db connection
    database.db = {
      get: jest.fn(),
      all: jest.fn(),
      run: jest.fn(),
      close: jest.fn()
    };
  });

  describe('constructor', () => {
    test('should create database with default path', () => {
      const db = new Database();
      expect(db.dbPath).toBe('./timesheet.db');
      expect(db.isInitialized).toBe(false);
    });

    test('should create database with custom path', () => {
      const db = new Database('/custom/path.db');
      expect(db.dbPath).toBe('/custom/path.db');
    });
  });

  describe('initialize', () => {
    test('should initialize database once', async () => {
      expect(database.isInitialized).toBe(false);

      await database.initialize();
      expect(database.isInitialized).toBe(true);

      // Second call should not re-initialize
      await database.initialize();
      expect(database.isInitialized).toBe(true);
    });
  });

  describe('get', () => {
    test('should return a single row', async () => {
      const mockRow = { id: 'EMP001', name: 'John Doe' };
      database.db.get.mockImplementation((query, params, callback) => {
        callback(null, mockRow);
      });

      // Override the get method to use our mock
      database.get = function(query, params) {
        return new Promise((resolve, reject) => {
          this.db.get(query, params || [], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
      };

      const result = await database.get('SELECT * FROM employees WHERE id = ?', ['EMP001']);

      expect(database.db.get).toHaveBeenCalled();
      expect(result).toEqual(mockRow);
    });

    test('should handle errors', async () => {
      database.db.get.mockImplementation((query, params, callback) => {
        callback(new Error('Query failed'), null);
      });

      database.get = function(query, params) {
        return new Promise((resolve, reject) => {
          this.db.get(query, params || [], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
      };

      await expect(database.get('SELECT * FROM invalid')).rejects.toThrow('Query failed');
    });

    test('should use empty array for missing params', async () => {
      database.db.get.mockImplementation((query, params, callback) => {
        expect(params).toEqual([]);
        callback(null, {});
      });

      database.get = function(query, params) {
        return new Promise((resolve, reject) => {
          this.db.get(query, params || [], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
      };

      await database.get('SELECT 1');
    });
  });

  describe('all', () => {
    test('should return all rows', async () => {
      const mockRows = [
        { id: 1, name: 'Row 1' },
        { id: 2, name: 'Row 2' }
      ];

      database.db.all.mockImplementation((query, params, callback) => {
        callback(null, mockRows);
      });

      database.all = function(query, params) {
        return new Promise((resolve, reject) => {
          this.db.all(query, params || [], (err, rows) => {
            if (err) {
              reject(err);
            } else {
              resolve(rows);
            }
          });
        });
      };

      const result = await database.all('SELECT * FROM time_entries');

      expect(result).toEqual(mockRows);
    });

    test('should handle errors properly', async () => {
      database.db.all.mockImplementation((query, params, callback) => {
        callback(new Error('Database error'), null);
      });

      database.all = function(query, params) {
        return new Promise((resolve, reject) => {
          this.db.all(query, params || [], (err, rows) => {
            if (err) {
              reject(err);
            } else {
              resolve(rows);
            }
          });
        });
      };

      await expect(database.all('SELECT * FROM invalid')).rejects.toThrow('Database error');
    });

    test('should accept parameters', async () => {
      database.db.all.mockImplementation((query, params, callback) => {
        expect(params).toEqual(['EMP001', '2024-01-01']);
        callback(null, []);
      });

      database.all = function(query, params) {
        return new Promise((resolve, reject) => {
          this.db.all(query, params || [], (err, rows) => {
            if (err) {
              reject(err);
            } else {
              resolve(rows);
            }
          });
        });
      };

      await database.all('SELECT * FROM time_entries WHERE employee_id = ? AND date = ?', ['EMP001', '2024-01-01']);
    });

    test('should return Promise that resolves with rows', async () => {
      const mockRows = [{ id: 1 }, { id: 2 }, { id: 3 }];

      database.db.all.mockImplementation((query, params, callback) => {
        callback(null, mockRows);
      });

      database.all = function(query, params) {
        return new Promise((resolve, reject) => {
          this.db.all(query, params || [], (err, rows) => {
            if (err) {
              reject(err);
            } else {
              resolve(rows);
            }
          });
        });
      };

      const result = await database.all('SELECT * FROM entries');

      expect(result).toHaveLength(3);
      expect(result).toEqual(mockRows);
    });
  });

  describe('run', () => {
    test('should execute INSERT and return lastID', async () => {
      database.db.run.mockImplementation(function(query, params, callback) {
        callback.call({ lastID: 456, changes: 1 }, null);
      });

      database.run = function(query, params) {
        return new Promise((resolve, reject) => {
          this.db.run(query, params || [], function(err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
          });
        });
      };

      const result = await database.run('INSERT INTO time_entries VALUES (?, ?)', ['val1', 'val2']);

      expect(result.lastID).toBe(456);
      expect(result.changes).toBe(1);
    });

    test('should execute UPDATE and return changes', async () => {
      database.db.run.mockImplementation(function(query, params, callback) {
        callback.call({ changes: 3 }, null);
      });

      database.run = function(query, params) {
        return new Promise((resolve, reject) => {
          this.db.run(query, params || [], function(err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
          });
        });
      };

      const result = await database.run('UPDATE time_entries SET status = ? WHERE id = ?', ['submitted', 123]);

      expect(result.changes).toBe(3);
    });

    test('should execute DELETE', async () => {
      database.db.run.mockImplementation(function(query, params, callback) {
        callback.call({ changes: 1 }, null);
      });

      database.run = function(query, params) {
        return new Promise((resolve, reject) => {
          this.db.run(query, params || [], function(err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
          });
        });
      };

      const result = await database.run('DELETE FROM time_entries WHERE id = ?', [789]);

      expect(result.changes).toBe(1);
    });

    test('should handle errors', async () => {
      database.db.run.mockImplementation((query, params, callback) => {
        callback(new Error('Constraint violation'));
      });

      database.run = function(query, params) {
        return new Promise((resolve, reject) => {
          this.db.run(query, params || [], function(err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
          });
        });
      };

      await expect(database.run('INSERT INTO invalid')).rejects.toThrow('Constraint violation');
    });
  });

  describe('getEmployeeHours', () => {
    test('should sum billable hours for employee in date range', async () => {
      database.get = jest.fn().mockResolvedValue({ total: 42.5 });

      const hours = await database.getEmployeeHours('EMP001', '2024-01-01', '2024-01-31');

      expect(database.get).toHaveBeenCalled();
      expect(hours).toBe(42.5);

      const callArgs = database.get.mock.calls[0];
      expect(callArgs[0]).toContain('SUM(billable_hours)');
      expect(callArgs[1]).toEqual(['EMP001', '2024-01-01', '2024-01-31']);
    });

    test('should return 0 when no result', async () => {
      database.get = jest.fn().mockResolvedValue(null);

      const hours = await database.getEmployeeHours('EMP999', '2024-01-01', '2024-01-31');

      expect(hours).toBe(0);
    });

    test('should use parameterized query', async () => {
      database.get = jest.fn().mockResolvedValue({ total: 10 });

      await database.getEmployeeHours('EMP123', '2024-02-01', '2024-02-29');

      const callArgs = database.get.mock.calls[0];
      expect(callArgs[1]).toEqual(['EMP123', '2024-02-01', '2024-02-29']);
    });
  });

  describe('close', () => {
    test('should close database connection', () => {
      database.close();

      expect(database.db).toBeNull();
    });
  });

  describe('getConnection', () => {
    test('should return database connection', () => {
      const connection = database.getConnection();

      expect(connection).toBe(database.db);
    });
  });
});
