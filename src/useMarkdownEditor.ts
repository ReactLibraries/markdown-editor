import { useLocalEventCreate } from '@react-libraries/use-local-event';

export type MarkdownEvent =
  | {
      type: 'getPosition';
      payload: {
        onResult: (start: number, end: number) => void;
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

export const useMarkdownEditor = () => {
  return useLocalEventCreate<MarkdownEvent>();
};
