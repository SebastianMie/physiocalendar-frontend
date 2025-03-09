<template>
  <div v-if="localBackup !== null">
    <v-simple-table style="margin-top: 16px" dense>
      <template v-slot:default>
        <thead>
          <tr>
            <th
              v-for="header in headers"
              :key="header.value"
              class="text-center text-subtitle-2"
            >
              <span v-if="header.text === ''">{{ header.text }}</span>
              <MasterlistHeader
                v-else
                :therapist="header.text"
                :therapistID="header.id"
                :head="header"
                :absences="header.absences"
                :date="currentWeekDay"
                :key="`${hash}-${header.id}`"
                @absencesChanged="saveAbsences($event)"
              />
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in rows" :key="row.name">
            <td
              v-for="header in headers.filter(header => header === '' || row[header.value] != undefined)"
              :key="header.value"
              :rowspan="calculateRowspan(row[header.value])"
              :class="{
                'text-center': true,
                'hour-begin': rowIndex % 6 === 0,
                'cell-series-appointment':
                  row[header.value] &&
                  row[header.value].patient &&
                  !row[header.value].isBWO,
                'cell-bwo':
                  row[header.value] &&
                  row[header.value].patient &&
                  row[header.value].isBWO,
                'cell-absence':
                  header.text !== '' && hasAbsenceInTime(header.id, rowIndex),
              }"
              @click="
                row[header.value] === ''
                  ? openCreateDialog(header.value, header.id, row.startTime)
                  : {}
              "
            >
              <span
                v-if="
                  typeof row[header.value] === 'string' &&
                  row[header.value].includes(':')
                "
                >{{ row[header.value] }}</span
              >
              <div
                v-else-if="row[header.value] === ''"
                class="create-appointment"
                @click="openCreateDialog(header.value, header.id, row.startTime)"
              ></div>
              <MasterlistElement
                v-else-if="row[header.value] && row[header.value].patient"
                :key="`${hash}-${row[header.value].therapistID}-${row.startTime}`"
                @appointmentAdded="addAppointment($event)"
                @appointmentChanged="changeAppointment($event)"
                @appointmentDeleted="deleteAppointment($event)"
                :patient="row[header.value].patient"
                :id="row[header.value].id"
                :therapist="row[header.value].therapist"
                :therapistID="row[header.value].therapistID"
                :appointmentStartDate="row[header.value].startDate"
                :appointmentEndDate="row[header.value].endDate"
                :startTime="row.startTime"
                :endTime="row[header.value].endTime"
                :comment="row[header.value].comment"
                :appointment="row[header.value]"
                :day="currentWeekDay"
              />
            </td>
          </tr>
        </tbody>
      </template>
    </v-simple-table>
    <v-dialog v-model="createDialog" width="600">
      <v-card>
        <v-card-title class="text-h5 grey lighten-2">
          {{ selectedAppointment.therapist }} -
          {{ currentWeekDay.toLowerCase() }}s - {{ selectedAppointment.startTime }}
        </v-card-title>

        <v-card-text class="pt-5">
          <v-combobox
            v-model="inputFields.patientTextfield"
            :loading="patientsLoading"
            :items="foundPatients"
            :search-input.sync="searchValue"
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
            v-model="inputFields.startTimeSelect"
          ></v-select>
          <v-select
            :items="getAllTimes()"
            label="Ende um"
            v-model="inputFields.endTimeSelect"
          ></v-select>
          <v-text-field
            label="Sonstige Bemerkungen"
            v-model="inputFields.commentTextfield"
            clearable
          ></v-text-field>
          <v-row class="pl-3">
            <v-checkbox
              label="BWO"
              v-model="inputFields.isBWO"
              :value="inputFields.isBWO"
            ></v-checkbox>
          </v-row>
           <v-row class="pl-3 pr-3">
            <v-text-field
              label="Wöchentliches Interval"
              type="number"
              :rules="[v => (v > 0 && v % 1 === 0)]"
              v-model="inputFields.interval"
              :value="inputFields.interval"
            ></v-text-field>
          </v-row>
          <v-row class="pl-3">
            <v-menu
              v-model="inputFields.startDatePickerIsOpen"
              :close-on-content-click="false"
              :nudge-right="40"
              transition="scale-transition"
              offset-y
              min-width="auto"
            >
              <template v-slot:activator="{ on, attrs }">
                <v-text-field
                  v-model="inputFields.startDateStringFormatted"
                  label="Start Datum"
                  persistent-hint
                  prepend-icon="mdi-calendar"
                  v-bind="attrs"
                  @blur="
                    inputFields.startDateString =
                      convertGermanToEnglishReadableString(
                        inputFields.startDateStringFormatted
                      )
                  "
                  v-on="on"
                ></v-text-field>
              </template>
              <v-date-picker
                v-model="inputFields.startDateString"
                :allowed-dates="
                  (dateVal) => {
                    return new Date(dateVal) >= new Date();
                  }
                "
                @input="
                  inputFields.startDatePickerIsOpen = false;
                  inputFields.startDate = getCombinedStartDate(inputFields.startDateString);
                  inputFields.endDateStringFormatted = convertEnglishToGermanReadableString(
                    inputFields.startDateString
                  );
                "
                locale="de-de"
              ></v-date-picker>
            </v-menu>
            <v-menu
              v-model="inputFields.endDatePickerIsOpen"
              :close-on-content-click="false"
              :nudge-right="40"
              transition="scale-transition"
              offset-y
              min-width="auto"
            >
              <template v-slot:activator="{ on, attrs }">
                <v-text-field
                  v-model="inputFields.endDateStringFormatted"
                  label="End Datum"
                  persistent-hint
                  prepend-icon="mdi-calendar"
                  v-bind="attrs"
                  @blur="
                    inputFields.endDateString =
                      convertGermanToEnglishReadableString(
                        inputFields.endDateStringFormatted
                      )
                  "
                  v-on="on"
                ></v-text-field>
              </template>
              <v-date-picker
                v-model="inputFields.endDateString"
                :allowed-dates="
                  (dateVal) => {
                    return new Date(dateVal) >= new Date();
                  }
                "
                @input="
                  inputFields.endDatePickerIsOpen = false;
                  inputFields.endDate = getCombinedEndDate(inputFields.endDateString);
                  inputFields.endDateStringFormatted = convertEnglishToGermanReadableString(
                    inputFields.endDateString
                );
                "
                locale="de-de"
              ></v-date-picker>
            </v-menu>
          </v-row>
          <v-alert v-if="conflicts.length > 0" type="error" class="mt-4"
            >Dieser Termin kann gespeichert werden, kollidiert aber mit folgenden
            Terminen:
            <ul>
              <li
                v-for="conflict in conflicts"
                :key="conflict.date.toLocaleDateString()"
              >
                {{ conflict.patient }} -
                {{ conflict.date.toLocaleDateString() }},
                {{ conflict.startTime }}
              </li>
            </ul>
          </v-alert>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions>
          <v-btn
            color="error"
            text
            @click="
              resetInputs();
              createDialog = false;
            "
          >
            Abbrechen
          </v-btn>
          <v-spacer></v-spacer>
          <v-spacer></v-spacer>
          <v-btn
            color="success"
            button
            @click="
              addAppointment({
                therapist: selectedAppointment.therapist,
                therapistID: selectedAppointment.therapistID,
                patient: inputFields.patientTextfield,
                startTime: inputFields.startTimeSelect,
                endTime: inputFields.endTimeSelect,
                interval: inputFields.interval,
                isBWO: inputFields.isBWO,
                comment: inputFields.commentTextfield,
                startDate: inputFields.startDate,
                endDate: inputFields.endDate,
              });
              resetInputs();
              createDialog = false;
            "
          >
            Speichern
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
  <div v-else>wird geladen</div>
