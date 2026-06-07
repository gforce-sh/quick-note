import { syntaxTree } from "@codemirror/language";
import { type EditorState, type Range, StateField } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";

function selectionTouches(state: EditorState, from: number, to: number): boolean {
  return state.selection.ranges.some((r) => r.from <= to && r.to >= from);
}

/**
 * True if the given position's line is touched by a selection (the "active"
 * line). When the editor is not focused, no line is active — so markers stay
 * concealed after you click away.
 */
function lineIsActive(view: EditorView, pos: number): boolean {
  if (!view.hasFocus) return false;
  const line = view.state.doc.lineAt(pos);
  return selectionTouches(view.state, line.from, line.to);
}

// ---------------------------------------------------------------------------
// Inline marks (focus-aware) — provided via a ViewPlugin.
// ---------------------------------------------------------------------------

/**
 * Obsidian-style inline Live Preview: render markdown formatting and conceal
 * its syntax markers — except on the line the cursor is on, which shows raw
 * markdown so it can be edited.
 */
function buildInlineDecorations(view: EditorView): DecorationSet {
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
          name === "HeaderMark" || name === "EmphasisMark" || name === "CodeMark";
        if (isMarker && node.to > node.from && !lineIsActive(view, node.from)) {
          let to = node.to;
          if (name === "HeaderMark") {
            // also hide the space between the #'s and the heading text
            const doc = view.state.doc;
            const lineTo = doc.lineAt(node.from).to;
            while (to < lineTo && doc.sliceString(to, to + 1) === " ") to++;
          }
          decos.push(Decoration.replace({}).range(node.from, to));
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
      this.decorations = buildInlineDecorations(view);
    }
    update(u: ViewUpdate) {
      if (
        u.docChanged ||
        u.selectionSet ||
        u.viewportChanged ||
        u.focusChanged
      ) {
        this.decorations = buildInlineDecorations(u.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

// ---------------------------------------------------------------------------
// Tables (block widgets) — must come from a StateField, not a ViewPlugin.
// ---------------------------------------------------------------------------

/** Split a markdown table row into trimmed cell strings. */
function tableCells(line: string): string[] {
  let l = line.trim();
  if (l.startsWith("|")) l = l.slice(1);
  if (l.endsWith("|")) l = l.slice(0, -1);
  return l.split("|").map((c) => c.trim());
}

/** Renders a GFM table's markdown source as an HTML <table>. */
export class TableWidget extends WidgetType {
  constructor(readonly source: string) {
    super();
  }

  eq(other: TableWidget): boolean {
    return other.source === this.source;
  }

  toDOM(): HTMLElement {
    const lines = this.source.split("\n").filter((l) => l.trim().length > 0);
    const table = document.createElement("table");
    table.className = "md-table";

    const [headerLine, , ...bodyLines] = lines;
    if (headerLine !== undefined) {
      const thead = document.createElement("thead");
      const tr = document.createElement("tr");
      for (const cell of tableCells(headerLine)) {
        const th = document.createElement("th");
        th.textContent = cell;
        tr.appendChild(th);
      }
      thead.appendChild(tr);
      table.appendChild(thead);
    }

    const tbody = document.createElement("tbody");
    for (const line of bodyLines) {
      const tr = document.createElement("tr");
      for (const cell of tableCells(line)) {
        const td = document.createElement("td");
        td.textContent = cell;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    return table;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

function buildTableDecorations(state: EditorState): DecorationSet {
  const decos: Range<Decoration>[] = [];
  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name !== "Table") return;
      // Show raw markdown while the cursor is inside the table (editing).
      if (!selectionTouches(state, node.from, node.to)) {
        const source = state.doc.sliceString(node.from, node.to);
        decos.push(
          Decoration.replace({
            widget: new TableWidget(source),
            block: true,
          }).range(node.from, node.to),
        );
      }
      return false; // don't descend into table cells
    },
  });
  return Decoration.set(decos, true);
}

/** CodeMirror extension that renders GFM tables as HTML tables. */
export const tablePreview = StateField.define<DecorationSet>({
  create(state) {
    return buildTableDecorations(state);
  },
  update(deco, tr) {
    if (tr.docChanged || tr.selection) return buildTableDecorations(tr.state);
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});
