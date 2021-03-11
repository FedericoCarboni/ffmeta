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

// These constants will be inlined by TypeScript.
// https://github.com/FFmpeg/FFmpeg/blob/master/libavformat/ffmeta.h
const enum Const {
  ID_STRING = ';FFMETADATA',
  ID_CHAPTER = '[CHAPTER]',
  ID_STREAM = '[STREAM]',
}

export function parse(source: string): FFMetadata {
  // https://github.com/FFmpeg/FFmpeg/blob/master/libavformat/ffmetadec.c#L31
  // if (!s.startsWith(Const.ID_STRING)) {
  //   throw new SyntaxError();
  // }

  // Convert source to a string and split on unescaped newlines.
  const lines = splitLines(`${source}`);

  // The metadata of the current section, may be the global
  // section, a stream or a chapter.
  let metadata: Tags = Object.create(null);
  const chapters: Chapter[] = [];
  const streams: Stream[] = [];

  const ffmetadata: FFMetadata = { metadata, streams, chapters };

  const length = lines.length;
  const lastIndex = length - 1;
  for (let i = 0; i < length; i++) {
    let line = lines[i]!;
    // https://github.com/FFmpeg/FFmpeg/blob/master/libavformat/ffmetadec.c#L184
    if (line.startsWith(Const.ID_STREAM)) {
      metadata = Object.create(null);
      streams.push({ metadata });
    } else if (line.startsWith(Const.ID_CHAPTER)) {
      // Parse the START, END and optionally TIMESTAMP values of the chapter.
      // Read the next line or throw a syntax error if there are no more lines.
      if (i === lastIndex)
        throw new SyntaxError('Expected chapter start timestamp, found EOF');
      line = lines[++i]!;

      // TIMEBASE is optional, if the line doesn't match it will be parsed as START.
      let TIMEBASE: string | undefined;
      const timebaseMatch = line.match(/^TIMEBASE=([0-9]+\\*\/[0-9]+)/);
      if (timebaseMatch !== null) {
        [, TIMEBASE] = timebaseMatch;
        if (i === lastIndex)
          throw new SyntaxError('Expected chapter start timestamp, found EOF');
        line = lines[++i]!;
      }

      // START and END are not optional, if the lines don't match throw a syntax error.
      const startMatch = line.match(/^START=([0-9]+)/);
      if (startMatch === null)
        throw new SyntaxError(`Expected chapter start timestamp, found ${line}`);
      const START = startMatch[1]!;

      if (i === lastIndex)
        throw new SyntaxError('Expected chapter end timestamp, found EOF');
      line = lines[++i]!;

      const endMatch = line.match(/^END=([0-9]+)/);
      if (endMatch === null)
        throw new SyntaxError(`Expected chapter end timestamp, found ${line}`);
      const END = endMatch[1]!;

      metadata = Object.create(null);
      chapters.push({ TIMEBASE, START, END, metadata });
    } else {
      const length = line.length;
      // Parse a tag.
      for (let i = 0; i < length; i++) {
        const c = line[i];
        // Read until the first unescaped `=`.
        if (c === '=') {
          const key = unescapeMetaComponent(line.slice(0, i));
          const value = unescapeMetaComponent(line.slice(i + 1));
          metadata[key] = value;
          break;
        } else if (c === '\\') {
          // The next character is escaped, skip it.
          i++;
        }
      }
    }
  }

  return ffmetadata;
}

export function stringify(ffmetadata: FFMetadata): string {
  // https://github.com/FFmpeg/FFmpeg/blob/master/libavformat/ffmetaenc.c
  const metadata = stringifyTags(ffmetadata.metadata);
  const streams = ffmetadata.streams
    .map(({ metadata }) => `${Const.ID_STREAM}\n${stringifyTags(metadata)}`)
    .join('');
  const chapters = ffmetadata.chapters
    .map(({ TIMEBASE, START, END, metadata }) => {
      let timebase: string | undefined;
      if (TIMEBASE !== void 0 && TIMEBASE !== null) {
        timebase = `${TIMEBASE}`;
        if (!/^[0-9]+\/[0-9]+$/.test(timebase))
          throw new TypeError(`${timebase} is not a valid timebase fraction`);
      }

      const start = `${START}`;
      if (!isInt(start))
        throw new TypeError(`${start} is not a valid start timestamp`);
      const end = `${END}`;
      if (!isInt(end))
        throw new TypeError(`${end} is not a valid end timestamp`);

      return `${Const.ID_CHAPTER}\n${timebase ? `TIMEBASE=${timebase}\n` : ''}START=${start}\nEND=${end}\n${stringifyTags(metadata)}`;
    })
    .join('');
  return `${Const.ID_STRING}1\n${metadata}${streams}${chapters}`;
}

function isInt(s: string) {
  return /^[0-9]+$/.test(s);
}

function stringifyTags(tags: Tags) {
  return Object.entries(tags)
    .filter(([, value]) => value !== void 0 && value !== null)
    .map(([key, value]) => `${escapeMetaComponent(key)}=${escapeMetaComponent(`${value}`)}\n`)
    .join('');
}

function splitLines(source: string) {
  const lines = [];
  // Adjusted for bug 9144, a bug in libavformat that makes
  // escaping inconsistent with \n (newline characters).
  // A backslash at the end of a value cannot be escaped properly.
  let prev: string | undefined;
  let offset = 0;
  let i = 0;
  const length = source.length;
  for (; i < length; i++) {
    const c = source[i];
    if (prev !== '\\' && (c === '\n' || c === '\r' || c === '\0')) {
      const line = source.slice(offset, i);
      if (isNonEmpty(line))
        lines.push(line);
      offset = i + 1; // Skip \n
    }
    prev = c;
  }
  const line = source.slice(offset, i);
  if (isNonEmpty(line))
    lines.push(line);
  return lines;
}

function isNonEmpty(line: string) {
  let c;
  return line !== '' && (c = line[0]) !== ';' && c !== '#';
}

function escapeMetaComponent(s: string) {
  return s.replace(/[=;#\\\n]/g, (c) => `\\${c}`);
}

function unescapeMetaComponent(s: string) {
  return s.replace(/\\(.|\n|\r)/g, (s) => s.slice(1));
}
