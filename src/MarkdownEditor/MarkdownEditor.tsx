import React, { FC, HTMLAttributes, useMemo } from 'react';
import { LocalEvent } from '@react-libraries/use-local-event';
import { CustomEditor, CustomEditorEvent } from '../CustomEditor/CustomEditor.js';
import { createProcesser, MarkdownComponents } from './MarkdownCompiler.js';

export type MarkdownEvent = LocalEvent<CustomEditorEvent>;

interface Props {
  event?: MarkdownEvent;
  defaultValue?: string;
  value?: string;
  onUpdate?: (value: string) => void;
  components?: MarkdownComponents;
}

/**
 * MarkdownEditor
 *
 * @param {Props} { }
 */
export const MarkdownEditor: FC<Props & HTMLAttributes<HTMLDivElement>> = ({
  components,
  ...props
}) => {
  const processer = useMemo(() => createProcesser(components), [components]);
  return <CustomEditor {...props} onCreateNode={(value) => processer.processSync(value).result} />;
};
export default true;
