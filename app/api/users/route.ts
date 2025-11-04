import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById, getAllUsers, createUser } from '@/lib/auth';

async function checkAuth(requiredRole: 'admin' | 'agent' | 'controller' = 'admin') {
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;
  
  if (!userId) {
    return null;
  }
  
  const user = getUserById(parseInt(userId));
  
  if (!user || user.role !== requiredRole) {
    return null;
  }
  
  return user;
}

export async function GET() {
  try {
    const user = await checkAuth('admin');
    
    if (!user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      );
    }
    
    const users = getAllUsers();
    
    return NextResponse.json({
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        name: u.name,
        role: u.role,
        created_at: u.created_at
      }))
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des utilisateurs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await checkAuth('admin');
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      );
    }
    
    const { username, password, name, role } = await request.json();
    
    if (!username || !password || !name || !role) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }
    
    const user = await createUser(username, password, name, role);
    
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        created_at: user.created_at
      }
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    
    if (error.message?.includes('UNIQUE')) {
      return NextResponse.json(
        { error: 'Ce nom d\'utilisateur existe déjà' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'utilisateur' },
      { status: 500 }
    );
  }
}
