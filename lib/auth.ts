import { compare, hash } from 'bcryptjs';
import { query, queryOne } from './database';
import { User } from './types';

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword);
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  return await queryOne('SELECT * FROM users WHERE username = ?', [username]) as User | undefined;
}

export async function getUserById(id: number): Promise<User | undefined> {
  return await queryOne('SELECT * FROM users WHERE id = ?', [id]) as User | undefined;
}

export async function getAllUsers(): Promise<User[]> {
  return await query('SELECT * FROM users ORDER BY created_at DESC') as User[];
}

export async function createUser(username: string, password: string, name: string, role: string): Promise<User> {
  const hashedPassword = await hashPassword(password);
  const result = await query(
    'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
    [username, hashedPassword, name, role]
  ) as any;
  
  return (await getUserById(result.insertId))!;
}

export async function updateUser(id: number, data: { username?: string; name?: string; role?: string }): Promise<User> {
  const updates: string[] = [];
  const values: any[] = [];
  
  if (data.username) {
    updates.push('username = ?');
    values.push(data.username);
  }
  if (data.name) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.role) {
    updates.push('role = ?');
    values.push(data.role);
  }
  
  values.push(id);
  
  await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
  
  return (await getUserById(id))!;
}

export async function updateUserPassword(id: number, newPassword: string): Promise<void> {
  const hashedPassword = await hashPassword(newPassword);
  await query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
}

export async function deleteUser(id: number): Promise<void> {
  await query('DELETE FROM users WHERE id = ?', [id]);
}
