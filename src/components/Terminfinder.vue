<template>
  <v-stepper v-model="currentStep" non-linear>
    <v-stepper-header>
      <v-stepper-step :complete="currentStep > 1" step="1">
        Patient & Filter
      </v-stepper-step>

      <v-divider></v-divider>

      <v-stepper-step :complete="currentStep > 2" step="2">
        Termin auswählen
      </v-stepper-step>

      <v-divider></v-divider>

      <v-stepper-step step="3">
        Auswahl bestätigen
      </v-stepper-step>
    </v-stepper-header>

    <v-stepper-items>
      <!-- STEP 1 -->
      <v-stepper-content step="1">
        <!-- Patient -->
        <v-combobox
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

        <!-- Therapeuten mit Close-Button -->
        <v-row class="pl-3">
          <v-col>
            <v-select
              v-model="selectedTherapists"
              :items="therapists"
              placeholder="Therapeuten auswählen"
              multiple
              clearable
              @click:clear="selectedTherapists = []"
            >
              <template v-slot:label>
                <div>{{ label }}</div>
              </template>
              <template v-slot:prepend-item>
                <v-list-item ripple @click="toggleAllTherapists">
                  <v-list-item-action>
                    <v-icon
                      :color="
                        selectedTherapists.length > 0 ? 'indigo darken-4' : ''
                      "
                    >{{ icon }}</v-icon>
                  </v-list-item-action>
                  <v-list-item-content>
                    <v-list-item-title>Alle auswählen</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
                <v-divider class="mt-2"></v-divider>
              </template>
              <template v-slot:append>
                <v-icon
                  v-if="selectedTherapists.length > 0"
                  small
                  class="cursor-pointer"
                  @click.stop="selectedTherapists = []"
                >
                  mdi-close-circle
                </v-icon>
              </template>
            </v-select>
          </v-col>
        </v-row>

        <!-- Dauer / Anzahl -->
        <v-row class="pl-3">
          <v-col>
            <v-text-field
              label="Anzahl der Termine"
              v-model.number="appointmentCount"
              clearable
              type="number"
              min="1"
              max="40"
            ></v-text-field>
          </v-col>
          <v-col>
            <v-select
              :items="availableAppointmentLengths"
              label="Dauer der Termine"
              v-model="appointmentLength"
            ></v-select>
          </v-col>
        </v-row>

        <!-- Tageszeit -->
        <v-row class="pl-3">
          <v-col>
            <v-select
              :items="timeOfDayOptions"
              item-text="text"
              item-value="value"
              label="Tageszeit"
              v-model="timeOfDay"
            ></v-select>
          </v-col>
        </v-row>

        <!-- Zeitraum (Date Range Picker) -->
        <v-row class="pl-3">
          <v-col>
            <v-menu
              v-model="searchStartDatePickerOpen"
              :close-on-content-click="false"
              :nudge-right="40"
              transition="scale-transition"
              offset-y
              min-width="auto"
            >
              <template v-slot:activator="{ on, attrs }">
                <v-text-field
                  v-model="searchStartDateFormatted"
                  label="Suchzeitraum: Von"
                  persistent-hint
                  append-icon="mdi-calendar"
                  v-bind="attrs"
                  v-on="on"
                  readonly
                ></v-text-field>
              </template>
              <v-date-picker
                v-model="searchStartDate"
                :allowed-dates="
                  (dateVal) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return new Date(dateVal) >= today;
                  }
                "
                @input="
                  searchStartDatePickerOpen = false;
                  updateSearchStartDateFormatted();
                "
                locale="de-de"
                :first-day-of-week="1"
              ></v-date-picker>
            </v-menu>
          </v-col>
          <v-col>
            <v-menu
              v-model="searchEndDatePickerOpen"
              :close-on-content-click="false"
              :nudge-right="40"
              transition="scale-transition"
              offset-y
              min-width="auto"
            >
              <template v-slot:activator="{ on, attrs }">
                <v-text-field
                  v-model="searchEndDateFormatted"
                  label="Suchzeitraum: Bis"
                  persistent-hint
                  append-icon="mdi-calendar"
                  v-bind="attrs"
                  v-on="on"
                  readonly
                ></v-text-field>
              </template>
              <v-date-picker
                v-model="searchEndDate"
                :allowed-dates="
                  (dateVal) => {
                    const startDate = searchStartDate ? new Date(searchStartDate) : new Date();
                    return new Date(dateVal) >= startDate;
                  }
                "
                @input="
                  searchEndDatePickerOpen = false;
                  updateSearchEndDateFormatted();
                "
                locale="de-de"
                :first-day-of-week="1"
              ></v-date-picker>
            </v-menu>
          </v-col>
        </v-row>

        <v-btn @click="resetFinder()" color="error" text>Abbrechen</v-btn>
        <v-btn
          class="button-next"
          :disabled="
            patientTextfield === '' ||
            selectedTherapists.length === 0 ||
            !appointmentCount ||
            !appointmentLength ||
            !searchStartDate ||
            !searchEndDate
          "
          color="primary"
          @click="onSearchClick"
        >
          Fortfahren
        </v-btn>
      </v-stepper-content>

      <!-- STEP 2 -->
      <v-stepper-content step="2">
        <div
          v-if="appointmentSuggestions.length > 0"
          style="overflow-y: scroll; overflow-x: hidden; max-height: 1000px"
        >
          <v-row class="pl-3 pr-3 mb-2">
            <v-col cols="12" sm="auto">
              <p class="font-weight-bold mb-0">
                Verfügbare Termine: <span class="text-primary">{{ allAppointmentSuggestions.length }}</span>
              </p>
            </v-col>
            <v-spacer></v-spacer>
            <v-col cols="12" sm="auto">
              <v-select
                v-model="appointmentsPagination.itemsPerPage"
                :items="[3, 6, 9, 12]"
                label="Pro Seite"
                dense
                outlined
                style="max-width: 150px"
              ></v-select>
            </v-col>
          </v-row>

          <v-row class="pl-3 pr-3">
            <v-col
              v-for="suggestion in appointmentSuggestions"
              :key="`${suggestion.therapistID}-${suggestion.date}-${suggestion.startTime}`"
              cols="12"
              sm="6"
              md="4"
              style="padding: 8px"
            >
              <v-card
                outlined
                @click="toggleAppointmentSelection(suggestion)"
                :class="{
                  'appointment-selected': isAppointmentSelected(suggestion),
                  'appointment-disabled': !canSelectAppointment(suggestion) &&
                    !isAppointmentSelected(suggestion)
                }"
                class="appointment-card cursor-pointer"
                :style="{
                  opacity: (!canSelectAppointment(suggestion) &&
                    !isAppointmentSelected(suggestion)) ? 0.6 : 1
                }"
              >
                <v-card-text>
                  <div class="d-flex align-items-center">
                    <v-checkbox
                      :value="suggestion"
                      v-model="selectedAppointmentSuggestions"
                      :multiple="true"
                      @click.stop
                      :disabled="!canSelectAppointment(suggestion) &&
                        !isAppointmentSelected(suggestion)"
                      class="flex-shrink-1"
                    ></v-checkbox>
                    <div class="flex-grow-1">
                      <div class="therapist-name font-weight-bold">{{ suggestion.therapist }}</div>
                      <div class="appointment-date">{{ convertSuggestionDate(suggestion.date) }}</div>
                      <div class="appointment-time">{{ formatAppointmentTime(suggestion.startTime, appointmentLength) }}</div>
                      <div class="appointment-duration text-caption">{{ appointmentLength }} min</div>
                      <div
                        v-if="!canSelectAppointment(suggestion) &&
                          !isAppointmentSelected(suggestion)"
                        class="conflict-warning text-caption"
                      >
                        <v-icon small>mdi-alert</v-icon> Überschneidung
                      </div>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Pagination -->
          <v-row class="pl-3 pr-3 mt-4">
            <v-col cols="12" class="d-flex justify-center">
              <v-pagination
                v-model="appointmentsPagination.page"
                :length="Math.ceil(
                  allAppointmentSuggestions.length /
                  appointmentsPagination.itemsPerPage
                )"
                total-visible="7"
              ></v-pagination>
            </v-col>
          </v-row>

          <v-row class="pl-3 pr-3 mt-2">
            <v-col cols="12">
              <v-alert type="info" dense>
                <strong>{{ selectedAppointmentSuggestions.length }}</strong>
                Termin{{ selectedAppointmentSuggestions.length !== 1 ? 'e' : '' }} ausgewählt
              </v-alert>
            </v-col>
          </v-row>

          <v-row class="pl-3 pr-3">
            <v-btn @click="resetFinder()" color="error" text>Abbrechen</v-btn>
            <v-spacer></v-spacer>
            <v-btn
              :disabled="selectedAppointmentSuggestions.length === 0"
              color="primary"
              @click="currentStep = 3"
            >
              Weiter
              <v-icon right>mdi-arrow-right</v-icon>
            </v-btn>
          </v-row>
        </div>
        <div v-else class="pa-4">
          <v-alert type="warning">
            Es wurde kein Termin gefunden. Bitte legen Sie manuell einen Termin
            über die Terminliste an.
          </v-alert>
          <v-btn
            color="primary"
            @click="resetFinder()"
          >
            Zurück
          </v-btn>
        </div>
      </v-stepper-content>

      <!-- STEP 3 -->
      <v-stepper-content step="3">
        <p class="pl-3 font-weight-bold">Folgende Termine werden gespeichert:</p>

        <v-row class="pl-3 pr-3">
          <v-col
            v-for="(suggestion, index) in selectedAppointmentSuggestions"
            :key="`${suggestion.therapistID}-${index}`"
            cols="12"
            sm="6"
            md="4"
            style="padding: 8px"
          >
            <v-card outlined>
              <v-card-text>
                <div class="therapist-name font-weight-bold mb-2">{{ suggestion.therapist }}</div>
                <div class="appointment-date mb-1">{{ convertSuggestionDate(suggestion.date) }}</div>
                <div class="appointment-time mb-1">{{ formatAppointmentTime(suggestion.startTime, appointmentLength) }}</div>
                <div class="appointment-duration text-caption">Dauer: {{ appointmentLength }} min</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-row class="pl-3 pr-3 mt-4">
          <v-col cols="12">
            <v-alert type="success" dense>
              <strong>{{ selectedAppointmentSuggestions.length }}</strong>
              Termin{{ selectedAppointmentSuggestions.length !== 1 ? 'e' : '' }}
              zur Bestätigung
            </v-alert>
          </v-col>
        </v-row>

        <v-row class="pl-3 pr-3">
          <v-btn @click="resetFinder()" color="error" text>Abbrechen</v-btn>
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            @click="takeAppointmentSuggestion()"
          >
            <v-icon left>mdi-check</v-icon>
            Termin speichern
          </v-btn>
        </v-row>
      </v-stepper-content>
    </v-stepper-items>
  </v-stepper>
