import { randomBytes } from 'crypto';
import { config } from '../config';
import pool from '../database';
import { UserRepository } from '../repositories/user.repository';
import { userService } from '../services';

const MIN_PASSWORD_LENGTH = 12;

const demoPassword = (): string => config.demo.password || randomBytes(24).toString('base64url');

async function main(): Promise<void> {
  const { username, password, firstName, lastName } = config.demo;

  if (!username.trim()) {
    throw new Error('DEMO_USERNAME must not be blank.');
  }
  if (password && password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`DEMO_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  const name = username.trim();
  const users = new UserRepository();
  const existing = await users.findByUsername(name);

  if (existing) {
    if (existing.role !== 'customer') {
      await users.updateRole(existing.id, 'customer');
      console.log(`[seed:demo] Returned "${name}" (id ${existing.id}) to the customer role.`);
      return;
    }
    console.log(`[seed:demo] "${name}" (id ${existing.id}) is ready. Nothing to do.`);
    return;
  }

  const created = await userService.createUser({
    username: name,
    password: demoPassword(),
    firstName: firstName?.trim() || 'Demo',
    lastName: lastName?.trim() || 'Visitor',
  });
  console.log(`[seed:demo] Created demo account "${name}" (id ${created.id}).`);
}

main()
  .catch((err: Error) => {
    console.error(`[seed:demo] ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
