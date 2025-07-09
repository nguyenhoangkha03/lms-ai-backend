export interface SeederInterface {
  run(): Promise<void>;
}

export interface SeedData {
  model: string;
  data: any[];
}
