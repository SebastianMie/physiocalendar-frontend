import { Time, Weekday } from './Enums';

export default class Absence {
  day: Weekday | string;

  start : Time;

  end : Time;

  constructor(
    day: Weekday | string,
    start : Time,
    end : Time,
  ) {
    this.day = day;
    this.start = start;
    this.end = end;
  }
}
