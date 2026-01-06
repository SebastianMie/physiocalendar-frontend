<template>
  <v-row align="center" justify="center">
    <v-col cols="auto"
      ><v-btn text @click="setPreviousWeekDay">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
    </v-col>
    <v-col cols="auto">
      <v-btn color="primary">{{ weekDay }}</v-btn>
    </v-col>
    <v-col cols="auto">
      <v-btn text @click="setNextWeekDay">
        <v-icon>mdi-arrow-right</v-icon>
      </v-btn>
    </v-col>
  </v-row>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { Weekday } from '../class/Enums';

@Component
export default class WeekDayPicker extends Vue {
  private weekDay: Weekday = Weekday.MONDAY;

  setNextWeekDay(): void {
    switch (this.weekDay) {
      case Weekday.MONDAY: this.weekDay = Weekday.TUESDAY; break;
      case Weekday.TUESDAY: this.weekDay = Weekday.WEDNESDAY; break;
      case Weekday.WEDNESDAY: this.weekDay = Weekday.THURSDAY; break;
      case Weekday.THURSDAY: this.weekDay = Weekday.FRIDAY; break;
      case Weekday.FRIDAY: this.weekDay = Weekday.MONDAY; break;
      default: break;
    }
    this.$emit('weekDayChanged', this.weekDay);
  }

  setPreviousWeekDay(): void {
    switch (this.weekDay) {
      case Weekday.MONDAY: this.weekDay = Weekday.FRIDAY; break;
      case Weekday.TUESDAY: this.weekDay = Weekday.MONDAY; break;
      case Weekday.WEDNESDAY: this.weekDay = Weekday.TUESDAY; break;
      case Weekday.THURSDAY: this.weekDay = Weekday.WEDNESDAY; break;
      case Weekday.FRIDAY: this.weekDay = Weekday.THURSDAY; break;
      default: break;
    }
    this.$emit('weekDayChanged', this.weekDay);
  }
}

</script>
