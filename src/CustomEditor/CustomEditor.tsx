import React, {
  ClipboardEventHandler,
  CompositionEventHandler,
  DragEventHandler,
  FC,
  FormEventHandler,
  HTMLAttributes,
  KeyboardEventHandler,
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  dispatchLocalEvent,
  LocalEvent,
  useLocalEvent,
  useLocalEventCreate,
} from '@react-libraries/use-local-event';

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
  composit?: boolean;
  compositData?: string;
  compositIndex: number;
};
const defaultProperty: Property = {
  position: 0,
  dragText: '',
  histories: [],
  historyIndex: 0,
  compositIndex: 0,
  text: undefined as never,
};
const cssClassName = 'markdown__fewjol87e89fhnao';
const css =
  `.${cssClassName}{position:relative;overflow-y:auto;} ` +
  `.${cssClassName}>div{outline:none;white-space:pre-wrap;}` +
  `.${cssClassName}>div *{display:inline;}`;

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
export const getNodeCount = (node: ReactNode) => {
  if (!node) return 0;
  let count = 1;
  const children = typeof node === 'object' && 'props' in node && node.props.children;
  children &&
    React.Children.toArray(children).forEach((children) => {
      count += getNodeCount(children);
    });
  return count;
};
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
    if (count === 0) {
      const findTextNode = (node: Node): Node | null => {
        if (node.nodeType === Node.TEXT_NODE || node.nodeName === 'BR') return node;
        for (const child of node.childNodes) {
          const n = findTextNode(child);
          if (n) return n;
        }
        return null;
      };
      return [findTextNode(node), 0];
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
  let [targetNode, offset] = findNode(editor, startPos, true);
  if (targetNode === null) [targetNode, offset] = findNode(editor, -1, true);
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
const isSafari = () => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.indexOf('safari') !== -1 && ua.indexOf('chrome') === -1 && ua.indexOf('edge') === -1;
};
const isEditableNode = (node: Node) => {
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
  return element?.isContentEditable === true;
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
  onClick,
  onDragStart,
  onKeyDownCapture,
  onKeyPressCapture,
  onDrop,
  onCut,
  onCompositionStart,
  onCompositionUpdate,
  onCompositionEnd,
  ...props
}) => {
  const refNode = useRef<HTMLDivElement>(null);
  const property = useRef<Property>(defaultProperty).current;
  const [caret, setCaret] = useState(true);
  if (value !== undefined && property.text !== value) property.text = value;
  if (property.text === undefined) property.text = defaultValue || '';
  const [text, setText2] = useState(() => value || defaultValue || '');
  const setText = useCallback(
    (value: string) => {
      setText2(value);
      property.text = value;
    },
    [property]
  );
  if (value !== undefined && text !== value) setText(value);
  const reactNode = useMemo(() => onCreateNode?.(property.text), [onCreateNode, property.text]);
  const pushText = useCallback(
    (newText: string) => {
      property.histories.splice(property.historyIndex++);
      property.histories.push([property.position, property.text]);
      if (value === undefined) setText(newText);
      onUpdate?.(newText);
    },
    [onUpdate, property, setText, value]
  );
  const undoText = useCallback(() => {
    if (property.historyIndex) {
      if (property.historyIndex >= property.histories.length)
        property.histories.push([property.position, property.text]);
      else property.histories[property.historyIndex] = [property.position, property.text];
      const newText = property.histories[--property.historyIndex];
      if (newText) {
        property.position = newText[0];
        setText(newText[1]);
        onUpdate?.(newText[1]);
      }
      return newText;
    }
    return undefined;
  }, [onUpdate, property, setText]);
  const redoText = useCallback(() => {
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
  }, [onUpdate, property, setText]);
  const insertText = useCallback(
    (text?: string, start?: number, end?: number) => {
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
    },
    [property, pushText]
  );
  const deleteInsertText = useCallback(
    (text: string, start: number, end: number) => {
      const pos = getPosition(refNode.current!);
      const currentText = property.text;
      if (pos[0] < start) {
        const currentText2 =
          currentText.slice(0, start) + currentText.slice(end, currentText.length);
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
    },
    [property, pushText]
  );
  const deleteText = useCallback(
    (start: number, end: number) => {
      const currentText = property.text;
      const text = currentText.slice(0, start) + currentText.slice(end, currentText.length);
      pushText(text);
    },
    [property.text, pushText]
  );
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
        {
          const target = refNode.current!.childNodes[0] as HTMLDivElement;
          target?.focus();
        }
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
    setPosition(node, property.position >= property.text.length ? -1 : property.position);
    node.focus();
    setCaret(true);
    const element = getSelection()?.focusNode as HTMLElement;
    if (element && refNode.current !== element) {
      const target = element.parentElement!;
      const y1 = target.offsetTop;
      const y2 = y1 + target.offsetHeight;
      const clientY1 = node.scrollTop;
      const clientY2 = clientY1 + node.clientHeight;
      if (y2 > clientY2) {
        node.scrollTo({
          left: node.scrollLeft,
          top: node.scrollTop + y2 - clientY2 + 8,
          behavior: 'smooth',
        });
      }
    }
  }, [property, reactNode]);

  typeof window !== 'undefined' &&
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useLayoutEffect(() => {
      refNode.current!.blur();
      setCaret(false);
    }, [reactNode]);
  const handleSelect = useCallback(() => {
    const p = getPosition(refNode.current!);
    property.position = p[0];
  }, [property]);
  const handlePaste: ClipboardEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      onPaste?.(e);
      if (e.isDefaultPrevented()) return;
      const t = e.clipboardData.getData('text/plain').replace(/\r\n/g, '\n');
      insertText(t);
      e.preventDefault();
    },
    [insertText, onPaste]
  );
  const handleDragStart: DragEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      onDragStart?.(e);
      if (e.isDefaultPrevented()) return;
      property.dragText = e.dataTransfer.getData('text/plain');
    },
    [onDragStart, property]
  );
  const handleDrop: DragEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      onDrop?.(e);
      if (e.isDefaultPrevented()) return;
      const [node, offset] = getDragCaret(e);
      if (!isEditableNode(node)) return;
      const p = getPosition(refNode.current!);
      const t = e.dataTransfer.getData('text/plain').replace(/\r\n/g, '\n');
      const range = document.createRange();
      range.setStart(node, offset);
      const sel = getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);
      deleteInsertText(t, p[0], p[1]);
      property.position;
      e.preventDefault();
    },
    [deleteInsertText, onDrop, property]
  );
  const handleKeyPressCapture: KeyboardEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      onKeyPressCapture?.(e);
      if (e.isDefaultPrevented()) return;
      if (e.key !== 'Enter') insertText(e.key);
      e.preventDefault();
      e.stopPropagation();
    },
    [insertText, onKeyPressCapture]
  );
  const handleKeyDownCapture: KeyboardEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      onKeyDownCapture?.(e);
      if (e.isDefaultPrevented() || property.composit || e.nativeEvent.isComposing) {
        if (e.key === 'Enter') property.composit = false;
        e.stopPropagation();
        return;
      }
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
            deleteText(p[0], p[1] + (p[0] === p[1] ? 1 : 0));
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
    },
    [deleteText, insertText, onKeyDownCapture, property, redoText, undoText]
  );
  const handleClick: React.MouseEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      if (e.isDefaultPrevented()) return;
      onClick?.(e);
      if (e.target === refNode.current) {
        if (event) {
          dispatchLocalEvent(event, { type: 'setFocus' });
          dispatchLocalEvent(event, { type: 'setPosition', payload: { start: -1 } });
        }
      }
    },
    [event, onClick]
  );
  const handleCut: ClipboardEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      onCut?.(e);
      if (e.isDefaultPrevented()) return;
      const value = getSelection()?.toString() || '';
      e.clipboardData.setData('text/plain', value);
      const p = getPosition(refNode.current!);
      deleteText(p[0], p[1]);
      property.position = p[0];
      e.preventDefault();
    },
    [deleteText, onCut, property]
  );
  const handleBeforeInputCapture: FormEventHandler<HTMLDivElement> = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  const handleCompositionStart: CompositionEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      onCompositionStart?.(e);
      if (e.isDefaultPrevented()) return;
      property.composit = true;
    },
    [onCompositionStart, property]
  );
  const handleCompositionUpdate: CompositionEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      onCompositionUpdate?.(e);
      if (e.isDefaultPrevented()) return;
      property.compositData = e.data;
    },
    [onCompositionUpdate, property]
  );
  const handleCompositionEnd: CompositionEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      onCompositionEnd?.(e);
      if (e.isDefaultPrevented() || !property.compositData || !property.composit) return;
      const selection = getSelection()!;
      const safari = isSafari();
      try {
        const range = document.createRange();
        if (safari) {
          range.setStart(selection.focusNode!, selection.focusOffset);
          range.setEnd(
            selection.focusNode!,
            selection.focusOffset + property.compositData!.length - 1
          );
        } else {
          range.setStart(
            selection.focusNode!,
            selection.focusOffset - property.compositData!.length
          );
          range.setEnd(selection.focusNode!, selection.focusOffset);
        }

        range.deleteContents();
      } catch (e) {
        //
      }
      insertText(property.compositData);
      property.compositData = undefined;
      if (!safari) property.composit = false;
      property.compositIndex++;
    },
    [insertText, onCompositionEnd, property]
  );

  const styleCss = useMemo(() => <style dangerouslySetInnerHTML={{ __html: css }} />, []);
  const nodeStyle = useMemo(
    () => ({ caretColor: caret ? undefined : 'transparent', ...style }),
    [caret, style]
  );
  const nodeClassName = useMemo(
    () => cssClassName + (className ? ' ' + className : ''),
    [className]
  );
  const nodeKey = useMemo(
    () => getNodeCount(reactNode) + `${property.compositIndex}`,
    [property.compositIndex, reactNode]
  );
  return (
    <>
      {styleCss}
      <div
        className={nodeClassName}
        ref={refNode}
        style={nodeStyle}
        spellCheck={false}
        onDragStart={handleDragStart}
        onCut={handleCut}
        onDrop={handleDrop}
        onBeforeInputCapture={handleBeforeInputCapture}
        onKeyPressCapture={handleKeyPressCapture}
        onKeyDownCapture={handleKeyDownCapture}
        onCompositionStart={handleCompositionStart}
        onCompositionUpdate={handleCompositionUpdate}
        onCompositionEnd={handleCompositionEnd}
        onClick={handleClick}
        onSelect={handleSelect}
        {...props}
      >
        <div
          key={nodeKey}
          contentEditable
          suppressContentEditableWarning={true}
          onPaste={handlePaste}
        >
          {reactNode}
        </div>
      </div>
    </>
  );
};

export default true;
