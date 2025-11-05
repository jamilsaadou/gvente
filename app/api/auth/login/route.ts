import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername, verifyPassword } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Nom d\'utilisateur et mot de passe requis' },
        { status: 400 }
      );
    }
    
    const user = await getUserByUsername(username);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Identifiants invalides' },
        { status: 401 }
      );
    }
    
    const isValid = await verifyPassword(password, user.password);
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Identifiants invalides' },
        { status: 401 }
      );
    }
    
    // Set session cookie
    const cookieStore = await cookies();
    // Only use secure cookies if explicitly enabled or on HTTPS
    const isSecure = process.env.USE_SECURE_COOKIES === 'true';
    cookieStore.set('userId', user.id.toString(), {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la connexion' },
      { status: 500 }
    );
  }
}
