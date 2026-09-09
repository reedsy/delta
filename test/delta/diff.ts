import isEqual = require('fast-deep-equal');
import { Delta } from '../../src/Delta';
import { Op } from '../../src/Op';

describe('diff()', () => {
  it('insert', () => {
    const a = new Delta().insert('A');
    const b = new Delta().insert('AB');
    const expected = new Delta().retain(1).insert('B');
    expect(a.diff(b)).toEqual(expected);
  });

  it('delete', () => {
    const a = new Delta().insert('AB');
    const b = new Delta().insert('A');
    const expected = new Delta().retain(1).delete(1);
    expect(a.diff(b)).toEqual(expected);
  });

  it('retain', () => {
    const a = new Delta().insert('A');
    const b = new Delta().insert('A');
    const expected = new Delta();
    expect(a.diff(b)).toEqual(expected);
  });

  it('format', () => {
    const a = new Delta().insert('A');
    const b = new Delta().insert('A', { bold: true });
    const expected = new Delta().retain(1, { bold: true });
    expect(a.diff(b)).toEqual(expected);
  });

  it('object attributes', () => {
    const a = new Delta().insert('A', {
      font: { family: 'Helvetica', size: '15px' },
    });
    const b = new Delta().insert('A', {
      font: { family: 'Helvetica', size: '15px' },
    });
    const expected = new Delta();
    expect(a.diff(b)).toEqual(expected);
  });

  it('embed integer match', () => {
    const a = new Delta().insert({ embed: 1 });
    const b = new Delta().insert({ embed: 1 });
    const expected = new Delta();
    expect(a.diff(b)).toEqual(expected);
  });

  it('embed integer mismatch', () => {
    const a = new Delta().insert({ embed: 1 });
    const b = new Delta().insert({ embed: 2 });
    const expected = new Delta().delete(1).insert({ embed: 2 });
    expect(a.diff(b)).toEqual(expected);
  });

  it('embed object match', () => {
    const a = new Delta().insert({ image: 'http://quilljs.com' });
    const b = new Delta().insert({ image: 'http://quilljs.com' });
    const expected = new Delta();
    expect(a.diff(b)).toEqual(expected);
  });

  it('embed object mismatch', () => {
    const a = new Delta().insert({
      image: 'http://quilljs.com',
      alt: 'Overwrite',
    });
    const b = new Delta().insert({ image: 'http://quilljs.com' });
    const expected = new Delta()
      .insert({ image: 'http://quilljs.com' })
      .delete(1);
    expect(a.diff(b)).toEqual(expected);
  });

  it('embed object change', () => {
    const embed = { image: 'http://quilljs.com' };
    const a = new Delta().insert(embed);
    embed.image = 'http://github.com';
    const b = new Delta().insert(embed);
    const expected = new Delta()
      .insert({ image: 'http://github.com' })
      .delete(1);
    expect(a.diff(b)).toEqual(expected);
  });

  it('embed false positive', () => {
    const a = new Delta().insert({ embed: 1 });
    const b = new Delta().insert(String.fromCharCode(0)); // Placeholder char for embed in diff()
    const expected = new Delta().insert(String.fromCharCode(0)).delete(1);
    expect(a.diff(b)).toEqual(expected);
  });

  it('error on non-documents', () => {
    const a = new Delta().insert('A');
    const b = new Delta().retain(1).insert('B');
    expect(() => {
      a.diff(b);
    }).toThrow();
    expect(() => {
      b.diff(a);
    }).toThrow();
  });

  it('inconvenient indexes', () => {
    const a = new Delta()
      .insert('12', { bold: true })
      .insert('34', { italic: true });
    const b = new Delta().insert('123', { color: 'red' });
    const expected = new Delta()
      .retain(2, { bold: null, color: 'red' })
      .retain(1, { italic: null, color: 'red' })
      .delete(1);
    expect(a.diff(b)).toEqual(expected);
  });

  it('combination', () => {
    const a = new Delta()
      .insert('Bad', { color: 'red' })
      .insert('cat', { color: 'blue' });
    const b = new Delta()
      .insert('Good', { bold: true })
      .insert('dog', { italic: true });
    const expected = new Delta()
      .insert('Good', { bold: true })
      .insert('dog', { italic: true })
      .delete(6);
    expect(a.diff(b)).toEqual(expected);
  });

  it('same document', () => {
    const a = new Delta().insert('A').insert('B', { bold: true });
    const expected = new Delta();
    expect(a.diff(a)).toEqual(expected);
  });

  it('immutability', () => {
    const attr1 = { color: 'red' };
    const attr2 = { color: 'red' };
    const a1 = new Delta().insert('A', attr1);
    const a2 = new Delta().insert('A', attr1);
    const b1 = new Delta().insert('A', { bold: true }).insert('B');
    const b2 = new Delta().insert('A', { bold: true }).insert('B');
    const expected = new Delta()
      .retain(1, { bold: true, color: null })
      .insert('B');
    expect(a1.diff(b1)).toEqual(expected);
    expect(a1).toEqual(a2);
    expect(b2).toEqual(b2);
    expect(attr1).toEqual(attr2);
  });

  it('non-document', () => {
    const a = new Delta().insert('Test');
    const b = new Delta().delete(4);
    expect(() => {
      a.diff(b);
    }).toThrow(new Error('diff() called on non-document'));
  });

  describe('surrogate pairs', () => {
    it('insert between astral characters', () => {
      const a = new Delta().insert('x🌀');
      const b = new Delta().insert('x🏆🌀');
      const expected = new Delta().retain(1).insert('🏆');
      expect(a.diff(b)).toEqual(expected);
    });

    it('delete an astral character', () => {
      const a = new Delta().insert('x🌀🎉');
      const b = new Delta().insert('x🎉');
      const expected = new Delta().retain(1).delete(2);
      expect(a.diff(b)).toEqual(expected);
    });

    it('attributed insert between astral characters', () => {
      const a = new Delta().insert('x🌀');
      const b = new Delta()
        .insert('x')
        .insert('🏆', { bold: true })
        .insert('🌀');
      const expected = new Delta().retain(1).insert('🏆', { bold: true });
      expect(a.diff(b)).toEqual(expected);
    });

    it('keeps semantic cleanup when no pair is split', () => {
      const a = new Delta().insert('🏆Badcat');
      const b = new Delta().insert('🏆Gooddog');
      const expected = new Delta().retain(2).insert('Gooddog').delete(6);
      expect(a.diff(b)).toEqual(expected);
    });

    it('never splits a pair, for any pair of documents', () => {
      const characters = ['a', 'b', 'x', ' ', '🏆', '🌀', '🎉', '👍🏾', '🇬🇧'];
      const attributes = [null, { bold: true }, { italic: true }];
      let seed = 20250904;
      const random = (max: number): number => {
        seed ^= seed << 13;
        seed ^= seed >>> 17;
        seed ^= seed << 5;
        return Math.abs(seed) % max;
      };
      const document = (): Delta => {
        const delta = new Delta();
        for (let op = random(4) + 1; op > 0; op--) {
          let text = '';
          for (let index = random(4) + 1; index > 0; index--) {
            text += characters[random(characters.length)];
          }
          const attribute = attributes[random(attributes.length)];
          if (attribute) {
            delta.insert(text, attribute);
          } else {
            delta.insert(text);
          }
        }
        return delta.insert('\n');
      };

      // `\p{Cs}` only ever matches a surrogate that has lost its partner: a
      // well-formed pair is a single non-Cs code point under `/u`
      const splitsPair = (delta: Delta): boolean =>
        delta.ops.some(
          (op) => typeof op.insert === 'string' && /\p{Cs}/u.test(op.insert),
        );

      type Counterexample = { a: Op[]; b: Op[]; delta: Op[] };
      let split: Counterexample | null = null;
      let inequivalent: Counterexample | null = null;

      for (let iteration = 0; iteration < 5000; iteration++) {
        const a = document();
        const b = document();
        const delta = a.diff(b);
        const counterexample = { a: a.ops, b: b.ops, delta: delta.ops };
        if (!split && splitsPair(delta)) {
          split = counterexample;
        }
        if (!inequivalent && !isEqual(a.compose(delta).ops, b.ops)) {
          inequivalent = counterexample;
        }
      }

      expect(split).toBeNull();
      expect(inequivalent).toBeNull();
    });
  });
});