</template>

<script lang="ts">
/* eslint-disable */
import { Component, Vue, Watch } from 'vue-property-decorator';
import { getModule } from 'vuex-module-decorators';
import Store from '../store/backup';
import { Time } from '@/class/Enums';
import SimpleAppointmentFinder, { SimpleTimeOfDay } from '@/class/SimpleAppointmentFinder';
import Backup from '@/class/Backup';
import SingleAppointment from '@/class/SingleAppointment';
import Dateconversions from '@/class/Dateconversions';

@Component
export default class Terminfinder extends Vue {
  private patientTextfield = '';

  therapists: string[] = [];

  therapistIDs: string[] = [];

  selectedTherapists: string[] = [];

  appointmentCount: number | null = null;

  appointmentLength = 20;

  availableAppointmentLengths = [
    { text: '10 Minuten', value: 10 },
    { text: '20 Minuten', value: 20 },
    { text: '30 Minuten', value: 30 },
    { text: '40 Minuten', value: 40 },
    { text: '50 Minuten', value: 50 },
    { text: '60 Minuten', value: 60 },
  ];

  timeOfDayOptions = [
    { text: 'Egal (08:00–18:00)', value: 'any' },
    { text: 'Vormittag (08:00–12:00)', value: 'morning' },
    { text: 'Nachmittag (12:00–18:00)', value: 'afternoon' },
  ];

