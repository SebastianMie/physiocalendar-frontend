import { v4 as uuidv4 } from 'uuid';
import Cancellation from './Cancellation';
import { Time } from './Enums';

export default class Appointment {
  id: string;

  therapist : string;

  therapistID : string;

  patient : string;

  startTime: Time;

  endTime: Time;

  comment: string;

  // macht keinen Sinn an der Stelle abe rum die Fehler zu bereinigen

  date: Date;

  cancellations: Cancellation[];

  weekday: string;

  constructor(
    therapist : string,
    therapistID : string,
    patient: string,
    startTime: Time,
    endTime: Time,
    comment: string,
    id? : string,
    date?: Date,
    weekday?: string,
    cancellations?: Cancellation[],
  ) {
    this.id = id || uuidv4();
    this.therapist = therapist;
    this.therapistID = therapistID;
    this.patient = patient;
    this.startTime = startTime;
    this.endTime = endTime;
    this.comment = comment;
    this.date = date || new Date('01.01.1975');
    this.weekday = weekday || '';
    this.cancellations = cancellations || [];
  }

  // eslint-disable-next-line class-methods-use-this
  calculateLength() : number {
    return parseInt(Time[this.endTime], 10) - parseInt(Time[this.startTime], 10);
  }
}
