<template>
  <v-app-bar app color="#2a2f79" dark>
    <img src="@/assets/icon-inverted.png" height="50px" class="mr-4" />
    <div class="d-flex align-center">
      <h1 class="text-h4">Physiokalender - Praxis Meyer</h1>
    </div>
    <v-spacer></v-spacer>
    <v-text-field
      hide-details
      prepend-icon="mdi-magnify"
      single-line
      v-model="searchTextfield"
      @click:prepend="search()"
      @keydown.enter="search()"
    ></v-text-field>
    <v-card v-if="showSearchResults" class="search-results" light elevation="24">
  <v-card-title>Suchergebnisse</v-card-title>

  <!-- Der scrollbare Bereich -->
  <v-card-text class="search-results-content">
    <ul v-if="searchResults.length > 0">
      <li v-for="(result, i) in searchResults" :key="`${result.id}-${i}`">
        <v-btn block text style="justify-content: flex-start;" @click="navigateTargetDate(result.date)">
          <strong>{{ result.patient }}:</strong>
          {{
            result.startDate ? `${result.weekday}s` : getReadableDate(result.date)
          }}, {{ result.startTime }} bis {{ result.endTime }} bei
          {{ result.therapist }}
        </v-btn>
      </li>
    </ul>
    <p v-else>Keine Termine gefunden.</p>
  </v-card-text>

  <!-- Fixierte Schließen-Schaltfläche -->
  <v-card-actions class="search-results-footer">
    <v-btn color="primary" @click="closeSearchResults()">Schließen</v-btn>
  </v-card-actions>
</v-card>
    <Menu />
  </v-app-bar>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import Menu from '@/components/Menu.vue';
import { getModule } from 'vuex-module-decorators';
import Appointment from '@/class/Appointment';
import AppointmentSeries from '@/class/AppointmentSeries';
import SingleAppointment from '@/class/SingleAppointment';
import Backup from '@/class/Backup';
import Dateconversions from '@/class/Dateconversions';
import Store from '../store/backup';
import EventBus from '../class/EventBus';

@Component({
  components: {
    Menu,
    EventBus,
  },
})

export default class AppBar extends Vue {
  private searchTextfield = '';

  private showSearchResults = false;

  private searchResults: Appointment[] = [];

  store = getModule(Store);

  get localBackup(): Backup | null {
    return this.store.getBackup;
  }

  search(): void {
    this.searchResults = [];
    if (this.localBackup && this.searchTextfield.length > 2) {
      const searchText = this.searchTextfield.toLowerCase();
      this.localBackup.masterlist.elements.forEach((listDay) => {
        this.searchResults = this.searchResults.concat(listDay.appointments.filter((appointment) => {
          const readableStartDate = Dateconversions.convertDateToReadableString((appointment as AppointmentSeries).startDate);
          const readableEndDate = Dateconversions.convertDateToReadableString((appointment as AppointmentSeries).endDate);
          const readableTargetDate = Dateconversions.convertDateToReadableString(new Date());
          return appointment.patient
            && ((appointment as AppointmentSeries).startDate < new Date() || readableStartDate === readableTargetDate)
            && ((appointment as AppointmentSeries).endDate > new Date() || readableEndDate === readableTargetDate)
            && appointment.patient.toLowerCase().includes(searchText);
        }));
      });
      this.localBackup.daylist.elements.forEach((listDay) => {
        this.searchResults = this.searchResults.concat(listDay.appointments.filter((appointment) => {
          const readableStartDate = Dateconversions.convertDateToReadableString((appointment as SingleAppointment).date);
          const readableTargetDate = Dateconversions.convertDateToReadableString(new Date());
          return appointment.patient
            && ((appointment as SingleAppointment).date > new Date() || readableStartDate === readableTargetDate)
            && appointment.patient.toLowerCase().includes(searchText);
        }));
      });
      // Sortiere die Suchergebnisse nach dem Datum
      this.searchResults.sort((a, b) => {
        const dateA = (a instanceof AppointmentSeries) ? (a as AppointmentSeries).startDate : (a as SingleAppointment).date;
        const dateB = (b instanceof AppointmentSeries) ? (b as AppointmentSeries).startDate : (b as SingleAppointment).date;
        return dateA.getTime() - dateB.getTime();
      });
      this.showSearchResults = true;
    }
  }

  closeSearchResults(): void {
    this.searchResults = [];
    this.searchTextfield = '';
    this.showSearchResults = false;
  }

  navigateTargetDate(date: Date): void {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dateFormatted = `${day}.${month}.${year}`;
    // nur einzeltermine betroffen Serientermine haben date 1975
    if (year >= 2000) {
      EventBus.$emit('currentDayChanged1', dateFormatted);
    }
    this.showSearchResults = false;
  }

  // eslint-disable-next-line class-methods-use-this
  getReadableDate(date: Date): string {
    return Dateconversions.convertDateToReadableString(date);
  }
}
</script>

<style>
.search-results {
  position: fixed; /* Damit der Dialog fixiert bleibt */
  top: 100px;
  right: 400px;
  max-height: 400px;
  display: flex;
  flex-direction: column;
  background: white;
  box-shadow: 0px 2px 10px rgba(0, 0, 0, 0.3);
}

.search-results-content {
  flex-grow: 1; /* Sorgt dafür, dass sich der Inhalt flexibel anpasst */
  overflow-y: auto; /* Macht den Inhalt scrollbar */
  max-height: 300px; /* Begrenzte Höhe für das Scrollen */
  padding: 10px;
}

.search-results-footer {
  background: white;
  padding: 10px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

</style>
