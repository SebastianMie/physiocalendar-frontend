<template>
  <div class="therapist-header" @click="absenceDialog = true">
    {{ therapist }}
    <v-dialog v-model="absenceDialog" width="800">
      <v-card>
        <v-card-title class="text-h5 grey lighten-2">
          {{ absenceType }} von {{ therapist }} am {{ date }}
        </v-card-title>

        <v-card-text class="pt-5">
          <v-row v-if="masterlistAbsences.length > 0">
            <v-col>
              <v-alert type="info">
                Für diesen Therapeuten sind Abwesenheiten in der Stammliste
                vorhanden:
                <p
                  v-for="(absence) in masterlistAbsences"
                  :key="absence.start"
                  style="margin-bottom: 0px"
                >
                  <v-btn title="Ausnahme hinzufügen" icon @click="addException(absence)"
                    ><v-icon>mdi-account-star</v-icon></v-btn
                  >
                  {{ absence.day }} - {{ absence.start }} bis {{ absence.end }}
                </p>
              </v-alert>
            </v-col>
          </v-row>
          <h3 v-if="newExceptions.length > 0">Neue Ausnahmen</h3>
          <v-row
            v-for="(exception, index) in newExceptions"
            :key="`${exception.start}-${exception.end}-${index}`"
          >
            <v-col>
              <v-select
                :items="times"
                :value="exception.start"
                v-model="newExceptions[index].start"
                label="Von"
              ></v-select>
            </v-col>
            <v-col>
              <v-select
                :items="times"
                :value="exception.end"
                v-model="newExceptions[index].end"
                label="Bis"
              ></v-select>
            </v-col>
            <v-col cols="1">
              <v-btn
                icon
                color="error"
                @click="
                  newExceptions = newExceptions.filter((abs, i) => i !== index)
                "
                style="margin-top: 12px"
              >
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </v-col>
          </v-row>
          <h3 v-if="newAbsences.length > 0">Neue Abwesenheiten</h3>
          <v-row
            v-for="(absence, index) in newAbsences"
            :key="`${absence.start}-${absence.end}-${index}`"
          >
            <v-col>
              <v-select
                :items="times"
                :value="absence.start"
                v-model="newAbsences[index].start"
                label="Von"
              ></v-select>
            </v-col>
            <v-col>
              <v-select
                :items="times"
                :value="absence.end"
                v-model="newAbsences[index].end"
                label="Bis"
              ></v-select>
            </v-col>
            <v-col cols="1">
              <v-btn
                icon
                color="error"
                @click="
                  newAbsences = newAbsences.filter((abs, i) => i !== index)
                "
                style="margin-top: 12px"
              >
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </v-col>
          </v-row>
          <h3 v-if="newVacationAbsences.length > 0">Urlaub/ Tages Abwesenheiten</h3>
          <v-row v-for="(absence, index) in newVacationAbsences"
          :key="`${absence.start}-${absence.end}-${index}`"
          >
            <v-col>
              <v-text-field
                v-model="vacationStart"
                label="Von"
                type="date"
              ></v-text-field>
            </v-col>
            <v-col>
              <v-text-field
                v-model="vacationEnd"
                label="Bis"
                type="date"
              ></v-text-field>
            </v-col>
          </v-row>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-btn color="normal" text @click="resetInputs()"> Abbrechen </v-btn>
          <v-spacer></v-spacer>
            <v-btn
              color="primary"
              @click="newAbsences.push({ start: null, end: null })"
            >
              + Abwesenheit
            </v-btn>
            <v-btn
              color="primary"
              @click="newExceptions.push({ start: null, end: null })"
            >
              + Ausnahme
            </v-btn>
            <v-btn
                  color="primary"
                  @click="this.newVacationAbsences.push({ day: null, start: null, end: null })"
                >
                  + Urlaub
            </v-btn>
            <v-btn
              color="success"
              button
              @click="
                submitAbsences();
                createDialog = false;
              "
            >
              Speichern
            </v-btn>
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

@Component
export default class DaylistHeader extends Vue {
  @Prop() readonly therapist!: string;

  @Prop() readonly therapistID!: string;

  @Prop() readonly date!: string;

  @Prop() readonly absences!: { start: Time, end: Time }[];

  @Prop() readonly exceptions!: { start: Time, end: Time }[];

  @Prop() readonly masterlistAbsences!: { start: Time, end: Time }[];

  private absenceType = Dateconversions.convertReadableStringToDate(this.date).getDay() === 6 ? 'Anwesenheiten' : 'Abwesenheiten';

  vacationStart: string | null = null;

  vacationEnd: string | null = null;

  times = Dateconversions.getAllTimes();

  newAbsences = JSON.parse(JSON.stringify(this.absences)) as { start: Time, end: Time }[];

  newVacationAbsences = JSON.parse(JSON.stringify(this.absences)) as { day: string, start: Time, end: Time }[];

  newExceptions = JSON.parse(JSON.stringify(this.exceptions)) as { start: Time, end: Time }[];

  absenceDialog = false;

  mounted() : void {
    this.resetInputs();
  }

  resetInputs(): void {
    this.newAbsences = JSON.parse(JSON.stringify(this.absences)) as { start: Time, end: Time }[];
    this.newExceptions = this.exceptions.map((exc) => ({
      start: exc.start,
      end: exc.end,
      times: this.times.slice(this.times.indexOf(exc.start.toString()), this.times.indexOf(exc.end.toString()) + 1),
    }));

    this.vacationStart = null;
    this.vacationEnd = null;

    this.absenceDialog = false;
  }

  submitAbsences(): void {
    const absencesToBeSubmitted = this.newAbsences.filter((abs) => abs.start !== null && abs.end !== null);
    const exceptionsToBeSubmitted = this.newExceptions.filter((abs) => abs.start !== null && abs.end !== null);

    // Falls ein Urlaubszeitraum gesetzt wurde, generiere Abwesenheiten
    if (this.vacationStart && this.vacationEnd) {
      const vacationAbsences = DaylistHeader.generateAbsenceEntries(this.vacationStart, this.vacationEnd);
      absencesToBeSubmitted.push(...vacationAbsences);
    }

    this.$emit('absencesChanged', {
      exceptions: exceptionsToBeSubmitted,
      absences: absencesToBeSubmitted,
      therapistID: this.therapistID.slice(),
    });
    this.resetInputs();
  }

  static generateAbsenceEntries(startDate: string, endDate: string): Absence[] {
    const absences: Absence[] = [];
    const currentDate = new Date(startDate);
    const lastDate = new Date(endDate);
    // Standard-Arbeitszeiten basierend auf dem `Time`-Enum
    while (currentDate <= lastDate) {
      const formattedDate = currentDate.toISOString().split('T')[0].split('-').reverse().join('.'); // DD.MM.YYYY Format
      absences.push(new Absence(formattedDate, Time['7:00'], Time['20:50']));
      console.log(absences);
      // Einen Tag weitergehen
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return absences;
  }
}

</script>
