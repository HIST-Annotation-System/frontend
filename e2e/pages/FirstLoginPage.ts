import { expect, type Page } from '@playwright/test';

type Profile = { firstName: string; lastName: string; password: string; confirm?: string };

export class FirstLoginPage {
  constructor(private readonly page: Page) {}

  expectVisible = () => expect(this.page.getByRole('heading', { name: 'Pierwsze logowanie' })).toBeVisible();

  async fill({ firstName, lastName, password, confirm = password }: Profile) {
    await this.page.getByLabel('Imię').fill(firstName);
    await this.page.getByLabel('Nazwisko').fill(lastName);
    await this.page.getByLabel('Nowe hasło (min. 8 znaków)').fill(password);
    await this.page.getByLabel('Powtórz hasło').fill(confirm);
  }

  submit = () => this.page.getByRole('button', { name: 'Zapisz i kontynuuj' }).click();
}
