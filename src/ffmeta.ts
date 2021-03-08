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

// Constants to be inlined.
const enum Const {
  ID_STRING = ';FFMETADATA',
  ID_CHAPTER = '[CHAPTER]',
  ID_STREAM = '[STREAM]',
}

export function parse(text: string): FFMeta {
  const s = `${text}`;

  if (!s.startsWith(Const.ID_STRING))
    throw new SyntaxError(); // TODO: add an error message

  const lines = splitLines(s);

  let metadata: Tags = Object.create(null);
  const chapters: Chapter[] = [];
  const streams: Stream[] = [];

  const meta: FFMeta = { metadata, chapters, streams };

  const length = lines.length;

  let i = 0;
  for (; i < length; i++) {
    let line = lines[i]!;
    if (line === Const.ID_STREAM) {
      metadata = Object.create(null);
      streams.push({ metadata });
    } else if (line === Const.ID_CHAPTER) {
      metadata = Object.create(null);

      if (i >= length - 1)
        throw new SyntaxError('Expected chapter start timestamp, found EOF');

      line = lines[++i];

      let TIMEBASE: string | undefined;
      const tb = line.match(/TIMEBASE=([0-9]+)\\*\/([0-9]+)/);
      if (tb !== null) {
        const [, num, dec] = tb;
        TIMEBASE = `${num}/${dec}`;
        if (i >= length - 1)
          throw new SyntaxError('Expected chapter start timestamp, found EOF');
        line = lines[++i];
      }
      const start = line.match(/START=([0-9]+)/);
      if (start === null) {
        throw new SyntaxError('Expected chapter start timestamp ' + line);
      }
      const [, START] = start;
      if (i >= length - 1)
        throw new SyntaxError('Expected chapter end timestamp, found EOF');
      line = lines[++i];
      const end = line.match(/END=([0-9]+)/);
      if (end === null) {
        throw new SyntaxError('Expected chapter end timestamp ' + line);
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

  return meta;
}

export function stringify(meta: FFMeta): string {
  const metadata = stringifyTags(meta.metadata);
  const streams = meta.streams
    .map(({ metadata }) => `${Const.ID_STREAM}\n${stringifyTags(metadata)}`)
    .join('');
  const chapters = meta.chapters
    .map(({ TIMEBASE, START, END, metadata }) => {
      return `${Const.ID_CHAPTER}\n${
        TIMEBASE !== void 0 && TIMEBASE !== null ? `TIMEBASE=${TIMEBASE}\n` : ''
      }START=${START}\nEND=${END}\n${stringifyTags(metadata)}`
    })
    .join('');
  return `${Const.ID_STRING}1\n${metadata}${streams}${chapters}`;
}

function stringifyTags(tags: Tags) {
  return Object.entries(tags)
    .filter(([, value]) => value !== void 0 && value !== null)
    .map(([key, value]) => `${escapeMetadataComponent(key)}=${escapeMetadataComponent(`${value}`)}\n`)
    .join('');
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
