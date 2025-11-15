// List component with poor performance and structure
import React, { useState } from 'react';
import EditTimeEntryModal from './EditTimeEntryModal';

interface TimeEntry {
  id: number;
  employeeId: string;
  projectId: string;
  startTime: Date;
  endTime: Date;
  description: string;
  billableHours: number;
  status: string;
}

interface Props {
  entries: TimeEntry[];
  onUpdate: (entry: TimeEntry) => void;
  projects: any[];
  employees: any[];
  calculateHours: (start: string, end: string) => number;
}


const TimeEntryList: React.FC<Props> = ({ entries, onUpdate, projects, employees, calculateHours }) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>('startTime');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  
  const getProjectName = (projectId: string): string => {
    const project = projects.find(p => p.id === projectId);
    return project ? `${project.name} (${project.client})` : 'Unknown Project';
  };
  
  const getEmployeeName = (employeeId: string): string => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown Employee';
  };
  
  // Inefficient sorting on every render
  const sortedEntries = [...entries].sort((a, b) => {
    let aVal, bVal;
    
    // Complex sorting logic that should be extracted
    switch (sortBy) {
      case 'startTime':
        aVal = new Date(a.startTime).getTime();
        bVal = new Date(b.startTime).getTime();
        break;
      case 'project':
        aVal = getProjectName(a.projectId);
        bVal = getProjectName(b.projectId);
        break;
      case 'hours':
        aVal = calculateHours(a.startTime.toString(), a.endTime.toString());
        bVal = calculateHours(b.startTime.toString(), b.endTime.toString());
        break;
      default:
        aVal = a[sortBy as keyof TimeEntry];
        bVal = b[sortBy as keyof TimeEntry];
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
  

  const handleDelete = async (entryId: number) => {
    if (confirm('Delete this entry?')) { 
      try {
        const response = await fetch(`${(window as any).apiBaseUrl}/timeentries/${entryId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          // Direct DOM manipulation instead of state management
          window.location.reload();
        } else {
          alert('Delete failed!');
        }
      } catch (err) {
        console.error('Delete error:', err);
        alert('Delete failed!');
      }
    }
  };
  
 
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'submitted': return '#28a745';
      case 'approved': return '#007bff';
      case 'rejected': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const tableStyles = {
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      marginTop: '20px'
    },
    th: {
      padding: '12px 8px',
      textAlign: 'left' as const,
      borderBottom: '2px solid #ddd',
      backgroundColor: '#f8f9fa',
      cursor: 'pointer',
      userSelect: 'none' as const
    },
    td: {
      padding: '10px 8px',
      borderBottom: '1px solid #eee',
      verticalAlign: 'top' as const
    },
    button: {
      padding: '5px 10px',
      margin: '0 2px',
      border: 'none',
      borderRadius: '3px',
      cursor: 'pointer',
      fontSize: '12px'
    }
  };
  
  const editingEntry = editingId !== null ? entries.find(e => e.id === editingId) : null;

  const handleSaveEdit = async (updatedEntry: any) => {
    try {
      const response = await fetch(`${(window as any).apiBaseUrl}/timeentries/${updatedEntry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedEntry)
      });

      if (response.ok) {
        // Reload page to refresh data
        window.location.reload();
      } else {
        alert('Failed to update time entry');
      }
    } catch (err) {
      console.error('Update error:', err);
      alert('Error updating time entry');
    }
  };

  return (
    <div>
      {editingEntry && (
        <EditTimeEntryModal
          entry={editingEntry}
          projects={projects}
          onSave={handleSaveEdit}
          onCancel={() => setEditingId(null)}
        />
      )}

      <div style={{marginBottom: '15px'}}>
        <span>Sort by: </span>
        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value)}
          style={{marginRight: '10px', padding: '5px'}}
        >
          <option value=\"startTime\">Start Time</option>
          <option value=\"project\">Project</option>
          <option value=\"hours\">Hours</option>
          <option value=\"status\">Status</option>
        </select>
        
        <button 
          onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
          style={{padding: '5px 10px'}}
        >
          {sortDirection === 'asc' ? '↑' : '↓'}
        </button>
      </div>
      
      <table style={tableStyles.table}>
        <thead>
          <tr>
            <th style={tableStyles.th}>Date</th>
            <th style={tableStyles.th}>Time</th>
            <th style={tableStyles.th}>Project</th>
            <th style={tableStyles.th}>Description</th>
            <th style={tableStyles.th}>Hours</th>
            <th style={tableStyles.th}>Status</th>
            <th style={tableStyles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedEntries.map(entry => {
            // Calculations on every render
            const startDate = new Date(entry.startTime);
            const endDate = new Date(entry.endTime);
            const hours = calculateHours(entry.startTime.toString(), entry.endTime.toString());
            
            return (
              <tr key={entry.id} style={{backgroundColor: entry.status === 'submitted' ? '#fff3cd' : 'white'}}>
                <td style={tableStyles.td}>
                  {startDate.toLocaleDateString()}
                </td>
                <td style={tableStyles.td}>
                  {startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                  {endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </td>
                <td style={tableStyles.td}>
                  <div style={{fontSize: '14px', fontWeight: 'bold'}}>
                    {getProjectName(entry.projectId)}
                  </div>
                </td>
                <td style={tableStyles.td}>
                  <div style={{maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                    {entry.description || <em style={{color: '#666'}}>No description</em>}
                  </div>
                </td>
                <td style={tableStyles.td}>
                  <span style={{fontWeight: 'bold'}}>
                    {hours.toFixed(2)}h
                  </span>
                  {entry.billableHours > 0 && (
                    <div style={{fontSize: '12px', color: '#28a745'}}>
                      💰 Billable
                    </div>
                  )}
                </td>
                <td style={tableStyles.td}>
                  <span 
                    style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: 'white',
                      backgroundColor: getStatusColor(entry.status)
                    }}
                  >
                    {entry.status}
                  </span>
                </td>
                <td style={tableStyles.td}>
                  <button 
                    style={{...tableStyles.button, backgroundColor: '#ffc107'}}
                    onClick={() => setEditingId(editingId === entry.id ? null : entry.id)}
                  >
                    {editingId === entry.id ? 'Cancel' : 'Edit'}
                  </button>
                  
                  {entry.status !== 'submitted' && (
                    <button 
                      style={{...tableStyles.button, backgroundColor: '#dc3545', color: 'white'}}
                      onClick={() => handleDelete(entry.id)}
                    >
                      Delete
                    </button>
                  )}
                  
                  {entry.status === 'draft' && (
                    <button 
                      style={{...tableStyles.button, backgroundColor: '#28a745', color: 'white'}}
                      onClick={() => {
                        // Inline business logic
                        const updatedEntry = { ...entry, status: 'submitted' };
                        onUpdate(updatedEntry);
                      }}
                    >
                      Submit
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {entries.length === 0 && (
        <div style={{textAlign: 'center', padding: '40px', color: '#666', fontStyle: 'italic'}}>
          No time entries found for this week
        </div>
      )}
    </div>
  );
};

export default TimeEntryList;