  timeOfDay: SimpleTimeOfDay = 'any';

  appointmentSuggestions: SingleAppointment[] = [];

  selectedAppointmentSuggestions: SingleAppointment[] = [];

  currentStep = 1;

  store = getModule(Store);

  backup: Backup | null = null;

  private patientsLoading = false;

  private searchValue = '';

  private foundPatients: string[] = [];

  private searchStartDate: string | null = null;

  private searchEndDate: string | null = null;

  private searchStartDateFormatted = '';

  private searchEndDateFormatted = '';

  private searchStartDatePickerOpen = false;

  private searchEndDatePickerOpen = false;

  private appointmentsPagination = {
    page: 1,
    itemsPerPage: 9,
    total: 0,
  };

  private allAppointmentSuggestions: SingleAppointment[] = [];

  mounted(): void {
    this.backup = this.store.getBackup;
    if (this.backup) {
      const today = new Date();
      this.therapists = this.backup.therapists
        .filter(
          (therapist) =>
            therapist.activeSince < today && therapist.activeUntil > today,
        )
        .map((therapist) => therapist.name);
      this.therapistIDs = this.backup.therapists
        .filter(
          (therapist) =>
            therapist.activeSince < today && therapist.activeUntil > today,
        )
        .map((therapist) => therapist.id);

      // Standard-Suchzeitraum: heute bis in 60 Tagen
      const today2 = new Date();
      this.searchStartDate = this.dateToYYYYMMDD(today2);
      this.updateSearchStartDateFormatted();

      const endDate = new Date(today2);
      endDate.setDate(endDate.getDate() + 60);
      this.searchEndDate = this.dateToYYYYMMDD(endDate);
      this.updateSearchEndDateFormatted();
    }
  }

