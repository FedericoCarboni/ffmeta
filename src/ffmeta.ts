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
  VERSION = '1',
}

export function parse(text: string): FFMeta {
  const s = String(text);

  if (!s.startsWith(Const.ID_STRING)) // TODO: add an error message
    throw new SyntaxError();

  const lines = splitLines(s);

  let metadata: Tags = blankObject();
  const chapters: Chapter[] = [];
  const streams: Stream[] = [];

  const meta: FFMeta = { metadata, chapters, streams };

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
      const tb = line.match(/TIMEBASE=([0-9]+\/[0-9]+)/);
      if (tb !== null) {
        [, TIMEBASE] = tb;
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
      let key, value;
      let i = 0;
      for (; i < length; i++) {
        const c = line[i];
        if (c === '\\') {
          i++;
        } else if (c === '=') {
          key = line.slice(0, i);
          value = line.slice(i + 1, length);
          break;
        }
      }
      if (key === void 0 || value === void 0)
        throw new SyntaxError(`${key}=${value} ${line}`);
      metadata[unescapeMetadataComponent(key)] = unescapeMetadataComponent(value);
    }
  }

  return meta;
}

export function stringify(meta: FFMeta): string {
  return '';
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
    } else if (c === '\r' || c === '\n' || c === '\0') {
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
  return String(s).replace(/[#;\\\n]/g, (c) => `\\${c}`);
}

function unescapeMetadataComponent(s: string) {
  return s.replace(/\\(.|\n|\r)|(\\$)/g, (s) => s.slice(1));
}
