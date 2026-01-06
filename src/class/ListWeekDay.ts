import AppointmentSeries from './AppointmentSeries';
import { Weekday } from './Enums';
import ListDay from './ListDay';

export default class ListWeekDay extends ListDay {
  weekday : Weekday;

  constructor(
    appointments : AppointmentSeries[],
    weekday: Weekday,
  ) {
    super(appointments);
    this.weekday = weekday;
  }
}
