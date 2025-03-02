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
                <DaylistHeader
                  :therapist="header.text"
                  :therapistID="header.id"
                  :head="header"
                  :dayAbsences="header.absences.filter((abs) => abs.day.includes('.'))"
                  :masterlistAbsences="header.absences.filter((abs) => !abs.day.includes('.'))"
                  :exceptions="header.exceptions"
                  :date="currentSingleDay"
                  :key="`${hash}-${header.id}`"
                  @absencesChanged="saveAbsences($event)"
                  @exceptionsChanged="saveExceptions($event)"
                />
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in rows" :key="row.name">
            <td
          v-for="header, headerIndex in headers.filter(header => header === '' || row[header.value] != undefined)"
          :key="header.value"
          :id="`cell_${rowIndex}_${headerIndex}`"
          :rowspan="calculateRowspan(row[header.value])"
          :isException="isCellException(row[header.value],`cell_${rowIndex}_${headerIndex}`)"
          :class="{
            'text-center': true,
            'hour-begin': rowIndex % 6 === 0,
            'cell-filled':
              row[header.value] &&
              row[header.value].patient &&
              row[header.value].startDate,
            'cell-bwo':
              row[header.value] &&
              row[header.value].patient &&
              row[header.value].isBWO,
            'cell-hotair':
              row[header.value] &&
              row[header.value].patient &&
              row[header.value].isHotair,
            'cell-ultrasonic':
              row[header.value] &&
              row[header.value].patient &&
              row[header.value].isUltrasonic,
            'cell-electric':
              row[header.value] &&
              row[header.value].patient &&
              row[header.value].isElectric,
            'cell-absence':
              header.text !== '' && hasAbsenceInTime(header.id, rowIndex),
            'cell-saturday':
              convertStringToDate(currentSingleDay).getDay() === 6 && !(typeof row[header.value] === 'string' &&
              row[header.value].includes(':'))
          }"
            @click="openCreateDialog(header.value, header.id, row.startTime)"
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
            <DaylistElement
              v-else-if="row[header.value] && row[header.value].patient"
              :key="`${hash}-${row[header.value].therapistID}-${row.startTime}`"
              @appointmentAdded="addAppointment($event)"
              @appointmentChanged="changeAppointment($event)"
              @singleAppointmentChanged="changeSingleAppointment($event)"
              @appointmentDeleted="deleteAppointment($event)"
              @exceptionAdded="addException($event)"
              @exceptionChanged="changeException($event)"
              @exceptionDeleted="deleteException($event)"
              @openDialog="showDialog($event)"
              :currDate="currentSingleDay"
              :patient="row[header.value].patient"
              :id="row[header.value].id"
              :comment="row[header.value].comment"
              :therapist="row[header.value].therapist"
              :therapistID="row[header.value].therapistID"
              :isException="row[header.value].startDate
               ? row[header.value].cancellations.some((c) => c.date === currentSingleDay) : false"
              :isHotair="row[header.value].startDate ? false : row[header.value].isHotair"
              :isUltrasonic="row[header.value].startDate ? false : row[header.value].isUltrasonic"
              :isElectric="row[header.value].startDate ? false : row[header.value].isElectric"
              :startTime="row.startTime"
              :endTime="row[header.value].endTime"
              :patient1="row[header.value].startDate ? getPatient(row[header.value].cancellations) : ''"
              :reqOnePatient="row[header.value].cancellations ? true : false"
              :isSingleApp="row[header.value] && row[header.value].patient && !row[header.value].startDate"
              :appointment="row[header.value]"
              :appointmentStartDate="row[header.value].startDate"
              :appointmentEndDate="row[header.value].endDate"
              :date="row[header.value].startDate ? `seit ${convertDateToString(row[header.value].startDate)}` : currentSingleDay"
              :weekday="weekday"
            />
           </td>
            </tr>
          </tbody>
        </template>
      </v-simple-table>
      <v-dialog v-model="openSingleAppointmentDialog" width="800">
              <v-card>
        <v-card-title class="text-h5 grey lighten-2">
          {{ selectedAppointment.therapist }} - {{ weekday }} {{ currentSingleDay }} -
          {{ singleAppointmentToOpen.startTime }}
        </v-card-title>
        <v-card-text class="pt-5">
          <v-combobox
            v-model="singleAppointmentToOpen.patient"
            @input="searchAppointmentsForPatient($event)"
            :disabled="true"
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
          v-model="singleAppointmentToOpen.startTime"
          :value="singleAppointmentToOpen.startTime"
          ></v-select>

          <v-select
          :items="getAllTimes()"
          label="Ende um"
          v-model="singleAppointmentToOpen.endTime"
          :value="singleAppointmentToOpen.endTime"
          ></v-select>
          <v-text-field
            label="Sonstige Bemerkungen"
            v-model="singleAppointmentToOpen.comment"
            clearable
          ></v-text-field>
          <v-row>
            <v-col>
              <v-checkbox
                label="Heißluft"
                v-model="singleAppointmentToOpen.isHotair"
              ></v-checkbox>
            </v-col>
            <v-col>
              <v-checkbox
                label="Ultraschall"
                v-model="singleAppointmentToOpen.isUltrasonic"
              ></v-checkbox>
            </v-col>
            <v-col>
              <v-checkbox
                label="Elektro"
                v-model="singleAppointmentToOpen.isElectric"
              ></v-checkbox>
            </v-col>
          </v-row>
        </v-card-text>
        <v-divider></v-divider>

        <v-card-actions>
          <v-btn
            color="normal"
            text
            @click="
              openSingleAppointmentDialog = false;
              resetSingleAppointmentToOpen();"
          >
            Abbrechen
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn
          color="error"
          text
          @click="
            deleteSingleAppointment(singleAppointmentToOpen);
            resetSingleAppointmentToOpen();"
          >
            Einzeltermin löschen
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
              changeRepSingleAppointment({
                therapist: selectedAppointment.therapist,
                therapistID: selectedAppointment.therapistID,
                patient: singleAppointmentToOpen.patient,
                comment: singleAppointmentToOpen.comment,
                id: singleAppointmentToOpen.id,
                isHotair: singleAppointmentToOpen.isHotair,
                isUltrasonic: singleAppointmentToOpen.isUltrasonic,
                isElectric: singleAppointmentToOpen.isElectric,
              });
              openSingleAppointmentDialog = false;
              resetSingleAppointmentToOpen();
            "
          >
            Speichern
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="createDialog" width="600">
      <v-card>
        <v-card-title class="text-h5 grey lighten-2">
          {{ selectedAppointment.therapist }} - {{ weekday }} {{ currentSingleDay }} -
          {{ selectedAppointment.startTime }}
        </v-card-title>

        <v-card-text class="pt-5">
          <v-row>
            <v-combobox
            v-model="inputFields.patientTextfield"
            @input="searchAppointmentsForPatient($event)"
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
          <v-switch v-model="inputFields.createSeriesAppointment" label="Serientermin" ></v-switch>
          </v-row>
          <v-row v-if="inputFields.createSeriesAppointment">
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
                append-icon="mdi-calendar"
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
              :allowed-dates="
                  (dateVal) => {
                    return new Date(dateVal) >= new Date();
                  }
              "
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
                append-icon="mdi-calendar"
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
              :allowed-dates="
                  (dateVal) => {
                    return new Date(dateVal) >= new Date();
                  }
              "
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
        <v-row>
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
        </v-row>
        <v-row v-if="inputFields.createSeriesAppointment">
          <v-text-field
              label="Wöchentliches Interval"
              type="number"
              :rules="[v => (v > 0 && v % 1 === 0)]"
              v-model="inputFields.interval"
          ></v-text-field>
          <v-checkbox
              label="BWO"
              v-model="inputFields.isBWO"
            ></v-checkbox>
        </v-row>
        <v-row>
          <v-text-field
            label="Sonstige Bemerkungen"
            v-model="inputFields.commentTextfield"
            clearable
          ></v-text-field>
        </v-row>
        <v-row>
          <v-col>
            <v-checkbox
              label="Heißluft"
              v-model="inputFields.isHotairField"
            ></v-checkbox>
          </v-col>
          <v-col>
            <v-checkbox
              label="Ultraschall"
              v-model="inputFields.isUltrasonicField"
            ></v-checkbox>
          </v-col>
          <v-col>
            <v-checkbox
              label="Elektro"
              v-model="inputFields.isElectricField"
            ></v-checkbox>
          </v-col>
          </v-row>
          <v-alert v-if="appointmentsForPatient.length > 0" type="info">
            Unter diesem Namen wurden weitere Termine gefunden:
            <div
              v-for="appointment in appointmentsForPatient"
            :key="`${appointment.therapistID}-${appointment.startTime}-${appointment.weekday}`"
            >
              {{
                appointment.weekday
                  ? appointment.weekday + "s"
                  : convertDateToString(appointment.date)
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
              createDialog = false;
            "
          >
            Abbrechen
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn
            color="success"
            button
            @click="createAppointment({
                therapist: selectedAppointment.therapist,
                therapistID: selectedAppointment.therapistID,
                patient: inputFields.patientTextfield,
                startTime: inputFields.startTimeSelect,
                endTime: inputFields.endTimeSelect,
                startDate: startDate,
                endDate: endDate,
                comment: inputFields.commentTextfield,
                id: '',
                weekday: weekdayLong,
                isBWO: inputFields.isBWO,
                interval: inputFields.interval,
                isHotair: inputFields.isHotairField,
                isUltrasonic: inputFields.isUltrasonicField,
                isElectric: inputFields.isElectricField,
              });
              createDialog = false;
            "
          >
          {{ inputFields.createSeriesAppointment ? 'Serientermin erstellen' : 'Einzeltermin erstellen' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
  <div v-else>wird geladen</div>
</template>

<script lang="ts">
import { v4 as uuidv4 } from 'uuid';
import Appointment from '@/class/Appointment';
import Absence from '@/class/Absence';
import AppointmentSeries from '@/class/AppointmentSeries';
import Cancellation from '@/class/Cancellation';
import Printer from '@/class/Printer';
import Backup from '@/class/Backup';
import Dateconversions from '@/class/Dateconversions';
import { Time, Weekday } from '@/class/Enums';
import SingleAppointment from '@/class/SingleAppointment';
import holidaysJSON from '@/data/holidays.json';
import {
  Component, Prop, Vue, Watch,
} from 'vue-property-decorator';
import { getModule } from 'vuex-module-decorators';
import Util from '@/class/Util';
import Exception from '@/class/Exception';
import Store from '../store/backup';
import DaylistElement from './DaylistElement.vue';
import DaylistHeader from './DaylistHeader.vue';

@Component({
  components: {
    DaylistElement,
    DaylistHeader,
  },
})

export default class Daylist extends Vue {
  @Prop() readonly currentSingleDay!: string;

  createDialog = false;

  openSingleAppointmentDialog = false;

  weekday = '';

  weekdayLong = '';

  public holidays = holidaysJSON.days;

  inputFields = {
    patientTextfield: '',
    startTimeSelect: '',
    endTimeSelect: '',
    commentTextfield: '',
    isHotairField: false,
    isUltrasonicField: false,
    isElectricField: false,
    interval: '1',
    isBWO: false,
    createSeriesAppointment: false,
  }

  public singleAppointmentToOpen: SingleAppointment = new SingleAppointment('',
    '',
    '',
    Dateconversions.timeFromString('07:00'),
    Dateconversions.timeFromString('07:00'),
    '',
    new Date(),
    false,
    false,
    false,
    '');

  selectedAppointment = {
    therapist: '',
    therapistID: '',
    startTime: '7:00',
    day: this.currentSingleDay,
    patient: '',
  };

  store = getModule(Store);

  appointmentsForPatient: Appointment[] = [];

  cellsToUpdate: { id: string, isException: boolean }[] = [];

  hash = uuidv4();

  private headers: { text: string, value: string, id: string, absences: Absence[], exceptions: Exception[], align: string }[] = [
    {
      text: '', value: 'startTime', id: '', absences: [], exceptions: [], align: '',
    },
  ];

  private rows: {
    [key: string]: string | Time | SingleAppointment | AppointmentSeries | Absence[]
  }[] = [{ startTimeString: '' }];

  private patientsLoading = false;

  public startDatePickerIsOpen = false;

  public endDatePickerIsOpen = false;

  public startDate = new Date();

  public startDateString: string = new Date(
    this.startDate.getTime() - this.startDate.getTimezoneOffset() * 60000,
  ).toISOString().substr(0, 10);

  public startDateStringFormatted: string = Dateconversions.convertEnglishToGermanReadableString(this.startDateString);

  public endDate = new Date();

  public endDateString: string = new Date(
    this.endDate.getTime() - this.endDate.getTimezoneOffset() * 60000,
  ).toISOString().substr(0, 10);

  public endDateStringFormatted: string = Dateconversions.convertEnglishToGermanReadableString(this.endDateString);

  private searchValue = '';

  private foundPatients : string[] = [];

  get localBackup(): Backup | null {
    return this.store.getBackup;
  }

  @Watch('currentSingleDay')
  async currentSingleDayChanged(): Promise<void> {
    const weekday = Dateconversions.getWeekdayForDate(Dateconversions.convertReadableStringToDate(this.currentSingleDay));
    this.createHeaders();
    this.createRows();
    this.hash = uuidv4();
    this.weekday = Dateconversions.getWeekdayStringForDate(Dateconversions.convertReadableStringToDate(this.currentSingleDay));
    if (weekday) {
      this.weekdayLong = Dateconversions.getGermanWeekdayString(weekday);
    }
  }

  @Watch('localBackup')
  localBackupChanged(): void {
    this.createHeaders();
    this.createRows();
    this.hash = uuidv4();
  }

  @Watch('searchValue')
  searchValueChanged(val: string | undefined): boolean {
    this.foundPatients = [];
    this.searchPatients(val);
    this.inputFields.patientTextfield = val || this.inputFields.patientTextfield;
    return val !== this.inputFields.patientTextfield;
  }

  mounted(): void {
    const weekday = Dateconversions.getWeekdayForDate(Dateconversions.convertReadableStringToDate(this.currentSingleDay));
    this.createHeaders();
    this.createRows();
    this.hash = uuidv4();
    if (weekday) {
      this.weekdayLong = Dateconversions.getGermanWeekdayString(weekday);
    }
  }

  private createHeaders(): void {
    if (this.localBackup !== null) {
      this.headers = [];
      const currentSingleDate = Dateconversions.convertReadableStringToDate(this.currentSingleDay);
      const therapistHeaders = this.localBackup.therapists.filter(
        (therapist) => therapist.activeSince < currentSingleDate && therapist.activeUntil > currentSingleDate,
      ).map((therapist) => ({
        text: therapist.name,
        value: therapist.name,
        id: therapist.id,
        absences: therapist.absences.filter(
          (abs) => abs.day === this.currentSingleDay || abs.day === Dateconversions.getWeekdayForDate(currentSingleDate),
        ),
        exceptions: therapist.exceptions.filter(
          (exc) => exc.day === this.currentSingleDay,
        ),
        align: 'center',
      }));
      this.headers = [{
        text: '',
        value: 'startTime',
        id: '',
        absences: [new Absence('a', Time['7:00'], Time['7:00'])],
        exceptions: [new Exception('a', Time['7:00'], Time['7:00'])],
        align: '',
      }].concat(therapistHeaders);
    }
  }

  private createRows(): void {
  type TableRow = {
    [key: string]: string | Time | SingleAppointment | AppointmentSeries;
  };

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
        const singleAppointment = this.localBackup?.daylist.searchAppointment(
          header.id, this.currentSingleDay, row.startTime as Time,
        );
        if (singleAppointment !== undefined) {
          newRow[header.text] = singleAppointment;
        } else {
          const currentSingleDate = Dateconversions.convertReadableStringToDate(this.currentSingleDay);
          const weekday = Dateconversions.getWeekdayForDate(currentSingleDate);
          if (weekday) {
            const masterAppointment = this.localBackup?.masterlist.searchAppointmentForDaylist(
              header.id, weekday, row.startTime as Time, currentSingleDate,
            );
            if (!masterAppointment?.cancellations.some((c) => c.date === this.currentSingleDay)) {
              newRow[header.text] = masterAppointment || '';
            } else {
              newRow[header.text] = '';
            }
          } else {
            newRow[header.text] = '';
          }
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
          const appointment = (row[therapist] as Appointment);
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

  public isCellException(appointment : string | AppointmentSeries | SingleAppointment): boolean {
    if (typeof appointment === 'string') {
      return false;
    }
    if (!appointment || appointment.cancellations.length === 0) {
      return false;
    }
    const match = appointment.cancellations.find((cancellation) => cancellation.date === this.currentSingleDay);
    if (match) {
      return true;
    }
    return false;
  }

  setRowspanTdId = (id: string, rowspan: number):void => {
    const td = document.getElementById(id);
    if (td) {
      td.setAttribute('rowspan', rowspan.toString());
    }
  }

  public static removeOverflowingCells1(): void {
    const table = document.querySelector('table');
    if (!table) return;
    const { rows } = table;
    const headerRow = table.querySelector('tr');
    if (!headerRow) return;
    const { cells: headerCells } = headerRow;
    const therapistHeaderCell = Array.from(headerCells).find((cell) => cell.textContent === 'Therapeut');
    const therapistHeaderCellIndex = therapistHeaderCell ? therapistHeaderCell.cellIndex : -1;
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      const row = rows[i];
      const { cells } = row;
      if (therapistHeaderCellIndex === -1) {
        if (cells.length > 11) {
          for (let j = cells.length - 1; j >= 11; j -= 1) {
            row.deleteCell(j);
          }
        }
      } else if (cells.length > therapistHeaderCellIndex + 1) {
        for (let j = cells.length - 1; j > therapistHeaderCellIndex + 1; j -= 1) {
          row.deleteCell(j);
        }
      }
    }
  }

  private openCreateDialog(therapist: string, therapistID: string, startTime: string): void {
    this.selectedAppointment.therapist = therapist;
    this.selectedAppointment.therapistID = therapistID;
    this.selectedAppointment.startTime = startTime;
    const times = this.getAllTimes();
    const i = times.indexOf(startTime);
    this.inputFields.startTimeSelect = startTime;
    this.inputFields.endTimeSelect = i + 2 < times.length - 1 ? times[i + 2] : times[times.length - 1];
    if (this.singleAppointmentToOpen.patient !== '') {
      this.createDialog = false;
    } else {
      this.createDialog = true;
    }
  }

  private showDialog(event: { appointment: SingleAppointment}): void {
    const { appointment } = event;
    console.log(event.appointment);
    this.selectedAppointment.therapist = appointment.therapist;
    this.selectedAppointment.therapistID = appointment.therapistID;
    this.selectedAppointment.startTime = Dateconversions.stringFromTime(appointment.startTime);
    this.singleAppointmentToOpen.date = Dateconversions.convertReadableStringToDate(this.currentSingleDay);
    this.singleAppointmentToOpen.id = appointment.id;
    this.singleAppointmentToOpen.startTime = appointment.startTime;
    this.singleAppointmentToOpen.patient = appointment.patient;
    this.singleAppointmentToOpen.endTime = appointment.endTime;
    this.singleAppointmentToOpen.comment = appointment.comment;
    this.singleAppointmentToOpen.isHotair = appointment.isHotair;
    this.singleAppointmentToOpen.isUltrasonic = appointment.isUltrasonic;
    this.singleAppointmentToOpen.isElectric = appointment.isElectric;
    if (this.createDialog) {
      this.createDialog = false;
    }
    this.openSingleAppointmentDialog = true;
  }

  private resetInputs(): void {
    this.inputFields = {
      patientTextfield: '',
      startTimeSelect: '',
      endTimeSelect: '',
      commentTextfield: '',
      isHotairField: false,
      isUltrasonicField: false,
      isElectricField: false,
      interval: '1',
      isBWO: false,
      createSeriesAppointment: false,
    };

    this.selectedAppointment = {
      patient: '',
      therapist: '',
      therapistID: '',
      startTime: '7:00',
      day: this.currentSingleDay,
    };

    this.appointmentsForPatient = [];
  }

  private resetSingleAppointmentToOpen(): void {
    this.singleAppointmentToOpen = new SingleAppointment('',
      '',
      '',
      Dateconversions.timeFromString('07:00'),
      Dateconversions.timeFromString('07:00'),
      '',
      new Date(),
      false,
      false,
      false,
      '');
  }

  private searchAppointmentsForPatient(patient: string): void {
    if (this.localBackup) {
      let appointments: Appointment[] = this.localBackup.daylist.getSingleAppointmentsByPatient(patient);
      appointments = appointments.concat(this.localBackup.masterlist.getAppointmentSeriesByPatient(patient));
      appointments = appointments.concat(this.localBackup.masterlist.getReplacementsByPatient(patient));
      console.log(appointments);
      this.appointmentsForPatient = appointments;
    }
  }

  public addAppointment(
    event: {
      therapist: string, therapistID: string, patient: string, startTime: string, endTime: string, comment: string, id: string,
      isHotair: boolean, isUltrasonic: boolean, isElectric: boolean,
    },
  ): void {
    const appointment = new SingleAppointment(
      event.therapist,
      event.therapistID,
      event.patient,
      event.startTime as unknown as Time,
      event.endTime as unknown as Time,
      event.comment,
      Dateconversions.convertReadableStringToDate(this.currentSingleDay),
      event.isHotair,
      event.isUltrasonic,
      event.isElectric,
    );
    if (this.localBackup) {
      this.store.addSingleAppointment(appointment);
    }
    this.resetInputs();
  }

  public addSeriesAppointment(
    event: {
      therapist: string, therapistID: string, patient: string, startDate: Date, endDate: Date,
      startTime: string, endTime: string, comment: string, id: string,
      isHotair: boolean, isUltrasonic: boolean, isElectric: boolean,
      weekday: Weekday, interval: number, cancellations: Cancellation[], isBWO: boolean,
    },
  ): void {
    const appointment = new AppointmentSeries(
      event.therapist,
      event.therapistID,
      event.patient,
      event.startTime as unknown as Time,
      event.endTime as unknown as Time,
      event.comment,
      event.isHotair,
      event.isUltrasonic,
      event.isElectric,
      event.weekday,
      event.interval,
      [],
      event.startDate,
      event.endDate,
      event.id,
      event.isBWO,
    );
    if (this.localBackup) {
      this.store.addAppointmentSeries(appointment);
    }
    this.resetInputs();
  }

  public createAppointment(event): void {
    if (this.inputFields.createSeriesAppointment) {
      this.addSeriesAppointment(event);
    } else {
      this.addAppointment(event);
    }
  }

  private changeAppointment(
    event: {
      therapist: string, therapistID: string, patient: string, startTime: string, endTime: string, weekday: Weekday,
      interval: number, cancellations: Cancellation[],
      startDate: Date, endDate: Date, comment: string, id: string,
      isBWO: boolean, isHotair: boolean, isUltrasonic: boolean, isElectric: boolean,
    },
  ): void {
    if (event.endDate) {
      // speichern SerienTermin
      const appointment = new AppointmentSeries(
        event.therapist,
        event.therapistID,
        event.patient,
        event.startTime as unknown as Time,
        event.endTime as unknown as Time,
        event.comment,
        event.isHotair,
        event.isUltrasonic,
        event.isElectric,
        event.weekday,
        event.interval,
        event.cancellations,
        event.startDate,
        event.endDate,
        event.id,
        event.isBWO,
      );
      console.log('speichern Serien Termin Daylist');
      console.log(appointment);
      if (this.localBackup) {
        this.store.changeAppointmentSeries(appointment);
        this.resetInputs();
      }
    }
  }

  private changeSingleAppointment(
    event: {
      therapist: string, therapistID: string, patient: string, comment: string, id: string, startTime: Time, endTime: Time,
      isHotair: boolean, isUltrasonic: boolean, isElectric: boolean,
    },
  ): void {
    const appointment = new SingleAppointment(
      event.therapist,
      event.therapistID,
      event.patient,
      event.startTime as unknown as Time,
      event.endTime as unknown as Time,
      event.comment,
      Dateconversions.convertReadableStringToDate(this.currentSingleDay),
      event.isHotair,
      event.isUltrasonic,
      event.isElectric,
      event.id,
    );
    console.log('speichern Serien Termin Daylist');
    console.log(appointment);
    if (this.localBackup) {
      this.store.changeSingleAppointment(appointment);
    }
  }

  private changeRepSingleAppointment(
    event: {
      therapist: string, therapistID: string, patient: string, comment: string, id: string,
      isHotair: boolean, isUltrasonic: boolean, isElectric: boolean,
    },
  ): void {
    const appointment = new SingleAppointment(
      event.therapist,
      event.therapistID,
      event.patient,
      this.singleAppointmentToOpen.startTime as unknown as Time,
      this.singleAppointmentToOpen.endTime as unknown as Time,
      event.comment,
      Dateconversions.convertReadableStringToDate(this.currentSingleDay),
      event.isHotair,
      event.isUltrasonic,
      event.isElectric,
      event.id,
    );
    if (this.localBackup) {
      this.store.changeSingleAppointment(appointment);
      this.resetInputs();
    }
  }

  private deleteAppointment(
    event: {
      therapist: string, therapistID: string, patient: string, startTime: string, endTime: string, comment: string, id: string,
      isHotair: boolean, isUltrasonic: boolean, isElectric: boolean,
    },
  ): void {
    if (this.localBackup) {
      const appointment = new SingleAppointment(
        event.therapist,
        event.therapistID,
        event.patient,
        event.startTime as unknown as Time,
        event.endTime as unknown as Time,
        event.comment,
        Dateconversions.convertReadableStringToDate(this.currentSingleDay),
        event.isHotair,
        event.isUltrasonic,
        event.isElectric,
        event.id,
      );
      this.store.deleteSingleAppointment(appointment);
    }
  }

  private deleteSingleAppointment(appointment: SingleAppointment): void {
    /* eslint-disable */
    if (window.confirm('Soll dieser Termin wirklich unwiederruflich gelöscht werden?')) {
      if (this.localBackup) {
        this.store.deleteSingleAppointment(appointment);
        console.log('gelöschter einzeltermin: ');
        console.log(appointment);
        this.openSingleAppointmentDialog = false;
      }
    }
  }

  private addException(event: { isException: boolean, patient: string, appointment: AppointmentSeries }): void {
    if (this.localBackup) {
      this.store.addCancellation({
        date: this.currentSingleDay, patient: event.patient, appointment: event.appointment,
      });
    }
  }

  private changeException(event: { isException: boolean, patient: string, appointment: AppointmentSeries }): void {
    if (this.localBackup) {
      this.store.changeCancellation({
        date: this.currentSingleDay, patient: event.patient, appointment: event.appointment,
      });
    }
  }

  private deleteException(event: { isException: boolean, patient: string, appointment: AppointmentSeries }): void {
    if (this.localBackup) {
      this.store.deleteCancellation({ date: this.currentSingleDay, appointment: event.appointment });
    }
  }

  private getPatient(cancellations: Cancellation[]): string {
    if (cancellations.length === 0) {
      return '';
    }
    const cancellation = cancellations.find((c) => c.date === this.currentSingleDay);
    if (!cancellation || cancellation.patient === '' || cancellation.patient === null) {
      return '';
    }
    const arr = cancellation.patient.split(';');
    let patientName = '';
    arr.forEach((p) => {
      if (p.trim()) {
        patientName += `${p.trim()}; `;
      }
    });
    return patientName;
  }

  private hasAbsenceInTime(therapistID: string, rowIndex: number): boolean {
    const therapist = this.headers.find((header) => header.id === therapistID);
    let hasAbsence = false;
    if (therapist) {
      therapist.absences.forEach((abs) => {
        if (parseInt(Time[abs.start], 10) <= rowIndex && parseInt(Time[abs.end], 10) >= rowIndex + 1) {
          if (!therapist.exceptions.find(
            (exc) => parseInt(Time[exc.start], 10) <= rowIndex && parseInt(Time[exc.end], 10) >= rowIndex + 1,
          )) {
            hasAbsence = true;
          }
        } else if (abs.end.toString() === '20:50' && rowIndex === 83) {
          hasAbsence = true;
        }
      });
    }
    return hasAbsence;
  }

  private saveAbsences(event: { absences: Absence[], therapistID: string }): void {
    const absences = event.absences.map(
      (abs) => new Absence(abs.day, abs.start as Time, abs.end as Time),
    );
    this.store.setAbsencesForTherapistForDay({
      absences,
      therapistID: event.therapistID,
      day: this.currentSingleDay,
    });
  }

  private saveExceptions(event: { exceptions: Exception[], therapistID: string }): void {

    const exceptions = event.exceptions.map(
      (exc) => new Exception(this.currentSingleDay, exc.start as Time, exc.end as Time),
    );
    this.store.setExceptionsForTherapistForDay({
      exceptions,
      therapistID: event.therapistID,
      day: this.currentSingleDay,
    });
  }

  private searchPatients(searchQuery : string | undefined) : void {
    if (searchQuery && searchQuery.length > 2 && this.localBackup) {
      this.patientsLoading = true;
      this.foundPatients = Util.searchPatientNames(this.localBackup, searchQuery);
      this.patientsLoading = false;
    }
  }

  public printAppointment(): void {
    const printer = new Printer(
      this.singleAppointmentToOpen.id,
      this.singleAppointmentToOpen.patient,
      this.selectedAppointment.therapist,
      this.singleAppointmentToOpen.startTime,
      this.singleAppointmentToOpen.endTime,
      Dateconversions.convertReadableStringToDate(this.currentSingleDay),
      0,
      undefined,
      undefined,
      undefined,
      new Date(),
    );
    this.appointmentsForPatient = [];
    this.searchAppointmentsForPatient(this.singleAppointmentToOpen.patient);
    printer.printSingleAppointment(this.appointmentsForPatient);
  }

  // eslint-disable-next-line class-methods-use-this
  private calculateRowspan(appointment : string | AppointmentSeries | SingleAppointment) : number {
    if (typeof appointment === 'string') {
      return 1;
    }
    return appointment.calculateLength();
  }

  // eslint-disable-next-line class-methods-use-this
  private convertStringToDate(date: string) : Date {
    return Dateconversions.convertReadableStringToDate(date);
  }

  // eslint-disable-next-line class-methods-use-this
  private convertDateToString(date: Date): string {
    return Dateconversions.convertDateToReadableString(date);
  }

  // eslint-disable-next-line class-methods-use-this
  private getAllTimes(): string[] {
    return Dateconversions.getAllTimes();
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

  public convertGermanToEnglishReadableString(string: string): string {
    return Dateconversions.convertGermanToEnglishReadableString(string);
  }

  public convertEnglishToGermanReadableString(string: string): string {
    return Dateconversions.convertEnglishToGermanReadableString(string);
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
  border-bottom: 1px solid #2a2f79;
  padding-left: 0px !important;
  padding-right: 0px !important;
  column-width: 300px;
  height: 24px !important;
}

td:hover {
  cursor: pointer;
  background-color: #b4b6d196 !important;
}

.cell-filled {
  background-color: lightgreen;
}

.cell-bwo {
  background-color: yellow;
}

.cell-hotair {
  background-color: rgb(228, 150, 5);
}

.cell-ultrasonic {
  background-color: lightskyblue;
}

.cell-electric {
  background-color: rgb(255, 61, 61);
}

.cell-absence {
  background-color: #6c7272;
}

.cell-absence:hover {
  background-color: #6c7272 !important;
  cursor: default;
}

.cell-saturday {
  background-color: #6c7272;
}

.cell-saturday:hover {
  background-color: #6c7272 !important;
  cursor: default;
}

.cell-saturday + .cell-absence {
  cursor: pointer !important;
  background-color: white !important;
}

.cell-saturday + .cell-absence:hover {
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

tr th:first-child:hover {
  background-color: white !important;
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
