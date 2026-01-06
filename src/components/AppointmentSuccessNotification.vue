<template>
  <v-snackbar
    v-model="internalVisible"
    color="success"
    top
    right
    :timeout="timeout"
  >
    <div class="d-flex align-center">
      <v-icon left>mdi-check-circle</v-icon>
      <span>{{ message }}</span>
    </div>
  </v-snackbar>
</template>

<script lang="ts">
import {
  Vue, Component, Prop, Watch,
} from 'vue-property-decorator';

@Component
export default class AppointmentSuccessNotification extends Vue {
  @Prop({ required: true }) visible!: boolean;

  @Prop({ required: true }) message!: string;

  @Prop({ default: 3000 }) timeout!: number;

  internalVisible = false;

  @Watch('visible', { immediate: true })
  onVisibleChanged(v: boolean): void {
    this.internalVisible = v;
  }

  @Watch('internalVisible')
  onInternalVisibleChanged(v: boolean): void {
    this.$emit('update:visible', v);
  }
}
</script>
