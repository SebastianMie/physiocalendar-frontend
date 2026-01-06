/* eslint-disable */
import Appointment from './Appointment';
import AppointmentSeries from './AppointmentSeries';
import Cancellation from './Cancellation';
import Dateconversions from './Dateconversions';
import { Time, Weekday } from './Enums';
import ListWeekDay from './ListWeekDay';
import SingleAppointment from './SingleAppointment';

export default class Masterlist {
  elements: ListWeekDay[];

  constructor(
    elements: ListWeekDay[],
  ) {
    this.elements = elements;
  }

  private static filterAppointmentOnStartTime(
    therapistID: string, startTime: Time, appointment: AppointmentSeries,
  ): AppointmentSeries | undefined {
    if (appointment.therapistID === therapistID && appointment.startTime === startTime) {
      return appointment;
    }
    return undefined;
  }

  private static filterAppointmentForDaylist(
    therapistID: string, startTime: Time, appointment: AppointmentSeries, date: Date, endTime?: Time,
  ): AppointmentSeries | undefined {
    if (appointment.therapistID === therapistID) {
      if (Dateconversions.appointmentIsInTimeInterval(appointment, startTime, endTime)) {
        if (this.appointmentIsInDayInterval(appointment, date)) {
          const readableStartDate = Dateconversions.convertDateToReadableString(appointment.startDate);
          const readableEndDate = Dateconversions.convertDateToReadableString(appointment.endDate);
          const readableTargetDate = Dateconversions.convertDateToReadableString(date);
          if (
            (date >= appointment.startDate || readableStartDate === readableTargetDate)
            && (date <= appointment.endDate || readableEndDate === readableTargetDate)
          ) {
            return appointment;
          }
        }
      }
    }
    return undefined;
  }

  private static appointmentIsInDayInterval(appointment: AppointmentSeries, date: Date) : boolean {
    const currentDate = new Date(appointment.startDate);
    const tomorow = new Date(date.toDateString());
    tomorow.setDate(tomorow.getDate() + 1);

    let weekdayOffset = 1;
    switch (appointment.weekday) {
      case Weekday.MONDAY: weekdayOffset = 1; break;
      case Weekday.TUESDAY: weekdayOffset = 2; break;
      case Weekday.WEDNESDAY: weekdayOffset = 3; break;
      case Weekday.THURSDAY: weekdayOffset = 4; break;
      case Weekday.FRIDAY: weekdayOffset = 5; break;
      default: break;
    }

    const currentSearchDate = currentDate;
    // eslint-disable-next-line no-mixed-operators
    currentSearchDate.setDate(currentSearchDate.getDate() + ((7 - currentSearchDate.getDay()) % 7 + weekdayOffset) % 7);

    while (currentSearchDate < tomorow) {
      if (Dateconversions.convertDateToReadableString(currentSearchDate) === Dateconversions.convertDateToReadableString(date)) {
        return true;
      }
      currentSearchDate.setDate(currentDate.getDate() + (7 * appointment.interval));
    }
    return false;
  }

  searchAppointmentOnStartTime(therapistID: string, weekday: Weekday, startTime: Time): AppointmentSeries | undefined {
    const currentDay = this.findListday(weekday);
    if (currentDay !== undefined) {
      return currentDay.appointments.find(
        (appointment) => Masterlist.filterAppointmentOnStartTime(therapistID, startTime, appointment as AppointmentSeries),
      ) as AppointmentSeries;
    }
    return undefined;
  }

  searchAppointmentForDaylist(
    therapistID: string, weekday: Weekday, startTime: Time, date: Date, endTime?: Time,
  ): AppointmentSeries | undefined {
    const currentDay = this.findListday(weekday);
    if (currentDay !== undefined) {
      return currentDay.appointments.find(
        (appointment) => Masterlist.filterAppointmentForDaylist(therapistID, startTime, appointment as AppointmentSeries, date, endTime),
      ) as AppointmentSeries;
    }
    return undefined;
  }

  getAppointmentConflict(
    date: Date,
    therapistID: string,
    startTime: Time,
    endTime: Time,
  ): AppointmentSeries | undefined {
    const dateWeekday = date.getDay();
    let weekday : Weekday = Weekday.FRIDAY;

    switch (dateWeekday) {
      case 1: weekday = Weekday.MONDAY; break;
      case 2: weekday = Weekday.TUESDAY; break;
      case 3: weekday = Weekday.WEDNESDAY; break;
      case 4: weekday = Weekday.THURSDAY; break;
      case 5: weekday = Weekday.FRIDAY; break;
      default: break;
    }

    return this.searchAppointmentForDaylist(therapistID, weekday, startTime, date, endTime);
  }

