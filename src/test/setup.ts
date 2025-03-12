
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import matchers from '@testing-library/jest-dom/matchers';
import '@testing-library/jest-dom';

// Extend Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

// Make vi accessible globally
declare global {
  // eslint-disable-next-line no-var
  var vi: any; // Using 'any' to avoid the circular reference error
}
global.vi = vi;

// Run cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});
