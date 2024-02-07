import Daylist from './Daylist';
import Masterlist from './Masterlist';
import Patient from './Patient';
import Therapist from './Therapist';

export default class Backup {
  createdDate: Date;

  masterlist: Masterlist;

  daylist: Daylist;

  therapists: Therapist[];

  patients: Patient[];

  constructor(
    masterlist: Masterlist,
    daylist: Daylist,
    createdDate: Date,
    therapists: Therapist[],
    patients: Patient[],
  ) {
    this.masterlist = masterlist;
    this.daylist = daylist;
    this.createdDate = createdDate || new Date();
    this.therapists = therapists;
    this.patients = patients;
  }
}
