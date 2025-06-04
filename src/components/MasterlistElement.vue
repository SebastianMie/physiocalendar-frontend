<template>
  <v-dialog persistent v-model="dialogIsOpen" width="600">
    <template v-slot:activator="{ on, attrs }">
      <button
        style="width: 100%; height: 100%"
        type="button"
        @click="dialogIsOpen = true"
        v-bind="attrs"
        v-on="on"
      >
        {{ patient }}
      </button>
    </template>

    <v-card>
      <v-card-title class="text-h5 grey lighten-2">
        {{ therapist }} - {{ day.toLowerCase() }}s - {{ startTime }} bis {{ endTime }}
      </v-card-title>

      <v-card-text class="pt-5">
        <v-combobox
          :value="patient"
          v-model="patientTextfield"
          :loading="patientsLoading"
          :items="foundPatients"
          :search-input.sync="searchValue"
          cache-items
          class="mb-4 mt-0"
          flat
          hide-no-data
          hide-details
          clearable
          label="Name des Patienten"
        ></v-combobox>

        <v-select
          :items="getAllTimes()"
          label="Start um"
          v-model="startTimeSelect"
          :value="startTime"
        ></v-select>

         <v-select
          :items="getAllTimes()"
          label="Ende um"
          v-model="endTimeSelect"
          :value="endTime"
        ></v-select>

        <v-text-field
          label="Sonstige Bemerkungen"
          :value="comment"
          v-model="commentTextfield"
          clearable
        ></v-text-field>

        <v-row class="pl-3 pr-3">
          <v-checkbox
            label="Patient ist aus BWO"
            v-model="isBWO"
            :value="isBWO"
          ></v-checkbox>
        </v-row>
        <v-row class="pl-3 pr-3">
          <v-text-field
            label="Wöchentliches Interval"
            type="number"
            :rules="[v => (v > 0 && v % 1 === 0)]"
            v-model="interval"
            :value="interval"
          ></v-text-field>
        </v-row>
        <v-row class="pl-3">
          <v-menu
            v-model="startDatePickerIsOpen"
            :close-on-content-click="false"
            :nudge-right="40"
            transition="scale-transition"
            offset-y
            min-width="auto"
          >
            <template v-slot:activator="{ on, attrs }">
              <v-text-field
                v-model="startDateStringFormatted"
                label="Start Datum"
                persistent-hint
                prepend-icon="mdi-calendar"
                v-bind="attrs"
                @blur="
                  startDateString = convertGermanToEnglishReadableString(
                    startDateStringFormatted
                  )
                "
                v-on="on"
              ></v-text-field>
            </template>
            <v-date-picker
              v-model="startDateString"
              :allowed-dates="dateIsAllowed"
              @input="
                startDatePickerIsOpen = false;
                startDate = getCombinedStartDate(startDateString);
                startDateStringFormatted = convertEnglishToGermanReadableString(
                  startDateString
                );
              "
              locale="de-de"
              :first-day-of-week="1"
            ></v-date-picker>
          </v-menu>
          <v-menu
            v-model="endDatePickerIsOpen"
            :close-on-content-click="false"
            :nudge-right="40"
            transition="scale-transition"
            offset-y
            min-width="auto"
          >
            <template v-slot:activator="{ on, attrs }">
              <v-text-field
                v-model="endDateStringFormatted"
                label="End Datum"
                persistent-hint
                prepend-icon="mdi-calendar"
                v-bind="attrs"
                @blur="
                  endDateString = convertGermanToEnglishReadableString(
                    endDateStringFormatted
                  )
                "
                v-on="on"
              ></v-text-field>
            </template>
            <v-date-picker
              v-model="endDateString"
              :allowed-dates="dateIsAllowed"
              @input="
                endDatePickerIsOpen = false;
                endDate = getCombinedEndDate(endDateString);
                endDateStringFormatted = convertEnglishToGermanReadableString(
                  endDateString
                );
              "
              locale="de-de"
              :first-day-of-week="1"
            ></v-date-picker>
          </v-menu>
        </v-row>
        <v-alert v-if="conflicts.length > 0" type="error" class="mt-4"
          >Dieser Termin kann gespeichert werden, kollidiert aber
          mit folgenden Terminen:
          <ul>
            <li
              v-for="conflict in conflicts"
              :key="conflict.date.toLocaleDateString()"
            >
              {{ conflict.patient }} - {{ conflict.date.toLocaleDateString() }},
              {{ conflict.startTime }}
            </li>
          </ul>
        </v-alert>
        <v-row>
          <ul>
            <li v-for="cancellation in cancellations" :key="cancellation.date">
              {{ cancellation.date }}
              <v-btn
                color="error"
                fab
                small
                @click="deleteCancellation(cancellation.date)"
              >
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </li>
          </ul>
        </v-row>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions>
        <v-btn
          color="normal"
          text
          @click="
            patientTextfield = patient;
            dialogIsOpen = false;
          "
        >
          Abbrechen
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn
          color="error"
          button
          @click="deleteAppointment();"
        >
          Löschen
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn
          color="warning"
          @click="printAppointment()"
          text
        >
          Drucken
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn
          color="success"
          button
          @click="
            patient !== '' ? changeAppointment() : addAppointment();
            dialogIsOpen = false;
          "
        >
          Speichern
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import AppointmentSeries from '@/class/AppointmentSeries';
import Appointment from '@/class/Appointment';
import Backup from '@/class/Backup';
import Dateconversions from '@/class/Dateconversions';
import Util from '@/class/Util';
import { Time, Weekday } from '@/class/Enums';
import Printer from '@/class/Printer';
import SingleAppointment from '@/class/SingleAppointment';
import {
  Component, Prop, Vue, Watch,
} from 'vue-property-decorator';
import { getModule } from 'vuex-module-decorators';
import holidaysJSON from '@/data/holidays.json';
import Store from '../store/backup';
import Cancellation from '../class/Cancellation';