</template>

<script lang="ts">
import { v4 as uuidv4 } from 'uuid';
import Absence from '@/class/Absence';
import AppointmentSeries from '@/class/AppointmentSeries';
import Cancellation from '@/class/Cancellation';
import Backup from '@/class/Backup';
import Dateconversions from '@/class/Dateconversions';
import { Time, Weekday } from '@/class/Enums';
import SingleAppointment from '@/class/SingleAppointment';
import {
  Component, Prop, Vue, Watch,
} from 'vue-property-decorator';
import { getModule } from 'vuex-module-decorators';
import Util from '@/class/Util';
import Store from '../store/backup';
import MasterlistElement from './MasterlistElement.vue';
import MasterlistHeader from './MasterlistHeader.vue';

@Component({
  components: {
    MasterlistElement,
    MasterlistHeader,
  },
})

export default class Masterlist extends Vue {
  @Prop() readonly currentWeekDay!: Weekday;

  createDialog = false;

  inputFields = {
    patientTextfield: '',
    startTimeSelect: '',
    endTimeSelect: '',
    commentTextfield: '',
    startDatePickerIsOpen: false,
    endDatePickerIsOpen: false,
    startDate: new Date(),
    endDate: new Date(),
    interval: 1,
    isBWO: false,
    startDateString: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().substr(0, 10),
    startDateStringFormatted: Dateconversions.convertEnglishToGermanReadableString(
      new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().substr(0, 10),
    ),
    endDateString: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().substr(0, 10),
    endDateStringFormatted: Dateconversions.convertEnglishToGermanReadableString(
      new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().substr(0, 10),
    ),
  }

