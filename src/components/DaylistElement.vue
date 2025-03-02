<template>
  <v-dialog persistent v-model="dialogIsOpen" width="800">
    <template v-slot:activator="{ on, attrs }">
      <button
            type="button"
            @click="dialogIsOpen = true"
            v-bind="attrs"
            v-on="on"
            :class="{ 'cell-button': !isException }"
            >
      <span v-if="!isException"
          :class="{
            textcenter: true,
          }"
          >
          {{ patient }}
        </span>
      </button>
        <span v-if="isException"
          :class="{
            appointmentSeries: appointment.startDate,
            textcenter: !isException,
          }"
          >
          <div class="elementrow">
            <span>
            <button
            :class="{
            cancelled: isException,
            exception: isException,
            textcenter: true,
            }"
            type="button"
            v-bind="attrs"
            v-on="on">
            {{ patient }}
            </button>
          </span>
          </div>
          <div v-if="patient1 !== ''" class="ersatzpatientrow">
            <span>
            <button
            :class="{
            textcenter: true,
            }"
            type="button"
            @click="dialogIsOpen = true"
            v-bind="attrs"
            v-on="on">
             Info: {{ patient1 }}
            </button>>
          </span>
          </div>
          <div class="replacements" v-if="replacementAppointments.length > 0">
          <ul>
            <li v-for="appointment in replacementAppointments" :key="appointment.id">
              <button :class="{
                listentry: true,
                ishotair: appointment.isHotair,
                isultrasonic: appointment.isUltrasonic,
                iselectric: appointment.isElectric,
                singleAppointment:  !appointment.isElectric && !appointment.isUltrasonic && !appointment.isHotair,
              }"
              type="button"
              @click="openDialog(appointment)"
              >{{ appointment.patient }} {{ appointment.startTime }} - {{ appointment.endTime }}
             </button>
            </li>
          </ul>
        </div>
        </span>
    </template>
    <v-card>
      <v-card-title class="text-h5 grey lighten-2">
        {{ therapist }} - {{ weekday }} {{ date }} - {{ startTime }} bis
        {{ endTime }}
      </v-card-title>

      <v-card-text class="pt-4">
        <v-combobox
          :disabled="appointment.id != null"
          :value="patient"
          v-model="patientTextfield"
          :loading="patientsLoading"
          :items="foundPatients"
          :search-input.sync="searchValue"
          @input="searchAppointmentsForPatient($event)"
          class="mb-4 mt-0"
          flat
          hide-no-data
          hide-details
          clearable
          label="Name des Patienten"
        ></v-combobox>

        <v-select
          :disabled="!isSingleAppointment"
          :items="getAllTimes()"
          label="Start um"
          v-model="startTimeSelect"
          :value="appointment.startTime"
        ></v-select>

        <v-select
          :disabled="!isSingleAppointment"
          :items="getAllTimes()"
          label="Ende um"
          v-model="endTimeSelect"
          :value="appointment.endTime"
        ></v-select>

        <v-row v-if="!isSingleAppointment">
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
                  );
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

        <v-text-field
          label="Sonstige Bemerkungen"
          :value="appointment.comment"
          v-model="commentTextfield"
          clearable
        ></v-text-field>

        <v-row v-if="isSingleAppointment">
          <v-col>
            <v-checkbox
              label="Heißluft"
              v-model="isHotairField"
              :value="isHotairField"
            ></v-checkbox>
          </v-col>
          <v-col>
            <v-checkbox
              label="Ultraschall"
              v-model="isUltrasonicField"
              :value="isUltrasonicField"
            ></v-checkbox>
          </v-col>
          <v-col>
            <v-checkbox
              label="Elektro"
              v-model="isElectricField"
              :value="isElectricField"
            ></v-checkbox>
          </v-col>
        </v-row>
        <div v-if="!isSingleAppointment">
          <v-row no-gutters>
          <v-col cols="8">
          <v-alert type="warning"
            >Dieser Termin wurde aus der Stammliste generiert.
            Änderungen gelten für jeden weiteren Folgetermin der Serie!
          </v-alert>
          </v-col>
          <v-col cols="1"><v-spacer>  </v-spacer></v-col>
          <v-col cols="3">
          <center>
          <v-checkbox
            label="Termin fällt aus"
            v-model="isExceptionField"
            :value="isExceptionField"
          ></v-checkbox>
         </center>
         </v-col>
        </v-row>
        <v-row v-if="isException">
              <v-text-field
                label="Ersatzpatient 1"
                v-model="patientTextField1"
                :value="patient1"
                clearable
              ></v-text-field>
        </v-row>
        </div>
        <v-alert
          v-if="appointmentsForPatient.length > 0 && !appointment.startTime"
          type="info"
        >
          Unter diesem Namen wurden weitere Termine gefunden:
          <div
            v-for="appointment in appointmentsForPatient"
            :key="`${appointment.therapistID}-${appointment.startTime}-${weekday}`"
          >
            {{
              appointment.weekday
                ? appointment.weekday + "s"
                : convertDate(appointment.date)
            }}, {{ appointment.startTime }} bei
            {{ appointment.therapist }}
          </div>
        </v-alert>
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
          v-if="isSingleAppointment"
          color="error"
          text
          @click="deleteSingleAppointment()"
        >
          Einzeltermin löschen
        </v-btn>
        <v-spacer v-if="isSingleAppointment"></v-spacer>
        <v-btn
          v-if="true"
          color="warning"
          @click="printAppointment()"
          text
        >
          Drucken
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn
          v-if="id !== null"
          color="success"
          button
          @click="changeAppointment();
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
import Appointment from '@/class/Appointment';
import Printer from '@/class/Printer';
import {
  Component, Prop, Vue, Watch,
} from 'vue-property-decorator';
import { Time } from '@/class/Enums';
import Dateconversions from '@/class/Dateconversions';
import { getModule } from 'vuex-module-decorators';
import Backup from '@/class/Backup';
import SingleAppointment from '@/class/SingleAppointment';
import AppointmentSeries from '@/class/AppointmentSeries';
import holidaysJSON from '@/data/holidays.json';
import Util from '@/class/Util';
import Store from '../store/backup';

