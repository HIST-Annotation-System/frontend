import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountResponse, Role } from '../types/user';
import { UploadCancelledError, getErrorMessage } from './errors';
import { formatRelativeDate } from './format';
import { ALL_ROLES, ORGANIZATION_ROLES, ROLE_LABELS, canChangeTag, canUpload, isManager, isSystemAdmin } from './roles';

const user = (role: Role): AccountResponse => ({ id: 1, username: 'u', role, is_first_login: false });

describe('roles', () => {
  it.each([
    ['ADMIN', true, true],
    ['ORG_ADMIN', false, true],
    ['ANNOTATOR', false, false],
  ] as const)('%s: system admin %s, manager %s', (role, systemAdmin, manager) => {
    expect(isSystemAdmin(user(role))).toBe(systemAdmin);
    expect(isManager(user(role))).toBe(manager);
  });

  it('treats a missing user as nobody', () => {
    expect(isSystemAdmin(null)).toBe(false);
    expect(isManager(undefined)).toBe(false);
    expect(canUpload(null)).toBe(false);
  });

  it('lets managers upload, and annotators only with the upload permission', () => {
    const profile = (can_upload: boolean) => ({ id: 1, first_name: 'A', last_name: 'B', can_upload, categories: [] });
    expect(canUpload(user('ADMIN'))).toBe(true);
    expect(canUpload({ ...user('ORG_ADMIN'), profile: profile(false) })).toBe(true);
    expect(canUpload(user('ANNOTATOR'))).toBe(false);
    expect(canUpload({ ...user('ANNOTATOR'), profile: profile(false) })).toBe(false);
    expect(canUpload({ ...user('ANNOTATOR'), profile: profile(true) })).toBe(true);
  });

  it('lets the system admin change any tag, and organization admins only their organization tags', () => {
    const orgAdmin = (id: number): AccountResponse => ({ ...user('ORG_ADMIN'), organization: { id, name: 'O' } });
    const global = { organization_id: null };
    const ofOrg = (id: number) => ({ organization_id: id });
    expect(canChangeTag(user('ADMIN'), global)).toBe(true);
    expect(canChangeTag(user('ADMIN'), ofOrg(7))).toBe(true);
    expect(canChangeTag(orgAdmin(7), ofOrg(7))).toBe(true);
    expect(canChangeTag(orgAdmin(7), ofOrg(8))).toBe(false);
    expect(canChangeTag(orgAdmin(7), global)).toBe(false);
    expect(canChangeTag({ ...user('ANNOTATOR'), organization: { id: 7, name: 'O' } }, ofOrg(7))).toBe(false);
    expect(canChangeTag(null, global)).toBe(false);
  });

  it('lets organization admins give only organization roles', () => {
    expect(ORGANIZATION_ROLES).not.toContain('ADMIN');
    expect(ALL_ROLES).toEqual(expect.arrayContaining([...ORGANIZATION_ROLES, 'ADMIN']));
    expect(Object.keys(ROLE_LABELS).sort()).toEqual([...ALL_ROLES].sort());
  });
});

describe('errors', () => {
  it('uses the error message or the fallback', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
    expect(getErrorMessage(new Error(''), 'fallback')).toBe('fallback');
    expect(getErrorMessage('string', 'fallback')).toBe('fallback');
    expect(getErrorMessage(undefined)).toBe('Wystąpił nieoczekiwany błąd.');
  });

  it('marks cancelled uploads', () => {
    const error = new UploadCancelledError();
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('UploadCancelledError');
  });
});

describe('formatRelativeDate', () => {
  const now = new Date('2026-03-10T12:00:00Z');
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000).toISOString();

  it.each([
    [10, 'przed chwilą'],
    [5 * 60, '5 minut temu'],
    [3 * 3600, '3 godziny temu'],
    [86400, 'wczoraj'],
    [2 * 86400, 'przedwczoraj'],
    [3 * 86400, '3 dni temu'],
  ])('%i seconds ago reads %s', (seconds, text) => {
    expect(formatRelativeDate(ago(seconds))).toBe(text);
  });

  it('shows the date after a week', () => {
    expect(formatRelativeDate(ago(8 * 86400))).toMatch(/2026/);
  });
});
