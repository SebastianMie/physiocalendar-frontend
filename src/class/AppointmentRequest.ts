import { TimeOfDay, Weekday } from './Enums';

export default class AppointmentRequest {
  weekday: Weekday;

  timeOfDay: TimeOfDay;

  constructor(
    weekday: Weekday,
    timeOfDay: TimeOfDay,
  ) {
    this.weekday = weekday;
    this.timeOfDay = timeOfDay;
  }

  static generateAll(): AppointmentRequest[] {
    return [
      new AppointmentRequest(Weekday.MONDAY, TimeOfDay.MORNING),
      new AppointmentRequest(Weekday.MONDAY, TimeOfDay.FORENOON),
      new AppointmentRequest(Weekday.MONDAY, TimeOfDay.NOON),
      new AppointmentRequest(Weekday.MONDAY, TimeOfDay.AFTERNOON),
      new AppointmentRequest(Weekday.MONDAY, TimeOfDay.EVENING),
      new AppointmentRequest(Weekday.TUESDAY, TimeOfDay.MORNING),
      new AppointmentRequest(Weekday.TUESDAY, TimeOfDay.FORENOON),
      new AppointmentRequest(Weekday.TUESDAY, TimeOfDay.NOON),
      new AppointmentRequest(Weekday.TUESDAY, TimeOfDay.AFTERNOON),
      new AppointmentRequest(Weekday.TUESDAY, TimeOfDay.EVENING),
      new AppointmentRequest(Weekday.WEDNESDAY, TimeOfDay.MORNING),
      new AppointmentRequest(Weekday.WEDNESDAY, TimeOfDay.FORENOON),
      new AppointmentRequest(Weekday.WEDNESDAY, TimeOfDay.NOON),
      new AppointmentRequest(Weekday.WEDNESDAY, TimeOfDay.AFTERNOON),
      new AppointmentRequest(Weekday.WEDNESDAY, TimeOfDay.EVENING),
      new AppointmentRequest(Weekday.THURSDAY, TimeOfDay.MORNING),
      new AppointmentRequest(Weekday.THURSDAY, TimeOfDay.FORENOON),
      new AppointmentRequest(Weekday.THURSDAY, TimeOfDay.NOON),
      new AppointmentRequest(Weekday.THURSDAY, TimeOfDay.AFTERNOON),
      new AppointmentRequest(Weekday.THURSDAY, TimeOfDay.EVENING),
      new AppointmentRequest(Weekday.FRIDAY, TimeOfDay.MORNING),
      new AppointmentRequest(Weekday.FRIDAY, TimeOfDay.FORENOON),
      new AppointmentRequest(Weekday.FRIDAY, TimeOfDay.NOON),
      new AppointmentRequest(Weekday.FRIDAY, TimeOfDay.AFTERNOON),
      new AppointmentRequest(Weekday.FRIDAY, TimeOfDay.EVENING),
    ];
  }

  static timesOfDayToTimes(): {
    Morgens: string[];
    Vormittags: string[];
    Mittags: string[];
    Nachmittags: string[];
    Abends: string[];
    } {
    return {
      [TimeOfDay.MORNING]: [
        '7:00', '7:10', '7:20',
        '7:30', '7:40', '7:50',
        '8:00', '8:10', '8:20',
        '8:30', '8:40', '8:50',
        '9:00', '9:10', '9:20',
        '9:30', '9:40', '9:50',
      ],
      [TimeOfDay.FORENOON]: [
        '10:00', '10:10', '10:20',
        '10:30', '10:40', '10:50',
        '11:00', '11:10', '11:20',
        '11:30', '11:40', '11:50',
      ],
      [TimeOfDay.NOON]: [
        '12:00', '12:10', '12:20',
        '12:30', '12:40', '12:50',
        '13:00', '13:10', '13:20',
        '13:30', '13:40', '13:50',
        '14:00', '14:10', '14:20',
        '14:30', '14:40', '14:50',
      ],
      [TimeOfDay.AFTERNOON]: [
        '15:00', '15:10', '15:20',
        '15:30', '15:40', '15:50',
        '16:00', '16:10', '16:20',
        '16:30', '16:40', '16:50',
        '17:00', '17:10', '17:20',
        '17:30', '17:40', '17:50',
      ],
      [TimeOfDay.EVENING]: [
        '18:00', '18:10', '18:20',
        '18:30', '18:40', '18:50',
        '19:00', '19:10', '19:20',
        '19:30', '19:40', '19:50',
      ],
    };
  }
}
