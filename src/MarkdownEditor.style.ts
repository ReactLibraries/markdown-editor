import type { CreateStyled } from '@emotion/styled';
import styled from '@emotion/styled';

export const Root = (typeof styled === 'function'
  ? styled
  : (styled as { default: CreateStyled }).default)('div')`
  outline: none;
  white-space: pre-wrap;
  code,
  p,
  div,
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  h7 {
    display: inline;
  }
`;
