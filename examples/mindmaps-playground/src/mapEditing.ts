export const layoutModes = ['auto', 'right', 'left', 'org'] as const;

export type LayoutMode = (typeof layoutModes)[number];

interface EditableLineInfo {
  kind: 'heading' | 'list';
  depth: number;
  lineIndex: number;
  parentKey: string;
  blockEnd: number;
}

export function getDefaultLayoutMode(): LayoutMode {
  return 'auto';
}

export function isLayoutMode(value: unknown): value is LayoutMode {
  return typeof value === 'string' && layoutModes.includes(value as LayoutMode);
}

function getLineKindAndDepth(line: string) {
  const heading = line.match(/^(#{1,6})\s+/);
  if (heading) {
    return {
      kind: 'heading' as const,
      depth: heading[1].length,
    };
  }

  const listItem = line.match(/^(\s*)(?:[-*+]|\d+\.)\s+/);
  if (listItem) {
    return {
      kind: 'list' as const,
      depth: listItem[1].replace(/\t/g, '  ').length,
    };
  }
}

function getParentKey(lines: string[], lineIndex: number) {
  const current = getLineKindAndDepth(lines[lineIndex]);
  if (!current) return 'root';

  for (let index = lineIndex - 1; index >= 0; index -= 1) {
    const previous = getLineKindAndDepth(lines[index]);
    if (!previous) continue;

    if (current.kind === 'heading') {
      if (previous.kind === 'heading' && previous.depth < current.depth) {
        return `heading:${index}`;
      }
      continue;
    }

    if (previous.kind === 'list' && previous.depth < current.depth) {
      return `list:${index}`;
    }
    if (previous.kind === 'heading') return `heading:${index}`;
  }

  return 'root';
}

function getBlockEnd(lines: string[], lineIndex: number) {
  const current = getLineKindAndDepth(lines[lineIndex]);
  if (!current) return lineIndex + 1;

  for (let index = lineIndex + 1; index < lines.length; index += 1) {
    const next = getLineKindAndDepth(lines[index]);
    if (!next) continue;

    if (current.kind === 'heading') {
      if (next.kind === 'heading' && next.depth <= current.depth) return index;
      continue;
    }

    if (next.kind === 'heading') return index;
    if (next.kind === 'list' && next.depth <= current.depth) return index;
  }

  return lines.length;
}

function getEditableLineInfo(
  lines: string[],
  lineIndex: number,
): EditableLineInfo | undefined {
  const current = getLineKindAndDepth(lines[lineIndex]);
  if (!current) return;

  return {
    kind: current.kind,
    depth: current.depth,
    lineIndex,
    parentKey: getParentKey(lines, lineIndex),
    blockEnd: getBlockEnd(lines, lineIndex),
  };
}

function areSiblings(left: EditableLineInfo, right: EditableLineInfo) {
  return (
    left.kind === right.kind &&
    left.depth === right.depth &&
    left.parentKey === right.parentKey &&
    left.lineIndex !== right.lineIndex
  );
}

export function moveMarkdownSibling(
  markdown: string,
  fromLineIndex: number,
  toLineIndex: number,
) {
  const lines = markdown.split('\n');
  const source = getEditableLineInfo(lines, fromLineIndex);
  const target = getEditableLineInfo(lines, toLineIndex);
  if (!source || !target || !areSiblings(source, target)) {
    return {
      moved: false,
      markdown,
    };
  }

  const sourceBlock = lines.slice(source.lineIndex, source.blockEnd);
  const withoutSource = [
    ...lines.slice(0, source.lineIndex),
    ...lines.slice(source.blockEnd),
  ];

  const targetStart =
    source.lineIndex < target.lineIndex
      ? target.lineIndex - sourceBlock.length
      : target.lineIndex;
  const targetEnd =
    source.lineIndex < target.lineIndex
      ? target.blockEnd - sourceBlock.length
      : target.blockEnd;
  const insertIndex =
    source.lineIndex < target.lineIndex ? targetEnd : targetStart;
  const nextLines = [
    ...withoutSource.slice(0, insertIndex),
    ...sourceBlock,
    ...withoutSource.slice(insertIndex),
  ];

  return {
    moved: true,
    markdown: nextLines.join('\n'),
  };
}
