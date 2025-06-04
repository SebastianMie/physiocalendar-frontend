// eslint-disable-next-line import/no-cycle
import { jsPDF as PrintPDF } from 'jspdf';
import holidaysJSON from '@/data/holidays.json';
import Dateconversions from './Dateconversions';
import { Time, Weekday } from './Enums';
import SingleAppointment from './SingleAppointment';
import Appointment from './Appointment';
import Cancellation from './Cancellation';
import AppointmentSeries from './AppointmentSeries';

export default class Printer {
  id: string;

  patient: string;

  therapist: string;

  startTime: Time;

  endTime: Time;

  day: Weekday | Date;

  interval: number;

  cancellations : Cancellation[];

  startDate: Date | undefined;

  endDate: Date | undefined;

  currentSingleDay: Date | undefined;

  MAX_APPOINTMENT_COUNT = 12;

  constructor(
    id: string,
    patient: string,
    therapist: string,
    startTime: Time,
    endTime: Time,
    day: Weekday | Date,
    interval: number,
    cancellations: Cancellation[] = [],
    startDate?: Date,
    endDate?: Date,
    currentSingleDay?: Date,
  ) {
    this.id = id;
    this.patient = patient;
    this.therapist = therapist;
    this.startTime = startTime;
    this.endTime = endTime;
    this.day = day;
    this.interval = interval;
    this.cancellations = cancellations;
    this.startDate = startDate;
    this.endDate = endDate;
    this.currentSingleDay = currentSingleDay;
  }

  printSingleAppointment(appointmentsForPatient: Appointment[]): void {
    const singleAppointments: SingleAppointment[] = appointmentsForPatient.filter(
      (appointment) => appointment instanceof SingleAppointment,
    ) as SingleAppointment[];
    // einzeltermine sortieren
    singleAppointments.sort((appointment1, appointment2) => {
      if (appointment1.date > appointment2.date) {
        return 1;
      }
      if (appointment1.date < appointment2.date) {
        return -1;
      }
      if (appointment1.startTime > appointment2.startTime) {
        return 1;
      }
      if (appointment1.startTime < appointment2.startTime) {
        return -1;
      }
      return 0;
    });
    let i = 0;
    const strs: string[] = [];
    let str = '';
    if (singleAppointments.length === 0) {
      return;
    }
    singleAppointments.forEach((appointment, j) => {
      if (this.currentSingleDay && appointment.date.getTime() >= this.currentSingleDay.getTime() - (24 * 3600000)) {
        if (i > 0 && i % this.MAX_APPOINTMENT_COUNT === 0) {
          strs.push(str);
          str = '';
        }
        const dateAsString = Dateconversions.convertDateToReadableString(appointment.date);
        const weekdayReadable = Printer.getWeekday(appointment.date);
        str += `${weekdayReadable}${dateAsString} um ${appointment.startTime}\n`;
        i += 1;
        if (j === singleAppointments.length - 1) {
          strs.push(str);
        }
      }
    });
    // single Appointments drucken
    if (singleAppointments.length !== 0) {
      this.print(strs);
    }
  }

  printSeriesAppointment(appointmentsForPatient: Appointment[]): void {
    const seriesAppointments: AppointmentSeries[] = appointmentsForPatient.filter(
      (appointment) => appointment instanceof AppointmentSeries,
    ) as AppointmentSeries[];

    if (seriesAppointments.length === 0) {
      return;
    }
    const seriesAppointmentToPrint = seriesAppointments.find((appointment) => appointment.id === this.id);
    if (!seriesAppointmentToPrint) {
      return;
    }
    let str = '';
    let i = 0;
    const {
      startDate,
      endDate,
      startTime,
      interval,
      cancellations,
      weekday,
    } = seriesAppointmentToPrint;
    if (this.currentSingleDay) {
      let currDate = new Date(startDate.getTime());
      if (currDate < this.currentSingleDay) {
        currDate = this.currentSingleDay;
        const targetWeekday = Object.values(Weekday).indexOf(weekday); // Den Ziel-Wochentag als numerischen Wert erhalten
        while (currDate.getDay() !== targetWeekday) {
          currDate.setDate(currDate.getDate() + 1);
        }
        currDate.setDate(currDate.getDate() + 1);
      }
      while (i < this.MAX_APPOINTMENT_COUNT) {
        const holidays = holidaysJSON.days;
        const dateString = Dateconversions.convertDateToReadableString(currDate);
        const weekdayReadable = Printer.getWeekday(currDate);
        const readableString = Dateconversions.convertGermanToEnglishReadableString(dateString);
        if (currDate.getTime() <= endDate.getTime() + (24 * 3600000)) {
          if (!holidays.includes(readableString)
            && !cancellations.some((c) => c.date === Dateconversions.convertDateToReadableString(currDate))) {
            str += `${weekdayReadable}${dateString} ab ${startTime}\n`;
            i += 1;
          }
          currDate.setDate(currDate.getDate() + interval * 7);
        } else {
          i += 1;
        }
      }
      this.print([str]);
    }
  }

