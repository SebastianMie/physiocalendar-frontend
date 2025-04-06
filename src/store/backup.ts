import Absence from '@/class/Absence';
import AppointmentSeries from '@/class/AppointmentSeries';
import { Weekday } from '@/class/Enums';
import Exception from '@/class/Exception';
import { JSONBackup } from '@/class/JSONStructures';
import SingleAppointment from '@/class/SingleAppointment';
import Therapist from '@/class/Therapist';
import axios from 'axios';
import {
  Action, Module, Mutation, VuexModule,
} from 'vuex-module-decorators';
import Backup from '../class/Backup';
import convertToBackup from './convertToBackup';
import convertToJSON from './convertToJSON';
import store from './index';

@Module({ name: 'StoreBackup', dynamic: true, store })
class StoreBackup extends VuexModule {
  public backup: Backup | null = null;

  @Action
  public async loadBackup(): Promise<void> {
    try {
      const responseData: JSONBackup = (await axios.get('http://localhost:4000/backup')).data as JSONBackup;
      const backup = convertToBackup(responseData);
      this.context.commit('setBackup', backup);
    } catch (err) {
      console.error(err);
      this.context.commit('setBackup', null);
    }
  }

  @Action
  public async saveBackup(importedBackup?: string): Promise<void> {
    if (this.backup) {
      // leere Einträge löschen
      this.backup.daylist.elements.forEach((element) => {
        element.appointments.forEach((app) => {
          if (app.patient === '' || app.patient === null) {
            this.deleteSingleAppointment(app as SingleAppointment);
          }
        });
      });
      try {
        const backupJSON = importedBackup ? JSON.parse(importedBackup) : convertToJSON(this.backup);
        await axios.put('http://localhost:4000/backup', backupJSON);
      } catch (err) {
        console.error(err);
      }
    }
  }

  @Action
  public addSingleAppointment(appointment: SingleAppointment): void {
    if (this.getBackup) {
      const localBackup = { ...this.getBackup };
      localBackup.daylist.addAppointment(appointment);
      this.setBackup(localBackup);
      this.saveBackup();
    }
  }

  @Action
  public changeSingleAppointment(appointment: SingleAppointment): void {
    if (this.getBackup) {
      const localBackup = { ...this.getBackup };
      localBackup.daylist.changeAppointment(appointment);
      this.setBackup(localBackup);
      this.saveBackup();
    }
  }

  @Action
  public deleteSingleAppointment(appointment: SingleAppointment): void {
    if (this.getBackup) {
      const localBackup = { ...this.getBackup };
      localBackup.daylist.deleteAppointment(appointment);
      this.setBackup(localBackup);
      this.saveBackup();
    }
  }

  @Action
  public addAppointmentSeries(appointment: AppointmentSeries): void {
    if (this.getBackup) {
      const localBackup = { ...this.getBackup };
      localBackup.masterlist.addAppointment(appointment);
      this.setBackup(localBackup);
      this.saveBackup();
    }
  }

  @Action
  public changeAppointmentSeries(appointment: AppointmentSeries): void {
    if (this.getBackup) {
      const localBackup = { ...this.getBackup };
      localBackup.masterlist.changeAppointment(appointment);
      this.setBackup(localBackup);
      this.saveBackup();
    }
  }

  @Action
  public deleteAppointmentSeries(appointment: AppointmentSeries): void {
    if (this.getBackup) {
      const localBackup = { ...this.getBackup };
      localBackup.masterlist.deleteAppointment(appointment);
      this.setBackup(localBackup);
      this.saveBackup();
    }
  }

  @Action
  public addCancellation({ date, patient, appointment }: { date: string, patient: string, appointment: AppointmentSeries }): void {
    if (this.getBackup) {
      const localBackup = { ...this.getBackup };
      localBackup.masterlist.addCancellation(date, patient, appointment);
      this.setBackup(localBackup);
      this.saveBackup();
    }
  }

  @Action
  public changeCancellation({ date, patient, appointment }: { date: string, patient: string, appointment: AppointmentSeries }): void {
    if (this.getBackup) {
      const localBackup = { ...this.getBackup };
      localBackup.masterlist.changeCancellation(date, patient, appointment);
      this.setBackup(localBackup);
      this.saveBackup();
    }
  }

  @Action
  public deleteCancellation({ date, appointment }: { date: string, appointment: AppointmentSeries }): void {
    if (this.getBackup) {
      const localBackup = { ...this.getBackup };
      localBackup.masterlist.removeCancellation(date, appointment);
      this.setBackup(localBackup);
      this.saveBackup();
    }
  }

  @Action
  public addTherapist({ name, id }: { name: string, id: string }): void {
    if (this.getBackup) {
      const localBackup = { ...this.getBackup };
      localBackup.therapists.push(new Therapist(name, id, new Date(), new Date(3471292800000), [], []));
      this.setBackup(localBackup);
      this.saveBackup();
    }
  }

  @Action
  public removeTherapist(id: string): void {
    if (this.getBackup) {
      const localBackup = { ...this.getBackup };
      localBackup.therapists = localBackup.therapists.filter((therapist) => therapist.id !== id);
      this.removeSeriesAppointmentsForTherapist(id);
      this.setBackup(localBackup);
      this.saveBackup();
    }
  }

