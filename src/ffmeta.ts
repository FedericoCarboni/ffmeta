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

export interface FFMetadata {
  metadata: Tags;
  streams: Stream[];
  chapters: Chapter[];
}

// Constants to be inlined.
const enum Const {
  ID_STRING = ';FFMETADATA',
  ID_CHAPTER = '[CHAPTER]',
  ID_STREAM = '[STREAM]',
}

export function parse(source: string): FFMetadata {
  // https://github.com/FFmpeg/FFmpeg/blob/7f1207cb79e79785ac837a9cd9f9ab6f0ba3462f/libavformat/ffmetadec.c#L31
  // if (!s.startsWith(Const.ID_STRING)) {
  //   throw new SyntaxError();
  // }

  // Convert source to a string and split every line.
  const lines = splitLines(`${source}`);

  //
  let metadata: Tags = Object.create(null);
  const chapters: Chapter[] = [];
  const streams: Stream[] = [];

  const meta: FFMetadata = { metadata, streams, chapters };

  const length = lines.length;
  let i = 0;
  for (; i < length; i++) {
    let line = lines[i]!;
    if (line.startsWith(Const.ID_STREAM)) {
      metadata = Object.create(null);
      streams.push({ metadata });
    } else if (line.startsWith(Const.ID_CHAPTER)) {

      if (i >= length - 1)
        throw new SyntaxError('Expected chapter start timestamp, found EOF');
      line = lines[++i];

      let TIMEBASE: string | undefined;
      const tb = line.match(/TIMEBASE=([0-9]+\\*\/[0-9]+)/);
      if (tb !== null) {
        [, TIMEBASE] = tb;
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

      metadata = Object.create(null);
      chapters.push({ TIMEBASE, START, END, metadata });
    } else {
      const length = line.length;
      let i = 0;
      for (; i < length; i++) {
        const c = line[i];
        if (c === '=') {
          const key = unescapeMetaComponent(line.slice(0, i));
          const value = unescapeMetaComponent(line.slice(i + 1, length));
          metadata[key] = value;

          // Read just until the first unescaped `=`
          break;
        } else if (c === '\\') {
          // The next character is escaped, skip it
          i++;
        }
      }
    }
  }
  console.log(JSON.stringify(meta, null, 2));
  return meta;
}

export function stringify(meta: FFMetadata): string {
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
    .map(([key, value]) => `${escapeMetaComponent(key)}=${escapeMetaComponent(`${value}`)}\n`)
    .join('');
}

function splitLines(source: string) {
  const lines = [];
  // Adjusted for bug 9144, a bug in libavformat that prevents
  // makes escaping inconsistent with \n (newline characters).
  let prev;
  let offset = 0;
  let i = 0;
  const length = source.length;
  for (; i < length; i++) {
    const c = source[i];
    if (prev !== '\\' && (c === '\n' || c === '\r' || c === '\0')) {
      const line = source.slice(offset, i);
      let c;
      if (line !== '' && (c = line[0]) !== ';' && c !== '#') lines.push(line);
      offset = i + 1; // Skip \n
    }
    prev = c;
  }
  const line = source.slice(offset, i);
  let c;
  if (line !== '' && (c = line[0]) !== ';' && c !== '#') lines.push(line);
  return lines;
}

function escapeMetaComponent(s: string) {
  return s.replace(/[=;#\\\n]/g, (c) => `\\${c}`);
}

function unescapeMetaComponent(s: string) {
  return s.replace(/\\(.|\n|\r)|(\\$)/g, (s) => s.slice(1));
}