@Component
export default class MasterlistElement extends Vue {
  @Prop() readonly patient!: string;

  @Prop() readonly startTime!: string;

  @Prop() readonly endTime!: string;

  @Prop() readonly therapist!: string;

  @Prop() readonly therapistID!: string;

  @Prop() readonly comment!: string;

  @Prop() readonly day!: Weekday;

  @Prop() readonly appointment!: AppointmentSeries;

  @Prop() readonly id!: string;

  @Prop() readonly appointmentStartDate!: Date;

  @Prop() readonly appointmentEndDate!: Date;

  store = getModule(Store);

  private appointmentPatient = this.appointment.patient;

  appointmentsForPatient: Appointment[] = [];

  public startDate = new Date(this.appointment?.startDate.getTime());

  public startDateString: string = new Date(
    this.startDate.getTime() - this.startDate.getTimezoneOffset() * 60000,
  ).toISOString().substr(0, 10);

  public startDateStringFormatted: string = Dateconversions.convertEnglishToGermanReadableString(this.startDateString);

  public endDate = this.appointmentEndDate ? new Date(this.appointmentEndDate.getTime()) : new Date(2524608000000);

  public endDateString: string = new Date(
    this.endDate.getTime() - this.endDate.getTimezoneOffset() * 60000,
  ).toISOString().substr(0, 10);

  public endDateStringFormatted: string = Dateconversions.convertEnglishToGermanReadableString(this.endDateString);

  private isBWO = this.appointment?.isBWO || false;

  private interval = this.appointment?.interval;

  private dialogIsOpen = false;

  public endDatePickerIsOpen = false;

  public startDatePickerIsOpen = false;

  private patientTextfield = this.appointmentPatient;

  private startTimeSelect = this.appointment.startTime;

  private endTimeSelect = this.appointment.endTime;

  private commentTextfield = this.appointment.comment || '';

  private conflicts: SingleAppointment[] = [];

  private holidays = holidaysJSON.days;

  private patientsLoading = false;

  private searchValue = '';

  private foundPatients : string[] = [];

  private cancellations : Cancellation[] = [];

  get localBackup(): Backup | null {
    return this.store.getBackup;
  }

  @Watch('dialogIsOpen')
  private dialogIsOpenChanged(): void {
    if (this.dialogIsOpen) {
      this.startDate = new Date(this.appointment?.startDate.getTime());
      this.endDate = new Date(this.appointment?.endDate.getTime());
      this.startDateString = new Date(
        this.startDate.getTime() - this.startDate.getTimezoneOffset() * 60000,
      ).toISOString().substr(0, 10);
      this.startDateStringFormatted = Dateconversions.convertEnglishToGermanReadableString(this.startDateString);
      this.endDateString = new Date(
        this.endDate.getTime() - this.endDate.getTimezoneOffset() * 60000,
      ).toISOString().substr(0, 10);
      this.endDateStringFormatted = Dateconversions.convertEnglishToGermanReadableString(this.endDateString);
      this.cancellations = this.showCancellations(this.appointment.cancellations);
      this.getAppointmentConflicts();
    }
  }

