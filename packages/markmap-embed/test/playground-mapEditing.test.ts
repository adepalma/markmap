import { describe, expect, it } from 'vitest';
import {
  getDefaultLayoutMode,
  isLayoutMode,
  moveMarkdownSibling,
} from '../../../examples/mindmaps-playground/src/mapEditing';

describe('mindmaps playground mapEditing', () => {
  it('moves a list item with its nested children after a sibling', () => {
    const markdown = [
      '# Plan',
      '',
      '## Work',
      '- One',
      '  - One child',
      '- Two',
      '- Three',
    ].join('\n');

    const result = moveMarkdownSibling(markdown, 3, 6);

    expect(result.moved).toBe(true);
    expect(result.markdown).toBe(
      [
        '# Plan',
        '',
        '## Work',
        '- Two',
        '- Three',
        '- One',
        '  - One child',
      ].join('\n'),
    );
  });

  it('moves a heading section before a sibling heading section', () => {
    const markdown = [
      '# Plan',
      '',
      '## Discovery',
      '- Interview',
      '## Delivery',
      '- Build',
      '## Review',
      '- Ship',
    ].join('\n');

    const result = moveMarkdownSibling(markdown, 6, 2);

    expect(result.moved).toBe(true);
    expect(result.markdown).toBe(
      [
        '# Plan',
        '',
        '## Review',
        '- Ship',
        '## Discovery',
        '- Interview',
        '## Delivery',
        '- Build',
      ].join('\n'),
    );
  });

  it('does not move nodes across different parents', () => {
    const markdown = [
      '# Plan',
      '',
      '## Discovery',
      '- Interview',
      '## Delivery',
      '- Build',
    ].join('\n');

    const result = moveMarkdownSibling(markdown, 3, 5);

    expect(result.moved).toBe(false);
    expect(result.markdown).toBe(markdown);
  });

  it('validates supported layout modes', () => {
    expect(getDefaultLayoutMode()).toBe('auto');
    expect(isLayoutMode('right')).toBe(true);
    expect(isLayoutMode('org')).toBe(true);
    expect(isLayoutMode('radial')).toBe(false);
  });
});