  selectedAppointment = {
    therapist: '',
    therapistID: '',
    startTime: '7:00',
    weekday: this.currentWeekDay,
  };

  private conflicts: SingleAppointment[] = [];

  hash = uuidv4();

  store = getModule(Store);

  private headers: { text: string, value: string, id: string, absences: Absence[] }[] = [
    {
      text: '', value: 'startTime', id: '', absences: [],
    },
  ];

  private rows: {
    [key: string]: string | Time | AppointmentSeries | Absence[]
  }[] = [{ startTimeString: '' }];

  private patientsLoading = false;

  private searchValue = '';

  private foundPatients : string[] = [];

  get localBackup(): Backup | null {
    return this.store.getBackup;
  }

  @Watch('currentWeekDay')
  private currentWeekDayChanged(): void {
    this.createHeaders();
    this.createRows();
    this.hash = uuidv4();
  }

  @Watch('localBackup')
  private localBackupChanged(): void {
    this.createHeaders();
    this.createRows();
    this.hash = uuidv4();
  }

  @Watch('inputFields.startTimeSelect')
  private startTimeSelectChanged(): void {
    this.getAppointmentConflicts();
  }

  @Watch('inputFields.endTimeSelect')
  private endTimeSelectChanged(): void {
    this.getAppointmentConflicts();
  }

  @Watch('inputFields.startDateString')
  private dateChanged(): void {
    this.getAppointmentConflicts();
    this.inputFields.startDateStringFormatted = Dateconversions.convertEnglishToGermanReadableString(this.inputFields.startDateString);
  }

  @Watch('searchValue')
  searchValueChanged(val: string | undefined): boolean {
    this.foundPatients = [];
    this.inputFields.patientTextfield = val || this.inputFields.patientTextfield;
    this.searchPatients(val);
    return val !== this.inputFields.patientTextfield;
  }

  mounted(): void {
    this.createHeaders();
    this.createRows();
    this.hash = uuidv4();
  }

  private createHeaders(): void {
    if (this.localBackup !== null) {
      const today = new Date();
      const therapistHeaders = this.localBackup.therapists.filter(
        (therapist) => therapist.activeSince < today && therapist.activeUntil > today,
      ).map((therapist) => ({
        text: therapist.name,
        value: therapist.name,
        id: therapist.id,
        absences: therapist.absences.filter((abs) => abs.day === this.currentWeekDay),
      }));
      this.headers = [{
        text: '', value: 'startTime', id: '', absences: [new Absence('a', Time['7:00'], Time['7:00'])],
      }].concat(therapistHeaders);
    }
  }

  private createRows(): void {
    type TableRow = {
      [key: string]: string | Time | AppointmentSeries
    }

    const startTimes = Object.values(Time).filter((startTime): startTime is string => startTime.toString().includes(':'));
    const emptyRows = startTimes.map((startTime) => ({
      startTimeString: startTime.toString(),
      startTime: startTime as unknown as Time,
    }));

    this.rows = [];

    emptyRows.forEach((row) => {
      const newRow: TableRow = {
        startTimeString: row.startTimeString,
        startTime: row.startTime,
      };
      this.headers.forEach((header) => {
        if (header.text !== '' && !this.hasOngoingAppointments(header.value, row.startTime)) {
          const appointment = this.localBackup?.masterlist.searchAppointmentOnStartTime(header.id,
            this.currentWeekDay, row.startTime as Time);
          if (appointment && appointment.endDate >= new Date()) {
            newRow[header.text] = appointment;
          } else {
            newRow[header.text] = '';
          }
        }
      });
      this.rows.push(newRow);
    });
  }

