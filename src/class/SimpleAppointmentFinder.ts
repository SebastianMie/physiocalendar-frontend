/* eslint-disable */
import Daylist from './Daylist';
import Masterlist from './Masterlist';
import Therapist from './Therapist';
import SingleAppointment from './SingleAppointment';
import Absence from './Absence';
import Dateconversions from './Dateconversions';
import { Time } from './Enums';

export type SimpleTimeOfDay = 'any' | 'timeframe1' | 'timeframe2' | 'timeframe3';

interface FinderConfig {
  patientName: string;
  therapistIDs: string[];          // leeres Array = kein Therapeut -> keine Vorschläge
  appointmentCount: number;        // wie viele Termine gesucht werden
  appointmentLengthMinutes: number;
  timeOfDay: SimpleTimeOfDay;
  daylist: Daylist;
  masterlist: Masterlist;
  therapists: Therapist[];
  searchStartDate?: Date;          // Suchzeitraum Start (optional)
  searchEndDate?: Date;            // Suchzeitraum Ende (optional)
}

/**
 * SimpleAppointmentFinder:
 * - durchsucht ab morgen (werktags) freie Slots für die gegebenen Therapeuten
 * - beachtet:
 *   - Einzeltermine (Daylist)
 *   - Serientermine (Masterlist)
 *   - Abwesenheiten (Absence) pro Therapeut
 * - Zeitraster: 10 Minuten (basierend auf enum Time)
 */
export default class SimpleAppointmentFinder {
  private patientName: string;

  private therapistIDs: string[];

  private appointmentCount: number;

  private appointmentLengthMinutes: number;

  private timeOfDay: SimpleTimeOfDay;

  private daylist: Daylist;

  private masterlist: Masterlist;

  private therapists: Therapist[];

  private searchStartDate: Date | undefined;

  private searchEndDate: Date | undefined;

  private readonly SLOT_STEP_MINUTES = 10;

  private readonly MAX_DAYS_TO_SEARCH = 60; // Sicherheit, keine Endlosschleife

  constructor(config: FinderConfig) {
    this.patientName = config.patientName;
    this.therapistIDs = config.therapistIDs;
    this.appointmentCount = config.appointmentCount;
    this.appointmentLengthMinutes = config.appointmentLengthMinutes;
    this.timeOfDay = config.timeOfDay;
    this.daylist = config.daylist;
    this.masterlist = config.masterlist;
    this.therapists = config.therapists;
    this.searchStartDate = config.searchStartDate;
    this.searchEndDate = config.searchEndDate;
  }

  public getSuggestions(): SingleAppointment[] {
    const suggestions: SingleAppointment[] = [];

    if (!this.patientName || this.therapistIDs.length === 0) {
      return suggestions;
    }

    const stepsForDuration = this.appointmentLengthMinutes / this.SLOT_STEP_MINUTES;
    if (!Number.isInteger(stepsForDuration) || stepsForDuration <= 0) {
      // Termindauer nicht kompatibel mit 10-Minuten-Raster
      return suggestions;
    }

    let daysSearched = 0;
    const currentDate = new Date();

    // Startdatum bestimmen: entweder searchStartDate oder morgen
    if (this.searchStartDate) {
      currentDate.setTime(this.searchStartDate.getTime());
    } else {
      // ab morgen suchen, damit keine "Vergangenheit"
      currentDate.setDate(currentDate.getDate() + 1);
    }
    currentDate.setHours(0, 0, 0, 0);

    // Sammle ALLE Slots im Zeitraum
    // Schleife läuft, solange:
    // 1. searchEndDate vorhanden ist UND aktuelles Datum <= searchEndDate ist
    // 2. ODER searchEndDate nicht vorhanden ist UND noch Tage zu durchsuchen sind
    while (
      (this.searchEndDate && currentDate.getTime() <= this.searchEndDate.getTime()) ||
      (!this.searchEndDate && daysSearched < this.MAX_DAYS_TO_SEARCH)
    ) {
      const dayOfWeek = currentDate.getDay(); // 0=So, 1=Mo, ..., 6=Sa

      // Nur Montag-Freitag
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        this.therapistIDs.forEach((therapistID) => {
          const therapist = this.therapists.find((t) => t.id === therapistID);
          if (!therapist) return;

          const slotsForTherapist = this.findSlotsForTherapistOnDate(
            therapist,
            new Date(currentDate),
            stepsForDuration,
          );

          // Sammle alle Slots
          slotsForTherapist.forEach((slot) => {
            suggestions.push(slot);
          });
        });
      }

      daysSearched += 1;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return suggestions;
  }

