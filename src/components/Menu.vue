<template>
  <v-menu offset-y v-model="menuOpen">
    <template v-slot:activator="{ on, attrs }">
      <v-btn v-bind="attrs" v-on="on" text>
        <v-icon>mdi-menu-down</v-icon>
      </v-btn>
    </template>
    <v-list>
      <v-list-item @click="downloadItem(); closeMenu()" class="menu-item">
        Backup runterladen
      </v-list-item>
      <v-list-item
        v-for="(item, index) in menuItems"
        :key="index"
        @click.stop="item.dialog = true; closeMenu()"
        class="menu-item"
      >
        <v-list-item-title>{{ item.title }}</v-list-item-title>
      </v-list-item>
    </v-list>
    <v-dialog v-model="menuItems[0].dialog" max-width="600">
      <Import @dialogClosed="menuItems[0].dialog = false" />
    </v-dialog>
    <v-bottom-sheet v-model="menuItems[1].dialog">
      <Terminfinder @dialogClosed="menuItems[1].dialog = false" />
    </v-bottom-sheet>
    <v-dialog v-model="menuItems[2].dialog" max-width="600">
      <Settings @dialogClosed="menuItems[2].dialog = false" />
    </v-dialog>
  </v-menu>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import Terminfinder from '@/components/Terminfinder.vue';
import Import from '@/components/Import.vue';
import Settings from '@/components/Settings.vue';

import { getModule } from 'vuex-module-decorators';
import FileSaver from 'file-saver';
import Store from '../store/backup';
import convertToJSON from '../store/convertToJSON';

@Component({
  components: {
    Terminfinder,
    Import,
    Settings,
  },
})

export default class Menu extends Vue {
  private menuItems = [
    { title: 'Backup einspielen', dialog: false },
    { title: 'Terminfinder', dialog: false },
    { title: 'Therapeuten verwalten', dialog: false },
  ];

  private menuOpen = false;

  store = getModule(Store);

  closeMenu(): void {
    this.menuOpen = false;
  }

  downloadItem(): void {
    const backup = this.store.getBackup;
    if (backup) {
      const backupJSON = convertToJSON(backup);
      backupJSON.createdDate = new Date().getTime();
      const blob = new Blob([JSON.stringify(backupJSON, null, 2)], { type: 'text/plain;charset=utf-8' });
      FileSaver.saveAs(blob, `backup_${backupJSON.createdDate}.json`);
    }
  }
}

</script>

<style scoped>
.menu-item {
  cursor: pointer;
}
.menu-item:hover {
  background-color: #eeeeee;
}
</style>