  @Watch('startTimeSelect')
  private startTimeSelectChanged(): void {
    this.getAppointmentConflicts();
  }

  @Watch('endTimeSelect')
  private endTimeSelectChanged(): void {
    this.getAppointmentConflicts();
  }

  @Watch('startDateString')
  private dateChanged(): void {
    this.getAppointmentConflicts();
    this.startDateStringFormatted = Dateconversions.convertEnglishToGermanReadableString(this.startDateString);
  }

  @Watch('searchValue')
  searchValueChanged(val: string | undefined): boolean {
    this.foundPatients = [];
    this.patientTextfield = val || this.patientTextfield;
    this.searchPatients(val);
    return val !== this.patientTextfield;
  }

  private dateIsAllowed(dateVal: string | Date): boolean {
    if (typeof dateVal === 'string') {
      if (this.holidays.includes(dateVal)) {
        return false;
      }
      const day = this.getCombinedDate(dateVal).getDay();
      return day > 0 && day < 6;
    }
    const readableString = Dateconversions.convertGermanToEnglishReadableString(Dateconversions.convertDateToReadableString(dateVal));
    if (this.holidays.includes(readableString)) {
      return false;
    }
    const day = dateVal.getDay();
    return day > 0 && day < 6;
  }

  private getAppointmentConflicts(): void {
    if (this.localBackup) {
      this.conflicts = this.localBackup.daylist.getAppointmentConflicts(
        this.day,
        this.therapistID,
        this.startTimeSelect !== this.appointment.startTime ? this.startTimeSelect : this.startTime as unknown as Time,
        this.endTimeSelect !== this.appointment.endTime ? this.endTimeSelect : this.endTime as unknown as Time,
        this.startDate,
        this.endDate,
        this.interval,
        this.cancellations,
      );
    }
  }

  private getCombinedDate(dateString?: string): Date {
    const date = dateString || this.startDateString;
    const timezoneOffsetInHours = new Date(`${date}T00:00:00.000Z`).getTimezoneOffset() * -1;
    const offsetSuffix = `${timezoneOffsetInHours < 0 ? '-' : '+'}0${Math.abs(timezoneOffsetInHours / 60)}:00`;
    return new Date(`${date}T04:00:00.000${offsetSuffix}`);
  }

  // eslint-disable-next-line class-methods-use-this
  public getCombinedStartDate(dateString: string): Date {
    const date = dateString;
    // console.log(dateString);
    const timezoneOffsetInHours = new Date(`${date}T00:00:00.000Z`).getTimezoneOffset() * -1;
    const offsetSuffix = `${timezoneOffsetInHours < 0 ? '-' : '+'}0${Math.abs(timezoneOffsetInHours / 60)}:00`;
    return new Date(`${date}T04:00:00.000${offsetSuffix}`);
  }

  // eslint-disable-next-line class-methods-use-this
  public getCombinedEndDate(dateString: string): Date {
    const date = dateString;
    // console.log(dateString);
    const timezoneOffsetInHours = new Date(`${date}T00:00:00.000Z`).getTimezoneOffset() * -1;
    const offsetSuffix = `${timezoneOffsetInHours < 0 ? '-' : '+'}0${Math.abs(timezoneOffsetInHours / 60)}:00`;
    return new Date(`${date}T04:00:00.000${offsetSuffix}`);
  }

  // eslint-disable-next-line class-methods-use-this
  private convertGermanToEnglishReadableString(string: string): string {
    return Dateconversions.convertGermanToEnglishReadableString(string);
  }

  // eslint-disable-next-line class-methods-use-this
  private convertEnglishToGermanReadableString(string: string): string {
    return Dateconversions.convertEnglishToGermanReadableString(string);
  }

  private changeAppointment(): void {
    if (this.patientTextfield !== '' && this.patientTextfield !== null) {
      this.$emit('appointmentChanged', {
        patient: this.patientTextfield,
        therapist: this.therapist,
        therapistID: this.therapistID,
        startTime: this.startTimeSelect,
        endTime: this.endTimeSelect,
        comment: this.commentTextfield,
        startDate: this.getCombinedDate(),
        endDate: this.endDate,
        cancellations: this.appointment.cancellations,
        interval: this.interval,
        id: this.id,
        isBWO: this.isBWO,
      });
    }
  }

