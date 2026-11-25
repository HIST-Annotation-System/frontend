import { expect, type Page } from '@playwright/test';
import type { Credentials } from '../helpers/api';

export class LoginPage {
  constructor(private readonly page: Page) {}

  goto = () => this.page.goto('/login');

  async signIn({ username, password }: Credentials) {
    await this.page.getByLabel('Nazwa użytkownika').fill(username);
    await this.page.getByLabel('Hasło', { exact: true }).fill(password);
    await this.page.getByRole('button', { name: /zaloguj/i }).click();
  }

  expectSignedIn = () => expect(this.page.getByRole('navigation', { name: 'Główna nawigacja' })).toBeVisible();
  expectError = () => expect(this.page.getByRole('alert')).toBeVisible();
}
