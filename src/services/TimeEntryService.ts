import { TimeEntry } from '../models/TimeEntry';
import { ITimeEntryRepository } from '../interfaces/ITimeEntryRepository';
import { IValidator } from '../interfaces/IValidator';
import { CreateTimeEntryDTO } from '../dtos/CreateTimeEntryDTO';
import { UpdateTimeEntryDTO } from '../dtos/UpdateTimeEntryDTO';
import { TimeEntryResponseDTO } from '../dtos/TimeEntryResponseDTO';
import * as moment from 'moment';

/**
 * Service responsible for Time Entry CRUD operations
 */
export class TimeEntryService {
  constructor(
    private timeEntryRepository: ITimeEntryRepository,
    private validator: IValidator<TimeEntry>
  ) {}

  async createTimeEntry(dto: CreateTimeEntryDTO): Promise<TimeEntryResponseDTO> {
    // Convert DTO to domain model
    const timeEntry = new TimeEntry({
      employeeId: dto.employeeId,
      projectId: dto.projectId,
      startTime: dto.startTime,
      endTime: dto.endTime,
      description: dto.description || '',
      billableHours: dto.billableHours || this.calculateBillableHours(dto.startTime, dto.endTime)
    });

    // Validate
    const validationResult = this.validator.validate(timeEntry);
    if (!validationResult.isValid) {
      throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
    }

    // Save via repository
    const savedEntry = await this.timeEntryRepository.save(timeEntry);

    // Return DTO
    return new TimeEntryResponseDTO(savedEntry);
  }

  async updateTimeEntry(dto: UpdateTimeEntryDTO): Promise<TimeEntryResponseDTO> {
    // Fetch existing entry
    const existingEntry = await this.timeEntryRepository.findById(dto.id);
    if (!existingEntry) {
      throw new Error(`Time entry with ID ${dto.id} not found`);
    }

    // Update fields
    if (dto.employeeId) existingEntry.employeeId = dto.employeeId;
    if (dto.projectId) existingEntry.projectId = dto.projectId;
    if (dto.startTime) existingEntry.startTime = new Date(dto.startTime);
    if (dto.endTime) existingEntry.endTime = new Date(dto.endTime);
    if (dto.description !== undefined) existingEntry.description = dto.description;
    if (dto.billableHours !== undefined) existingEntry.billableHours = dto.billableHours;
    if (dto.status) existingEntry.status = dto.status;

    // Validate
    const validationResult = this.validator.validate(existingEntry);
    if (!validationResult.isValid) {
      throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
    }

    // Save via repository
    const updatedEntry = await this.timeEntryRepository.save(existingEntry);

    // Return DTO
    return new TimeEntryResponseDTO(updatedEntry);
  }

  async getTimeEntryById(id: number): Promise<TimeEntryResponseDTO | null> {
    const timeEntry = await this.timeEntryRepository.findById(id);
    return timeEntry ? new TimeEntryResponseDTO(timeEntry) : null;
  }

  async getTimeEntriesForEmployee(
    employeeId: string,
    weekOf?: Date
  ): Promise<TimeEntryResponseDTO[]> {
    const entries = await this.timeEntryRepository.findByEmployee(employeeId, weekOf);
    return TimeEntryResponseDTO.fromTimeEntries(entries);
  }

  async deleteTimeEntry(id: number): Promise<void> {
    const entry = await this.timeEntryRepository.findById(id);
    if (!entry) {
      throw new Error(`Time entry with ID ${id} not found`);
    }

    await this.timeEntryRepository.delete(id);
  }

  private calculateBillableHours(start: string, end: string): number {
    const startMoment = moment(start);
    const endMoment = moment(end);

    if (!startMoment.isValid() || !endMoment.isValid()) {
      return 0;
    }

    const hours = endMoment.diff(startMoment, 'hours', true);

    // Return 0 if negative hours
    if (hours < 0) {
      return 0;
    }

    // Round to quarter hours
    return Math.round(hours * 4) / 4;
  }
}
