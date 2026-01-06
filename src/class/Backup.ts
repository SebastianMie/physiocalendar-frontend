import Daylist from './Daylist';
import Masterlist from './Masterlist';
import Therapist from './Therapist';

export default class Backup {
  createdDate: Date;

  masterlist: Masterlist;

  daylist: Daylist;

  therapists: Therapist[];

  constructor(
    masterlist: Masterlist,
    daylist: Daylist,
    createdDate: Date,
    therapists: Therapist[],
  ) {
    this.masterlist = masterlist;
    this.daylist = daylist;
    this.createdDate = createdDate || new Date();
    this.therapists = therapists;
  }
}
