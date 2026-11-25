import { expect, type Page } from '@playwright/test';
import { dialogTitled } from '../helpers/ui';

export class UsersPage {
  constructor(private readonly page: Page) {}

  goto = () => this.page.goto('/admin/users');

  row = (username: string) => this.page.getByRole('row', { name: new RegExp(`\\b${username}\\b`) });

  search = (text: string) => this.page.getByRole('searchbox', { name: 'Szukaj użytkowników' }).fill(text);

  openCreateDialog = async () => {
    await this.page.getByRole('button', { name: 'Dodaj użytkownika' }).click();
    return dialogTitled(this.page, 'Dodaj użytkownika');
  };

  async create({ username, password, canUpload = false }: { username: string; password: string; canUpload?: boolean }) {
    const dialog = await this.openCreateDialog();
    await dialog.getByLabel('Nazwa użytkownika').fill(username);
    await dialog.getByLabel('Hasło tymczasowe').fill(password);
    if (canUpload) await dialog.getByLabel('Może wgrywać pliki').check();
    await dialog.getByRole('button', { name: 'Utwórz konto' }).click();
    return dialog;
  }

  expectRow = (username: string) => expect(this.row(username)).toBeVisible();
}
