import ListDay from './ListDay';
import SingleAppointment from './SingleAppointment';

export default class ListSingleDay extends ListDay {
  date : Date;

  constructor(
    appointments : SingleAppointment[],
    date: Date,
  ) {
    super(appointments);
    this.date = date;
  }
}
