<template>
  <div class="therapist-header" @click="absenceDialog = true">
    {{ therapist }}
    <v-dialog v-model="absenceDialog" width="800">
      <v-card>
        <v-card-title class="text-h5 grey lighten-2">
          Abwesenheiten von {{ therapist }}
        </v-card-title>
        <v-card-text class="pt-5">
          <!-- Bestehende Abwesenheiten anzeigen -->
          <h3 v-if="dayAbsences.length > 0">Bestehende Abwesenheiten</h3>
          <div v-for="(absence, index) in dayAbsences" :key="'absence-' + index">
            <p class="entry">
              {{ absence.day }} - {{ absence.start }} bis {{ absence.end }}
              <v-btn icon color="error" @click="removeAbsence(index)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </p>
          </div>

          <!-- Bestehende Ausnahmen anzeigen -->
          <h3 v-if="exceptions.length > 0">Bestehende Ausnahmen</h3>
          <div v-for="(exception, index) in exceptions" :key="'exception-' + index">
            <p class="entry">
              {{ exception.day }} - {{ exception.start }} bis {{ exception.end }}
              <v-btn icon color="error" @click="removeException(index)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </p>
          </div>

          <!-- Stammlisten-Abwesenheiten mit Ausnahme-Hinzufügen -->
          <div v-if="masterlistAbsences.length > 0">
            <v-alert type="info">
              Stammlisten-Abwesenheiten:
              <div v-for="(absence, index) in masterlistAbsences" :key="'masterabsence-' + index">
                <p class="entry">
                  <v-icon small>mdi-account-star</v-icon>
                  {{ absence.day }} - {{ absence.start }} bis {{ absence.end }}
                </p>
              </div>
            </v-alert>
          </div>

          <h3 v-if="newException"> Neue Ausnahme</h3>
          <v-row v-if="newException">
            <v-col>
              <v-select
                :items="times"
                v-model="exceptionStartTime"
                label="Von"
              ></v-select>
            </v-col>
            <v-col>
              <v-select
                :items="times"
                v-model="exceptionEndTime"
                label="Bis"
              ></v-select>
            </v-col>
          </v-row>
          <!-- Toggle für Einzel- oder Zeitraum-Abwesenheit -->
          <h3 v-if="newAbsence">Neue Abwesenheit hinzufügen</h3>
          <v-switch v-if="newAbsence" v-model="isMultiDay" label="Zeitraum-Abwesenheit"></v-switch>

          <!-- Eingabe für Datum: Entweder Einzel- oder Zeitraum -->
          <v-row v-if="newAbsence">
            <v-col v-if="isMultiDay">
              <v-text-field v-model="absenceStartDate" label="Von" type="date"></v-text-field>
            </v-col>
            <v-col v-if="isMultiDay">
              <v-text-field v-model="absenceEndDate" label="Bis" type="date"></v-text-field>
            </v-col>
          </v-row>

          <!-- Eingabe für Uhrzeiten -->
          <v-row v-if="newAbsence">
            <v-col>
              <v-select :items="times" v-model="absenceStartTime" label="Von"></v-select>
            </v-col>
            <v-col>
              <v-select :items="times" v-model="absenceEndTime" label="Bis"></v-select>
            </v-col>
          </v-row>
        </v-card-text>

        <v-divider></v-divider>
        <v-card-actions>
            <v-btn color="normal" text @click="resetInputsClose()"> Abbrechen </v-btn>
            <v-spacer></v-spacer>
            <!-- Button für neue Abwesenheit -->
            <v-btn color="primary" @click="newAbsence = true"> Neue Abwesenheit </v-btn>
            <v-spacer></v-spacer>
            <!-- Button für neue Ausnahme -->
            <v-btn color="primary" @click="newException = true"> Neue Ausnahme </v-btn>
            <v-spacer></v-spacer>
            <v-btn color="success" button @click="submitAbsences()"> Speichern </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import Absence from '@/class/Absence';
import Dateconversions from '@/class/Dateconversions';
import { Time } from '@/class/Enums';
import { Component, Prop, Vue } from 'vue-property-decorator';
import Exception from '../class/Exception';

@Component
export default class DaylistHeader extends Vue {
  @Prop() readonly therapist!: string;

  @Prop() readonly therapistID!: string;

  @Prop() readonly dayAbsences!: Absence[];

  @Prop() readonly exceptions!: Exception[];

  @Prop() readonly date!: string;

  @Prop() readonly masterlistAbsences!: Absence[];

  // Standardwerte für Abwesenheiten
  absenceStartDate: string | null = this.date;

  absenceEndDate: string | null = null;

