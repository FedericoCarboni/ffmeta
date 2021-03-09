import * as ffmeta from '../src/ffmeta';
import path from 'path'
import fs from 'fs';

function readSample(name: string) {
  return fs.readFileSync(path.join(__dirname, 'samples', name), 'utf8');
}

const PROTO = readSample('proto.ffmeta');
const BUG_9144 = readSample('bug-9144.ffmeta');
const INVALID_END = readSample('invalid-end.ffmeta');
const INVALID_END_EOF = readSample('invalid-end-eof.ffmeta');
const INVALID_START = readSample('invalid-start.ffmeta');
const INVALID_START_EOF = readSample('invalid-start-eof.ffmeta');
const INVALID_TIMEBASE = readSample('invalid-timebase.ffmeta');

describe('ffmeta', () => {
  describe('parse()', () => {
    it('should set __proto__ to any value', () => {
      const {
        metadata,
        chapters: [{ metadata: chapter }],
        streams: [{ metadata: stream }]
      } = ffmeta.parse(PROTO);
      expect(Object.keys(metadata)).toContain('__proto__');
      expect(Object.keys(chapter)).toContain('__proto__');
      expect(Object.keys(stream)).toContain('__proto__');
      expect(metadata.__proto__).toBe('value');
      expect(chapter.__proto__).toBe('value');
      expect(stream.__proto__).toBe('value');
    });
    it('should implement bug 9144', () => {
      const {
        metadata,
        chapters: [{ metadata: chapter }],
        streams: [{ metadata: stream }]
      } = ffmeta.parse(BUG_9144);
      expect(metadata.key).toBe('value\\\nunfortunately=multiline');
      expect(chapter.key).toBe('value\\\nunfortunately=multiline');
      expect(stream.key).toBe('value\\\nunfortunately=multiline');
    });
    it('should throw SyntaxError on invalid end', () => {
      ffmeta.parse(INVALID_END)
      expect(() => ffmeta.parse(INVALID_END)).toThrow(SyntaxError);
    });
    it('should throw SyntaxError on invalid end eof', () => {
      ffmeta.parse(INVALID_END_EOF)
      expect(() => ffmeta.parse(INVALID_END_EOF)).toThrow(SyntaxError);
    });
    it('should throw SyntaxError on invalid start', () => {
      ffmeta.parse(INVALID_START)
      expect(() => ffmeta.parse(INVALID_START)).toThrow(SyntaxError);
    });
    it('should throw SyntaxError on invalid start eof', () => {
      ffmeta.parse(INVALID_START_EOF)
      expect(() => ffmeta.parse(INVALID_START_EOF)).toThrow(SyntaxError);
    });
    it('should throw SyntaxError on invalid timebase', () => {
      ffmeta.parse(INVALID_TIMEBASE)
      expect(() => ffmeta.parse(INVALID_TIMEBASE)).toThrow(SyntaxError);
    });
  });
  describe('stringify()', () => {
    it('should set __proto__ to any value', () => {
      const metadata = Object.create(null);
      metadata.__proto__ = 'value';
      const ffmetaFile = ffmeta.stringify({
        metadata,
        streams: [{ metadata }],
        chapters: [{
          START: '0',
          END: '0',
          metadata,
        }],
      });
      expect(ffmetaFile).toBe(PROTO);
    });
    it('should implement bug 9144', () => {
      const ffmetaFile = ffmeta.stringify({
        metadata: {
          key: 'value\\',
          unfortunately: 'multiline',
        },
        streams: [{
          metadata: {
            key: 'value\\',
            unfortunately: 'multiline',
          },
        }],
        chapters: [{
          START: '0',
          END: '0',
          metadata: {
            key: 'value\\',
            unfortunately: 'multiline',
          },
        }],
      });
      expect(ffmetaFile).toBe(BUG_9144);
    });
  });
});