  /**
   * Ermittelt alle freien Slots für einen Therapeuten an einem bestimmten Datum
   */
  private findSlotsForTherapistOnDate(
    therapist: Therapist,
    date: Date,
    stepsForDuration: number,
  ): SingleAppointment[] {
    const slots: SingleAppointment[] = [];

    const [frameStartIndex, frameEndIndex] = this.getTimeFrameIndices();

    const lastPossibleStartIndex = frameEndIndex - stepsForDuration;
    if (lastPossibleStartIndex < frameStartIndex) {
      return slots;
    }

    // Alle möglichen Time-Indizes durchlaufen
    for (let i = frameStartIndex; i <= lastPossibleStartIndex; i += 1) {
      const startTime = i as unknown as Time;
      const endTime = (i + stepsForDuration) as unknown as Time;

      // Prüfe Abwesenheiten
      if (!this.isTherapistAvailable(therapist, date, startTime, endTime)) {
        continue;
      }

      // Prüfe Einzeltermin-Konflikte
      const hasSingleConflicts = this.daylist.getSingleAppointmentsConflicts(
        therapist.id,
        date,
        startTime,
        endTime,
      ).length > 0;

      if (hasSingleConflicts) continue;

      // Prüfe Serientermin-Konflikte
      const hasSeriesConflicts = this.masterlist.getSeriesAppointmentsConflicts(
        therapist.id,
        date,
        startTime,
        endTime,
      ).length > 0;

      if (hasSeriesConflicts) continue;

      // Konvertiere numerische Indizes zu Zeit-Strings für Speicherung
      const startTimeString = Dateconversions.stringFromTime(startTime);
      const endTimeString = Dateconversions.stringFromTime(endTime);

      // Slot ist frei → Vorschlag erzeugen MIT ZEIT-STRINGS
      const appointment = new SingleAppointment(
        therapist.name,
        therapist.id,
        this.patientName,
        startTimeString as unknown as Time,
        endTimeString as unknown as Time,
        '',
        new Date(date),
        false,
        false,
        false,
      );

      slots.push(appointment);
    }

    return slots;
  }

  /**
   * Zeitfenster pro TimeOfDay:
   * - any:        08:00–19:30 (alle)
   * - timeframe1: 08:00–12:00 (Morgen)
   * - timeframe2: 12:00–15:00 (Mittag)
   * - timeframe3: 15:00–19:30 (Nachmittag)
   */
  private getTimeFrameIndices(): [number, number] {
    let startLabel = '8:00';
    let endLabel = '19:30';

    if (this.timeOfDay === 'timeframe1') {
      startLabel = '8:00';
      endLabel = '12:00';
    } else if (this.timeOfDay === 'timeframe2') {
      startLabel = '12:00';
      endLabel = '15:00';
    } else if (this.timeOfDay === 'timeframe3') {
      startLabel = '15:00';
      endLabel = '19:30';
    }
    // Bei 'any': 8:00-19:30 (siehe oben initialisiert)

    // Bei numerischen Enums: Time[0] = "7:00", Time[1] = "7:10", etc.
    // timeFromString gibt einen Time-Enum zurück (der ist eine Zahl)
    const startIndex = Dateconversions.timeFromString(startLabel) as unknown as number;
    const endIndex = Dateconversions.timeFromString(endLabel) as unknown as number;

    return [startIndex, endIndex];
  }

  /**
   * Prüft, ob ein Slot durch Abwesenheiten blockiert ist
   */
  private isTherapistAvailable(therapist: Therapist, date: Date, startTime: Time, endTime: Time): boolean {
    if (!therapist.absences || therapist.absences.length === 0) {
      return true;
    }

    const dateReadable = Dateconversions.convertDateToReadableString(date);
    const slotStartIndex = Dateconversions.timeToIndex(startTime);
    const slotEndIndex = Dateconversions.timeToIndex(endTime);

    return !therapist.absences.some((absence: Absence) => {
      // day kann entweder ein konkretes Datum ("14.02.2023") oder ein Weekday sein
      let relevantForDate = false;

      if (typeof absence.day === 'string' && absence.day.includes('.')) {
        // Datumsspezifische Abwesenheit
        relevantForDate = absence.day === dateReadable;
      } else {
        // Wochentags-Abwesenheit
        const jsDay = date.getDay(); // 1=Mo,...,5=Fr
        const weekdayName = this.mapJsDayToWeekdayString(jsDay);
        relevantForDate = weekdayName === absence.day;
      }

      if (!relevantForDate) return false;

      // Zeitliche Überschneidung prüfen
      const absenceStartIndex = Dateconversions.timeToIndex(absence.start);
      const absenceEndIndex = Dateconversions.timeToIndex(absence.end);

      const startsBeforeEnd = absenceStartIndex < slotEndIndex;
      const endsAfterStart = absenceEndIndex > slotStartIndex;

      return startsBeforeEnd && endsAfterStart;
    });
  }

  /**
   * Konvertiert einen Time Enum Wert zu seinem numerischen Index
   */
  private getTimeIndex(time: Time): number {
    return Dateconversions.timeToIndex(time);
  }

  private mapJsDayToWeekdayString(jsDay: number): string | undefined {
    // 1=Mo,...,5=Fr
    switch (jsDay) {
      case 1: return 'Montag';
      case 2: return 'Dienstag';
      case 3: return 'Mittwoch';
      case 4: return 'Donnerstag';
      case 5: return 'Freitag';
      default: return undefined;
    }
  }
}
