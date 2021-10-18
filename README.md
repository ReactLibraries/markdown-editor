# @react-libraries/markdown-editor

## Overview

Markdown editor for React  
SSR in Next.js is also supported.

[Demo](https://next-markdown-murex.vercel.app/)

![2021-10-10-20-16-21](https://user-images.githubusercontent.com/54426986/136717840-48c96380-b65a-4c0a-96e8-330b84b2e253.gif)

## Basic usage

- No control

```tsx
import { MarkdownEditor } from "@react-libraries/markdown-editor";
const Page = () => {
  return <MarkdownEditor defaultValule={"ABC"} onUpdate={(v) => console.log(v)} />;
};
export default Page;
```

- With control

```tsx
import { MarkdownEditor } from "@react-libraries/markdown-editor";
const Page = () => {
  const [value, setValue] = useState("ABC");
  useEffect(() => {
    console.log(value);
  }, [value]);
  return <MarkdownEditor value={value} onUpdate={setValue} />;
};
export default Page;
```

- External control

```tsx
import { MarkdownEditor, useMarkdownEditor } from "@react-libraries/markdown-editor";
import { dispatchLocalEvent } from "@react-libraries/use-local-event";
const Page = () => {
  const event = useMarkdownEditor();
  return (
    <>
      <MarkdownEditor event={event} />
      <button
        onClick={() => {
          dispatchLocalEvent(event, {
            type: "update",
            payload: { value: "{new value}\n", start: 0 },
          });
        }}
      >
        Insert text
      </button>
    </>
  );
};
export default Page;
```

## Props

`HTMLAttributes<HTMLDivElement>` now has the following properties.

```ts
interface Props {
  event?: LocalEvent<MarkdownEvent>;
  defaultValue?: string;
  value?: string;
  onUpdate?: (value: string) => void;
}
```

## Action list

Parameters to be used from dispatchLocalEvent

```ts
export declare type MarkdownEvent =
  | {
      type: "getPosition";
      payload: {
        onResult: (start: number, end: number) => void;
      };
    }
  | {
      type: "getLine";
      payload: {
        onResult: (line: number, offset: number) => void;
      };
    }
  | {
      type: "getScrollLine";
      payload: {
        onResult: (line: number, offset: number) => void;
      };
    }
  | {
      type: "setPosition";
      payload: {
        start: number;
        end?: number;
      };
    }
  | {
      type: "setFocus";
    }
  | {
      type: "setValue";
      payload: {
        value: string;
      };
    }
  | {
      type: "update";
      payload: {
        start?: number;
        end?: number;
        value?: string;
      };
    }
  | {
      type: "redo";
    }
  | {
      type: "undo";
    };
```

## Custom component

[ComponentType](https://github.com/syntax-tree/mdast)

If the number of characters in {children} changes, it will not work properly.

```tsx
const components: MarkdownComponents = {
  strong: ({ children, node, ...props }) => <strong {...props}>{children}</strong>,
  heading: ({ children, node, ...props }) => {
    const Tag = ("h" + node.depth) as ElementType;
    return (
      <Tag
        {...props}
        onMouseOver={(e: React.MouseEvent<HTMLHeadingElement>) =>
          setMessage(e.currentTarget.innerText)
        }
      >
        {children}
      </Tag>
    );
  },
};
…
<MarkdownEditor components={components} />;
```

## Custom style

[DataType](https://github.com/syntax-tree/mdast)

If you use `display:block`, it will not work properly.

```scss
.markdown {
  [datatype="heading"] {
    color: blue;
  }
}
```

```tsx
import styled from "./styled.module.scss";
…
<MarkdownEditor className={styled.markdown} />;
```
