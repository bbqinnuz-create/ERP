import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthError, bootstrapAdmin, createUser, ensureConfiguredAdmin, login, resetAdminPassword, setUserPermissions, updateUser, withAuthorizedUser } from '../src/modules/auth/service';
import { addUser, makeEnv, type TestEnv } from './helpers';

let env: TestEnv;
let adminId: string;
const adminLogin = 'owner';
const adminPassword = 'correct horse battery';
const start = Date.UTC(2026, 10, 12, 10, 0, 0);

beforeEach(async () => {
  env = makeEnv();
  const admin = await bootstrapAdmin(env.db, {
    login: adminLogin,
    password: adminPassword,
    fullName: 'Owner',
    role: 'admin',
    lang: 'ru',
  });
  adminId = admin.id;
});

afterEach(() => env.cleanup());

describe('пользователи и сессии', () => {
  it('хранит Argon2id-хэш и выдаёт токен, в БД остаётся только его SHA-256', async () => {
    const result = await login(env.db, adminLogin, adminPassword, start);
    const user = env.db.prepare('SELECT password_hash FROM users WHERE id = ?').get(adminId) as { password_hash: string };
    const session = env.db.prepare('SELECT token_hash FROM sessions WHERE user_id = ?').get(adminId) as { token_hash: string };

    expect(user.password_hash).toMatch(/^\$argon2id\$/);
    expect(result.token).not.toBe(session.token_hash);
    expect(session.token_hash).toBe(createHash('sha256').update(result.token).digest('hex'));
  });

  it('новый вход отзывает старую сессию и лишает старый токен доступа', async () => {
    const first = await login(env.db, adminLogin, adminPassword, start);
    const second = await login(env.db, adminLogin, adminPassword, start + 1000);
    expect(() => withAuthorizedUser(env.db, first.token, null, (session) => session.user, start + 2000))
      .toThrowError(new AuthError(401, 'auth.session_replaced'));
    expect(withAuthorizedUser(env.db, second.token, null, (session) => session.user.login, start + 2000)).toBe(adminLogin);
    const revoked = env.db.prepare('SELECT revoke_reason FROM sessions WHERE token_hash = ?')
      .get(createHash('sha256').update(first.token).digest('hex')) as { revoke_reason: string };
    expect(revoked.revoke_reason).toBe('login_elsewhere');
  });

  it('проверяет абсолютные 12 часов независимо от активности', async () => {
    const { token } = await login(env.db, adminLogin, adminPassword, start);
    for (let hour = 1; hour <= 11; hour += 1) {
      expect(withAuthorizedUser(env.db, token, null, () => true, start + hour * 60 * 60 * 1000)).toBe(true);
    }
    expect(() => withAuthorizedUser(env.db, token, null, () => true, start + 12 * 60 * 60 * 1000))
      .toThrowError(new AuthError(401, 'auth.session_expired'));
    const revoked = env.db.prepare('SELECT revoked_at, revoke_reason FROM sessions WHERE token_hash = ?')
      .get(createHash('sha256').update(token).digest('hex')) as { revoked_at: string | null; revoke_reason: string | null };
    expect(revoked).toMatchObject({ revoke_reason: 'expired' });
    expect(revoked.revoked_at).not.toBeNull();
  });

  it('завершает сессию через 2 часа бездействия', async () => {
    const { token } = await login(env.db, adminLogin, adminPassword, start);
    const activeAt = start + 60 * 60 * 1000;
    expect(withAuthorizedUser(env.db, token, null, () => true, activeAt)).toBe(true);
    expect(() => withAuthorizedUser(env.db, token, null, () => true, activeAt + 2 * 60 * 60 * 1000))
      .toThrowError(new AuthError(401, 'auth.session_expired'));
  });

  it('проверка статуса не продлевает сессию бездействием', async () => {
    const { token } = await login(env.db, adminLogin, adminPassword, start);
    const idleAt = start + 60 * 60 * 1000;
    expect(withAuthorizedUser(env.db, token, null, () => true, idleAt, false)).toBe(true);
    const session = env.db.prepare('SELECT last_activity_at FROM sessions WHERE user_id = ?')
      .get(adminId) as { last_activity_at: string };
    expect(session.last_activity_at).toBe(new Date(start).toISOString());
    expect(() => withAuthorizedUser(env.db, token, null, () => true, start + 2 * 60 * 60 * 1000, false))
      .toThrowError(new AuthError(401, 'auth.session_expired'));
  });

  it('аудирует неудачный вход без записи пароля', async () => {
    await expect(login(env.db, adminLogin, 'wrong password', start)).rejects.toMatchObject({
      status: 401,
      errorKey: 'auth.invalid_credentials',
    });
    const entry = env.db.prepare("SELECT after_json FROM audit_log WHERE action = 'auth.login_failed'").get() as
      | { after_json: string }
      | undefined;
    expect(entry).toBeDefined();
    expect(entry!.after_json).toContain(adminLogin);
    expect(entry!.after_json).not.toContain('wrong password');
  });

  it('кассир получает только выданные права, запрет действует и на серверной проверке', async () => {
    const cashier = await createUser(env.db, adminId, {
      login: 'cashier1',
      password: 'cashier password',
      fullName: 'Cashier',
      role: 'cashier',
      lang: 'uz',
    });
    setUserPermissions(env.db, adminId, cashier.id, { sell: 1, discount_check_limit_bp: 500 });
    const { token, user } = await login(env.db, 'CASHIER1', 'cashier password', start);

    const audit = env.db.prepare("SELECT before_json, after_json FROM audit_log WHERE action = 'user.permissions_changed'")
      .get() as { before_json: string; after_json: string };
    expect(JSON.parse(audit.before_json)).toMatchObject({ sell: 0 });
    expect(JSON.parse(audit.after_json)).toMatchObject({ sell: 1, discount_check_limit_bp: 500 });
    expect(user.permissions.sell).toBe(1);
    expect(user.permissions.users_manage).toBe(0);
    expect(user.permissions.discount_check_limit_bp).toBe(500);
    expect(() => withAuthorizedUser(env.db, token, 'users_manage', () => true, start + 1000))
      .toThrowError(new AuthError(403, 'auth.permission_denied'));
    expect(withAuthorizedUser(env.db, token, 'sell', () => true, start + 1000)).toBe(true);
  });

  it('неактивный пользователь не может войти, его текущая сессия отзывается', async () => {
    const cashier = await createUser(env.db, adminId, {
      login: 'cashier2',
      password: 'cashier password',
      fullName: 'Cashier',
      role: 'cashier',
      lang: 'ru',
    });
    const { token } = await login(env.db, 'cashier2', 'cashier password', start);
    await updateUser(env.db, adminId, cashier.id, { active: false });

    expect(() => withAuthorizedUser(env.db, token, null, () => true, start + 1000))
      .toThrowError(new AuthError(401, 'auth.session_expired'));
    await expect(login(env.db, 'cashier2', 'cashier password', start + 2000)).rejects.toMatchObject({
      status: 401,
      errorKey: 'auth.invalid_credentials',
    });
  });

  it('деактивация отзывает сессии, а последнего администратора нельзя отключить', async () => {
    const { token } = await login(env.db, adminLogin, adminPassword, start);
    await expect(updateUser(env.db, adminId, adminId, { active: false })).rejects.toMatchObject({
      status: 409,
      errorKey: 'users.last_admin',
    });
    await expect(updateUser(env.db, adminId, adminId, { password: 'new secure password' })).resolves.toMatchObject({
      id: adminId,
    });
    expect(() => withAuthorizedUser(env.db, token, null, () => true, start + 1000))
      .toThrowError(new AuthError(401, 'auth.session_expired'));
  });

  it('создание начального администратора разрешено только один раз', async () => {
    await expect(bootstrapAdmin(env.db, {
      login: 'another',
      password: 'another secure password',
      fullName: 'Another',
      role: 'admin',
      lang: 'ru',
    })).rejects.toMatchObject({ errorKey: 'users.bootstrap_already_used' });
  });

  it('создаёт настроенного администратора один раз, даже если в базе уже есть другие пользователи', async () => {
    const configuredEnv = makeEnv();
    try {
      addUser(configuredEnv.db, 'existing-cashier');
      await expect(ensureConfiguredAdmin(configuredEnv.db, { login: 'admin', password: '12345' })).resolves.toBe(true);
      await expect(ensureConfiguredAdmin(configuredEnv.db, { login: 'admin', password: 'different5' })).resolves.toBe(false);
      await expect(login(configuredEnv.db, 'admin', '12345', start)).resolves.toMatchObject({
        user: { login: 'admin', role: 'admin' },
      });
      expect(configuredEnv.db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'").get())
        .toMatchObject({ count: 1 });
    } finally {
      configuredEnv.cleanup();
    }
  });

  it('принимает пароль из пяти символов и отклоняет пароль короче', async () => {
    await expect(createUser(env.db, adminId, {
      login: 'shortpass',
      password: '1234',
      fullName: 'Short Password',
      role: 'cashier',
      lang: 'ru',
    })).rejects.toMatchObject({ errorKey: 'validation.invalid_password' });

    await expect(createUser(env.db, adminId, {
      login: 'fivechars',
      password: '12345',
      fullName: 'Five Characters',
      role: 'cashier',
      lang: 'ru',
    })).resolves.toMatchObject({ login: 'fivechars' });
  });

  it('сбрасывает пароль только активному администратору и отзывает его сессии', async () => {
    const { token } = await login(env.db, adminLogin, adminPassword, start);
    await resetAdminPassword(env.db, adminLogin.toUpperCase(), 'newpass5');

    expect(() => withAuthorizedUser(env.db, token, null, () => true, start + 1000))
      .toThrowError(new AuthError(401, 'auth.session_expired'));
    await expect(login(env.db, adminLogin, adminPassword, start + 2000)).rejects.toMatchObject({
      errorKey: 'auth.invalid_credentials',
    });
    await expect(login(env.db, adminLogin, 'newpass5', start + 3000)).resolves.toMatchObject({
      user: { login: adminLogin, role: 'admin' },
    });
    const audit = env.db.prepare("SELECT after_json FROM audit_log WHERE action = 'user.password_changed'").get() as
      | { after_json: string }
      | undefined;
    expect(audit).toBeDefined();
    expect(audit!.after_json).not.toContain('newpass5');
  });

  it('не допускает дубли логина без учёта регистра', async () => {
    await createUser(env.db, adminId, {
      login: 'cashier1',
      password: 'cashier secure password',
      fullName: 'Cashier',
      role: 'cashier',
      lang: 'ru',
    });
    await expect(createUser(env.db, adminId, {
      login: 'CASHIER1',
      password: 'another secure password',
      fullName: 'Another',
      role: 'cashier',
      lang: 'ru',
    })).rejects.toMatchObject({ status: 409, errorKey: 'users.login_taken' });
  });
});
