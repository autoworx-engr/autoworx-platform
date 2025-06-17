export type TAttachments =
  | {
      fileUrl: string;
      id: number;
      isLocal?: boolean;
    }[]
  | [];
