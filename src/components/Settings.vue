<template>
  <v-card>
    <v-card-title class="text-h5"> Therapeuten verwalten </v-card-title>

    <v-card-text class="pt-5">
      <v-row
        class="pl-4 pr-2"
        v-for="therapist in therapists.filter(
          (therapist) =>
            therapist.state !== 'removed' && therapist.state !== 'added-removed'
        )"
        :key="therapist.id"
      >
        <v-text-field :value="therapist.name" dense @change="renameTherapist(therapist.id, $event)" />
        <v-btn icon color="primary" @click="removeTherapist(therapist.id)">
          <v-icon color="error">mdi-delete</v-icon>
        </v-btn>
      </v-row>
      <h6 class="text-subtitle-1 mt-8" style="color: black; font-weight: bold">
        Therapeuten hinzufügen
      </h6>
      <v-row class="pl-4 pr-2 mt-4">
        <v-text-field v-model="therapistTextfield" label="Name" dense />
        <v-btn icon color="secondary" @click="addTherapist()">
          <v-icon>mdi-plus</v-icon>
        </v-btn>
      </v-row>
    </v-card-text>

    <v-card-actions>
      <v-btn
        text
        @click="
          reloadTherapists();
          $emit('dialogClosed');
        "
      >
        Abbrechen
      </v-btn>
      <v-spacer></v-spacer>
      <v-btn color="success" button @click="commitNewTherapists()">
        Speichern
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script lang="ts">
import { v4 as uuidv4 } from 'uuid';
import Backup from '@/class/Backup';
import { Component, Vue } from 'vue-property-decorator';
import { getModule } from 'vuex-module-decorators';
import Store from '../store/backup';

@Component
export default class Settings extends Vue {
  store = getModule(Store);

  backup: Backup | null = null;

  therapists: {
    name: string,
    id: string,
    state: 'unchanged' | 'removed' | 'added' | 'added-removed' | 'renamed'
  }[] = [];

  therapistTextfield = '';

  mounted(): void {
    this.backup = this.store.getBackup;
    this.reloadTherapists();
  }

  reloadTherapists(): void {
    this.therapists = this.backup?.therapists.map((therapist) => ({
      name: therapist.name,
      id: therapist.id,
      state: 'unchanged',
    })) || [];
  }

  removeTherapist(id: string): void {
    const therapistFound = this.therapists.find((therapist) => therapist.id === id);
    if (therapistFound) {
      const i = this.therapists.indexOf(therapistFound);
      if (this.therapists[i].state === 'added') {
        this.therapists[i].state = 'added-removed';
      } else {
        this.therapists[i].state = 'removed';
      }
    }
  }

  addTherapist(): void {
    this.therapists.push({
      name: this.therapistTextfield,
      id: uuidv4(),
      state: 'added',
    });
    this.therapistTextfield = '';
  }

  renameTherapist(therapistID: string, newName: string): void {
    const therapistFound = this.therapists.find((therapist) => therapist.id === therapistID);
    if (therapistFound) {
      this.therapists[this.therapists.indexOf(therapistFound)].name = newName;
      this.therapists[this.therapists.indexOf(therapistFound)].state = 'renamed';
    }
  }

  async commitNewTherapists(): Promise<void> {
    // eslint-disable-next-line no-restricted-syntax
    for (const therapist of this.therapists) {
      if (therapist.state === 'added') {
        this.store.addTherapist({ name: therapist.name, id: therapist.id });
      } else if (therapist.state === 'removed') {
        // eslint-disable-next-line no-await-in-loop
        const futureAppointments = await this.store.getFutureAppointmentsForTherapist(therapist.id);
        if (futureAppointments.length > 0) {
          // Detaillierte Termine abrufen
          // eslint-disable-next-line no-await-in-loop
          const appointmentDetails = await this.store.getFutureAppointmentsDetailsForTherapist(therapist.id);

          // Termine als formatierte Liste anzeigen
          const appointmentList = appointmentDetails.map(
            (apt) => `${apt.type}: ${apt.date} | ${apt.patient} | ${apt.time}`,
          ).join('\n');

          // eslint-disable-next-line no-alert
          const confirmDelete = window.confirm(
            `Therapeut "${therapist.name}" hat noch ${appointmentDetails.length} zukünftige Termine:\n\n${appointmentList}\n
            \n⚠️ ACHTUNG: Diese Termine werden gelöscht!\n\nWirklich löschen und Therapeuten entfernen?`,
          );

          if (confirmDelete) {
            // Alle zukünftigen Termine löschen
            this.store.deleteFutureAppointmentsForTherapist(therapist.id);
            // Therapeut löschen
            this.store.removeTherapist(therapist.id);
            // eslint-disable-next-line no-alert
            window.alert(
              `Therapeut "${therapist.name}" und ${appointmentDetails.length} zukünftige Termine wurden erfolgreich gelöscht.`,
            );
            therapist.state = 'unchanged';
          } else {
            // Benutzer hat abgebrochen - der Therapeut bleibt unverändert
            therapist.state = 'unchanged';
          }
        } else {
          // Falls keine Termine vorhanden sind, wird der Therapeut gelöscht
          this.store.removeTherapist(therapist.id);
          // eslint-disable-next-line no-alert
          window.alert(
            `Therapeut "${therapist.name}" wurde erfolgreich gelöscht.`,
          );
        }
      } else if (therapist.state === 'renamed') {
        this.store.renameTherapist({ id: therapist.id, name: therapist.name });
      }
    }
    // Therapeutenliste neu laden
    this.reloadTherapists();
    // Dialog schließen
    this.$emit('dialogClosed');
  }
}
</script>