  getAppointmentSeriesByPatient(patient: string): AppointmentSeries[] {
    let appointments: Appointment[] = [];
    this.elements.forEach((listWeekDay) => {
      appointments = appointments.concat(listWeekDay.appointments.filter((appointment) => appointment.patient === patient));
    });
    return Masterlist.removeDuplicates(appointments as AppointmentSeries[]);
  }

  getReplacementsByPatient(patient: string) : SingleAppointment[] {
    const appointments: SingleAppointment[] = [];
    this.elements.forEach((listWeekDay) => {
      const replacements = listWeekDay.appointments.filter(
        (appointment) => (appointment as AppointmentSeries).cancellations.some((c) => c.patient === patient),
      );
      replacements.forEach((appointment) => {
        (appointment as AppointmentSeries).cancellations.forEach((cancellation) => {
          if (cancellation.patient === patient) {
            appointments.push(new SingleAppointment(
              appointment.therapist,
              appointment.therapistID,
              appointment.patient,
              appointment.startTime,
              appointment.endTime,
              '',
              Dateconversions.convertReadableStringToDate(cancellation.date),
              false,
              false,
              false,
            ));
          }
        });
      });
    });
    return appointments;
  }

  public getSeriesAppointmentsConflicts(
    therapistId: string,
    date: Date,
    startTime: Time,
    endTime: Time,
  ): Appointment[] {
    const jsWeekdayToEnum: Record<number, Weekday> = {
      1: Weekday.MONDAY,
      2: Weekday.TUESDAY,
      3: Weekday.WEDNESDAY,
      4: Weekday.THURSDAY,
      5: Weekday.FRIDAY,
    };

    const currentWeekday = jsWeekdayToEnum[date.getDay()];
    if (!currentWeekday) return [];

    const listday = this.findListdayByDate(date);
    if (!listday) return [];

    const readableDate = Dateconversions.convertDateToReadableString(date);

    // Konvertiere zu Minuten für korrekte numerische Vergleiche
    // String-Vergleiche funktionieren bei Zeiten NICHT ("12:00" < "9:00" ist FALSE!)
    const searchStartMinutes = Dateconversions.timeToIndex(startTime) * 10;
    const searchEndMinutes = Dateconversions.timeToIndex(endTime) * 10;

    const conflictingAppointments = listday.appointments
    .filter((appointment) => {
      const series = appointment as AppointmentSeries;

      // Serien-Termin muss gültig sein
      const isSeriesInRange =
        series.startDate &&
        series.endDate &&
        series.startDate.getTime() <= date.getTime() &&
        series.endDate.getTime() >= date.getTime();
      if (!isSeriesInRange) return false;

      const isSameTherapist = series.therapistID === therapistId;

      // Konvertiere zu Minuten für numerische Vergleiche
      const seriesStartMinutes = Dateconversions.timeToIndex(series.startTime) * 10;
      const seriesEndMinutes = Dateconversions.timeToIndex(series.endTime) * 10;

      // Prüfe auf zeitliche Überschneidung:
      // Überschneidung existiert wenn: series.start < slot.end UND series.end > slot.start
      const startsBeforeSearchEnd = seriesStartMinutes < searchEndMinutes;
      const endsAfterSearchStart = seriesEndMinutes > searchStartMinutes;

      const sameWeekday = series.weekday.toLowerCase() === currentWeekday.toLowerCase();

      return (
        isSameTherapist &&
        startsBeforeSearchEnd &&
        endsAfterSearchStart &&
        sameWeekday
      );
    })
    .filter((appointment) => {
      const series = appointment as AppointmentSeries;
      // Filtere aus: Serien mit Stornierung an diesem Datum
      const hasCancellationOnDate = series.cancellations.some(
        (cancellation) => cancellation.date === readableDate
      );
      return !hasCancellationOnDate;
    });

    return conflictingAppointments;
  }

  private static removeDuplicates(appointmentList: AppointmentSeries[]): AppointmentSeries[] {
    const newAppointments: AppointmentSeries[] = [];
    appointmentList.forEach((appointmentToBeChecked) => {
      if (!newAppointments.find(
        (appointment) => (appointment.weekday === appointmentToBeChecked.weekday
          && appointment.startTime === appointmentToBeChecked.startTime && appointment.therapistID === appointmentToBeChecked.therapistID),
      )) {
        newAppointments.push(appointmentToBeChecked);
      }
    });
    return newAppointments;
  }

  addAppointment(appointment: AppointmentSeries): void {
    const currentDay = this.findListday(appointment.weekday);
    if (currentDay === undefined) {
      this.elements.push(new ListWeekDay([appointment], appointment.weekday));
    } else {
      currentDay.appointments.push(appointment);
    }
  }

