import React, { useState, useEffect } from 'react';

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

interface EditTimeEntryModalProps {
  entry: TimeEntry;
  projects: any[];
  onSave: (updatedEntry: any) => void;
  onCancel: () => void;
}

const EditTimeEntryModal: React.FC<EditTimeEntryModalProps> = ({ entry, projects, onSave, onCancel }) => {
  const [projectId, setProjectId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [isBillable, setIsBillable] = useState(true);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    // Populate form with entry data
    if (entry) {
      const start = new Date(entry.startTime);
      const end = new Date(entry.endTime);

      setProjectId(entry.projectId);
      setStartDate(start.toISOString().split('T')[0]);
      setStartTime(start.toTimeString().slice(0, 5));
      setEndDate(end.toISOString().split('T')[0]);
      setEndTime(end.toTimeString().slice(0, 5));
      setDescription(entry.description);
      setIsBillable(entry.billableHours > 0);
    }
  }, [entry]);

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!projectId) newErrors.projectId = 'Project is required';
    if (!startDate) newErrors.startDate = 'Start date is required';
    if (!startTime) newErrors.startTime = 'Start time is required';
    if (!endDate) newErrors.endDate = 'End date is required';
    if (!endTime) newErrors.endTime = 'End time is required';

    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);
    if (endDateTime <= startDateTime) {
      newErrors.endTime = 'End time must be after start time';
    }

    if (description.length > 500) {
      newErrors.description = 'Description too long (max 500 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);
    const hours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);

    const updatedEntry = {
      id: entry.id,
      projectId: projectId,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      description: description.trim(),
      billableHours: isBillable ? hours : 0,
      status: entry.status
    };

    onSave(updatedEntry);
  };

  const modalStyles = {
    overlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '30px',
      maxWidth: '800px',
      width: '90%',
      maxHeight: '90vh',
      overflow: 'auto',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      paddingBottom: '15px',
      borderBottom: '2px solid #e0e0e0'
    },
    title: {
      margin: 0,
      fontSize: '24px',
      color: '#333'
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '28px',
      cursor: 'pointer',
      color: '#666',
      padding: '0',
      width: '30px',
      height: '30px',
      lineHeight: '1'
    },
    form: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '20px'
    },
    field: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '5px'
    },
    fullWidth: {
      gridColumn: '1 / -1'
    },
    input: {
      padding: '10px 12px',
      border: '1px solid #ccc',
      borderRadius: '4px',
      fontSize: '14px'
    },
    error: {
      color: '#dc3545',
      fontSize: '12px',
      marginTop: '2px'
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end',
      marginTop: '10px',
      gridColumn: '1 / -1'
    },
    button: {
      padding: '12px 24px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: 'bold' as const
    },
    saveButton: {
      backgroundColor: '#28a745',
      color: 'white'
    },
    cancelButton: {
      backgroundColor: '#6c757d',
      color: 'white'
    }
  };

  return (
    <div style={modalStyles.overlay} onClick={onCancel}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h2 style={modalStyles.title}>Edit Time Entry</h2>
          <button style={modalStyles.closeButton} onClick={onCancel}>×</button>
        </div>

        <form style={modalStyles.form} onSubmit={handleSubmit}>
          <div style={modalStyles.field}>
            <label htmlFor="project">Project *</label>
            <select
              id="project"
              style={{...modalStyles.input, borderColor: errors.projectId ? '#dc3545' : '#ccc'}}
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">Select a project...</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name} - {project.client}
                </option>
              ))}
            </select>
            {errors.projectId && <span style={modalStyles.error}>{errors.projectId}</span>}
          </div>

          <div style={modalStyles.field}>
            <label htmlFor="startDate">Start Date *</label>
            <input
              id="startDate"
              type="date"
              style={{...modalStyles.input, borderColor: errors.startDate ? '#dc3545' : '#ccc'}}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            {errors.startDate && <span style={modalStyles.error}>{errors.startDate}</span>}
          </div>

          <div style={modalStyles.field}>
            <label htmlFor="startTime">Start Time *</label>
            <input
              id="startTime"
              type="time"
              style={{...modalStyles.input, borderColor: errors.startTime ? '#dc3545' : '#ccc'}}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            {errors.startTime && <span style={modalStyles.error}>{errors.startTime}</span>}
          </div>

          <div style={modalStyles.field}>
            <label htmlFor="endDate">End Date *</label>
            <input
              id="endDate"
              type="date"
              style={{...modalStyles.input, borderColor: errors.endDate ? '#dc3545' : '#ccc'}}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            {errors.endDate && <span style={modalStyles.error}>{errors.endDate}</span>}
          </div>

          <div style={modalStyles.field}>
            <label htmlFor="endTime">End Time *</label>
            <input
              id="endTime"
              type="time"
              style={{...modalStyles.input, borderColor: errors.endTime ? '#dc3545' : '#ccc'}}
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
            {errors.endTime && <span style={modalStyles.error}>{errors.endTime}</span>}
          </div>

          <div style={{...modalStyles.field, ...modalStyles.fullWidth}}>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              style={{...modalStyles.input, minHeight: '100px', resize: 'vertical'}}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your work..."
            />
            {errors.description && <span style={modalStyles.error}>{errors.description}</span>}
          </div>

          <div style={{...modalStyles.field, ...modalStyles.fullWidth}}>
            <label>
              <input
                type="checkbox"
                checked={isBillable}
                onChange={(e) => setIsBillable(e.target.checked)}
                style={{marginRight: '8px'}}
              />
              Billable Time
            </label>
          </div>

          <div style={modalStyles.buttonGroup}>
            <button
              type="button"
              style={{...modalStyles.button, ...modalStyles.cancelButton}}
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{...modalStyles.button, ...modalStyles.saveButton}}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTimeEntryModal;
