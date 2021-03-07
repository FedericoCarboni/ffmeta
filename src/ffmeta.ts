export interface Tags {
  [key: string]: string;
}

export interface Chapter {
  TIMEBASE?: string;
  START: string;
  END: string;
  metadata: Tags;
}

export interface Stream {
  metadata: Tags;
}

export interface FFMeta {
  metadata: Tags;
  chapters: Chapter[];
  streams: Stream[];
}

export function parse(text: string) {
  const s = '' + text;
}
