// Timesheet server
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// middleware setup
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let db;


function initializeDatabase() {
  db = new sqlite3.Database('./timesheet.db', (err) => {
    if (err) {
      console.error('Database error:', err);
      process.exit(1); // Poor error handling
    }
    console.log('Connected to SQLite database');
    createTables();
  });
}


function createTables() {
  const createSQL = `
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
  
  db.exec(createSQL, (err) => {
    if (err) {
      console.error('Error creating tables:', err);
    } else {
      seedData(); // Side effect in table creation
    }
  });
}

// Hardcoded test data mixed with schema
function seedData() {
  const employees = [
    ['EMP001', 'John', 'Doe', 'john.doe@company.com', 'Engineering', 'Senior Developer', 75.0, 1, 'EMP002', '2020-01-15', 15, 2],
    ['EMP002', 'Jane', 'Smith', 'jane.smith@company.com', 'Engineering', 'Engineering Manager', 95.0, 1, null, '2018-03-01', 20, 1]
  ];
  
  const projects = [
    ['PROJ001', 'Website Redesign', 'Acme Corp', 50000.0, '2024-01-01', '2024-06-30', 'active', 0],
    ['PROJ002', 'Mobile App Development', 'Beta Industries', 75000.0, '2024-02-01', '2024-08-31', 'active', 0]
  ];
  
  // No transaction handling
  employees.forEach(emp => {
    const query = `INSERT OR IGNORE INTO employees 
      (id, first_name, last_name, email, department, role, hourly_rate, is_active, manager_id, start_date, vacation_days, sick_days)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(query, emp, (err) => {
      if (err) console.error('Employee insert error:', err);
    });
  });
  
  projects.forEach(proj => {
    const query = `INSERT OR IGNORE INTO projects 
      (id, name, client, budget, start_date, end_date, status, total_hours)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(query, proj, (err) => {
      if (err) console.error('Project insert error:', err);
    });
  });
}



// Get time entries with SQL injection vulnerability
app.get('/api/timeentries', (req, res) => {
  const { employee, week } = req.query;
  
  // No input validation
  let query = `SELECT * FROM time_entries WHERE employee_id = '${employee}'`;
  
  if (week) {
    // Calculate week start (Sunday) and end (Saturday)
    const weekDate = new Date(week);
    const startOfWeek = new Date(weekDate);
    startOfWeek.setDate(weekDate.getDate() - weekDate.getDay());
    startOfWeek.setHours(0, 0, 0, 0); // Beginning of day

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999); // End of day

    query += ` AND start_time >= '${startOfWeek.toISOString()}' AND start_time <= '${endOfWeek.toISOString()}'`;
  }
  
  db.all(query, (err, rows) => {
    if (err) {
      console.error('Query error:', err);
      res.status(500).json({ error: 'Database error' });
    } else {
      res.json(rows);
    }
  });
});

// Create time entry without proper validation
app.post('/api/timeentries', (req, res) => {
  const { employeeId, projectId, startTime, endTime, description, billableHours } = req.body;
  
  // Business logic in controller
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  const calculatedHours = (endDate - startDate) / (1000 * 60 * 60); // Bug: can be negative
  
  const query = `
    INSERT INTO time_entries 
    (employee_id, project_id, start_time, end_time, description, billable_hours, created_at, last_modified)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const now = new Date().toISOString();
  
  db.run(query, [employeeId, projectId, startTime, endTime, description, billableHours || 0, now, now], function(err) {
    if (err) {
      console.error('Insert error:', err);
      res.status(400).json({ error: 'Failed to create time entry' });
    } else {
      res.json({ success: true, id: this.lastID });
    }
  });
});

// Delete without authorization
app.delete('/api/timeentries/:id', (req, res) => {
  const entryId = req.params.id;
  
  // No authorization check
  const query = `DELETE FROM time_entries WHERE id = ?`;
  
  db.run(query, [entryId], function(err) {
    if (err) {
      console.error('Delete error:', err);
      res.status(500).json({ error: 'Delete failed' });
    } else {
      res.json({ success: true, changes: this.changes });
    }
  });
});

// Submit timesheet with hardcoded business logic
app.post('/api/timesheet/submit', (req, res) => {
  const { employeeId, week } = req.body;
  
  // Business logic in controller
  const query = `UPDATE time_entries SET status = 'submitted' WHERE employee_id = ? AND start_time >= ? AND start_time <= ?`;

  // Calculate week start (Sunday) and end (Saturday)
  const weekDate = new Date(week);
  const startOfWeek = new Date(weekDate);
  startOfWeek.setDate(weekDate.getDate() - weekDate.getDay());
  startOfWeek.setHours(0, 0, 0, 0); // Beginning of day

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999); // End of day

  db.run(query, [employeeId, startOfWeek.toISOString(), endOfWeek.toISOString()], function(err) {
    if (err) {
      console.error('Submit error:', err);
      res.status(500).json({ error: 'Submit failed' });
    } else {
      res.json({ success: true, message: 'Timesheet submitted' });
    }
  });
});

// Get projects without pagination
app.get('/api/projects', (req, res) => {
  const query = 'SELECT * FROM projects WHERE status = "active"';
  
  db.all(query, (err, rows) => {
    if (err) {
      console.error('Projects query error:', err);
      res.status(500).json({ error: 'Failed to fetch projects' });
    } else {
      res.json(rows);
    }
  });
});

// Get employees without filtering
app.get('/api/employees', (req, res) => {
  const query = 'SELECT * FROM employees WHERE is_active = 1';
  
  db.all(query, (err, rows) => {
    if (err) {
      console.error('Employees query error:', err);
      res.status(500).json({ error: 'Failed to fetch employees' });
    } else {
      res.json(rows);
    }
  });
});

// Serve static files for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong' });
});

// Start server with initialization
initializeDatabase();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('API available at /api');
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  if (db) {
    db.close((err) => {
      if (err) console.error('Error closing database:', err);
    });
  }
  process.exit(0);
});