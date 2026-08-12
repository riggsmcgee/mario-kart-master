/**
 * DOM helpers. (2a2)
 *
 * Nine chapters of prose have to be written as something, and the two obvious options are both
 * bad: `innerHTML` with template strings puts an injection hole in every chapter and loses the
 * compiler, while raw `document.createElement` turns a paragraph of copy into eight lines of
 * plumbing that nobody wants to edit.
 *
 * So: a builder for structure, and a deliberately tiny inline formatter for emphasis. The
 * formatter understands `**bold**` and `*italic*` and nothing else, and it builds real text
 * nodes rather than parsing markup — which means copy can contain any character at all without
 * anyone thinking about escaping.
 */

type Child = Node | string | number | null | undefined | false;

type Props<K extends keyof HTMLElementTagNameMap> = Partial<
  Omit<HTMLElementTagNameMap[K], 'style' | 'dataset' | 'children'>
> & {
  class?: string;
  style?: Partial<CSSStyleDeclaration>;
  data?: Record<string, string>;
  attrs?: Record<string, string>;
};

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Props<K> | null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);

  if (props) {
    const { class: className, style, data, attrs, ...rest } = props;
    if (className) node.className = className;
    if (style) Object.assign(node.style, style);
    if (data) for (const [key, value] of Object.entries(data)) node.dataset[key] = value;
    if (attrs) for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    Object.assign(node, rest);
  }

  append(node, children);
  return node;
}

export function frag(...children: Child[]): DocumentFragment {
  const fragment = document.createDocumentFragment();
  append(fragment, children);
  return fragment;
}

function append(parent: Node, children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    parent.appendChild(typeof child === 'object' ? child : document.createTextNode(String(child)));
  }
}

/**
 * Emphasis only: `**bold**` and `*italic*`.
 *
 * Built out of text nodes, never parsed as markup, so a chapter can say "<" or "&" without a
 * thought. Anything more than emphasis is a sign the copy wants real structure, which is what
 * {@link el} is for.
 */
export function rich(text: string): DocumentFragment {
  const out = document.createDocumentFragment();
  const pattern = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let cursor = 0;

  for (let match = pattern.exec(text); match !== null; match = pattern.exec(text)) {
    if (match.index > cursor) {
      out.appendChild(document.createTextNode(text.slice(cursor, match.index)));
    }
    if (match[1] !== undefined) out.appendChild(el('strong', null, match[1]));
    else if (match[2] !== undefined) out.appendChild(el('em', null, match[2]));
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) out.appendChild(document.createTextNode(text.slice(cursor)));
  return out;
}

/** A run of paragraphs. The shape almost every concept section wants. */
export function prose(paragraphs: string[], className = 'prose'): HTMLDivElement {
  return el('div', { class: className }, ...paragraphs.map((text) => el('p', null, rich(text))));
}

/** Remove everything inside a node without replacing the node itself. */
export function clear(node: Node): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}
