import { describe, expect, it } from 'vitest';
import { escapeHtml } from '../src/lib/notify.js';

describe('escapeHtml', () => {
  it('neutralises markup in customer-supplied text', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    expect(escapeHtml("Cali & Xaliimo's")).toBe('Cali &amp; Xaliimo&#39;s');
  });
});
