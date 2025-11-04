import { compare, hash } from 'bcryptjs';
import db from './database';
import { User } from './types';

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword);
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

export function getUserByUsername(username: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;
}

export function getUserById(id: number): User | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
}

export function getAllUsers(): User[] {
  return db.prepare('SELECT * FROM users ORDER BY created_at DESC').all() as User[];
}

export async function createUser(username: string, password: string, name: string, role: string): Promise<User> {
  const hashedPassword = await hashPassword(password);
  const result = db.prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)').run(
    username,
    hashedPassword,
    name,
    role
  );
  
  return getUserById(result.lastInsertRowid as number)!;
}

export function updateUser(id: number, data: { username?: string; name?: string; role?: string }): User {
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
  
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  
  return getUserById(id)!;
}

export async function updateUserPassword(id: number, newPassword: string): Promise<void> {
  const hashedPassword = await hashPassword(newPassword);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, id);
}

export function deleteUser(id: number): void {
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}