  private print(pdfContents: string[]): void {
    const doc = new PrintPDF({ orientation: 'landscape' });

    pdfContents.forEach((pdfContent, i) => {
      const textOptions: { align: 'center' } = { align: 'center' };

      doc.setFontSize(16);
      doc.setDrawColor('#2a2f79');

      // Left outline box
      doc.line(5, 5, 143, 5);
      doc.line(5, 205, 5, 5);
      doc.line(143, 5, 143, 205);
      doc.line(5, 205, 143, 205);

      // Right outline box
      doc.line(153, 5, 291, 5);
      doc.line(153, 205, 153, 5);
      doc.line(291, 5, 291, 205);
      doc.line(153, 205, 291, 205);

      // Header for appointments
      const nextAppointment = 'IHRE NÄCHSTEN BEHANDLUNGSTERMINE';
      doc.setTextColor('#2a2f79');
      doc.text(nextAppointment, 74, 20, textOptions);
      doc.text(nextAppointment, 222, 20, textOptions);

      // Praxis information
      doc.setFontSize(12);
      const praxisHeader = 'Praxis Meyer\nAm Hans-Teich 16\n51674 Wiehl\nTelefon: 02262/797919';
      doc.text(praxisHeader, 74, 40, textOptions);
      doc.text(praxisHeader, 222, 40, textOptions);

      // Name of patient
      doc.setFontSize(14);
      doc.setTextColor('#000000');
      doc.text(`Name: ${this.patient}`, 74, 75, textOptions);
      doc.text(`Name: ${this.patient}`, 222, 75, textOptions);

      // Appointments
      doc.setTextColor('#000000');
      doc.text(pdfContent, 74, 85, textOptions);
      doc.text(pdfContent, 222, 85, textOptions);

      // Page number
      doc.setFontSize(10);
      doc.setTextColor('#000000');
      doc.text(`Seite ${i + 1} von ${pdfContents.length}`, 74, 160, textOptions);
      doc.text(`Seite ${i + 1} von ${pdfContents.length}`, 222, 160, textOptions);

      // Legal disclaimer
      // eslint-disable-next-line max-len
      const disclaimer = 'Bitte beachten Sie:\nFür unsere Patienten bemühen wir uns stets unsere Terminorganisation so effizient wie möglich zu gestalten. Eine Absage sollte daher nur in dringenden Fällen, spätestens jedoch 24 Stunden vor der Behandlung, erfolgen. Nicht rechtzeitig abgesagte Termine müssen wir Ihnen leider privat in Rechnung stellen.';
      doc.setTextColor('#2a2f79');
      doc.setFontSize(10);
      doc.text(doc.splitTextToSize(disclaimer, 120), 74, 175, textOptions);
      doc.text(doc.splitTextToSize(disclaimer, 120), 222, 175, textOptions);

      if (i < pdfContents.length - 1) {
        doc.addPage();
      }
    });

    doc.autoPrint();
    doc.output('dataurlnewwindow');
  }

  static getWeekday(date: Date): string {
    switch (date.getDay()) {
      case 0: return 'Sonntag, ';
      case 1: return 'Montag, ';
      case 2: return 'Dienstag, ';
      case 3: return 'Mittwoch, ';
      case 4: return 'Donnerstag, ';
      case 5: return 'Freitag, ';
      case 6: return 'Samstag, ';
      default: return '';
    }
  }
}