  private hasOngoingAppointments(therapist : string, time: Time) : boolean {
    return this.rows.some((row) => {
      if (row[therapist] !== '') {
        try {
          const appointment = (row[therapist] as AppointmentSeries);
          if (Time[appointment.startTime] < Time[time] && Time[appointment.endTime] > Time[time]) {
            return true;
          }
        } catch (err) {
          return false;
        }
      }
      return false;
    });
  }

  private openCreateDialog(therapist: string, therapistID: string, startTime: string): void {
    this.selectedAppointment.therapist = therapist;
    this.selectedAppointment.therapistID = therapistID;
    this.selectedAppointment.startTime = startTime;
    const times = this.getAllTimes();
    const i = times.indexOf(startTime);
    this.inputFields.startTimeSelect = startTime;
    this.inputFields.endTimeSelect = i + 2 < times.length - 1 ? times[i + 2] : times[times.length - 1];
    this.createDialog = true;
    this.getAppointmentConflicts();
  }

  private getAppointmentConflicts(): void {
    if (this.localBackup && this.inputFields.endTimeSelect !== '') {
      this.conflicts = this.localBackup.daylist.getAppointmentConflicts(
        this.currentWeekDay,
        this.selectedAppointment.therapistID,
        this.inputFields.startTimeSelect !== this.selectedAppointment.startTime
          ? this.inputFields.startTimeSelect as unknown as Time : this.selectedAppointment.startTime as unknown as Time,
        this.inputFields.endTimeSelect as unknown as Time,
        this.inputFields.startDate,
        this.inputFields.endDate,
        this.inputFields.interval,
        [],
      );
    }
  }

  private resetInputs(): void {
    this.inputFields = {
      patientTextfield: '',
      startTimeSelect: '',
      endTimeSelect: '',
      commentTextfield: '',
      startDatePickerIsOpen: false,
      endDatePickerIsOpen: false,
      interval: 1,
      isBWO: false,
      startDate: new Date(),
      endDate: new Date(),
      startDateString: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().substr(0, 10),
      startDateStringFormatted: Dateconversions.convertEnglishToGermanReadableString(
        new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().substr(0, 10),
      ),
      endDateString: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().substr(0, 10),
      endDateStringFormatted: Dateconversions.convertEnglishToGermanReadableString(
        new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().substr(0, 10),
      ),
    };

    this.selectedAppointment = {
      therapist: '',
      therapistID: '',
      startTime: '7:00',
      weekday: this.currentWeekDay,
    };

    this.conflicts = [];
  }

  private addAppointment(
    event: { therapist: string, therapistID: string, patient: string, startTime: string, endTime: string, comment: string,
    startDate: Date, endDate: Date, id: string, isBWO: boolean, interval: number },
  ): void {
    const appointment = new AppointmentSeries(
      event.therapist,
      event.therapistID,
      event.patient,
      event.startTime as unknown as Time,
      event.endTime as unknown as Time,
      event.comment,
      false,
      false,
      false,
      this.currentWeekDay,
      event.interval,
      [],
      event.startDate,
      event.endDate,
      uuidv4(),
      event.isBWO,
    );
    if (this.localBackup) {
      this.store.addAppointmentSeries(appointment);
    }
    this.resetInputs();
  }

  private changeAppointment(
    event: {
      patient: string, therapist: string, therapistID: string, startTime: string, endTime: string, comment: string,
      cancellations: Cancellation[], startDate: Date, endDate: Date, id: string, isBWO: boolean, interval: number
    },
  ): void {
    const appointment = new AppointmentSeries(
      event.therapist,
      event.therapistID,
      event.patient,
      event.startTime as unknown as Time,
      event.endTime as unknown as Time,
      event.comment,
      false,
      false,
      false,
      this.currentWeekDay,
      event.interval,
      event.cancellations,
      event.startDate,
      event.endDate,
      event.id,
      event.isBWO,
    );
    if (this.localBackup) {
      this.store.changeAppointmentSeries(appointment);
    }
  }

