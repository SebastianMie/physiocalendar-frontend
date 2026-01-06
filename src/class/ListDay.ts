import Appointment from './Appointment';

export default class ListDay {
  appointments : Appointment[];

  constructor(
    appointments : Appointment[],
  ) {
    this.appointments = appointments;
  }
}
