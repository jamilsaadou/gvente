'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Search, CheckCircle, Clock, List } from 'lucide-react';

interface User {
  id: number;
  name: string;
  role: string;
}

interface Sale {
  id: number;
  receipt_number: string;
  buyer_name: string;
  buyer_firstname: string;
  buyer_matricule: string;
  buyer_grade: string;
  total_amount: number;
  status: string;
  agent_name: string;
  created_at: string;
  items?: any[];
}

export default function ControllerPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'search'>('list');
  
  // List data
  const [pendingSales, setPendingSales] = useState<Sale[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  
  // Search data
  const [searchMatricule, setSearchMatricule] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Sale[]>([]);
  
  // Validation
  const [validating, setValidating] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user && activeTab === 'list') {
      fetchPendingSales();
    }
  }, [user, activeTab]);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
        return;
      }
      const data = await response.json();
      if (data.user.role !== 'controller') {
        router.push('/login');
        return;
      }
      setUser(data.user);
    } catch (error) {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingSales = async () => {
    setLoadingSales(true);
    try {
      const response = await fetch('/api/sales?status=pending');
      const data = await response.json();
      setPendingSales(data.sales || []);
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setLoadingSales(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSearchResults([]);
    setSearching(true);

    try {
      const response = await fetch(`/api/sales?matricule=${searchMatricule}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la recherche');
      }

      const results = data.sales.filter((s: Sale) => 
        s.buyer_matricule.toLowerCase().includes(searchMatricule.toLowerCase())
      );

      if (results.length === 0) {
        setError('Aucune vente trouvée pour ce matricule');
      } else {
        setSearchResults(results);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la recherche');
    } finally {
      setSearching(false);
    }
  };

  const handleValidate = async (sale: Sale) => {
    setValidating(sale.id);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/sales/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptNumber: sale.receipt_number })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la validation');
      }

      setSuccess(`Vente ${sale.receipt_number} validée avec succès!`);
      
      // Refresh lists
      if (activeTab === 'list') {
        fetchPendingSales();
      } else {
        handleSearch(new Event('submit') as any);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la validation');
    } finally {
      setValidating(null);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  const SaleCard = ({ sale }: { sale: Sale }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm text-gray-600 mb-1">N° Reçu</p>
          <p className="font-mono font-semibold text-primary-600">{sale.receipt_number}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          sale.status === 'validated' ? 'bg-green-100 text-green-800' :
          'bg-red-100 text-red-800'
        }`}>
          {sale.status === 'pending' ? 'En attente' :
           sale.status === 'validated' ? 'Validé' : 'Annulé'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-xs text-gray-600">Acheteur</p>
          <p className="font-medium text-sm">{sale.buyer_firstname} {sale.buyer_name}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Matricule</p>
          <p className="font-medium text-sm">{sale.buyer_matricule}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Grade</p>
          <p className="font-medium text-sm">{sale.buyer_grade}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Montant</p>
          <p className="font-semibold text-sm text-primary-600">{sale.total_amount.toLocaleString()} FCFA</p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Agent</p>
          <p className="font-medium text-sm">{sale.agent_name}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Date</p>
          <p className="font-medium text-sm">{new Date(sale.created_at).toLocaleDateString('fr-FR')}</p>
        </div>
      </div>

      {sale.status === 'pending' && (
        <button
          onClick={() => handleValidate(sale)}
          disabled={validating === sale.id}
          className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          <CheckCircle className="w-4 h-4" />
          {validating === sale.id ? 'Validation...' : 'Valider'}
        </button>
      )}

      {sale.status === 'validated' && (
        <div className="bg-green-50 border border-green-200 p-3 rounded-lg text-center">
          <p className="text-green-800 text-sm font-medium">✓ Validé</p>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Navbar user={user} />
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Point de contrôle</h1>
          <p className="text-gray-600">Vérifiez et validez les reçus de vente</p>
        </div>

        {(success || error) && (
          <div className={`mb-6 px-4 py-3 rounded-lg ${
            success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {success || error}
          </div>
        )}

        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'list'
                ? 'border-b-2 border-primary-500 text-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <List className="w-5 h-5 inline mr-2" />
            Ventes en attente
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'search'
                ? 'border-b-2 border-primary-500 text-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Search className="w-5 h-5 inline mr-2" />
            Recherche par matricule
          </button>
        </div>

        {activeTab === 'list' && (
          <div>
            {loadingSales ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">Chargement...</p>
              </div>
            ) : pendingSales.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune vente en attente</h3>
                <p className="text-gray-600">Toutes les ventes ont été validées</p>
              </div>
            ) : (
              <div>
                <div className="mb-4 flex justify-between items-center">
                  <p className="text-gray-600">{pendingSales.length} vente(s) en attente</p>
                  <button
                    onClick={fetchPendingSales}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    Actualiser
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingSales.map((sale) => (
                    <SaleCard key={sale.id} sale={sale} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'search' && (
          <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <form onSubmit={handleSearch} className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro de matricule
                  </label>
                  <input
                    type="text"
                    value={searchMatricule}
                    onChange={(e) => setSearchMatricule(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Entrez le matricule de l'acheteur"
                    required
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={searching}
                    className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {searching ? 'Recherche...' : 'Rechercher'}
                  </button>
                </div>
              </form>
            </div>

            {searchResults.length > 0 && (
              <div>
                <div className="mb-4">
                  <p className="text-gray-600">{searchResults.length} résultat(s) trouvé(s)</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.map((sale) => (
                    <SaleCard key={sale.id} sale={sale} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
