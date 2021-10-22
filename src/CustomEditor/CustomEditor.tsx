import React, {
  ClipboardEventHandler,
  CompositionEventHandler,
  DragEventHandler,
  FC,
  Fragment,
  HTMLAttributes,
  KeyboardEventHandler,
  ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { LocalEvent, useLocalEvent, useLocalEventCreate } from '@react-libraries/use-local-event';

export type CustomEditorEvent =
  | {
      type: 'getPosition';
      payload: {
        onResult: (start: number, end: number) => void;
      };
    }
  | {
      type: 'getLine';
      payload: {
        onResult: (line: number, offset: number) => void;
      };
    }
  | {
      type: 'getScrollLine';
      payload: {
        onResult: (line: number, offset: number) => void;
      };
    }
  | {
      type: 'setPosition';
      payload: { start: number; end?: number };
    }
  | {
      type: 'setFocus';
    }
  | {
      type: 'setValue';
      payload: { value: string };
    }
  | {
      type: 'update';
      payload: { start?: number; end?: number; value?: string };
    }
  | {
      type: 'redo';
    }
  | {
      type: 'undo';
    };

export const useCustomEditor = () => {
  return useLocalEventCreate<CustomEditorEvent>();
};

interface Props {
  event?: LocalEvent<CustomEditorEvent>;
  defaultValue?: string;
  value?: string;
  onUpdate?: (value: string) => void;
  onCreateNode?: (value: string) => ReactNode;
}
type Property = {
  position: number;
  dragText: string;
  histories: [number, string][];
  historyIndex: number;
  text: string;
  compositData?: string;
};
const defaultProperty: Property = {
  position: 0,
  dragText: '',
  histories: [],
  historyIndex: 0,
  text: undefined as never,
};

/**
 * MarkdownEditor
 *
 * @param {Props} { }
 */
export const CustomEditor: FC<Props & HTMLAttributes<HTMLDivElement>> = ({
  className,
  style,
  event,
  defaultValue,
  value,
  onUpdate,
  onCreateNode,
  onPaste,
  onDragStart,
  onKeyDown,
  onDrop,
  onCompositionUpdate,
  onCompositionEnd,
  ...props
}) => {
  const refNode = useRef<HTMLDivElement>(null);
  const property = useRef<Property>(defaultProperty).current;
  const [caret, setCaret] = useState(true);
  if (property.text === undefined) property.text = value || defaultValue || '';
  const [text, setText2] = useState(() => value || defaultValue || '');
  const setText = (value: string) => {
    setText2(value);
    property.text = value;
  };
  if (value !== undefined && text !== value) setText(value);
  const reactNode = useMemo(() => onCreateNode?.(property.text), [property.text]);
  const pushText = (newText: string) => {
    property.histories.splice(property.historyIndex++);
    property.histories.push([property.position, text]);
    if (value === undefined) setText(newText);
    onUpdate?.(newText);
  };
  const undoText = () => {
    if (property.historyIndex) {
      if (property.historyIndex >= property.histories.length)
        property.histories.push([property.position, text]);
      else property.histories[property.historyIndex] = [property.position, text];
      const newText = property.histories[--property.historyIndex];
      if (newText) {
        property.position = newText[0];
        setText(newText[1]);
        onUpdate?.(newText[1]);
      }
      return newText;
    }
    return undefined;
  };
  const redoText = () => {
    if (property.historyIndex < property.histories.length - 1) {
      const newText = property.histories[++property.historyIndex];
      if (newText) {
        property.position = newText[0];
        setText(newText[1]);
        onUpdate?.(newText[1]);
      }
      return newText;
    }
    return undefined;
  };
  const insertText = (text?: string, start?: number, end?: number) => {
    const pos = getPosition(refNode.current!);
    const currentText = property.text;
    const startPos =
      start !== undefined ? (start === -1 ? property.text.length + 1 : start) : pos[0];
    const endPos =
      end !== undefined
        ? end === -1
          ? property.text.length
          : end
        : start !== undefined
        ? startPos
        : pos[1];
    pushText(currentText.slice(0, startPos) + (text || '') + currentText.slice(endPos));
    property.position = startPos + (text?.length || 0);
  };
  const deleteInsertText = (text: string, start: number, end: number) => {
    const pos = getPosition(refNode.current!);
    const currentText = property.text;
    if (pos[0] < start) {
      const currentText2 = currentText.slice(0, start) + currentText.slice(end, currentText.length);
      pushText(
        currentText2.slice(0, pos[0]) + text + currentText2.slice(pos[1], currentText2.length)
      );
      property.position = pos[0] + text.length;
    } else {
      const currentText2 =
        currentText.slice(0, pos[0]) + text + currentText.slice(pos[1], currentText.length);
      pushText(currentText2.slice(0, start) + currentText2.slice(end, currentText2.length));
      property.position = pos[0] + text.length + start - end;
    }
  };
  const deleteText = (start: number, end: number) => {
    const currentText = property.text;
    const text = currentText.slice(0, start) + currentText.slice(end, currentText.length);
    pushText(text);
  };
  const handleCompositionUpdate: CompositionEventHandler<HTMLDivElement> = (e) => {
    onCompositionUpdate?.(e);
    if (e.isDefaultPrevented()) return;
    property.compositData = e.data;
  };
  const handleCompositionEnd: CompositionEventHandler<HTMLDivElement> = (e) => {
    onCompositionEnd?.(e);
    const selection = getSelection()!;
    if (e.isDefaultPrevented()) return;
    try {
      const range = document.createRange();
      range.setStart(selection.focusNode!, selection.focusOffset - property.compositData!.length);
      range.setEnd(selection.focusNode!, selection.focusOffset);
      range.deleteContents();
      insertText(property.compositData);
    } catch (e) {
      //
    }
  };
  const handlePaste: ClipboardEventHandler<HTMLDivElement> = (e) => {
    onPaste?.(e);
    if (e.isDefaultPrevented()) return;
    const t = e.clipboardData.getData('text/plain').replace(/\r\n/g, '\n');
    insertText(t);
    e.preventDefault();
  };
  const handleDragStart: DragEventHandler<HTMLDivElement> = (e) => {
    onDragStart?.(e);
    if (e.isDefaultPrevented()) return;
    property.dragText = e.dataTransfer.getData('text/plain');
  };
  const handleDrop: DragEventHandler<HTMLDivElement> = (e) => {
    onDrop?.(e);
    if (e.isDefaultPrevented()) return;
    const p = getPosition(refNode.current!);
    const t = e.dataTransfer.getData('text/plain').replace(/\r\n/g, '\n');
    const [node, offset] = getDragCaret(e);
    const range = document.createRange();
    range.setStart(node, offset);
    const sel = getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    deleteInsertText(t, p[0], p[1]);
    property.position;
    e.preventDefault();
  };
  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (e) => {
    onKeyDown?.(e);
    if (e.isDefaultPrevented()) return;
    switch (e.key) {
      case 'Tab': {
        insertText('\t');
        e.preventDefault();
        break;
      }
      case 'Enter':
        {
          const p = getPosition(refNode.current!);
          if (p[0] === property.text.length) {
            insertText('\n\n');
            property.position--;
          } else insertText('\n');
          e.preventDefault();
        }
        break;
      case 'Backspace':
        {
          const p = getPosition(refNode.current!);
          const start = Math.max(p[0] - 1, 0);
          const end = Math.min(p[1], property.text.length);
          deleteText(start, end);
          property.position = start;
          e.preventDefault();
        }
        break;
      case 'Delete':
        {
          const p = getPosition(refNode.current!);
          deleteText(p[0], p[1] + 1);
          property.position = p[0];
          e.preventDefault();
        }
        break;
      case 'z':
        if (e.ctrlKey && !e.shiftKey) {
          undoText();
        }
        break;
      case 'y':
        if (e.ctrlKey && !e.shiftKey) {
          redoText();
        }
        break;
    }
  };
  useLocalEvent(event, (action) => {
    switch (action.type) {
      case 'getPosition':
        action.payload.onResult(...getPosition(refNode.current!));
        break;
      case 'getLine':
        {
          const pos = getPosition(refNode.current!)[0];
          let line = 1;
          let offset = 0;
          const text = property.text;
          for (let i = 0; i < pos && i < text.length; i++) {
            offset++;
            if (text[i] === '\n') {
              line++;
              offset = 0;
            }
          }
          action.payload.onResult(line, offset);
        }
        break;
      case 'getScrollLine':
        {
          const node = findScrollTop(refNode.current!, refNode.current!.scrollTop);
          if (node) {
            const pos = getNodePositioin(refNode.current!, node, 0);
            let line = 1;
            let offset = 0;
            const text = property.text;
            for (let i = 0; i < pos && i < text.length; i++) {
              offset++;
              if (text[i] === '\n') {
                line++;
                offset = 0;
              }
            }
            action.payload.onResult(line, offset);
          } else {
            action.payload.onResult(0, 0);
          }
        }
        break;
      case 'setPosition':
        setPosition(refNode.current!, action.payload.start, action.payload.end);
        break;
      case 'setFocus':
        refNode.current!.focus();
        break;
      case 'update':
        insertText(action.payload.value, action.payload.start, action.payload.end);
        break;
      case 'undo':
        undoText();
        break;
      case 'redo':
        redoText();
        break;
    }
  });
  useEffect(() => {
    const node = refNode.current!;
    setPosition(node, property.position >= text.length ? -1 : property.position);
    node.focus();
    setCaret(true);
    const element = getSelection()?.focusNode as HTMLElement;
    const target = element?.scrollIntoView !== undefined ? element : element.parentElement!;
    const y1 = target.offsetTop;
    const y2 = y1 + target.offsetHeight;
    const clientY1 = node.scrollTop;
    const clientY2 = clientY1 + node.clientHeight;
    if (y2 > clientY2) {
      node.scrollTo({
        left: node.scrollLeft,
        top: node.scrollTop + y2 - clientY2 + 1,
        behavior: 'smooth',
      });
    }
  }, [reactNode]);

  typeof window !== 'undefined' &&
    useLayoutEffect(() => {
      refNode.current!.blur();
      setCaret(false);
    }, [reactNode]);

  const handleKeyPress: KeyboardEventHandler<HTMLDivElement> = (e) => {
    insertText(e.key);
    e.preventDefault();
  };
  return (
    <>
      <style>{css}</style>
      <div
        style={{ caretColor: caret ? undefined : 'transparent', ...style }}
        className={cssClassName + (className ? ' ' + className : '')}
        ref={refNode}
        contentEditable
        spellCheck={false}
        onPaste={handlePaste}
        onDragStart={handleDragStart}
        onDrop={handleDrop}
        onKeyPress={handleKeyPress}
        onKeyDown={handleKeyDown}
        onCompositionUpdate={handleCompositionUpdate}
        onCompositionEnd={handleCompositionEnd}
        suppressContentEditableWarning={true}
        {...props}
      >
        <Fragment key={getNodeCount(reactNode)}>{reactNode}</Fragment>
      </div>
    </>
  );
};
const findScrollTop = (node: HTMLElement, scrollTop: number) => {
  if (node.offsetTop >= scrollTop) return node;
  for (const child of node.childNodes) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const findNode = findScrollTop(child as HTMLElement, scrollTop) as HTMLElement;
      if (findNode) return findNode;
    }
  }
  return undefined;
};
const getNodeCount = (node: ReactNode) => {
  if (!node) return 0;
  let count = 1;
  const children = typeof node === 'object' && 'props' in node && node.props.children;
  children &&
    React.Children.toArray(children).forEach((children) => {
      count += getNodeCount(children);
    });
  return count;
};
const cssClassName = 'markdown__fewjol87e89fhnao';
const css =
  `.${cssClassName}{position:relative;outline:none;white-space:pre-wrap;overflow-y:auto;} ` +
  `.${cssClassName} *{display:inline;}`;