@Component
export default class DaylistElement extends Vue {
  @Prop({ default: '' }) readonly currDate!: string;

  @Prop({ default: '' }) readonly patient!: string;

  @Prop({ default: '' }) readonly patient1!: string;

  @Prop({ default: '' }) readonly startTime!: string;

  @Prop({ default: '' }) readonly endTime!: string;

  @Prop({ default: '' }) readonly comment!: string;

  @Prop({ default: '' }) readonly date!: string;

  @Prop({ default: '' }) readonly therapist!: string;

  @Prop({ default: '' }) readonly therapistID!: string;

  @Prop({ default: '' }) readonly isException!: boolean;

  @Prop({ default: '' }) readonly replacementPatient!: string;

  @Prop({ default: '' }) readonly appointment!: Appointment;

  @Prop({ default: '' }) readonly id!: string;

  @Prop({ default: '' }) readonly weekday!: string;

  @Prop({ default: false }) readonly isHotair!: boolean;

  @Prop({ default: false }) readonly isUltrasonic!: boolean;

  @Prop({ default: false }) readonly isElectric!: boolean;

  @Prop() readonly appointmentStartDate!: Date;

  @Prop() readonly appointmentEndDate!: Date;

  @Prop() readonly isSingleApp!: boolean;

  @Prop() readonly reqOnePatient!: boolean;

  store = getModule(Store);

  public dialogIsOpen = false;

  public startDatePickerIsOpen = false;

  public endDatePickerIsOpen = false;

  public currentDate = Dateconversions.convertReadableStringToDate(this.currDate);

  public patientTextfield = this.patient;

  public patientTextField1 = this.patient1;

  public startTimeSelect = this.startTime;

  public endTimeSelect = this.endTime;

  public commentTextfield = this.comment;

  public isExceptionField = !!this.isException;

  public isHotairField = !!this.isHotair;

  public isUltrasonicField = !!this.isUltrasonic;

  public isElectricField = !!this.isElectric;

  public showReplacementPatient1= true;

  appointmentsForPatient: Appointment[] = [];

  replacementAppointments: Appointment[] = [];

  public requireOnePatient = !!this.reqOnePatient;

  public requireTwoPatient = false;

  public isSingleAppointment = !!this.isSingleApp;

  public patientsLoading = false;

  public searchValue = '';

  public foundPatients : string[] = [];

  public holidays = holidaysJSON.days;

  public startDate = this.appointmentStartDate ? new Date(this.appointmentStartDate.getTime()) : new Date();