  absenceStartTime: Time | null = null;

  absenceEndTime: Time | null = null;

  exceptionStartTime: Time | null = null;

  exceptionEndTime: Time | null = null;

  isMultiDay = false; // Umschalter für Tages- oder Zeitraum-Abwesenheit

  times = Dateconversions.getAllTimes();

  absenceDialog = false;

  newAbsence = false;

  newException = false;

  // Lokale Arrays für Änderungen
  localAbsences = JSON.parse(JSON.stringify(this.dayAbsences)) as Absence[];

  localExceptions = JSON.parse(JSON.stringify(this.exceptions)) as Exception[];

  mounted() : void {
    this.resetInputs();
  }

  addAbsence(): void {
    if (!this.absenceStartTime || !this.absenceEndTime) return;

    const newAbsence = new Absence(this.date, this.absenceStartTime, this.absenceEndTime);
    this.localAbsences.push(newAbsence);

    // Direktes Event-Feuern
    this.$emit('absencesChanged', {
      absences: this.localAbsences,
      therapistID: this.therapistID,
    });
  }

  addException(): void {
    if (!this.exceptionStartTime || !this.exceptionEndTime) return;

    const newException = new Exception(this.date, this.exceptionStartTime, this.exceptionEndTime);
    this.localExceptions.push(newException);

    // Direktes Event-Feuern
    this.$emit('exceptionsChanged', {
      exceptions: this.localExceptions,
      therapistID: this.therapistID,
    });
  }

  removeAbsence(index: number): void {
    this.localAbsences.splice(index, 1);

    // Direktes Event-Feuern
    this.$emit('absencesChanged', {
      absences: this.localAbsences,
      therapistID: this.therapistID,
    });
  }

  // Entfernt eine Ausnahme
  removeException(index: number): void {
    this.localExceptions.splice(index, 1);

    // Direktes Event-Feuern
    this.$emit('exceptionsChanged', {
      exceptions: this.localExceptions,
      therapistID: this.therapistID,
    });
  }

  resetInputs(): void {
    this.localAbsences = JSON.parse(JSON.stringify(this.masterlistAbsences));
    this.localExceptions = JSON.parse(JSON.stringify(this.exceptions));
    this.absenceStartDate = null;
    this.absenceEndDate = null;
    this.absenceStartTime = null;
    this.absenceEndTime = null;
    this.exceptionStartTime = null;
    this.exceptionEndTime = null;
    this.newAbsence = false;
    this.newException = false;
  }

  resetInputsClose(): void {
    this.localAbsences = JSON.parse(JSON.stringify(this.masterlistAbsences));
    this.localExceptions = JSON.parse(JSON.stringify(this.exceptions));
    this.absenceStartDate = null;
    this.absenceEndDate = null;
    this.absenceStartTime = null;
    this.absenceEndTime = null;
    this.exceptionStartTime = null;
    this.exceptionEndTime = null;
    this.newAbsence = false;
    this.newException = false;

    this.absenceDialog = false;
  }

  submitAbsences(): void {
    if (!this.date) return;

    let absencesToBeSubmitted: Absence[] = [];

    this.addException();

    if (this.isMultiDay && this.absenceStartTime && this.absenceEndTime && this.absenceStartDate && this.absenceEndDate) {
      absencesToBeSubmitted = DaylistHeader.generateAbsenceEntries(
        this.absenceStartDate,
        this.absenceEndDate,
        this.absenceStartTime,
        this.absenceEndTime,
      );
      if (absencesToBeSubmitted.length > 0) {
        this.$emit('absencesChanged', {
          absences: absencesToBeSubmitted,
          therapistID: this.therapistID.slice(),
        });
      }
    } else {
      this.addAbsence();
    }

    this.resetInputs();
  }

  static generateAbsenceEntries(startDate: string, endDate: string, startTime: Time, endTime: Time): Absence[] {
    const absences: Absence[] = [];

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      console.error('Fehler: Startdatum liegt nach dem Enddatum.');
      return [];
    }

    const currentDate = new Date(start);

    while (currentDate <= end) {
      // Führende Nullen für Datum sicherstellen
      const day = String(currentDate.getDate()).padStart(2, '0');
      const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Monate in JS starten bei 0
      const year = currentDate.getFullYear();
      const formattedDate = `${day}.${month}.${year}`;

      absences.push(new Absence(formattedDate, startTime, endTime));

      currentDate.setDate(currentDate.getDate() + 1);
    }
    return absences;
  }
}
</script>

<style scoped lang="scss">
.entry {
  margin: 0;
  padding: 0;
  line-height: 1.2;
}
</style>
