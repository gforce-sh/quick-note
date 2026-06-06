import { syntaxTree } from "@codemirror/language";
import { type Range } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";

/** True if the given position's line is touched by a selection (the "active" line). */
function lineIsActive(view: EditorView, pos: number): boolean {
  const line = view.state.doc.lineAt(pos);
  return view.state.selection.ranges.some(
    (r) => r.from <= line.to && r.to >= line.from,
  );
}

/**
 * Obsidian-style inline Live Preview: render markdown formatting and conceal
 * its syntax markers — except on the line the cursor is on, which shows raw
 * markdown so it can be edited.
 */
function buildDecorations(view: EditorView): DecorationSet {
  const decos: Range<Decoration>[] = [];
  const tree = syntaxTree(view.state);

  for (const { from, to } of view.visibleRanges) {
    tree.iterate({
      from,
      to,
      enter: (node) => {
        const name = node.name;

        if (/^ATXHeading[1-6]$/.test(name)) {
          const level = name.slice(-1);
          const line = view.state.doc.lineAt(node.from);
          decos.push(
            Decoration.line({
              class: `cm-md-heading cm-md-h${level}`,
            }).range(line.from),
          );
          return;
        }
        if (name === "StrongEmphasis") {
          decos.push(Decoration.mark({ class: "cm-md-strong" }).range(node.from, node.to));
          return;
        }
        if (name === "Emphasis") {
          decos.push(Decoration.mark({ class: "cm-md-emphasis" }).range(node.from, node.to));
          return;
        }
        if (name === "InlineCode") {
          decos.push(Decoration.mark({ class: "cm-md-code" }).range(node.from, node.to));
          return;
        }

        // Conceal the syntax markers themselves, unless editing that line.
        const isMarker =
          name === "HeadingMark" || name === "EmphasisMark" || name === "CodeMark";
        if (isMarker && node.to > node.from && !lineIsActive(view, node.from)) {
          decos.push(Decoration.replace({}).range(node.from, node.to));
        }
      },
    });
  }

  return Decoration.set(decos, true);
}

/** CodeMirror extension providing the inline Live Preview decorations. */
export const livePreview = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }
    update(u: ViewUpdate) {
      if (u.docChanged || u.selectionSet || u.viewportChanged) {
        this.decorations = buildDecorations(u.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);