  public startDateString: string = new Date(
    this.startDate.getTime() - this.startDate.getTimezoneOffset() * 60000,
  ).toISOString().substr(0, 10);

  public startDateStringFormatted: string = Dateconversions.convertEnglishToGermanReadableString(this.startDateString);

  public endDate = this.appointmentEndDate ? new Date(this.appointmentEndDate.getTime()) : new Date();

  public endDateString: string = new Date(
    this.endDate.getTime() - this.endDate.getTimezoneOffset() * 60000,
  ).toISOString().substr(0, 10);

  public endDateStringFormatted: string = Dateconversions.convertEnglishToGermanReadableString(this.endDateString);

  get localBackup(): Backup | null {
    return this.store.getBackup;
  }

  mounted(): void {
    if (this.localBackup) {
      this.appointmentsForPatient = this.localBackup.daylist.getSingleAppointmentsByPatient(this.patient);
      this.appointmentsForPatient = this.appointmentsForPatient.concat(
        this.localBackup.masterlist.getAppointmentSeriesByPatient(this.patient),
      );
      if (this.isException) {
        this.fetchReplacementAppointments(this.appointment.therapistID, this.currentDate, this.appointment.startTime,
          this.appointment.endTime);
      }
    }
  }

  @Watch('searchValue')
  searchValueChanged(val: string | undefined): boolean {
    this.foundPatients = [];
    this.patientTextfield = val || this.patientTextfield;
    this.searchPatients(val);
    return val !== this.patientTextfield;
  }

  public searchAppointmentsForPatient(patient: string): void {
    if (this.localBackup) {
      let appointments: Appointment[] = this.localBackup.daylist.getSingleAppointmentsByPatient(patient);
      appointments = appointments.concat(this.localBackup.masterlist.getAppointmentSeriesByPatient(patient));
      appointments = appointments.concat(this.localBackup.masterlist.getReplacementsByPatient(patient));
      this.appointmentsForPatient = appointments;
    }
  }

  public fetchReplacementAppointments(therapistId: string, currentDate: Date, startTime: Time, endTime: Time): void {
    if (this.localBackup) {
      const singleAppointments = this.localBackup.daylist.getSingleAppointmentsByDateAndTimeframe(therapistId,
        currentDate, startTime, endTime);
      this.replacementAppointments = singleAppointments;
    }
  }

  public openDialog(appointment: SingleAppointment): void {
    console.log('Dialog öffnen Replacement:', appointment.patient);
    // Checkbox-Werte aus dem Appointment übernehmen
    this.isHotairField = appointment.isHotair;
    this.isUltrasonicField = appointment.isUltrasonic;
    this.isElectricField = appointment.isElectric;
    this.$emit('openDialog', { appointment });
  }

  public changeAppointmentSeries(): void {
    if ((this.appointment as AppointmentSeries).startDate) {
      console.log('speichern Serien Termin', this.isHotairField, this.isUltrasonicField, this.isElectricField);
      this.$emit('appointmentChanged', {
        patient: this.patientTextfield,
        therapist: this.therapist,
        therapistID: this.therapistID,
        startTime: this.startTimeSelect,
        endTime: this.endTimeSelect,
        comment: this.commentTextfield,
        startDate: this.startDate,
        endDate: this.endDate,
        cancellations: (this.appointment as AppointmentSeries).cancellations,
        interval: (this.appointment as AppointmentSeries).interval,
        id: this.id,
        weekday: (this.appointment as AppointmentSeries).weekday,
        isHotair: this.isHotairField,
        isUltrasonic: this.isUltrasonicField,
        isElectric: this.isElectricField,
        isBWO: (this.appointment as AppointmentSeries).isBWO,
      });
    }
    if (this.patientTextfield !== null) {
      if ((this.appointment as AppointmentSeries).startTime) {
        // eslint-disable-next-line
        if (this.isExceptionField !== this.isException) {
          if (this.isExceptionField) {
            // Serien Termin fällt aus
            this.$emit('exceptionAdded', {
              isException: this.isExceptionField,
              patient: this.patientTextField1,
              appointment: this.appointment as AppointmentSeries,
            });
            const button = document.querySelector('.button-element');
            if (button) {
              button.classList.toggle('button-element-exception');
            }
          } else {
            this.$emit('exceptionDeleted', {
              isException: !this.isExceptionField,
              patient: this.patientTextField1,
              appointment: this.appointment as AppointmentSeries,
            });
          }
        } else if (this.isExceptionField === this.isException) {
          this.$emit('exceptionChanged', {
            isException: this.isExceptionField,
            patient: this.patientTextField1,
            appointment: this.appointment as AppointmentSeries,
          });
        }
      }
    } else {
      this.$emit('appointmentDeleted', {
        patient: this.patient,
        therapist: this.therapist,
        therapistID: this.therapistID,
        startTime: this.startTimeSelect,
        endTime: this.endTimeSelect,
        comment: this.commentTextfield,
        id: this.id,
        isHotair: this.isHotairField,
        isUltrasonic: this.isUltrasonicField,
        isElectric: this.isElectricField,
      });
    }
  }

