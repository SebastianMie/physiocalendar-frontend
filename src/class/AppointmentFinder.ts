import holidaysJSON from '@/data/holidays.json';
import AppointmentRequest from './AppointmentRequest';
import Dateconversions from './Dateconversions';
import Daylist from './Daylist';
import { Time, Weekday } from './Enums';
import Masterlist from './Masterlist';
import SingleAppointment from './SingleAppointment';
import Therapist from './Therapist';

export default class AppointmentFinder {
  patient: string;

  therapists: string[];

  therapistIDs: string[];

  appointmentsNeeded: number;

  appointmentLength: number;

  appointmentRequests: AppointmentRequest[];

  daylist: Daylist;

  masterlist: Masterlist;

  allTherapists: Therapist[];

  static APPOINTMENTS_PER_WEEK = 3;

  static ADDITIONAL_WEEKS = 3;

  static MAX_SEARCH_DATE_INTERVAL = 31536000000;

  static timeMapping = AppointmentRequest.timesOfDayToTimes();

  constructor(
    patient: string,
    therapists: string[],
    therapistIDs: string[],
    appointmentsNeeded: number,
    appointmentLength: number,
    appointmentRequests: AppointmentRequest[],
    daylist: Daylist,
    masterlist: Masterlist,
    allTherapists: Therapist[],
  ) {
    this.patient = patient;
    this.therapists = therapists;
    this.therapistIDs = therapistIDs;
    this.appointmentsNeeded = parseInt(appointmentsNeeded.toString(), 10);
    this.appointmentLength = appointmentLength;
    this.appointmentRequests = appointmentRequests;
    this.daylist = daylist;
    this.masterlist = masterlist;
    this.allTherapists = allTherapists;
  }

  getSuggestions(): SingleAppointment[] {
    let suggestions: SingleAppointment[] = [];
    const currentSearchDate = new Date();
    for (let i = 0;
      i < this.appointmentsNeeded + AppointmentFinder.ADDITIONAL_WEEKS
        && (currentSearchDate.getTime() - new Date().getTime() < AppointmentFinder.MAX_SEARCH_DATE_INTERVAL);
      i += 1) {
      currentSearchDate.setDate(currentSearchDate.getDate() + 7);
      const suggestionsForWeek = this.getSuggestionForWeek(currentSearchDate);
      if (suggestionsForWeek.length > 0) {
        suggestions = suggestions.concat(suggestionsForWeek);
      } else {
        i -= 1;
      }
    }
    const suggestionsReduced = suggestions.slice();
    return suggestionsReduced;
  }

  private getSuggestionForWeek(startDate: Date): SingleAppointment[] {
    let suggestions: SingleAppointment[] = [];
    this.therapists.forEach((therapist, i) => {
      this.appointmentRequests.every((request) => {
        const foundAppointments = this.getAppointmentForTherapistinRequest(
          therapist, this.therapistIDs[i], AppointmentFinder.timeMapping[request.timeOfDay], request.weekday, startDate,
        );
        suggestions = suggestions.concat(foundAppointments);
        if (suggestions.length >= AppointmentFinder.APPOINTMENTS_PER_WEEK) {
          return false;
        }
        return true;
      });
    });
    const suggestionsReduced = suggestions.slice(0, AppointmentFinder.APPOINTMENTS_PER_WEEK);
    suggestionsReduced.sort((suggestionA, suggestionB) => suggestionA.date.getTime() - suggestionB.date.getTime());
    return suggestionsReduced;
  }

  private getAppointmentForTherapistinRequest(
    therapist: string, therapistID: string, startTimes: string[], weekday: Weekday, startDate: Date,
  ): SingleAppointment[] {
    const foundAppointments: SingleAppointment[] = [];
    const searchingDate = AppointmentFinder.getNextDateForWeekday(weekday, startDate);
    startTimes.every((startTime) => {
      const therapistAbsences = this.allTherapists.find((thera) => thera.id === therapistID)?.absences;
      if (therapistAbsences) {
        const foundAbsences = therapistAbsences.find(
          (abs) => (Time[abs.start] <= Time[startTime as unknown as Time]
          && Time[abs.end] > Time[startTime as unknown as Time]
          && (abs.day === weekday || abs.day === Dateconversions.convertDateToReadableString(searchingDate))),
        );
        if (foundAbsences || holidaysJSON.days.includes(
          Dateconversions.convertGermanToEnglishReadableString(Dateconversions.convertDateToReadableString(searchingDate)),
        )) {
          return true;
        }
      }
      const endTime = Time[parseInt(Time[startTime as unknown as Time] + (this.appointmentLength / 10), 10)];
      const foundAppointment = this.daylist.searchAppointment(
        therapistID, Dateconversions.convertDateToReadableString(searchingDate),
        startTime as unknown as Time, endTime as unknown as Time,
      );
      if (foundAppointment === undefined) {
        const hasConflict = this.masterlist.getAppointmentConflict(
          searchingDate, therapistID, startTime as unknown as Time, endTime as unknown as Time,
        );
        if (!hasConflict) {
          foundAppointments.push(
            new SingleAppointment(therapist, therapistID, this.patient,
              startTime as unknown as Time, endTime as unknown as Time, '', new Date(searchingDate.getTime()), false, false, false),
          );
          return false;
        }
      }
      return true;
    });
    return foundAppointments;
  }

  private static getNextDateForWeekday(weekday: Weekday, startDate = new Date()) {
    let weekdayOffset = 1;
    const cleanStartDate = new Date(startDate);

    switch (weekday) {
      case Weekday.MONDAY: weekdayOffset = 1; break;
      case Weekday.TUESDAY: weekdayOffset = 2; break;
      case Weekday.WEDNESDAY: weekdayOffset = 3; break;
      case Weekday.THURSDAY: weekdayOffset = 4; break;
      case Weekday.FRIDAY: weekdayOffset = 5; break;
      default: break;
    }

    // eslint-disable-next-line no-mixed-operators
    cleanStartDate.setDate(cleanStartDate.getDate() + ((7 - cleanStartDate.getDay()) % 7 + weekdayOffset) % 7);
    return cleanStartDate;
  }
}
