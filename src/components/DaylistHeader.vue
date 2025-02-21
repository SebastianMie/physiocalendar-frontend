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
          <h3 v-if="absences.length > 0">Bestehende Abwesenheiten</h3>
          <v-row v-for="(absence, index) in absences" :key="index">
            <v-col>
              {{ absence.day }} - {{ absence.start }} bis {{ absence.end }}
            </v-col>
            <v-col cols="1">
              <v-btn icon color="error" @click="removeAbsence(index)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </v-col>
          </v-row>

          <!-- Stammlisten-Abwesenheiten mit Ausnahme-Hinzufügen -->
          <v-row v-if="masterlistAbsences.length > 0">
            <v-col>
              <v-alert type="info">
                Stammlisten-Abwesenheiten:
                <p style="margin-bottom: 0" v-for="(absence, index) in masterlistAbsences" :key="index">
                  <v-btn title="Ausnahme hinzufügen" icon @click="addException(absence)">
                    <v-icon>mdi-account-star</v-icon>
                  </v-btn>
                  {{ absence.day }} - {{ absence.start }} bis {{ absence.end }}
                </p>
              </v-alert>
            </v-col>
          </v-row>

          <!-- Bestehende Ausnahmen anzeigen -->
          <h3 v-if="localExceptions.length > 0">Neue Ausnahmen</h3>
          <v-row v-for="(exception, index) in localExceptions" :key="index">
            <v-col>
              <v-select :items="times" v-model="localExceptions[index].start" label="Von"></v-select>
            </v-col>
            <v-col>
              <v-select :items="times" v-model="localExceptions[index].end" label="Bis"></v-select>
            </v-col>
            <v-col cols="1">
              <v-btn icon color="error" @click="removeException(index)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </v-col>
          </v-row>

          <!-- Toggle für Einzel- oder Zeitraum-Abwesenheit -->
          <h3>Neue Abwesenheit hinzufügen</h3>
          <v-switch v-model="isMultiDay" label="Zeitraum-Abwesenheit"></v-switch>

          <!-- Eingabe für Datum: Entweder Einzel- oder Zeitraum -->
          <v-row>
            <v-col v-if="isMultiDay">
              <v-text-field v-model="absenceStartDate" label="Von" type="date"></v-text-field>
            </v-col>
            <v-col v-if="isMultiDay">
              <v-text-field v-model="absenceEndDate" label="Bis" type="date"></v-text-field>
            </v-col>
          </v-row>

          <!-- Eingabe für Uhrzeiten -->
          <v-row>
            <v-col>
              <v-select :items="times" v-model="absenceStartTime" label="Von Uhrzeit"></v-select>
            </v-col>
            <v-col>
              <v-select :items="times" v-model="absenceEndTime" label="Bis Uhrzeit"></v-select>
            </v-col>
          </v-row>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions>
          <v-btn color="normal" text @click="resetInputs()"> Abbrechen </v-btn>
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

  @Prop() readonly absences!: { day: string, start: Time, end: Time }[];

  @Prop() readonly exceptions!: { start: Time, end: Time }[];

  @Prop() readonly date!: string;

  @Prop() readonly masterlistAbsences!: { day: string, start: Time, end: Time }[];

  // Standardwerte für Abwesenheiten
  absenceStartDate: string | null = this.date;

  absenceEndDate: string | null = null;

  absenceStartTime: Time = Time['7:00'];

  absenceEndTime: Time = Time['20:50'];

  isMultiDay = false; // Umschalter für Tages- oder Zeitraum-Abwesenheit

  times = Dateconversions.getAllTimes();

  absenceDialog = false;

  // Lokale Arrays für Änderungen
  localAbsences = JSON.parse(JSON.stringify(this.absences)) as Absence[];

  localExceptions = JSON.parse(JSON.stringify(this.exceptions)) as Exception[];

  mounted() : void {
    this.resetInputs();
  }

  // Entfernt eine bestehende Abwesenheit
  removeAbsence(index: number): void {
    console.log('Lösche Abwesenheit:', this.localAbsences[index]);
    this.localAbsences.splice(index, 1);
  }

  // Entfernt eine Ausnahme
  removeException(index: number): void {
    console.log('Lösche Ausnahme:', this.localExceptions[index]);
    this.localExceptions.splice(index, 1);
  }

  resetInputs(): void {
    console.log('Eingaben zurücksetzen');
    this.localAbsences = JSON.parse(JSON.stringify(this.absences));
    this.localExceptions = JSON.parse(JSON.stringify(this.exceptions));
    this.absenceStartDate = null;
    this.absenceEndDate = null;
    this.absenceStartTime = Time['7:00'];
    this.absenceEndTime = Time['20:50'];
    this.absenceDialog = false;
  }

  submitAbsences(): void {
    console.log(this.date);
    if (!this.date) return;

    let absencesToBeSubmitted: Absence[] = [];

    if (this.isMultiDay && this.absenceEndDate) {
      absencesToBeSubmitted = DaylistHeader.generateAbsenceEntries(
        this.date,
        this.absenceEndDate,
        this.absenceStartTime,
        this.absenceEndTime,
      );
    } else {
      absencesToBeSubmitted.push(new Absence(this.date, this.absenceStartTime, this.absenceEndTime));
    }

    console.log('Speichere Abwesenheiten:', absencesToBeSubmitted);
    console.log('Speichere Ausnahmen:', this.localExceptions);

    this.$emit('absencesChanged', {
      absences: this.localAbsences.concat(absencesToBeSubmitted),
      exceptions: this.localExceptions,
      therapistID: this.therapistID.slice(),
    });

    this.resetInputs();
  }

  static generateAbsenceEntries(startDate: string, endDate: string, startTime: Time, endTime: Time): Absence[] {
    const absences: Absence[] = [];
    const currentDate = new Date(startDate);
    const lastDate = new Date(endDate);

    while (currentDate <= lastDate) {
      const formattedDate = currentDate.toISOString().split('T')[0].split('-').reverse().join('.');
      absences.push(new Absence(formattedDate, startTime, endTime));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log('Generierte Abwesenheiten:', absences);
    return absences;
  }

  addException(exception: Exception): void {
    this.localExceptions.push(exception);
  }
}
</script>
