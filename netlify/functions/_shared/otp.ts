import { createHash } from 'node:crypto';

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}
