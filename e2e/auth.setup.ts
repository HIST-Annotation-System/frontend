import { test as setup } from '@playwright/test';
import { env } from './env';
import { Api, completeFirstLogin, E2E_ORGANIZATION, type Credentials, type Role } from './helpers/api';
import { LoginPage } from './pages/LoginPage';

// The sign-ins need the accounts the first test creates.
setup.describe.configure({ mode: 'serial' });

// Creates the org admin and annotator once (the admin comes from the API's create_admin script).
setup('prepare the E2E accounts', async () => {
  const admin = await Api.as(env.admin);
  try {
    const organizations = await admin.get<{ id: number; name: string }[]>('organizations/');
    const organization =
      organizations.find((item) => item.name === E2E_ORGANIZATION) ?? (await admin.createOrganization(E2E_ORGANIZATION));
    const users = await admin.get<{ username: string }[]>('users/');
    const accounts: [Credentials, Role][] = [
      [env.orgAdmin, 'ORG_ADMIN'],
      [env.annotator, 'ANNOTATOR'],
    ];
    for (const [credentials, role] of accounts) {
      if (users.some((user) => user.username === credentials.username)) continue;
      await admin.createUser({ ...credentials, role, organizationId: organization.id });
      await completeFirstLogin(credentials);
    }
  } finally {
    await admin.dispose();
  }
});

for (const [role, credentials] of [
  ['admin', env.admin],
  ['orgadmin', env.orgAdmin],
  ['annotator', env.annotator],
] as const) {
  setup(`sign in as ${role}`, async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.signIn(credentials);
    await login.expectSignedIn();
    await page.context().storageState({ path: `e2e/auth/${role}.json` });
  });
}
