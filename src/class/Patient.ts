
export default class Therapist {
  firstName: string;

  name: string;

  id: string;

  activeSince: Date;

  activeUntil: Date;

  isBWO: boolean;

  constructor(
    firstName: string,
    name: string,
    id: string,
    activeSince: Date,
    activeUntil: Date,
    isBWO: boolean,
  ) {
    this.firstName = firstName;
    this.name = name;
    this.id = id;
    this.activeSince = activeSince;
    this.activeUntil = activeUntil;
    this.isBWO = isBWO;
  }
}