  public changeAppointment(): void {
    if (!this.isSingleAppointment) {
      this.changeAppointmentSeries();
    }
    if (this.isSingleAppointment) {
      if (this.localBackup) {
        // pruefen ob ausgewähltes Zeitfenster frei Einzeltermine
        const conflictSingleAppointments: Appointment[] = this.localBackup.daylist.getSingleAppointmentsConflicts(this.therapistID,
          this.startDate, this.startTimeSelect as unknown as Time, this.endTimeSelect as unknown as Time);
        // pruefen ob ausgewähltes Zeitfenster frei Serientermine
        const conflictSeriesAppointments: Appointment[] = this.localBackup.masterlist.getSeriesAppointmentsConflicts(this.therapistID,
          this.startDate, this.startTimeSelect as unknown as Time, this.endTimeSelect as unknown as Time);
        if (conflictSingleAppointments.length > 1 || conflictSeriesAppointments.length > 0) {
          /* eslint-disable */
          if (window.confirm('Die ausgewählte Zeit verursacht einen Konflikt mit einem bestehenden Termin. Bitte behebe den Konflikt vor dem Speichern.')) {
            	return;
          }
        }
        else {
          this.$emit('singleAppointmentChanged', {
          patient: this.patientTextfield,
          therapist: this.therapist,
          therapistID: this.therapistID,
          startTime: this.startTimeSelect,
          endTime: this.endTimeSelect,
          startDate: this.startDate,
          endDate: this.endDate,
          comment: this.commentTextfield,
          id: this.id,
          isHotair: this.isHotairField,
          isUltrasonic: this.isUltrasonicField,
          isElectric: this.isElectricField,
          });
        }
      }
    }
  }

  public checkTimeAvailable(date: Date,startTime: string, endTime: string): boolean {

   return false;
  }

  public addAppointment(): void {
    this.$emit('appointmentAdded', {
      patient: this.patientTextfield,
      therapist: this.therapist,
      therapistID: this.therapistID,
      startTime: this.startTimeSelect,
      endTime: this.endTimeSelect,
      comment: this.commentTextfield,
      isHotair: this.isHotairField,
      isUltrasonic: this.isUltrasonicField,
      isElectric: this.isElectricField,
    });
  }

  public addTwoRepPatient(): void {
    this.requireTwoPatient = true;
  }

  public deleteSingleAppointment(): void {
    /* eslint-disable */
    if (window.confirm('Soll dieser Termin wirklich unwiederruflich gelöscht werden?')) {
    // löschen eines single appointments
      this.$emit('appointmentDeleted', {
        patient: this.patient,
        therapist: this.therapist,
        therapistID: this.therapistID,
        startTime: this.startTimeSelect,
        endTime: this.endTimeSelect,
        comment: this.commentTextfield,
        id: this.id,
        isHotair: this.isHotairField,
        isUltrasonic: this.isUltrasonicField,
        isElectric: this.isElectricField,
      });
      this.requireOnePatient = false;
      this.requireTwoPatient = false;
      this.dialogIsOpen = false;
    }
  }

  public printAppointment(): void {
    const printer = new Printer(
      this.id,
      this.patient,
      this.therapist,
      this.startTime as unknown as Time,
      this.endTime as unknown as Time,
      Dateconversions.convertReadableStringToDate(this.date),
      (this.appointment as AppointmentSeries).interval,
      (this.appointment as AppointmentSeries).cancellations,
      (this.appointment as AppointmentSeries).startDate,
      (this.appointment as AppointmentSeries).endDate,
      new Date(),
    );
    if (this.isSingleAppointment) {
      printer.printSingleAppointment(this.appointmentsForPatient);
    }
    else {
      printer.printSeriesAppointment(this.appointmentsForPatient);
    }
  }