  private deleteAppointment(
    event: {
      patient: string, therapist: string, therapistID: string, startTime: string, endTime: string, comment: string,
      cancellations: Cancellation[], startDate: Date, endDate: Date, id: string, isBWO: boolean, interval: number
    },
  ): void {
    if (this.localBackup) {
      const appointment = new AppointmentSeries(
        event.therapist,
        event.therapistID,
        event.patient,
        event.startTime as unknown as Time,
        event.endTime as unknown as Time,
        event.comment,
        false,
        false,
        false,
        this.currentWeekDay,
        event.interval,
        event.cancellations,
        event.startDate,
        event.endDate,
        event.id,
        event.isBWO,
      );
      this.store.deleteAppointmentSeries(appointment);
    }
  }

  private hasAbsenceInTime(therapistID: string, rowIndex: number): boolean {
    const therapist = this.headers.find((header) => header.id === therapistID);
    let hasAbsence = false;
    if (therapist) {
      therapist.absences.forEach((abs) => {
        if (parseInt(Time[abs.start], 10) <= rowIndex && parseInt(Time[abs.end], 10) >= rowIndex + 1) {
          hasAbsence = true;
        } else if (abs.end.toString() === '20:50' && rowIndex === 83) {
          hasAbsence = true;
        }
      });
    }
    return hasAbsence;
  }

  private saveAbsences(event: { absences: [{ start: string, end: string }], therapistID: string }): void {
    if (this.localBackup) {
      const absences = event.absences.map(
        (abs) => new Absence(this.currentWeekDay, abs.start as unknown as Time, abs.end as unknown as Time),
      );
      this.store.setAbsencesForTherapistForDay({ absences, therapistID: event.therapistID.slice(), day: this.currentWeekDay });
    }
  }

  private searchPatients(searchQuery : string | undefined) : void {
    if (searchQuery && searchQuery.length > 2 && this.localBackup) {
      this.patientsLoading = true;
      this.foundPatients = Util.searchPatientNames(this.localBackup, searchQuery);
      this.patientsLoading = false;
    }
  }

  // eslint-disable-next-line class-methods-use-this
  private calculateRowspan(appointment : string | AppointmentSeries) : number {
    if (typeof appointment === 'string') {
      return 1;
    }
    return appointment.calculateLength();
  }

  // eslint-disable-next-line class-methods-use-this
  private getAllTimes(): string[] {
    return Dateconversions.getAllTimes();
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
}

</script>

<style scoped>
th:first-child {
  border-left: 1px solid #2a2f79;
  border-right: 2px solid #2a2f79;
  border-top-left-radius: 15px;
}

th:last-child {
  border-top-right-radius: 15px;
}

tr:last-child td {
  border-bottom: 1px solid #2a2f79 !important;
}

tr:last-child td:first-child {
  border-bottom-left-radius: 15px;
}

tr:last-child td:last-child {
  border-bottom-right-radius: 15px;
}

th {
  border-top: 1px solid #2a2f79;
  border-right: 1px solid #2a2f79;
  padding-left: 0px !important;
  padding-right: 0px !important;
  color: black !important;
}

td {
  border-right: 1px solid #2a2f79;
  padding-left: 0px !important;
  padding-right: 0px !important;
  column-width: 300px;
  height: 24px !important;
}

td:hover {
  cursor: pointer;
  background-color: #b4b6d196 !important;
}

tr:hover {
  background-color: white !important;
}

tr td:first-child {
  border-left: 1px solid #2a2f79;
  border-right: 2px solid #2a2f79;
  font-weight: bold;
}

tr td:first-child:hover {
  background-color: white !important;
  cursor: default;
}

.cell-bwo {
  background-color: yellow;
}

.cell-series-appointment {
  background-color: lightgreen;
}

.cell-absence {
  background-color: #6c7272;
}

.cell-absence:hover {
  background-color: #6c7272 !important;
  cursor: default;
}

th:hover {
  cursor: pointer;
  background-color: #9e9eaa96;
}

.hour-begin {
  border-top: 2px ridge #2a2f79;
}

.create-appointment {
  width: 100%;
  height: 100%;
}
</style>
