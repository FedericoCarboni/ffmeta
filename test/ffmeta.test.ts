import * as ffmeta from '../src/ffmeta';
import path from 'path'
import fs from 'fs';

function readSample(name: string) {
  return fs.readFileSync(path.join(__dirname, 'samples', name), 'utf8');
}

const PROTO = readSample('proto.ffmeta');
const BUG_9144 = readSample('bug-9144.ffmeta');
const ESCAPING = readSample('escaping.ffmeta');
const INVALID_END = readSample('invalid-end.ffmeta');
const INVALID_END_EOF = readSample('invalid-end-eof.ffmeta');
const INVALID_START = readSample('invalid-start.ffmeta');
const INVALID_START_EOF = readSample('invalid-start-eof.ffmeta');
const INVALID_TIMEBASE = readSample('invalid-timebase.ffmeta');
const INVALID_TIMEBASE_EOF = readSample('invalid-timebase-eof.ffmeta');

describe('ffmeta', () => {
  describe('parse()', () => {
    it('should set __proto__ to any value', () => {
      const {
        metadata,
        streams: [stream],
        chapters: [chapter]
      } = ffmeta.parse(PROTO);
      expect(Object.keys(metadata)).toContain('__proto__');
      expect(Object.keys(chapter!.metadata)).toContain('__proto__');
      expect(Object.keys(stream!.metadata)).toContain('__proto__');
      expect(metadata['__proto__']).toBe('value');
      expect(chapter!.metadata['__proto__']).toBe('value');
      expect(stream!.metadata['__proto__']).toBe('value');
    });
    it('should implement bug 9144', () => {
      const {
        metadata,
        streams: [stream],
        chapters: [chapter]
      } = ffmeta.parse(BUG_9144);
      expect(metadata['key']).toBe('value\\\nunfortunately=multiline');
      expect(chapter!.metadata['key']).toBe('value\\\nunfortunately=multiline');
      expect(stream!.metadata['key']).toBe('value\\\nunfortunately=multiline');
    });
    it('should unescape keys and values', () => {
      const {
        metadata,
        streams: [stream],
        chapters: [chapter1, chapter2]
      } = ffmeta.parse(ESCAPING);
      expect(metadata['key=;#\\']).toBe('value\\=;#');
      expect(metadata['key']).toBe('multi\nline');
      expect(stream!.metadata['key=;#\\']).toBe('value\\=;#');
      expect(stream!.metadata['key']).toBe('multi\nline');
      expect(chapter1!.metadata['key=;#\\']).toBe('value\\=;#');
      expect(chapter1!.metadata['key']).toBe('multi\nline');
      expect(chapter1!.TIMEBASE).toBe('1/1000');
      expect(chapter1!.START).toBe('0');
      expect(chapter1!.END).toBe('0');
      expect(chapter2!.TIMEBASE).toBe('1/1000');
      expect(chapter2!.START).toBe('0');
      expect(chapter2!.END).toBe('0');
    });
    it('should throw SyntaxError on invalid end', () => {
      expect(() => ffmeta.parse(INVALID_END)).toThrow(SyntaxError);
    });
    it('should throw SyntaxError on invalid end eof', () => {
      expect(() => ffmeta.parse(INVALID_END_EOF)).toThrow(SyntaxError);
    });
    it('should throw SyntaxError on invalid start', () => {
      expect(() => ffmeta.parse(INVALID_START)).toThrow(SyntaxError);
    });
    it('should throw SyntaxError on invalid start eof', () => {
      expect(() => ffmeta.parse(INVALID_START_EOF)).toThrow(SyntaxError);
    });
    it('should throw SyntaxError on invalid timebase', () => {
      expect(() => ffmeta.parse(INVALID_TIMEBASE)).toThrow(SyntaxError);
    });
    it('should throw SyntaxError on invalid timebase eof', () => {
      expect(() => ffmeta.parse(INVALID_TIMEBASE_EOF)).toThrow(SyntaxError);
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
    it('should escape keys and values', () => {
      const ffmetaFile = ffmeta.stringify({
        metadata: {
          'key=;#\\': 'value\\=;#',
          key: 'multi\nline'
        },
        streams: [{
          metadata: {
            'key=;#\\': 'value\\=;#',
            key: 'multi\nline'
          }
        }],
        chapters: [{
          TIMEBASE: '1/1000',
          START: '0',
          END: '0',
          metadata: {
            'key=;#\\': 'value\\=;#',
            key: 'multi\nline'
          }
        },{
          TIMEBASE: '1/1000',
          START: '0',
          END: '0',
          metadata: {}
        }]
      });
      expect(ffmetaFile).toBe(ESCAPING.replace('TIMEBASE=1\\/1000', 'TIMEBASE=1\/1000'));
    });
    it('should throw TypeError on invalid TIMEBASE', () => {
      expect(() => ffmeta.stringify({
        metadata: {},
        streams: [],
        chapters: [{
          TIMEBASE: 'abc',
          START: '0',
          END: '0',
          metadata: {},
        }],
      })).toThrow(TypeError);
    });
    it('should throw TypeError on invalid START', () => {
      expect(() => ffmeta.stringify({
        metadata: {},
        streams: [],
        chapters: [{
          START: 'abc',
          END: '0',
          metadata: {},
        }],
      })).toThrow(TypeError);
    });
    it('should throw TypeError on invalid END', () => {
      expect(() => ffmeta.stringify({
        metadata: {},
        streams: [],
        chapters: [{
          START: '0',
          END: 'abc',
          metadata: {},
        }],
      })).toThrow(TypeError);
    });
  });
});
