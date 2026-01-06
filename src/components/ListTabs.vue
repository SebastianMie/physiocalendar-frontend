<template>
  <div>
    <v-tabs class="mt-4" v-model="tab" background-color="transparent" grow>
      <v-tabs-slider></v-tabs-slider>
      <v-tab v-for="list in lists" :key="list.name">
        {{ list.name }}
      </v-tab>
    </v-tabs>
    <v-tabs-items v-model="tab">
      <v-tab-item v-for="list in lists" :key="list.name">
        <CalendarList :listType="list.type" />
      </v-tab-item>
    </v-tabs-items>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import CalendarList from './CalendarList.vue';

@Component({
  components: {
    CalendarList,
  },
})

export default class ListTabs extends Vue {
  public tab = null;

  public lists: Array<Record<string, string>> = [{ name: 'Terminliste', type: 'daylist' }, { name: 'Stammliste', type: 'masterlist' }]
}
</script>