  changeAppointment(appointment: AppointmentSeries): void {
    const currentDay = this.findListday(appointment.weekday);
    const appointmentToBeChanged = currentDay?.appointments.find(
      (searchedAppointment) => searchedAppointment.id === appointment.id,
    );
    if (currentDay && appointmentToBeChanged) {
      appointmentToBeChanged.patient = appointment.patient;
      appointmentToBeChanged.startTime = appointment.startTime;
      appointmentToBeChanged.endTime = appointment.endTime;
      // falls serien Termin gespeichert werden soll
      if (appointment.startDate) {
        (appointmentToBeChanged as AppointmentSeries).startDate = appointment.startDate;
        (appointmentToBeChanged as AppointmentSeries).endDate = appointment.endDate;
        (appointmentToBeChanged as AppointmentSeries).comment = appointment.comment;
        (appointmentToBeChanged as AppointmentSeries).interval = appointment.interval;
        (appointmentToBeChanged as AppointmentSeries).weekday = appointment.weekday;
        (appointmentToBeChanged as AppointmentSeries).isBWO = appointment.isBWO;
      }
      const newAppointments = currentDay.appointments.filter(
        (filterAppointment) => filterAppointment.id !== appointment.id,
      );
      newAppointments.push(appointment);
      currentDay.appointments = newAppointments;
    }
  }

  deleteAppointment(appointment: AppointmentSeries): void {
    const currentDay = this.findListday(appointment.weekday);
    if (currentDay) {
      const newAppointments = currentDay.appointments.filter(
        (filterAppointment) => filterAppointment.id !== appointment.id,
      );
      currentDay.appointments = newAppointments;
    }
  }

  addCancellation(date : string, patient: string, appointment : AppointmentSeries) : void {
    const currentDay = this.findListday(appointment.weekday);
    const appointmentToBeChanged = currentDay?.appointments.find(
      (searchedAppointment) => searchedAppointment.id === appointment.id,
    );
    if (currentDay && appointmentToBeChanged) {
      (appointmentToBeChanged as AppointmentSeries).cancellations.push(new Cancellation(date, patient));
      const newAppointments = currentDay.appointments.filter(
        (filterAppointment) => filterAppointment.id !== appointment.id,
      );
      newAppointments.push(appointment);
      currentDay.appointments = newAppointments;
    }
  }

  changeCancellation(date : string, patient: string, appointment: AppointmentSeries) : void {
    const currentDay = this.findListday(appointment.weekday);
    const appointmentToBeChanged = currentDay?.appointments.find(
      (searchedAppointment) => searchedAppointment.id === appointment.id,
    );
    if (currentDay && appointmentToBeChanged) {
      const newAppointment = (appointmentToBeChanged as AppointmentSeries);
      const cancellation = newAppointment.cancellations.find((c) => c.date === date);
      if (cancellation) {
        cancellation.patient = patient;
        const newCancellations = newAppointment.cancellations.filter((c) => c.date !== date);
        newCancellations.push(cancellation);
        newAppointment.cancellations = newCancellations;
        const newAppointments = currentDay.appointments.filter(
          (filterAppointment) => filterAppointment.id !== appointment.id,
        );
        newAppointments.push(newAppointment);
        currentDay.appointments = newAppointments;
      }
    }
  }

  removeCancellation(date : string, appointment : AppointmentSeries) : void {
    const currentDay = this.findListday(appointment.weekday);
    const appointmentToBeChanged = currentDay?.appointments.find(
      (searchedAppointment) => searchedAppointment.id === appointment.id,
    );
    if (currentDay && appointmentToBeChanged) {
      (appointmentToBeChanged as AppointmentSeries)
        .cancellations = (appointmentToBeChanged as AppointmentSeries).cancellations.filter((c) => c.date !== date);
      const newAppointments = currentDay.appointments.filter(
        (filterAppointment) => filterAppointment.id !== appointment.id,
      );
      newAppointments.push(appointmentToBeChanged);
      currentDay.appointments = newAppointments;
    }
  }

  private findListday(weekday: Weekday): ListWeekDay | undefined {
    return this.elements.find(
      (listday) => listday.weekday === weekday,
    );
  }

  private findListdayByDate(date: Date): ListWeekDay | undefined {
    const dayIndex = date.getDay(); // Gibt den Index des Wochentags (0 für Sonntag, 1 für Montag, usw.) zurück
    const weekdayMap: Record<number, Weekday> = {
      1: Weekday.MONDAY,
      2: Weekday.TUESDAY,
      3: Weekday.WEDNESDAY,
      4: Weekday.THURSDAY,
      5: Weekday.FRIDAY,
    };

    if (dayIndex >= 1 && dayIndex <= 5) {
      const weekday = weekdayMap[dayIndex];
      return this.elements.find(
        (listday) => listday.weekday === weekday,
      );
    }
    return undefined;
  }
}
