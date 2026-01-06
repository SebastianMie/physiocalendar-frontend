<template>
  <v-row align="center" justify="center">
    <v-col cols="auto"
      ><v-btn text @click="setPreviousDate">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
    </v-col>
    <v-col cols="auto">
      <v-menu
        v-model="menu"
        :close-on-content-click="false"
        :nudge-right="40"
        transition="scale-transition"
        offset-y
        min-width="auto"
      >
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            color="primary"
            v-model="dateFormatted"
            v-bind="attrs"
            v-on="on"
            >{{ weekday }} {{ dateFormatted }}</v-btn
          >
        </template>
        <v-date-picker
          v-model="date"
          v-date-
          :allowed-dates="dateIsAllowed"
          @input="
            menu = false;
            getCombinedDate();
          "
          locale="de-de"
          :first-day-of-week="1"
        ></v-date-picker>
      </v-menu>
    </v-col>
    <v-col cols="auto">
      <v-btn text @click="setNextDate">
        <v-icon>mdi-arrow-right</v-icon>
      </v-btn>
    </v-col>
  </v-row>
</template>

<script lang="ts">
import Dateconversions from '@/class/Dateconversions';
import EventBus from '@/class/EventBus';
import {
  Component, Prop, Watch, Vue,
} from 'vue-property-decorator';
import holidaysJSON from '@/data/holidays.json';

@Component({
  components: {
    EventBus,
  },
})
export default class SingleDayPicker extends Vue {
  @Prop() readonly currentSingleDay!: string;

  public date: string = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().substr(0, 10)

  private dateFormatted: string = Dateconversions.convertEnglishToGermanReadableString(this.date);

  private weekday = this.getWeekdaybyDate(new Date());

  private menu = false;

  private holidays = holidaysJSON.days;

  mounted() : void {
    if (!this.dateIsAllowed(this.date)) {
      this.setNextDate();
    }
  }

  @Watch('currentSingleDay')
  private oncurrentSingleDayChanged(): void {
    this.dateFormatted = Dateconversions.convertGermanToEnglishReadableString(this.currentSingleDay);
    this.date = this.dateFormatted;
    this.dateFormatted = Dateconversions.convertEnglishToGermanReadableString(this.date);
  }

  @Watch('date')
  private dateChanged(): void {
    this.dateFormatted = Dateconversions.convertEnglishToGermanReadableString(this.date);
    this.weekday = this.getWeekdaybyDate();
    this.$emit('currentDayChanged', this.dateFormatted);
  }

  private dateIsAllowed(dateVal: string | Date): boolean {
    const minDate = new Date('2024-01-01'); // 1. Januar 2024

    if (typeof dateVal === 'string') {
      // Falls das Datum ein String ist, konvertieren wir es in ein Date-Objekt
      const parsedDate = new Date(dateVal);
      if (parsedDate < minDate) return false; // Blockiere alle Daten vor 2024

      if (this.holidays.includes(dateVal)) {
        return false;
      }
      const day = this.getCombinedDate(dateVal).getDay();
      return day > 0 && day < 7;
    }

    // Falls es bereits ein Date-Objekt ist
    if (dateVal < minDate) return false; // Blockiere alle Daten vor 2024

    const readableString = Dateconversions.convertGermanToEnglishReadableString(
      Dateconversions.convertDateToReadableString(dateVal),
    );
    if (this.holidays.includes(readableString)) {
      return false;
    }

    const day = dateVal.getDay();
    return day > 0 && day < 7;
  }

  private getCombinedDate(dateString?: string): Date {
    const date = dateString || this.date;
    const timezoneOffsetInHours = new Date(`${date}T00:00:00.000Z`).getTimezoneOffset() * -1;
    const offsetSuffix = `${timezoneOffsetInHours < 0 ? '-' : '+'}0${Math.abs(timezoneOffsetInHours / 60)}:00`;
    return new Date(`${date}T00:00:00.000${offsetSuffix}`);
  }

  private getWeekdaybyDate(date? : Date) : string {
    const dateToCheck = date || this.getCombinedDate();
    return Dateconversions.getWeekdayStringForDate(dateToCheck);
  }

  private setPreviousDate(): void {
    const date = this.getCombinedDate();
    date.setDate(date.getDate() - 1);
    while (!this.dateIsAllowed(date)) {
      date.setDate(date.getDate() - 1);
    }
    this.date = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  }

  private setNextDate(): void {
    const date = this.getCombinedDate();
    date.setDate(date.getDate() + 1);
    while (!this.dateIsAllowed(date)) {
      date.setDate(date.getDate() + 1);
    }
    this.date = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  }
}

</script>
