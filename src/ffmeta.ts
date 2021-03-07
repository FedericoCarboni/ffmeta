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

const enum Const {
  ID_STRING = ';FFMETADATA',
  ID_CHAPTER = '[CHAPTER]',
  ID_STREAM = '[STREAM]',
}

export function parse(text: string): FFMeta {
  const s = String(text);

  if (!s.startsWith(Const.ID_STRING))
    throw new SyntaxError(); // TODO: add an error message

  const lines = splitLines(s);

  let metadata: Tags = blankObject();
  const chapters: Chapter[] = [];
  const streams: Stream[] = [];

  const ffmeta: FFMeta = { metadata, chapters, streams };

  const length = lines.length;

  let i = 0;
  for (; i < length; i++) {
    let line = lines[i]!;
    if (line === Const.ID_STREAM) {
      metadata = blankObject();
      streams.push({metadata});
    } else if (line === Const.ID_CHAPTER) {
      metadata = blankObject();
      line = lines[++i];

      let TIMEBASE: string | undefined;
      const tb = line && line.match(/TIMEBASE=([0-9]+)\\*\/([0-9]+)/);
      if (tb) {
        const [, num, dec] = tb;
        TIMEBASE = `${num}/${dec}`;
        line = lines[++i];
      }
      const start = line && line.match(/START=([0-9]+)/);
      if (!start) {
        throw new SyntaxError('Expected chapter start timestamp');
      }
      const [, START] = start;
      line = lines[++i];
      const end = line && line.match(/END=([0-9]+)/);
      if (!end) {
        throw new SyntaxError('Expected chapter end timestamp');
      }
      const [, END] = end;

      chapters.push({ TIMEBASE, START, END, metadata });
    } else {
      let key: string | undefined, value: string | undefined;
      const length = line.length;
      let i = 0;
      for (; i < length; i++) {
        const c = line[i];
        if (c === '\\') {
          i++;
        } else if (c === '=') {
          key = unescapeMetadataComponent(line.slice(0, i));
          value = unescapeMetadataComponent(line.slice(i + 1, length));
          break;
        }
      }
      if (key === void 0 || value === void 0)
        throw new SyntaxError(`${key}=${value} ${line}`);
      metadata[key] = value;
    }
  }

  return ffmeta;
}

export function stringify(ffmeta: FFMeta): string {
  return `${Const.ID_STRING}1\n`;
}

function blankObject(): {} {
  return Object.create(null);
}

function splitLines(s: string) {
  const length = s.length;
  const lines = [];
  let offset = 0;
  let i = 0;
  for (; i < length; i++) {
    const c = s[i];
    if (c === '\\') {
      i++;
    } else if (c === '\n' || c === '\r' || c === '\0') {
      const line = s.slice(offset, i);
      let c;
      if (line !== '' && (c = line[0]) !== ';' && c !== '#') lines.push(line);
      offset = i + 1; // Skip \n
    }
  }
  const line = s.slice(offset, i);
  let c;
  if (line !== '' && (c = line[0]) !== ';' && c !== '#') lines.push(line);
  return lines;
}

function escapeMetadataComponent(s: string) {
  return s.replace(/[#;\\\n]/g, (c) => `\\${c}`);
}

function unescapeMetadataComponent(s: string) {
  return s.replace(/\\(.|\n|\r)|(\\$)/g, (s) => s.slice(1));
}
