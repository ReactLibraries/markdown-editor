import { Processor, Compiler } from "unified";
import type unist from "unist";
import type { Root, Content } from "mdast";
import React, { ReactElement, ReactNode, useEffect, useRef, useState } from "react";
export type VNode = { type: string; value?: unknown; start: number; end: number };
let processor: Processor<Root, Root, Root, ReactElement>;
const getProcesser = async () => {
  if (processor) return processor;
  const [unified, remarkParse, remarkGfm] = await Promise.all([
    import("unified").then((v) => v.unified),
    import("remark-parse").then((v) => v.default),
    import("remark-gfm").then((v) => v.default),
  ]);

  function ReactCompiler(this: Processor) {
    const expandNode = (node: Content & Partial<unist.Parent<Content>>, nodes: VNode[]) => {
      nodes.push({
        type: node.type,
        start: node.position!.start.offset!,
        end: node.position!.end!.offset!,
        value: node.type === "heading" ? node.depth : undefined,
      });
      node.children?.forEach((n) => expandNode(n, nodes));
    };
    const reactNode = (vnodes: VNode[], value: string): ReactNode => {
      let position = 0;
      let index = 0;
      let nodeCount = 0;
      const getNode = (limit: number): ReactNode => {
        const nodes = [];
        while (position < limit && index < vnodes.length) {
          const vnode = vnodes[index];
          const [start, end] = [vnode.start, vnode.end];
          if (start > limit) {
            nodes.push(value.substring(position, limit));
            position = limit;
            break;
          }
          if (position < start) {
            if (index < vnodes.length) {
              nodes.push(value.substring(position, start));
              position = start;
            } else {
              nodes.push(value.substring(position, end));
              position = end;
            }
          } else {
            const TagName = {
              heading: "h" + vnode.value,
              strong: "strong",
              emphasis: "em",
              inlineCode: "code",
              code: "code",
              list: "code",
              table: "code",
            }[vnode.type] as keyof JSX.IntrinsicElements;
            index++;
            if (TagName) {
              if (index < vnodes.length) {
                nodes.push(React.createElement(TagName, { key: index }, getNode(end)));
              } else {
                nodes.push(
                  React.createElement(TagName, { key: index }, value.substring(start, end))
                );
                position = end;
              }
            }
          }
        }
        if (position < limit) {
          nodeCount++;
          nodes.push(value.substring(position, limit));
          position = limit;
        }
        nodeCount += nodes.length;
        return nodes.length ? nodes : null;
      };
      const nodes = getNode(value.length);
      if (!nodes) return;
      return React.createElement("span", { key: nodeCount }, nodes);
    };

    const Compiler: Compiler = (tree: unist.Node & Partial<unist.Parent<unist.Node>>, value) => {
      const nodes: VNode[] = [];
      expandNode(tree as Content, nodes);
      return reactNode(
        nodes.filter((node) => !["text", "paragraph"].includes(node.type)),
        String(value)
      );
    };
    this.Compiler = Compiler;
  }

  const p = unified().use(remarkParse).use(remarkGfm).use(ReactCompiler) as Processor<
    Root,
    Root,
    Root,
    ReactElement
  >;
  processor = p;
  return p;
};

export const useMarkdown = (value: string) => {
  const [node, setNode] = useState<ReactNode>();
  useEffect(() => {
    getProcesser().then((p) => p.process(value).then((v) => setNode(v.result)));
  }, [value]);
  return node;
};
