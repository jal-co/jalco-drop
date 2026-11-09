export type Drop = {
  slug: string;
  name: string;
  size: number;
  type: string;
  uploaded: Date;
  locked: boolean;
  expires?: number;
  sender?: string;
  uploader?: Uploader;
};

export type Uploader = { id: string; name: string; avatar: boolean };

export type Card = {
  url: string;
  description: string;
  image?: string;
  imageSize?: { width: number; height: number };
  video?: { url: string; type: string };
};

export type ShareEntry = { path: string; size: number };