  @Action
  public removeSeriesAppointmentsForTherapist(therapistID: string): void {
    if (this.getBackup) {
      const localBackup = { ...this.getBackup };

      // Alle Serientermine des Therapeuten entfernen
      localBackup.masterlist.elements = localBackup.masterlist.elements.map((element) => {
        // eslint-disable-next-line no-param-reassign
        element.appointments = element.appointments.filter(
          (appointment) => appointment.therapistID !== therapistID,
        );
        return element;
      });

      this.setBackup(localBackup);
      this.saveBackup();
    }
  }

  @Action
  public renameTherapist({ name, id }: { name: string, id: string }): void {
    if (this.getBackup) {
      const localBackup = { ...this.getBackup };
      const foundTherapist = localBackup.therapists.find((therapist) => therapist.id === id);
      if (foundTherapist) {
        localBackup.therapists[localBackup.therapists.indexOf(foundTherapist)].name = name;
        this.setBackup(localBackup);
        this.saveBackup();
      }
    }
  }

  static removeOldAbsences(absences: Absence[]): Absence[] {
    const now = new Date();
    // Bestimme das Datum, das genau einen Monat zurückliegt
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    return absences.filter((absence) => {
      if (!absence.day.includes('.')) {
        return true;
      }
      // Konvertiere den Tag (im Format "TT.MM.JJJJ") in ein Datum
      const [day, month, year] = absence.day.split('.').map(Number);
      const absenceDate = new Date(year, month - 1, day);
      // Behalte nur Absagen, die nicht älter als einen Monat sind
      return absenceDate >= oneMonthAgo;
    });
  }

  static removeDuplicateWeekdayAbsences(absences: Absence[]): Absence[] {
    const uniqueAbsences: Absence[] = [];
    absences.forEach((absence) => {
      // Wenn der Eintrag ein Datum enthält (z. B. "14.02.2023"), direkt übernehmen
      if (absence.day.includes('.')) {
        uniqueAbsences.push(absence);
      } else {
        // Für Wochentage: Prüfe, ob bereits ein Eintrag mit exakt gleichem day, start und end existiert
        const duplicate = uniqueAbsences.find((existing) => !existing.day.includes('.')
          && existing.day === absence.day
          && existing.start === absence.start
          && existing.end === absence.end);
        if (!duplicate) {
          uniqueAbsences.push(absence);
        }
      }
    });
    return uniqueAbsences;
  }

  @Action
  public setAbsencesForTherapistForDay({
    absences,
    therapistID,
    day,
  }: { absences: Absence[], therapistID: string, day: Weekday | string }): void {
    if (this.getBackup) {
      const localBackup = { ...this.getBackup };
      const foundTherapist = localBackup.therapists.find((therapist) => therapist.id === therapistID);
      if (foundTherapist) {
        // Bestehende Abwesenheiten für den Tag filtern
        let newAbsences = foundTherapist.absences.filter((abs) => abs.day !== day);
        // Füge die neuen Absenzen hinzu
        newAbsences = newAbsences.concat(absences);
        // Entferne alte Abwesenheiten, die älter als ein Monat sind
        newAbsences = StoreBackup.removeOldAbsences(newAbsences);
        newAbsences = StoreBackup.removeDuplicateWeekdayAbsences(newAbsences);
        localBackup.therapists[localBackup.therapists.indexOf(foundTherapist)].absences = newAbsences;
      }
      this.setBackup(localBackup);
      this.saveBackup();
    }
  }

  @Action
  public setExceptionsForTherapistForDay(
    { exceptions, therapistID, day }: { exceptions: Exception[], therapistID: string, day: Weekday | string },
  ): void {
    if (this.getBackup) {
      const localBackup = { ...this.getBackup };
      const foundTherapist = localBackup.therapists.find((therapist) => therapist.id === therapistID);
      if (foundTherapist) {
        let newExceptions = foundTherapist.exceptions.filter((abs) => abs.day !== day);
        newExceptions = newExceptions.concat(exceptions);
        localBackup.therapists[localBackup.therapists.indexOf(foundTherapist)].exceptions = newExceptions;
      }
      this.setBackup(localBackup);
      this.saveBackup();
    }
  }

  @Action
  public getFutureAppointmentsForTherapist(therapistID: string): SingleAppointment[] {
    if (!this.getBackup) return [];
    const localBackup = this.getBackup;
    const today = new Date();
    // Alle zukünftigen Einzeltermine filtern
    const futureSingleAppointments = localBackup.daylist.elements
      .flatMap((element) => element.appointments)
      .filter(
        (appointment) => appointment.therapistID === therapistID
          && appointment.date >= today,
      ) as SingleAppointment[];
    return [...futureSingleAppointments];
  }

  @Mutation
  public setBackup(newBackup?: Backup): void {
    if (newBackup) {
      this.backup = newBackup;
    } else {
      this.loadBackup();
    }
  }

  get getBackup(): Backup | null {
    return this.backup;
  }
}

export default StoreBackup;
