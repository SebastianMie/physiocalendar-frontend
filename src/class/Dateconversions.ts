// eslint-disable-next-line import/no-cycle

import Appointment from './Appointment';
import { Time, Weekday } from './Enums';

export default class Dateconversions {
  static convertReadableStringToDate(readableDate: string): Date {
    const [day, month, year] = readableDate.split('.');
    return new Date(`${year}-${month}-${day}`);
  }

  static convertDateToReadableString(date: Date): string {
    return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
  }

  static timeFromString(timeString: string): Time {
    // Mit numerischen Enums: finde den Index für den Zeit-String
    const timeEntries = Object.entries(Time).filter(([k]) => !Number.isNaN(Number(k)));
    const foundEntry = timeEntries.find(([, v]) => v === timeString);

    if (foundEntry) {
      return Number(foundEntry[0]) as unknown as Time;
    }

    // Fallback: versuche selber zu berechnen
    const [hour, minute] = timeString.split(':').map(Number);
    // Time Enum hat 6 Einträge pro Stunde (7:00, 7:10, 7:20, 7:30, 7:40, 7:50)
    // Start ist 7:00
    const index = (hour - 7) * 6 + (minute / 10);
    return index as unknown as Time;
  }

  static stringFromTime(time: Time): string {
    return Time[time as unknown as number];
  }

  /**
   * Konvertiert jede Time (String oder Zahl) zu einem numerischen Index
   * Dies ist essentiell, da die Daten manchmal Strings ("8:00") und manchmal Zahlen (6) enthalten
   */
  static timeToIndex(time: Time): number {
    if (typeof time === 'string') {
      // Es ist ein Zeit-String wie "8:00" - konvertiere zu Index
      return this.timeFromString(time) as unknown as number;
    }
    // Es ist bereits ein numerischer Index
    return time as unknown as number;
  }

  static convertEnglishToGermanReadableString(date: string): string {
    const [year, month, day] = date.split('-');
    return `${day}.${month}.${year}`;
  }

  static convertGermanToEnglishReadableString(date: string): string {
    const [day, month, year] = date.split('.');
    return `${year}-${month}-${day}`;
  }

  static datesAreEqual(date1: Date, date2: Date): boolean {
    return this.convertDateToReadableString(date1) === this.convertDateToReadableString(date2);
  }

  static getWeekdayForDate(date: Date) : Weekday | undefined {
    switch (date.getDay()) {
      case 1: return Weekday.MONDAY;
      case 2: return Weekday.TUESDAY;
      case 3: return Weekday.WEDNESDAY;
      case 4: return Weekday.THURSDAY;
      case 5: return Weekday.FRIDAY;
      case 6: return undefined;
      default: return Weekday.MONDAY;
    }
  }

  static getGermanWeekdayString(weekday: Weekday): string {
    switch (weekday) {
      case Weekday.MONDAY: return 'Montag';
      case Weekday.TUESDAY: return 'Dienstag';
      case Weekday.WEDNESDAY: return 'Mittwoch';
      case Weekday.THURSDAY: return 'Donnerstag';
      case Weekday.FRIDAY: return 'Freitag';
      default: return '';
    }
  }

  static getWeekdayStringForDate(date: Date) : string {
    switch (date.getDay()) {
      case 1: return 'Mo,';
      case 2: return 'Di,';
      case 3: return 'Mi,';
      case 4: return 'Do,';
      case 5: return 'Fr,';
      case 6: return 'Sa,';
      default: return '';
    }
  }

  static getAllTimes(): string[] {
    const times = [''];
    for (let i = 7; i < 21; i += 1) {
      const hour = i.toString();
      times.push(`${hour}:00`, `${hour}:10`, `${hour}:20`, `${hour}:30`, `${hour}:40`, `${hour}:50`);
    }
    return times;
  }

  static appointmentIsInTimeInterval(appointment: Appointment, startTime: Time, endTime?: Time) : boolean {
    // Konvertiere Time Enum-Werte zu numerischen Indizes für Vergleich
    const appointmentStart = appointment.startTime as unknown as number;
    const appointmentEnd = appointment.endTime as unknown as number;
    const searchStart = startTime as unknown as number;
    const searchEnd = endTime as unknown as number;

    if (endTime) {
      return appointmentEnd === searchEnd
      || appointmentStart === searchStart
      || (appointmentStart < searchStart && appointmentEnd > searchEnd)
      || (appointmentStart > searchStart && appointmentStart < searchEnd)
      || (appointmentEnd > searchStart && appointmentEnd < searchEnd);
    }
    return appointmentStart === searchStart;
  }
}
