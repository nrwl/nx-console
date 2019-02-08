export type SelectDirectory = (options: {
  title: string;
  buttonLabel: string;
}) => Promise<string | undefined>;
