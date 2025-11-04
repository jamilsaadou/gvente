'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { ShoppingCart, Printer, CheckCircle, List, Search, BarChart3, XCircle, AlertCircle } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  weight: string;
  price: number;
}

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
  created_at: string;
}

export default function AgentPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'new' | 'list' | 'recap' | 'cancelled'>('new');
  
  // Form data
  const [buyerName, setBuyerName] = useState('');
  const [buyerFirstname, setBuyerFirstname] = useState('');
  const [buyerMatricule, setBuyerMatricule] = useState('');
  const [buyerGrade, setBuyerGrade] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<{ [key: number]: number }>({});
  const [receiptData, setReceiptData] = useState<any>(null);
  
  // Sales list data
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Cancellation
  const [cancellingReceipt, setCancellingReceipt] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelNote, setCancelNote] = useState('');
  
  // Cancelled receipts
  const [cancelledSales, setCancelledSales] = useState<Sale[]>([]);

  useEffect(() => {
    fetchUser();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (user) {
      if (activeTab === 'list' || activeTab === 'recap') {
        fetchMySales();
      } else if (activeTab === 'cancelled') {
        fetchCancelledSales();
      }
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredSales(sales);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = sales.filter(sale =>
        sale.buyer_name.toLowerCase().includes(term) ||
        sale.buyer_firstname.toLowerCase().includes(term) ||
        sale.buyer_matricule.toLowerCase().includes(term) ||
        sale.buyer_grade.toLowerCase().includes(term)
      );
      setFilteredSales(filtered);
    }
  }, [searchTerm, sales]);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
        return;
      }
      const data = await response.json();
      if (data.user.role !== 'agent') {
        router.push('/login');
        return;
      }
      setUser(data.user);
    } catch (error) {
      router.push('/login');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      setProducts(data.products);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMySales = async () => {
    try {
      const response = await fetch('/api/sales/my-sales');
      const data = await response.json();
      // Filter out cancelled sales
      const activeSales = data.sales.filter((s: Sale) => s.status !== 'cancelled');
      setSales(activeSales);
      setFilteredSales(activeSales);
    } catch (error) {
      console.error('Error fetching sales:', error);
    }
  };

  const fetchCancelledSales = async () => {
    try {
      const response = await fetch('/api/sales/my-sales');
      const data = await response.json();
      const cancelled = data.sales.filter((s: Sale) => s.status === 'cancelled');
      setCancelledSales(cancelled);
    } catch (error) {
      console.error('Error fetching cancelled sales:', error);
    }
  };

  const handleCancelClick = (receiptNumber: string) => {
    setCancellingReceipt(receiptNumber);
    setShowCancelModal(true);
    setCancelReason('');
    setCancelNote('');
  };

  const handleCancelSubmit = async () => {
    if (!cancelReason || !cancellingReceipt) return;
    
    try {
      const response = await fetch('/api/sales/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptNumber: cancellingReceipt,
          reason: cancelReason,
          note: cancelNote
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'annulation');
      }

      setShowCancelModal(false);
      setCancellingReceipt(null);
      fetchMySales();
      setError('');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'annulation');
      setShowCancelModal(false);
    }
  };

  const handleProductChange = (productId: number, checked: boolean) => {
    setSelectedProducts(prev => {
      if (!checked) {
        const newSelected = { ...prev };
        delete newSelected[productId];
        return newSelected;
      }
      return { ...prev, [productId]: 1 };
    });
  };

  const calculateTotal = () => {
    return Object.entries(selectedProducts).reduce((total, [productId, quantity]) => {
      const product = products.find(p => p.id === parseInt(productId));
      return total + (product ? product.price * quantity : 0);
    }, 0);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const items = Object.entries(selectedProducts).map(([productId, quantity]) => ({
        productId: parseInt(productId),
        quantity
      }));

      if (items.length === 0) {
        throw new Error('Veuillez sélectionner au moins un produit');
      }

      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerData: {
            name: buyerName,
            firstname: buyerFirstname,
            matricule: buyerMatricule,
            grade: buyerGrade
          },
          items
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création de la vente');
      }

      // Prepare receipt data
      const receiptItems = items.map(item => {
        const product = products.find(p => p.id === item.productId)!;
        return {
          product: `${product.name} ${product.weight}`,
          quantity: item.quantity,
          unitPrice: product.price,
          total: product.price * item.quantity
        };
      });

      setReceiptData({
        receiptNumber: data.sale.receipt_number,
        date: new Date().toLocaleDateString('fr-FR'),
        buyer: {
          name: buyerName,
          firstname: buyerFirstname,
          matricule: buyerMatricule,
          grade: buyerGrade
        },
        items: receiptItems,
        total: calculateTotal()
      });

      setSuccess(true);
      
      // Reset form
      setBuyerName('');
      setBuyerFirstname('');
      setBuyerMatricule('');
      setBuyerGrade('');
      setSelectedProducts({});
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création de la vente');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleNewSale = () => {
    setSuccess(false);
    setReceiptData(null);
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

  if (success && receiptData) {
    return (
      <>
        <Navbar user={user} />
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6 no-print">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Vente enregistrée avec succès!</h2>
              <p className="text-gray-600">Reçu prêt à imprimer</p>
            </div>

            {/* Receipt */}
            <div className="border-2 border-gray-300 rounded-lg p-8 mb-6 print-only">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">REÇU DE VENTE</h1>
                <p className="text-gray-600">N° {receiptData.receiptNumber}</p>
                <p className="text-gray-600">Date: {receiptData.date}</p>
              </div>

              <div className="mb-8">
                <h3 className="font-bold text-lg mb-4 border-b pb-2">INFORMATIONS DE L'ACHETEUR</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600">Nom:</p>
                    <p className="font-semibold">{receiptData.buyer.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Prénom:</p>
                    <p className="font-semibold">{receiptData.buyer.firstname}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Matricule:</p>
                    <p className="font-semibold">{receiptData.buyer.matricule}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Grade:</p>
                    <p className="font-semibold">{receiptData.buyer.grade}</p>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="font-bold text-lg mb-4 border-b pb-2">PRODUITS</h3>
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Produit</th>
                      <th className="text-center py-2">Qté</th>
                      <th className="text-right py-2">Prix Unit.</th>
                      <th className="text-right py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptData.items.map((item: any, index: number) => (
                      <tr key={index} className="border-b">
                        <td className="py-2">{item.product}</td>
                        <td className="text-center py-2">{item.quantity}</td>
                        <td className="text-right py-2">{item.unitPrice.toLocaleString()} FCFA</td>
                        <td className="text-right py-2">{item.total.toLocaleString()} FCFA</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold text-lg">
                      <td colSpan={3} className="text-right py-4">TOTAL:</td>
                      <td className="text-right py-4">{receiptData.total.toLocaleString()} FCFA</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="mt-12 pt-8 border-t text-center text-sm text-gray-600">
                <p>Merci de présenter ce reçu au point de contrôle</p>
                <p className="mt-2">Agent: {user.name}</p>
              </div>
            </div>

            <div className="flex gap-4 no-print">
              <button
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                <Printer className="w-5 h-5" />
                Imprimer le reçu
              </button>
              <button
                onClick={handleNewSale}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg transition-colors"
              >
                Nouvelle vente
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar user={user} />
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Espace Agent</h1>
          <p className="text-gray-600">Gérez vos ventes</p>
        </div>

        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('new')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'new'
                ? 'border-b-2 border-primary-500 text-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ShoppingCart className="w-5 h-5 inline mr-2" />
            Nouvelle vente
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'list'
                ? 'border-b-2 border-primary-500 text-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <List className="w-5 h-5 inline mr-2" />
            Mes ventes
          </button>
          <button
            onClick={() => setActiveTab('recap')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'recap'
                ? 'border-b-2 border-primary-500 text-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-5 h-5 inline mr-2" />
            Récapitulatif
          </button>
          <button
            onClick={() => setActiveTab('cancelled')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'cancelled'
                ? 'border-b-2 border-primary-500 text-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <XCircle className="w-5 h-5 inline mr-2" />
            Reçus annulés
          </button>
        </div>

        {error && activeTab !== 'new' && (
          <div className="mb-6 bg-red-50 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Annuler le reçu</h3>
                  <p className="text-sm text-gray-600">N° {cancellingReceipt}</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Raison d'annulation <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="">Sélectionner une raison</option>
                    <option value="stock_unavailable">Disponibilité de stock</option>
                    <option value="not_eligible">Non éligible</option>
                    <option value="other">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Note (optionnelle)
                  </label>
                  <textarea
                    value={cancelNote}
                    onChange={(e) => setCancelNote(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    rows={3}
                    placeholder="Précisez si nécessaire..."
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancellingReceipt(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCancelSubmit}
                  disabled={!cancelReason}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmer l'annulation
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'new' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Enregistrement de vente</h2>
                <p className="text-gray-600">Saisissez les informations de l'acheteur et sélectionnez les produits</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-bold text-lg mb-4">Informations de l'acheteur</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prénom <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={buyerFirstname}
                      onChange={(e) => setBuyerFirstname(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Numéro de matricule <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={buyerMatricule}
                      onChange={(e) => setBuyerMatricule(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Grade <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={buyerGrade}
                      onChange={(e) => setBuyerGrade(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    >
                      <option value="">Sélectionner un grade</option>
                      <option value="GP">GP</option>
                      <option value="Sous officier">Sous officier</option>
                      <option value="Officier">Officier</option>
                      <option value="Inspecteur">Inspecteur</option>
                      <option value="Commissaire">Commissaire</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-bold text-lg mb-4">Produits souhaités (quantité: 1 unité par produit)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {products.map(product => (
                    <label
                      key={product.id}
                      className={`flex items-center justify-between bg-white p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedProducts[product.id]
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-primary-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={!!selectedProducts[product.id]}
                          onChange={(e) => handleProductChange(product.id, e.target.checked)}
                          className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <div>
                          <p className="font-medium">{product.name} - {product.weight}</p>
                          <p className="text-sm text-gray-600">{product.price.toLocaleString()} FCFA</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-primary-50 p-6 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Montant total:</span>
                  <span className="text-2xl font-bold text-primary-600">{calculateTotal().toLocaleString()} FCFA</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || Object.keys(selectedProducts).length === 0}
                className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Enregistrement...' : 'Enregistrer la vente et générer le reçu'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'list' && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Mes ventes</h2>
                <span className="text-sm text-gray-600">{filteredSales.length} vente(s)</span>
              </div>
              
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Rechercher par nom, prénom, matricule ou grade..."
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Reçu</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acheteur</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matricule</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                        {searchTerm ? 'Aucune vente trouvée pour cette recherche' : 'Aucune vente enregistrée'}
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{sale.receipt_number}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{sale.buyer_firstname} {sale.buyer_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{sale.buyer_matricule}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{sale.buyer_grade}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold">{sale.total_amount.toLocaleString()} FCFA</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            sale.status === 'validated' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {sale.status === 'pending' ? 'En attente' :
                             sale.status === 'validated' ? 'Validé' : 'Annulé'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(sale.created_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {sale.status === 'pending' && (
                            <button
                              onClick={() => handleCancelClick(sale.receipt_number)}
                              className="text-red-600 hover:text-red-800 font-medium"
                            >
                              Annuler
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'recap' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total des ventes</p>
                    <p className="text-3xl font-bold text-gray-900">{sales.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <List className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">En attente</p>
                    <p className="text-3xl font-bold text-yellow-600">
                      {sales.filter(s => s.status === 'pending').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Validées</p>
                    <p className="text-3xl font-bold text-green-600">
                      {sales.filter(s => s.status === 'validated').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Montant total par statut</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg">
                  <span className="font-medium text-gray-900">En attente</span>
                  <span className="text-lg font-bold text-yellow-600">
                    {sales
                      .filter(s => s.status === 'pending')
                      .reduce((sum, s) => sum + s.total_amount, 0)
                      .toLocaleString()} FCFA
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                  <span className="font-medium text-gray-900">Validées</span>
                  <span className="text-lg font-bold text-green-600">
                    {sales
                      .filter(s => s.status === 'validated')
                      .reduce((sum, s) => sum + s.total_amount, 0)
                      .toLocaleString()} FCFA
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-100 rounded-lg border-t-2 border-gray-300">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-primary-600">
                    {sales.reduce((sum, s) => sum + s.total_amount, 0).toLocaleString()} FCFA
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cancelled' && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center gap-3 mb-2">
                <XCircle className="w-6 h-6 text-red-600" />
                <h2 className="text-xl font-bold">Reçus annulés</h2>
              </div>
              <p className="text-sm text-gray-600">{cancelledSales.length} reçu(s) annulé(s)</p>
            </div>

            {cancelledSales.length === 0 ? (
              <div className="p-12 text-center">
                <XCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun reçu annulé</h3>
                <p className="text-gray-600">Vous n'avez aucun reçu annulé</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Reçu</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acheteur</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matricule</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date création</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date annulation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {cancelledSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-red-600">{sale.receipt_number}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{sale.buyer_firstname} {sale.buyer_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{sale.buyer_matricule}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold">{sale.total_amount.toLocaleString()} FCFA</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(sale.created_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {sale.created_at ? new Date(sale.created_at).toLocaleDateString('fr-FR') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
