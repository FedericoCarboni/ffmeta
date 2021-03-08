import * as ffmeta from '../src/ffmeta';
import { readFileSync } from 'fs';

describe('ffmeta', () => {
  describe('parse()', () => {
    it('should throw SyntaxError if not an FFMETA file', () => {
      expect(() => ffmeta.parse(';NOTFFMETADATA')).toThrow(SyntaxError);
    });
    it('should work', () => {
      console.log(JSON.stringify(ffmeta.parse(readFileSync('test.ffmeta', 'utf8')), null, 2));
    });
  });
  describe('stringify()', () => {
    it('should work', () => {
      console.log(ffmeta.stringify(ffmeta.parse(readFileSync('test.ffmeta', 'utf8'))));
    });
  });
});
