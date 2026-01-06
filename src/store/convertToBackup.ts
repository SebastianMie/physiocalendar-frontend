import Backup from '@/class/Backup';
import Daylist from '@/class/Daylist';
import {
  JSONAbsence,
  JSONBackup, JSONDaylist, JSONException, JSONMasterlist, JSONTherapist,
} from '@/class/JSONStructures';
import { Time, Weekday } from '@/class/Enums';
import ListSingleDay from '@/class/ListSingleDay';
import ListWeekDay from '@/class/ListWeekDay';
import Masterlist from '@/class/Masterlist';
import Therapist from '@/class/Therapist';
import AppointmentSeries from '@/class/AppointmentSeries';
import SingleAppointment from '@/class/SingleAppointment';
import Absence from '@/class/Absence';
import Exception from '@/class/Exception';

function getListWeekDays(listWeekDaysJSON: JSONMasterlist): ListWeekDay[] {
  const listWeekDays = listWeekDaysJSON.elements.map((jsonElement) => {
    const weekday = jsonElement.weekday as Weekday;
    const appointments = jsonElement.appointments.map(
      (jsonAppointment) => new AppointmentSeries(
        jsonAppointment.therapist, jsonAppointment.therapistID, jsonAppointment.patient, jsonAppointment.startTime as unknown as Time,
        jsonAppointment.endTime as unknown as Time, jsonAppointment.comment, false, false, false,
        weekday, jsonAppointment.interval, jsonAppointment.cancellations,
        new Date(jsonAppointment.startDate), new Date(jsonAppointment.endDate), jsonAppointment.id, jsonAppointment.isBWO || false,
      ),
    );
    return new ListWeekDay(appointments, weekday);
  });
  return listWeekDays;
}

function getListSingleDays(listSingleDaysJSON: JSONDaylist): ListSingleDay[] {
  const listSingleDays = listSingleDaysJSON.elements.map((jsonElement) => {
    const date = new Date(jsonElement.date);
    const appointments = jsonElement.appointments.map(
      (jsonAppointment) => new SingleAppointment(
        jsonAppointment.therapist, jsonAppointment.therapistID,
        jsonAppointment.patient, jsonAppointment.startTime as unknown as Time,
        jsonAppointment.endTime as unknown as Time, jsonAppointment.comment,
        date, jsonAppointment.isHotair, jsonAppointment.isUltrasonic, jsonAppointment.isElectric,
      ),
    );
    return new ListSingleDay(appointments, date);
  });
  return listSingleDays;
}

function getAbsencesForTherapist(absencesJSON: JSONAbsence[]) : Absence[] {
  const absences = absencesJSON.map((jsonElement) => {
    let day : Weekday | string;
    if (jsonElement.day.includes('.')) {
      day = jsonElement.day;
    } else {
      day = jsonElement.day as Weekday;
    }
    return new Absence(day, jsonElement.start as unknown as Time, jsonElement.end as unknown as Time);
  });
  return absences;
}

function getExceptionsForTherapist(exceptionsJSON: JSONException[]) : Exception[] {
  if (exceptionsJSON) {
    const exceptions = exceptionsJSON.map(
      (jsonElement) => new Exception(jsonElement.day, jsonElement.start as unknown as Time, jsonElement.end as unknown as Time),
    );
    return exceptions;
  }
  return [];
}

function getTherapists(therapistsJSON: JSONTherapist[]): Therapist[] {
  const therapists = therapistsJSON.map((jsonElement) => {
    // 315532800000 is "01.01.1980"
    const activeSinceDate = jsonElement.activeSince === -1 ? new Date(315532800000) : new Date(jsonElement.activeSince);
    // 3471292800000 is "01.01.2080"
    const activeUntilDate = jsonElement.activeUntil === -1 ? new Date(3471292800000) : new Date(jsonElement.activeUntil);
    return new Therapist(jsonElement.name, jsonElement.id,
      activeSinceDate, activeUntilDate, getAbsencesForTherapist(jsonElement.absences),
      getExceptionsForTherapist(jsonElement.exceptions));
  });
  return therapists;
}

export default function convertToBackup(responseData: JSONBackup): Backup {
  const createdDate = new Date(responseData.createdDate);
  const masterList = new Masterlist(getListWeekDays(responseData.masterlist));
  const dayList = new Daylist(getListSingleDays(responseData.daylist));
  const therapists = getTherapists(responseData.therapists);

  return new Backup(masterList, dayList, createdDate, therapists);
}