  @Watch('searchValue')
  searchValueChanged(val: string | undefined): boolean {
    this.foundPatients = [];
    this.patientTextfield = val || this.patientTextfield;
    this.searchPatients(val);
    return val !== this.patientTextfield;
  }

  get label(): string {
    if (this.selectedTherapists.length === this.therapists.length) {
      return 'Alle Therapeuten ausgewählt';
    }
    if (this.selectedTherapists.length === 0) {
      return 'Therapeuten auswählen';
    }
    return `${this.selectedTherapists.length} Therapeuten ausgewählt`;
  }

  get icon(): string {
    if (this.selectedTherapists.length === this.therapists.length) return 'mdi-close-box';
    if (this.selectedTherapists.length > 0) return 'mdi-minus-box';
    return 'mdi-checkbox-blank-outline';
  }

  // Computed: Paginierte Termine basierend auf aktuellem Page/ItemsPerPage
  get paginatedAppointments(): SingleAppointment[] {
    const start = (this.appointmentsPagination.page - 1) * this.appointmentsPagination.itemsPerPage;
    const end = start + this.appointmentsPagination.itemsPerPage;
    return this.allAppointmentSuggestions.slice(start, end);
  }

  // Watcher für Page-Änderungen (damit Komponente aktualisiert wird)
  @Watch('appointmentsPagination.page')
  onPageChanged(): void {
    this.appointmentSuggestions = this.paginatedAppointments;
  }

  @Watch('appointmentsPagination.itemsPerPage')
  onItemsPerPageChanged(): void {
    this.appointmentsPagination.page = 1;
    this.appointmentSuggestions = this.paginatedAppointments;
  }

  toggleAllTherapists(): void {
    if (this.selectedTherapists.length === this.therapists.length) {
      this.selectedTherapists = [];
    } else {
      this.selectedTherapists = this.therapists.slice();
    }
  }

  // Step 1 → Suche ausführen
  onSearchClick(): void {
    this.findAppointments();
    this.currentStep = 2;
  }

  // Hilfsfunktionen
  // eslint-disable-next-line class-methods-use-this
  convertSuggestionDate(date: Date): string {
    return Dateconversions.convertDateToReadableString(date);
  }

  formatSuggestionLabel(suggestion: SingleAppointment): string {
    return `${suggestion.therapist}, ${this.convertSuggestionDate(
      suggestion.date,
    )} um ${suggestion.startTime}`;
  }

