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
      console.log(appointment);
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

  @Action
  public setAbsencesForTherapistForDay(
    { absences, therapistID, day }: { absences: Absence[], therapistID: string, day: Weekday | string },
  ): void {
    if (this.getBackup) {
      const localBackup = { ...this.getBackup };
      const foundTherapist = localBackup.therapists.find((therapist) => therapist.id === therapistID);
      if (foundTherapist) {
        let newAbsences = foundTherapist.absences.filter((abs) => abs.day !== day);
        newAbsences = newAbsences.concat(absences);
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
