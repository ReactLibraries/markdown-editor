# @react-libraries/markdown-editor

## Overview

Markdown editor for React  
SSR in Next.js is also supported.

[Demo](https://next-markdown-murex.vercel.app/)

This is the current development version.  
We are planning to add more features such as external operations.

## usage

```tsx
import React from "react";
import { MarkdownEditor } from "@react-libraries/markdown-editor";

import styled from "./index.module.scss";
const value = `# Title

Putting **emphasis** in a sentence

- ListItem
- ListItem

## Table

| Header1       | Header2                                    |
| ------------- | ------------------------------------------ |
| name1         | info1                                      |
| name2         | info 2                                     |

# A*B*CD

AAAAAAA
`;

const Page = () => {
  return <MarkdownEditor defaultValue={value} onUpdate={(v) => console.log(v)} />;
};
export default Page;
```
