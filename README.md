# ffmeta
A pure JavaScript implementation of FFMETADATA parsing and serialization. `ffmeta` follows closely
the `libavformat`'s implementation to be as consistent as possible with FFmpeg's tools.

# Usage
`ffmeta` exports two functions, `parse()` and `stringify()`.
Use `parse()` to parse a string containing an FFMETADATA file, it will throw a SyntaxError if the
input is invalid or return an object representation of the metadata.
Use `stringify()` to turn an object representation of the metadata into an FFMETADATA file, it may
throw a TypeError if a chapter has invalid TIMEBASE, START or END .

Node.js example.
```ts
import * as ffmeta from 'ffmeta';
import fs from 'fs';

const metadata = ffmeta.parse(fs.readFileSync('input.ffmeta', 'utf8'));
metadata.metadata.title = 'Some Title';

fs.writeFileSync('output.ffmeta', ffmeta.stringify(metadata));
```
