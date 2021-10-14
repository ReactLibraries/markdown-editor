import React, { Attributes, HTMLAttributes, ReactNode } from 'react';
import type unist from 'unist';
import type { Root, Content } from 'mdast';
import { unified, Processor, Compiler } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';

export type VNode = Content & Partial<unist.Parent<Content>>;

export type MarkdownComponents = {
  [K in Content['type']]?: (
    params: {
      node: Content & { type: K };
    } & HTMLAttributes<HTMLElement> &
      Attributes
  ) => ReactNode;
};

const defaultComponents: MarkdownComponents = {
  heading: ({ children, node, ...props }) => React.createElement('h' + node.depth, props, children),
  strong: ({ children, ...props }) => React.createElement('strong', props, children),
  emphasis: ({ children, ...props }) => React.createElement('em', props, children),
  inlineCode: ({ children, ...props }) => React.createElement('em', props, children),
  code: ({ children, ...props }) => React.createElement('code', props, children),
  list: ({ children, ...props }) => React.createElement('code', props, children),
  table: ({ children, ...props }) => React.createElement('code', props, children),
};

function ReactCompiler(this: Processor, components?: MarkdownComponents) {
  const expandNode = (node: Content & Partial<unist.Parent<Content>>, nodes: VNode[]) => {
    nodes.push(node);
    node.children?.forEach((n) => expandNode(n, nodes));
  };
  const reactNode = (vnodes: VNode[], value: string): React.ReactNode => {
    let position = 0;
    let index = 0;
    let nodeCount = 0;
    const getNode = (limit: number): React.ReactNode => {
      const nodes = [];
      while (position < limit && index < vnodes.length) {
        const vnode = vnodes[index];
        const [start, end] = [vnode.position!.start.offset!, vnode.position!.end.offset!];
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
          const markdownContent = components?.[vnode.type] || defaultComponents[vnode.type];
          index++;
          if (markdownContent) {
            const children =
              index < vnodes.length ? getNode(end) : value.substring(start, (position = end));
            nodes.push(
              markdownContent({ key: index, node: vnode, datatype: vnode.type, children } as never)
            );
          }
          //else nodes.push(children);
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
    return React.createElement('span', { key: nodeCount }, nodes);
  };

  const Compiler: Compiler = (tree: unist.Node & Partial<unist.Parent<unist.Node>>, value) => {
    const nodes: VNode[] = [];
    expandNode(tree as Content, nodes);
    return reactNode(
      nodes.filter((node) => !['text'].includes(node.type)),
      String(value)
    );
  };
  this.Compiler = Compiler;
}
export const createProcesser = (option?: MarkdownComponents) => {
  return unified().use(remarkParse).use(remarkGfm).use(ReactCompiler, option) as Processor<
    Root,
    Root,
    Root,
    React.ReactElement
  >;
};
export default true;
