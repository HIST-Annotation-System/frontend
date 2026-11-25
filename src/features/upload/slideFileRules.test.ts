import { describe, expect, it } from 'vitest';
import { validateSlideFile } from './slideFileRules';

describe('validateSlideFile', () => {
  it('accepts single-file slides and zip archives', () => {
    expect(validateSlideFile({ name: 'CMU-2.svs', size: 10 })).toBeNull();
    expect(validateSlideFile({ name: 'scan.TIFF', size: 10 })).toBeNull();
    expect(validateSlideFile({ name: 'CMU-1.zip', size: 10 })).toBeNull();
  });

  it('asks for a zip archive when a bare MRXS file is chosen', () => {
    expect(validateSlideFile({ name: 'CMU-1.mrxs', size: 10 })).toContain('format wieloplikowy');
  });

  it('rejects unsupported and empty files', () => {
    expect(validateSlideFile({ name: 'notes.txt', size: 10 })).toContain('.txt');
    expect(validateSlideFile({ name: 'no-extension', size: 10 })).toContain('no-extension');
    expect(validateSlideFile({ name: 'empty.svs', size: 0 })).toBe('Wybrany plik jest pusty.');
  });
});