  findAppointments(): void {
    if (this.backup && this.appointmentCount && this.appointmentCount > 0) {
      const selectedTherapistIDs: string[] = [];
      this.selectedTherapists.forEach((selectedTherapist) => {
        const index = this.therapists.indexOf(selectedTherapist);
        if (index > -1) {
          selectedTherapistIDs.push(this.therapistIDs[index]);
        }
      });

      // Zeitraum-Daten konvertieren
      const searchStartDate = this.searchStartDate ? new Date(this.searchStartDate) : undefined;
      const searchEndDate = this.searchEndDate ? new Date(this.searchEndDate) : undefined;

      const finder = new SimpleAppointmentFinder({
        patientName: this.patientTextfield,
        therapistIDs: selectedTherapistIDs,
        appointmentCount: this.appointmentCount * 3, // Mehr Vorschläge wegen Überschneidungsfilter
        appointmentLengthMinutes: this.appointmentLength,
        timeOfDay: this.timeOfDay,
        daylist: this.backup.daylist,
        masterlist: this.backup.masterlist,
        therapists: this.backup.therapists,
        searchStartDate,
        searchEndDate,
      });

      let allSuggestions = finder.getSuggestions();

      // Filter: nur nicht-überlappende Termine
      this.allAppointmentSuggestions = this.filterNonOverlappingAppointments(allSuggestions);
      this.appointmentsPagination.page = 1;
      this.appointmentSuggestions = this.paginatedAppointments;
      this.selectedAppointmentSuggestions = [];
    }
  }

  resetFinder(): void {
    this.currentStep = 1;
    this.patientTextfield = '';
    this.selectedTherapists = [];
    this.selectedAppointmentSuggestions = [];
    this.appointmentSuggestions = [];
    this.allAppointmentSuggestions = [];
    this.appointmentCount = null;
    this.timeOfDay = 'any';
    this.appointmentsPagination.page = 1;
    this.$emit('dialogClosed');
  }

  takeAppointmentSuggestion(): void {
    if (this.backup) {
      this.selectedAppointmentSuggestions.forEach((suggestion) => {
        // Konvertiere Time Enum Indizes zu String-Format vor dem Speichern
        const startTimeString = Dateconversions.stringFromTime(suggestion.startTime);
        const endTimeString = Dateconversions.stringFromTime(suggestion.endTime);
        
        const appointmentToStore = new SingleAppointment(
          suggestion.therapist,
          suggestion.therapistID,
          suggestion.patient,
          startTimeString as unknown as Time,
          endTimeString as unknown as Time,
          suggestion.comment,
          suggestion.date,
          suggestion.isHotair,
          suggestion.isUltrasonic,
          suggestion.isElectric,
          suggestion.id,
        );
        this.store.addSingleAppointment(appointmentToStore);
      });
    }
    this.resetFinder();
  }

  private searchPatients(searchQuery: string | undefined): void {
    if (searchQuery && searchQuery.length > 2 && this.backup) {
      this.patientsLoading = true;
      this.foundPatients = [];

      this.backup.masterlist.elements.forEach((listDay) => {
        this.foundPatients = this.foundPatients.concat(
          listDay.appointments
            .filter(
              (appointment) =>
                appointment.patient &&
                appointment.patient
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase()),
            )
            .map((appointment) => appointment.patient),
        );
      });

      this.backup.daylist.elements.forEach((listDay) => {
        this.foundPatients = this.foundPatients.concat(
          listDay.appointments
            .filter(
              (appointment) =>
                appointment.patient &&
                appointment.patient
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase()),
            )
            .map((appointment) => appointment.patient),
        );
      });

