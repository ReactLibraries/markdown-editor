import React, {
  ClipboardEventHandler,
  DragEventHandler,
  FC,
  FormEventHandler,
  HTMLAttributes,
  KeyboardEventHandler,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { LocalEvent, useLocalEvent } from '@react-libraries/use-local-event';
import { useMarkdown } from './MarkdownCompiler.js';
import { MarkdownEvent } from './useMarkdownEditor.js';
import { Root } from './MarkdownEditor.style.js';
interface Props {
  event?: LocalEvent<MarkdownEvent>;
  defaultValue?: string;
  value?: string;
  onUpdate?: (value: string) => void;
}

const defaultProperty = {
  position: 0,
  dragText: '',
  histories: [],
  historyIndex: 0,
};

export default true;

/**
 * MarkdownEditor
 *
 * @param {Props} { }
 */
export const MarkdownEditor: FC<Props & HTMLAttributes<HTMLDivElement>> = ({
  className,
  style,
  event,
  defaultValue,
  value,
  onUpdate,
  ...props
}) => {
  const refNode = useRef<HTMLDivElement>(null);
  const property = useRef<{
    active?: boolean;
    position: number;
    dragText: string;
    histories: [number, string][];
    historyIndex: number;
  }>(defaultProperty).current;
  const [caret, setCaret] = useState(true);
  const [text, setText] = useState(() => value || defaultValue || '');
  if (value !== undefined && text !== value) setText(value);
  const reactNode = useMarkdown(text);
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
  const movePosition = (editor: HTMLElement, start: number, end?: number) => {
    const selection = document.getSelection();
    if (!selection) return;
    const findNode = (node: Node, count: number): [Node | null, number] => {
      if (node.nodeType === Node.TEXT_NODE) {
        count -= node.textContent!.length;
      } else if (node.nodeName === 'BR') {
        count -= 1;
      }
      if (count <= 0) {
        return [node, (node.nodeType === Node.TEXT_NODE ? node.textContent!.length : 0) + count];
      }
      for (let i = 0; i < node.childNodes.length; i++) {
        const [n, o] = findNode(node.childNodes[i], count);
        if (n) return [n, o];
        count = o;
      }
      return [null, count];
    };
    const [targetNode, offset] = findNode(editor, start);
    const [targetNode2, offset2] = end !== undefined ? findNode(editor, end) : [null, 0];
    const range = document.createRange();
    try {
      if (targetNode) {
        range.setStart(targetNode, offset);
        if (targetNode2) range.setEnd(targetNode2, offset2);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        range.setStart(refNode.current!, 0);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch (e) {
      console.error(e);
    }
  };
  const getPosition = () => {
    const selection = document.getSelection();
    if (!selection) return [0, 0] as const;
    const getPos = (end = true) => {
      const [targetNode, targetOffset] = end
        ? [selection.anchorNode, selection.anchorOffset]
        : [selection.focusNode, selection.focusOffset];
      const findNode = (node: Node) => {
        if (node === targetNode && (node !== refNode.current || !targetOffset)) {
          return [true, targetOffset] as const;
        }
        let count = 0;
        for (let i = 0; i < node.childNodes.length; i++) {
          const [flag, length] = findNode(node.childNodes[i]);
          count += length;
          if (flag) return [true, count] as const;
        }
        count +=
          node.nodeType === Node.TEXT_NODE
            ? node.textContent!.length
            : node.nodeName === 'BR' || node.nodeName === 'DIV' || node.nodeName === 'P'
            ? 1
            : 0;
        return [false, count] as const;
      };
      const p = findNode(refNode.current!);
      return p[0] ? p[1] : p[1] - 1;
    };
    const p = getPos(true);
    if (!selection.rangeCount) {
      return [p, p] as const;
    }
    const p2 = getPos(false);
    return [Math.min(p, p2), Math.max(p, p2)] as const;
  };
  const insertText = (text?: string, start?: number, end?: number) => {
    const pos = getPosition();
    const currentText = refNode.current!.innerText;
    const startPos = start !== undefined ? start : pos[0];
    const endPos = end !== undefined ? end : start !== undefined ? start : pos[1];
    pushText(
      currentText.slice(0, startPos) + (text || '') + currentText.slice(endPos, currentText.length)
    );
    property.position = startPos + (text?.length || 0);
  };
  const deleteInsertText = (text: string, start: number, end: number) => {
    const pos = getPosition();
    const currentText = refNode.current!.innerText;
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
    const currentText = refNode.current!.innerText;
    const text = currentText.slice(0, start) + currentText.slice(end, currentText.length);
    pushText(text);
  };
  const handleInput: FormEventHandler<HTMLElement> = (e) => {
    e.preventDefault();
    const currentText = e.currentTarget.innerText;
    if (!property.active) {
      pushText(currentText);
      property.position = getPosition()[0];
    }
  };
  const handlePaste: ClipboardEventHandler<HTMLElement> = (e) => {
    const t = e.clipboardData.getData('text/plain').replace(/\r\n/g, '\n');
    insertText(t);
    e.preventDefault();
  };
  const handleDragStart: DragEventHandler<HTMLDivElement> = (e) => {
    property.dragText = e.dataTransfer.getData('text/plain');
  };
  const handleDrop: DragEventHandler<HTMLDivElement> = (e) => {
    if (document.caretRangeFromPoint) {
      const p = getPosition();
      var sel = getSelection()!;
      const x = e.clientX;
      const y = e.clientY;
      const pos = document.caretRangeFromPoint(x, y)!;
      sel.removeAllRanges();
      sel.addRange(pos);
      const t = e.dataTransfer.getData('text/plain').replace(/\r\n/g, '\n');
      deleteInsertText(t, p[0], p[1]);
    } else {
      const p = getPosition();
      const range = document.createRange();
      range.setStart((e.nativeEvent as any).rangeParent, (e.nativeEvent as any).rangeOffset);
      var sel = getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);
      const t = e.dataTransfer.getData('text/plain').replace(/\r\n/g, '\n');
      deleteInsertText(t, p[0], p[1]);
    }
    e.preventDefault();
  };
  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (e) => {
    switch (e.key) {
      case 'Tab': {
        insertText('\t');
        e.preventDefault();
        break;
      }
      case 'Enter':
        const p = getPosition();
        if (p[0] === refNode.current!.innerText.length) {
          insertText('\n\n');
          property.position--;
        } else insertText('\n');
        e.preventDefault();
        break;
      case 'Backspace':
        {
          const p = getPosition();
          const start = Math.max(p[0] - 1, 0);
          const end = Math.min(p[1], refNode.current!.innerText.length);
          deleteText(start, end);
          property.position = start;
          e.preventDefault();
        }
        break;
      case 'Delete':
        {
          const p = getPosition();
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
        action.payload.onResult(...getPosition());
        break;
      case 'setPosition':
        movePosition(refNode.current!, action.payload.start, action.payload.end);
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
    movePosition(refNode.current!, property.position);
    setCaret(true);
  }, [reactNode]);
  typeof window !== 'undefined' &&
    useLayoutEffect(() => {
      setCaret(false);
    }, [reactNode]);
  const handleKeyPress: KeyboardEventHandler<HTMLDivElement> = (e) => {
    insertText(e.key);
    e.preventDefault();
  };
  return (
    <Root
      style={{ caretColor: caret ? undefined : 'transparent', ...style }}
      className={className}
      key={reactNode ? 0 : 1}
      ref={refNode}
      contentEditable
      spellCheck={false}
      onInput={handleInput}
      onPaste={handlePaste}
      onDragStart={handleDragStart}
      onDrop={handleDrop}
      onKeyPress={handleKeyPress}
      onKeyDown={handleKeyDown}
      onCompositionStart={() => (property.active = true)}
      onCompositionEnd={() => (property.active = false)}
      suppressContentEditableWarning={true}
      {...props}
    >
      {reactNode}
    </Root>
  );
};