export const setPosition = (editor: HTMLElement, startPos: number, end?: number) => {
  const selection = document.getSelection();
  if (!selection) return;
  const findNode = (node: Node, count: number, editable: boolean): [Node | null, number] => {
    if (count === -1) {
      let lastChild = node;
      while (lastChild.lastChild) lastChild = lastChild.lastChild;
      if (lastChild.nodeType === Node.TEXT_NODE) {
        return [lastChild, (lastChild as Text).length];
      }
      return [lastChild, 0];
    }
    const display =
      node.nodeType === Node.ELEMENT_NODE && getComputedStyle(node as HTMLElement).display;
    const type = node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).dataset.type;

    if (display === 'none' || type === 'ignore') return [null, count];

    if (node.nodeType === Node.TEXT_NODE) {
      count -= node.textContent!.length;
    }
    if (count <= 0) {
      if (editable)
        return [node, (node.nodeType === Node.TEXT_NODE ? node.textContent!.length : 0) + count];
      return [null, count];
    }
    for (let i = 0; i < node.childNodes.length; i++) {
      const [n, o] = findNode(
        node.childNodes[i],
        count,
        editable ? (node as HTMLElement).contentEditable !== 'false' : false
      );
      if (n) return [n, o];
      count = o;
    }
    if (node.nodeType === Node.ELEMENT_NODE && editor !== node) {
      if (node.nodeName === 'BR') {
        count -= 1;
      } else if (getComputedStyle(node as Element).display === 'block') {
        if (node.nextSibling) count -= 1;
      }
    }
    return [null, count];
  };
  const [targetNode, offset] = findNode(editor, startPos, true);
  const [targetNode2, offset2] = end !== undefined ? findNode(editor, end, true) : [null, 0];
  const range = document.createRange();
  try {
    if (targetNode) {
      range.setStart(targetNode, offset);
      if (targetNode2) range.setEnd(targetNode2, offset2);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      range.setStart(editor, 0);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  } catch (e) {
    console.error(e);
  }
};
export const getNodePositioin = (
  editor: HTMLElement,
  targetNode: Node | null,
  targetOffset: number
) => {
  const findNode = (node: Node | null) => {
    if (!node) return [null, 0] as const;
    const display =
      node.nodeType === Node.ELEMENT_NODE && getComputedStyle(node as Element).display;
    const type = node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).dataset.type;
    if (display === 'none' || type === 'ignore') return [false, 0] as const;
    if (node === targetNode && (!targetOffset || node.nodeType === Node.TEXT_NODE)) {
      return [true, targetOffset] as const;
    }
    let count = 0;
    for (let i = 0; i < (node === targetNode ? targetOffset : node.childNodes.length); i++) {
      const [flag, length] = findNode(node.childNodes[i]);
      count += length;
      if (flag) return [true, count] as const;
    }
    if (node === targetNode) return [true, count] as const;
    if (node.nodeType === Node.TEXT_NODE) {
      count += node.textContent!.length;
    } else {
      if (node.nodeName === 'BR') {
        count++;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (display === 'block') {
          if (node.nextSibling) count++;
        }
      }
    }
    return [node === targetNode, count] as const;
  };
  const p = findNode(editor);
  return p[0] ? p[1] : p[1] - 1;
};

export const getPosition = (editor: HTMLElement) => {
  const selection = document.getSelection();
  if (!selection) return [0, 0] as const;
  const p = getNodePositioin(editor, selection.focusNode, selection.focusOffset);
  if (!selection.rangeCount) {
    return [p, p] as const;
  }
  const p2 = getNodePositioin(editor, selection.anchorNode, selection.anchorOffset);
  return [Math.min(p, p2), Math.max(p, p2)] as const;
};
const getDragCaret = (e: React.DragEvent<HTMLDivElement>) => {
  if (document.caretRangeFromPoint) {
    const x = e.clientX;
    const y = e.clientY;
    const range = document.caretRangeFromPoint(x, y)!;
    return [range.startContainer, range.startOffset] as const;
  } else {
    const native = e.nativeEvent as typeof e.nativeEvent & {
      rangeParent: Node;
      rangeOffset: number;
    };
    return [native.rangeParent, native.rangeOffset] as const;
  }
};
export default true;