  public searchPatients(searchQuery : string | undefined) : void {
    if (searchQuery && searchQuery.length > 2 && this.localBackup) {
      this.patientsLoading = true;
      this.foundPatients = Util.searchPatientNames(this.localBackup, searchQuery);
      this.patientsLoading = false;
    }
  }

  // eslint-disable-next-line class-methods-use-this
  public convertDate(date: Date): string {
    return Dateconversions.convertDateToReadableString(date);
  }

  // eslint-disable-next-line class-methods-use-this
  public getAllTimes(): string[] {
    return Dateconversions.getAllTimes();
  }

  public dateIsAllowed(dateVal: string | Date): boolean {
    if (typeof dateVal === 'string') {
      if (this.holidays.includes(dateVal)) {
        return false;
      }
      const day = this.getCombinedStartDate(dateVal).getDay();
      return day > 0 && day < 6;
    }
    const readableString = Dateconversions.convertGermanToEnglishReadableString(Dateconversions.convertDateToReadableString(dateVal));
    if (this.holidays.includes(readableString)) {
      return false;
    }
    const day = dateVal.getDay();
    return day > 0 && day < 6;
  }

  public getCombinedStartDate(dateString: string): Date {
    const date = dateString;
    // console.log(dateString);
    const timezoneOffsetInHours = new Date(`${date}T00:00:00.000Z`).getTimezoneOffset() * -1;
    const offsetSuffix = `${timezoneOffsetInHours < 0 ? '-' : '+'}0${Math.abs(timezoneOffsetInHours / 60)}:00`;
    return new Date(`${date}T04:00:00.000${offsetSuffix}`);
  }

  public getCombinedEndDate(dateString: string): Date {
    const date = dateString;
    // console.log(dateString);
    const timezoneOffsetInHours = new Date(`${date}T00:00:00.000Z`).getTimezoneOffset() * -1;
    const offsetSuffix = `${timezoneOffsetInHours < 0 ? '-' : '+'}0${Math.abs(timezoneOffsetInHours / 60)}:00`;
    return new Date(`${date}T04:00:00.000${offsetSuffix}`);
  }

  private convertGermanToEnglishReadableString(string: string): string {
    return Dateconversions.convertGermanToEnglishReadableString(string);
  }

  private convertEnglishToGermanReadableString(string: string): string {
    return Dateconversions.convertEnglishToGermanReadableString(string);
  }

}
</script>

<style scoped>
.cancelled {
  text-decoration: line-through;
  width: 100%;
  height: 10%;
}
ul {
  list-style-type: none;
  margin: 0;
  padding: 0;
}
.ishotair {
  background-color: rgb(228, 150, 5);
}

.singleAppointment {
  background-color: rgb(255, 255, 255);
}

.iselectric {
  background-color: rgb(255, 61, 61);
}

.isultrasonic {
  background-color: lightskyblue;
}

.textcenter {
  width: 100%;
  height: 100%;
  text-align: center;
}

.exception {
  font-size: 10px;
  height: 20px;
  overflow: hidden;
  vertical-align: center;
  line-height: 20px;
  padding-top: 0;
}

.add-replacement {
  font-size: 10px;
  margin-left: 5px;
  margin-right: 5px;
  width: 20px;
  height: 20px;
  line-height: 20px;
  padding-top: 0;
  border: 1px solid black;
  display: inline;
}

.replacements {
  font-size: 10px;
  width: 100%px;
  height: 20px;
  line-height: 20px;
  margin-top: 10px;
  display: block;
}

.listentry {
  margin-top: 5px;
  margin-bottom: 5px;
  border: 1px solid black;
}

.appointmentSeries {
  flex-direction: column;
  text-align: center;
}

.elementrow {
  height: 20px;
  display: flex;
  flex-direction: row;
  align-items: center;
}
.ersatzpatientrow {
  margin-top: 5px;
  max-height: 50px;
  overflow: hidden;
  font-size: 10px;
  display: flex;
  flex-direction: row;
  align-items: left;
  border: 1px solid black;
}

.cell-button {
  width: 100%;
  height: 100%;
  padding: 0; /* Optional, um den Button-Innenabstand zu entfernen */
}
</style>
