// eslint-disable-next-line import/no-cycle
import Appointment from './Appointment';
import Dateconversions from './Dateconversions';
import { Time, Weekday } from './Enums';
import ListSingleDay from './ListSingleDay';
import SingleAppointment from './SingleAppointment';

export default class Daylist {
  elements: ListSingleDay[];

  constructor(
    elements: ListSingleDay[],
  ) {
    this.elements = elements;
  }

  searchAppointment(
    therapistID: string, dateString: string, startTime: Time, endTime? : Time | undefined,
  ): SingleAppointment | undefined {
    const currentDay = this.findListday(dateString);
    if (currentDay !== undefined) {
      return currentDay.appointments.find((appointment) => {
        if (appointment.therapistID !== therapistID) {
          return false;
        }
        return Dateconversions.appointmentIsInTimeInterval(appointment, startTime, endTime);
      }) as SingleAppointment;
    }
    return undefined;
  }

  public getSingleAppointmentsByDateAndTimeframe(therapistId: string, date: Date, startTime: Time, endTime: Time): SingleAppointment[] {
    const listday = this.findListday(date);
    if (listday) {
      const appointments = listday.appointments.filter((appointment) => appointment.therapistID === therapistId
        && Time[appointment.startTime] >= Time[startTime]
        && Time[appointment.endTime] <= Time[endTime]);
      if (appointments.length > 0) {
        return appointments as SingleAppointment[];
      }
    }
    return [];
  }

  getSingleAppointmentsByPatient(patient: string): SingleAppointment[] {
    const currentSearchDate = new Date();
    const endDate = new Date();
    let appointments: Appointment[] = [];
    endDate.setFullYear(currentSearchDate.getFullYear() + 1);
    while (currentSearchDate < endDate) {
      const currentListDay = this.findListday(currentSearchDate);
      if (currentListDay) {
        appointments = appointments.concat(currentListDay.appointments.filter((appointment) => appointment.patient === patient));
      }
      currentSearchDate.setDate(currentSearchDate.getDate() + 1);
    }
    return Daylist.removeDuplicates(appointments as SingleAppointment[]);
  }

  private static removeDuplicates(appointmentList: SingleAppointment[]): SingleAppointment[] {
    const newAppointments: SingleAppointment[] = [];
    appointmentList.forEach((appointmentToBeChecked) => {
      if (!newAppointments.find(
        (appointment) => (appointment.date === appointmentToBeChecked.date
          && appointment.startTime === appointmentToBeChecked.startTime
          && appointment.therapistID === appointmentToBeChecked.therapistID),
      )) {
        newAppointments.push(appointmentToBeChecked);
      }
    });
    return newAppointments;
  }

  getAppointmentConflicts(
    weekday: Weekday,
    therapistID: string,
    startTime: Time,
    endTime: Time,
    startDate: Date,
  ): SingleAppointment[] {
    const conflicts: SingleAppointment[] = [];
    let weekdayOffset = 1;

    switch (weekday) {
      case Weekday.MONDAY: weekdayOffset = 1; break;
      case Weekday.TUESDAY: weekdayOffset = 2; break;
      case Weekday.WEDNESDAY: weekdayOffset = 3; break;
      case Weekday.THURSDAY: weekdayOffset = 4; break;
      case Weekday.FRIDAY: weekdayOffset = 5; break;
      default: break;
    }

    const currentSearchDate = new Date(startDate);
    // eslint-disable-next-line no-mixed-operators
    currentSearchDate.setDate(currentSearchDate.getDate() + ((7 - currentSearchDate.getDay()) % 7 + weekdayOffset) % 7);

    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    while (currentSearchDate < endDate) {
      const conflictAppointmentOnStart = this.searchAppointment(
        therapistID,
        Dateconversions.convertDateToReadableString(currentSearchDate),
        startTime,
        endTime,
      );
      if (conflictAppointmentOnStart) {
        conflicts.push(conflictAppointmentOnStart);
      }
      currentSearchDate.setDate(currentSearchDate.getDate() + 7);
    }
    return conflicts;
  }

  addAppointment(appointment: SingleAppointment): void {
    const currentDay = this.findListday(appointment.date);
    if (currentDay === undefined) {
      this.elements.push(new ListSingleDay([appointment], appointment.date));
    } else {
      currentDay.appointments.push(appointment);
    }
  }

  changeAppointment(appointment: SingleAppointment): void {
    const currentDay = this.findListday(appointment.date);
    const appointmentToBeChanged = currentDay?.appointments.find(
      (searchedAppointment) => searchedAppointment.id === appointment.id,
    );
    if (currentDay && appointmentToBeChanged) {
      appointmentToBeChanged.patient = appointment.patient;
      appointmentToBeChanged.startTime = appointment.startTime;
      appointmentToBeChanged.endTime = appointment.endTime;
      appointmentToBeChanged.comment = appointment.comment;
      const newAppointments = currentDay.appointments.filter(
        (filterAppointment) => filterAppointment.id !== appointment.id,
      );
      newAppointments.push(appointment);
      currentDay.appointments = newAppointments;
    }
  }

  deleteAppointment(appointment: SingleAppointment): void {
    const currentDay = this.findListday(appointment.date);
    if (currentDay) {
      console.log('Deleted Appointment: ');
      console.log(appointment);
      const newAppointments = currentDay.appointments.filter(
        (filterAppointment) => filterAppointment.id !== appointment.id,
      );
      currentDay.appointments = newAppointments;
    }
  }

  private findListday(date: string | Date): ListSingleDay | undefined {
    let dateConverted: Date;
    if (typeof date === 'string') {
      dateConverted = Dateconversions.convertReadableStringToDate(date);
    } else {
      dateConverted = date;
    }
    return this.elements.find(
      (listday) => Dateconversions.datesAreEqual(listday.date, dateConverted),
    );
  }
}