      // Duplikate entfernen
      this.foundPatients = Array.from(new Set(this.foundPatients));
      this.patientsLoading = false;
    }
  }

  // Hilfsmethoden für Date Range Picker
  private dateToYYYYMMDD(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private dateFromYYYYMMDD(dateString: string): Date {
    return new Date(dateString);
  }

  updateSearchStartDateFormatted(): void {
    if (this.searchStartDate) {
      const date = new Date(this.searchStartDate);
      this.searchStartDateFormatted = Dateconversions.convertDateToReadableString(date);
    }
  }

  updateSearchEndDateFormatted(): void {
    if (this.searchEndDate) {
      const date = new Date(this.searchEndDate);
      this.searchEndDateFormatted = Dateconversions.convertDateToReadableString(date);
    }
  }

  // Formatierung der Terminzeit
  formatAppointmentTime(startTime: Time, lengthMinutes: number): string {
    const startLabel = this.timeToLabel(startTime);
    const endLabel = this.timeToLabel(this.calculateEndTime(startTime, lengthMinutes));
    return `${startLabel} - ${endLabel}`;
  }


  private calculateEndTime(startTime: Time, lengthMinutes: number): Time {
    // Time enum ist in 10-Minuten Steps aufgebaut
    const steps = Math.round(lengthMinutes / 10);
    const startIndex = startTime as unknown as number;
    const endIndex = startIndex + steps;

    // Clamp auf letzten Time-Wert (damit nie out-of-range)
    const maxIndex = Object.keys(Time)
      .filter((k) => !Number.isNaN(Number(k)))
      .map((k) => Number(k))
      .sort((a, b) => b - a)[0];

    const safeEndIndex = Math.min(endIndex, maxIndex);
    return safeEndIndex as unknown as Time;
  }

  private timeToLabel(t: Time): string {
    // bei numeric enums liefert Time[t] den String ("8:00", "8:10", ...)
    const label = (Time as any)[t];
    return typeof label === 'string' ? label : String(label);
  }
  // Termin-Auswahl Hilfsmethoden
  toggleAppointmentSelection(suggestion: SingleAppointment): void {
    const index = this.selectedAppointmentSuggestions.findIndex(
      (s) => s.therapistID === suggestion.therapistID &&
             s.date === suggestion.date &&
             s.startTime === suggestion.startTime
    );

    if (index > -1) {
      this.selectedAppointmentSuggestions.splice(index, 1);
    } else {
      this.selectedAppointmentSuggestions.push(suggestion);
    }
  }

  isAppointmentSelected(suggestion: SingleAppointment): boolean {
    return this.selectedAppointmentSuggestions.some(
      (s) => s.therapistID === suggestion.therapistID &&
             s.date === suggestion.date &&
             s.startTime === suggestion.startTime
    );
  }

  // Filter: nur Termine, die sich nicht überschneiden
  private filterNonOverlappingAppointments(
    suggestions: SingleAppointment[]
  ): SingleAppointment[] {
    const filtered: SingleAppointment[] = [];

    suggestions.forEach((suggestion) => {
      const hasOverlap = filtered.some((existing) => {
        return this.appointmentsOverlap(existing, suggestion);
      });

      if (!hasOverlap) {
        filtered.push(suggestion);
      }
    });

    return filtered;
  }

  // Überprüfe, ob sich zwei Termine zeitlich überschneiden
  private appointmentsOverlap(
    apt1: SingleAppointment,
    apt2: SingleAppointment
  ): boolean {
    // Verschiedene Therapeuten können sich nicht überschneiden
    if (apt1.therapistID !== apt2.therapistID) {
      return false;
    }

    // Verschiedene Tage können sich nicht überschneiden
    const date1 = new Date(apt1.date).toDateString();
    const date2 = new Date(apt2.date).toDateString();
    if (date1 !== date2) {
      return false;
    }

    // Zeiten in Minuten seit Mitternacht konvertieren
    const start1 = this.timeStringToMinutes(apt1.startTime);
    const end1 = start1 + this.appointmentLength;

    const start2 = this.timeStringToMinutes(apt2.startTime);
    const end2 = start2 + this.appointmentLength;

    // Überlappung prüfen
    return start1 < end2 && start2 < end1;
  }

  private timeStringToMinutes(time: any): number {
    // Wenn time ein Time Enum Index ist (Zahl), verwende timeToLabel() um String zu bekommen
    const timeLabel = this.timeToLabel(time);
    const [hours, minutes] = timeLabel.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Warnung: Es gibt Überschneidungen in der Auswahl
  canSelectAppointment(suggestion: SingleAppointment): boolean {
    return !this.selectedAppointmentSuggestions.some((existing) => {
      return this.appointmentsOverlap(existing, suggestion);
    });
  }
}
</script>

<style scoped>
.button-next {
  float: right;
}

.appointment-card {
  transition: all 0.2s ease;
}

.appointment-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.appointment-card.appointment-selected {
  border: 2px solid #1976d2;
  background-color: #f0f7ff;
}

.therapist-name {
  color: #1976d2;
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.appointment-date {
  color: #555;
  font-size: 0.9rem;
}

.appointment-time {
  color: #666;
  font-size: 0.9rem;
  font-weight: 500;
}

.appointment-duration {
  color: #999;
}

.conflict-warning {
  color: #d32f2f;
  margin-top: 0.25rem;
}

.appointment-disabled {
  cursor: not-allowed !important;
}

.cursor-pointer {
  cursor: pointer;
}
</style>
