export enum Weekday {
  MONDAY = 'Montag',
  TUESDAY = 'Dienstag',
  WEDNESDAY = 'Mittwoch',
  THURSDAY = 'Donnerstag',
  FRIDAY = 'Freitag'
}

export enum TimeOfDay {
  MORNING = 'Morgens',
  FORENOON = 'Vormittags',
  NOON = 'Mittags',
  AFTERNOON = 'Nachmittags',
  EVENING = 'Abends'
}

export enum Time {
  '7:00',
  '7:10',
  '7:20',
  '7:30',
  '7:40',
  '7:50',
  '8:00',
  '8:10',
  '8:20',
  '8:30',
  '8:40',
  '8:50',
  '9:00',
  '9:10',
  '9:20',
  '9:30',
  '9:40',
  '9:50',
  '10:00',
  '10:10',
  '10:20',
  '10:30',
  '10:40',
  '10:50',
  '11:00',
  '11:10',
  '11:20',
  '11:30',
  '11:40',
  '11:50',
  '12:00',
  '12:10',
  '12:20',
  '12:30',
  '12:40',
  '12:50',
  '13:00',
  '13:10',
  '13:20',
  '13:30',
  '13:40',
  '13:50',
  '14:00',
  '14:10',
  '14:20',
  '14:30',
  '14:40',
  '14:50',
  '15:00',
  '15:10',
  '15:20',
  '15:30',
  '15:40',
  '15:50',
  '16:00',
  '16:10',
  '16:20',
  '16:30',
  '16:40',
  '16:50',
  '17:00',
  '17:10',
  '17:20',
  '17:30',
  '17:40',
  '17:50',
  '18:00',
  '18:10',
  '18:20',
  '18:30',
  '18:40',
  '18:50',
  '19:00',
  '19:10',
  '19:20',
  '19:30',
  '19:40',
  '19:50',
  '20:00',
  '20:10',
  '20:20',
  '20:30',
  '20:40',
  '20:50'
}

export function nextTime(time: Time): Time {
  const timeString = time.toString();
  if (timeString === '20:50') {
    return '7:00' as unknown as Time;
  }

  let hour = timeString.split(':')[0];
  let minute = timeString.split(':')[1];

  if (minute === '00') {
    minute = '20';
  } else if (minute === '20') {
    minute = '40';
  } else {
    minute = '00';
    hour = (parseInt(hour, 10) + 1).toString();
  }

  return `${hour}:${minute}` as unknown as Time;
}