  private addAppointment(): void {
    this.$emit('appointmentAdded', {
      patient: this.patientTextfield,
      therapist: this.therapist,
      therapistID: this.therapistID,
      startTime: this.startTimeSelect,
      endTime: this.endTimeSelect,
      comment: this.commentTextfield,
      startDate: this.startDate,
      endDate: this.endDate,
      interval: this.interval,
      isBWO: this.isBWO,
    });
  }

  public deleteAppointment(): void {
    /* eslint-disable */
    if (window.confirm('Soll dieser Serien Termin wirklich unwiederruflich gelöscht werden?')) {
    // löschen eines single appointments
    this.$emit('appointmentDeleted', {
        patient: this.patient,
        therapist: this.therapist,
        therapistID: this.therapistID,
        startTime: this.startTimeSelect,
        endTime: this.endTimeSelect,
        comment: this.commentTextfield,
        startDate: this.getCombinedDate(),
        cancellations: this.appointment.cancellations,
        interval: this.interval,
        id: this.id,
        isBWO: this.isBWO,
      });
      this.dialogIsOpen = false;
    }
  }

  private printAppointment(): void {
    const printer = new Printer(
      this.id,
      this.patient,
      this.therapist,
      this.startTime as unknown as Time,
      this.endTime as unknown as Time,
      this.day,
      this.interval,
      this.appointment.cancellations,
      new Date(this.appointment.startDate.getTime()),
      new Date(this.appointment.endDate.getTime()), 
      new Date(),
    );
    if (this.localBackup) {
      this.appointmentsForPatient = this.appointmentsForPatient.concat(
        this.localBackup.masterlist.getAppointmentSeriesByPatient(this.patient),
      );
      printer.printSeriesAppointment(this.appointmentsForPatient);
    }
  }

  private deleteCancellation(date: string): void {
    if (window.confirm('Soll dieser Termin Ausfall wirklich storniert werden? Einzeltermine in dem Zeitraum werden überschrieben')) {
    // löschen einer cancellation
    this.store.deleteCancellation({date: date, appointment: this.appointment});
    }
  }

  private showCancellations(cancellations: Cancellation[]): Cancellation[] {
     // Datum vor 4 Wochen
     const fourWeeksAgo = new Date();
     fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28); // 28 Tage entsprechen etwa 4 Wochen

    // Filtere die Cancellations, um nur diejenigen in der Gegenwart und Zukunft zu behalten
    const filteredCancellations = cancellations.filter(cancellation => {
      // Wandle das Datum im Format "TT.MM.JJJJ" in ein JavaScript-Date-Objekt um
      const [day, month, year] = cancellation.date.split('.').map(Number);
      const cancellationDate = new Date(year, month - 1, day); // Monat ist 0-basiert

      // Vergleiche das Cancellation-Datum mit dem heutigen Datum
      return cancellationDate >= fourWeeksAgo;
    });

    // Sortiere die Cancellations nach Datum in aufsteigender Reihenfolge
    filteredCancellations.sort((a, b) => {
      // Wandle das Datum im Format "TT.MM.JJJJ" in ein JavaScript-Date-Objekt um
      const [dayA, monthA, yearA] = a.date.split('.').map(Number);
      const dateA = new Date(yearA, monthA - 1, dayA).getTime(); // Monat ist 0-basiert

      const [dayB, monthB, yearB] = b.date.split('.').map(Number);
      const dateB = new Date(yearB, monthB - 1, dayB).getTime(); // Monat ist 0-basiert

      return dateA - dateB;
    });

    // Rückgabe der sortierten und gefilterten Cancellations
    return filteredCancellations;
  }

  private searchPatients(searchQuery : string | undefined) : void {
    if (searchQuery && searchQuery.length > 2 && this.localBackup) {
      this.patientsLoading = true;
      this.foundPatients = Util.searchPatientNames(this.localBackup, searchQuery);
      this.patientsLoading = false;
    }
  }

  // eslint-disable-next-line class-methods-use-this
  private getAllTimes(): string[] {
    return Dateconversions.getAllTimes();
  }
}
</script>

<style scoped lang="scss">
.radio-group-full-width {
  width: 100%;
}
</style>
