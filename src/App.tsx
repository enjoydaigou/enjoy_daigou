import React, { useState } from 'react';
import { Customer, Order, OrderItem, Currency, PaymentRecord, PaymentStage, SystemSettings, CatalogProduct, OrderStatus, StaffUser, WishRequest } from './types';
import {
  getStoredSettings,
  saveStoredSettings,
  getStoredCustomers,
  saveStoredCustomers,
  getStoredOrders,
  saveStoredOrders,
  getStoredPayments,
  saveStoredPayments,
  getStoredCatalog,
  saveStoredCatalog,
  getStoredStaffUsers,
  getStoredCurrentAdmin,
  saveStoredCurrentAdmin,
  getStoredWishRequests,
  saveStoredWishRequests,
} from './utils/storage';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { OverviewView } from './components/views/OverviewView';
import { CatalogView } from './components/views/CatalogView';
import { QuotingView } from './components/views/QuotingView';
import { OrdersView } from './components/views/OrdersView';
import { ProcurementView } from './components/views/ProcurementView';
import { ReconciliationView } from './components/views/ReconciliationView';
import { CustomersView } from './components/views/CustomersView';
import { SettingsView } from './components/views/SettingsView';
import { StorefrontView } from './components/storefront/StorefrontView';
import { AdminLoginView } from './components/auth/AdminLoginView';
import { LayoutDashboard, ShoppingBag, Boxes, CreditCard, Menu } from 'lucide-react';

// 內建 WishesView 組件避免缺檔報錯
const WishesView = ({ wishRequests }: any) => (
  <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
    <h2 className="text-xl font-bold mb-4">顧客許願清單</h2>
    {wishRequests && wishRequests.length > 0 ? (
      <div className="space-y-3">
        {wishRequests.map((w: any) => (
          <div key={w.id} className="p-4 border rounded-lg flex justify-between items-center">
            <div>
              <div className="font-semibold">{w.productName}</div>
              <div className="text-sm text-slate-500">{w.specNote || '無備註'}</div>
            </div>
            <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-medium">
              {w.status || '處理中'}
            </span>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-slate-500">目前尚無許願委託。</p>
    )}
  </div>
);

export default function App() {
  // 預設進入顧客前台商城；若網址帶有 ?mode=admin 則進入管理員後台
  const [viewMode, setViewMode] = useState<'admin' | 'storefront'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'admin') {
        return 'admin';
      }
    }
    return 'storefront';
  });

  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [settings, setSettings] = useState<SystemSettings>(() => getStoredSettings?.() ?? ({} as any));
  const [customers, setCustomers] = useState<Customer[]>(() => getStoredCustomers?.() ?? []);
  const [orders, setOrders] = useState<Order[]>(() => getStoredOrders?.() ?? []);
  const [payments, setPayments] = useState<PaymentRecord[]>(() => getStoredPayments?.() ?? []);
  const [catalog, setCatalog] = useState<CatalogProduct[]>(() => getStoredCatalog?.() ?? []);
  const [wishRequests, setWishRequests] = useState<WishRequest[]>(() => getStoredWishRequests?.() ?? []);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>(() => getStoredStaffUsers?.() ?? []);
  const [currentAdmin, setCurrentAdmin] = useState<StaffUser | null>(() => getStoredCurrentAdmin?.() ?? null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [reconcileFilterOrderNo, setReconcileFilterOrderNo] = useState<string>('');
  const [preselectedProduct, setPreselectedProduct] = useState<CatalogProduct | null>(null);
  const [preselectedItems, setPreselectedItems] = useState<OrderItem[] | null>(null);

  // Reload data from storage
  const reloadAllData = () => {
    if (getStoredSettings) setSettings(getStoredSettings());
    if (getStoredCustomers) setCustomers(getStoredCustomers());
    if (getStoredOrders) setOrders(getStoredOrders());
    if (getStoredPayments) setPayments(getStoredPayments());
    if (getStoredCatalog) setCatalog(getStoredCatalog());
    if (getStoredWishRequests) setWishRequests(getStoredWishRequests());
    if (getStoredStaffUsers) setStaffUsers(getStoredStaffUsers());
    if (getStoredCurrentAdmin) setCurrentAdmin(getStoredCurrentAdmin());
  };

  // Badge counts
  const pendingReconcileCount = (payments || []).filter((p) => p.status === 'pending').length;
  const pendingPurchaseCount = (orders || [])
    .filter(
      (o) =>
        o.status === 'purchasing' ||
        (o.status === 'pending_deposit' && o.depositPaymentStatus === 'paid')
    )
    .flatMap((o) => o.items || [])
    .filter((i) => i.purchaseStatus === 'pending')
    .reduce((sum, i) => sum + (i.quantity || 1), 0);
  const arrivedPendingBalanceCount = (orders || []).filter(
    (o) => o.status === 'arrived_tw' || o.status === 'pending_balance'
  ).length;

  const pendingWishCount = (wishRequests || []).filter((w) => w.status === 'pending').length;

  // Handlers for Catalog
  const handleSaveProduct = (product: CatalogProduct) => {
    const exists = catalog.some((p) => p.id === product.id);
    let updated: CatalogProduct[];
    if (exists) {
      updated = catalog.map((p) => (p.id === product.id ? product : p));
    } else {
      updated = [product, ...catalog];
    }
    setCatalog(updated);
    saveStoredCatalog(updated);
  };

  const handleDeleteProduct = (productId: string) => {
    const updated = catalog.filter((p) => p.id !== productId);
    setCatalog(updated);
    saveStoredCatalog(updated);
  };

  const handleQuickOrderWithItems = (items: OrderItem[], country: Currency) => {
    setPreselectedItems(items);
    setActiveTab('quoting');
  };

  // Wish Requests Handlers
  const handleSaveWish = (newWish: WishRequest) => {
    const updated = [newWish, ...wishRequests];
    setWishRequests(updated);
    saveStoredWishRequests(updated);
  };

const handleUpdateWish = (updatedWish: WishRequest) => {
  const updated = wishRequests.map((w) => (w.id === updatedWish.id ? updatedWish : w));
  setWishRequests(updated);
  saveStoredWishRequests(updated);
};

  const handleConvertToQuoteFromWish = (wish: WishRequest, quotedPriceTwd: number) => {
    const item: OrderItem = {
      id: `item-wish-${Date.now()}`,
      name: wish.productName,
      category: '許願代購',
      country: wish.country,
      sourceStore: '專櫃/官網採購',
      originalPrice: 0,
      exchangeRate: 1,
      serviceFeeTwd: Math.round(quotedPriceTwd * 0.1),
      unitPriceTwd: quotedPriceTwd,
      quantity: 1,
      subtotalTwd: quotedPriceTwd,
      spec: wish.specNote,
      imageUrl: wish.imageUrl,
      purchaseStatus: 'pending',
    };
    setPreselectedItems([item]);
    setActiveTab('quoting');
  };

  const handleConvertToCatalogFromWish = (wish: WishRequest, priceTwd: number) => {
    const newProduct: CatalogProduct = {
      id: `prod-${Date.now()}`,
      name: wish.productName,
      sku: `WISH-${Math.floor(Math.random() * 8999 + 1000)}`,
      category: '許願熱銷',
      country: wish.country,
      sourceStore: '連線採購',
      suggestedPriceTwd: priceTwd,
      originalPrice: priceTwd,
      isSecondStageFreight: false,
      description: wish.specNote || '顧客許願熱銷商品',
      imageUrl: wish.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
      status: 'active',
      subItems: [
        {
          id: `sub-${Date.now()}`,
          name: '標準規格',
          suggestedPriceTwd: priceTwd,
          originalPrice: priceTwd,
          stockQty: 0,
          isSecondStageFreight: false,
          imageUrl: wish.imageUrl,
          specOptions: ['預設色號/尺寸'],
        },
      ],
      createdAt: new Date().toISOString(),
    };
    handleSaveProduct(newProduct);
    setActiveTab('catalog');
  };

  // Handlers for Orders & Payments
  const handleSaveOrder = (newOrder: Order, newCustomer?: Customer) => {
    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    saveStoredOrders(updatedOrders);

    if (newCustomer) {
      const existingIndex = customers.findIndex(
        (c) => c.id === newCustomer.id || c.phone === newCustomer.phone
      );
      let updatedCustomers: Customer[];
      if (existingIndex >= 0) {
        updatedCustomers = [...customers];
        const existing = updatedCustomers[existingIndex];
        updatedCustomers[existingIndex] = {
          ...existing,
          ...newCustomer,
          password: newCustomer.password || existing.password || 'password123',
          ordersCount: (existing.ordersCount || 0) + 1,
          totalSpentTwd: (existing.totalSpentTwd || 0) + (newOrder.itemsTotalTwd || 0),
        };
      } else {
        updatedCustomers = [newCustomer, ...customers];
      }
      setCustomers(updatedCustomers);
      saveStoredCustomers(updatedCustomers);
    } else {
      const updatedCustomers = customers.map((c) =>
        c.id === newOrder.customerId
          ? {
              ...c,
              ordersCount: (c.ordersCount || 0) + 1,
              totalSpentTwd: (c.totalSpentTwd || 0) + (newOrder.itemsTotalTwd || 0),
            }
          : c
      );
      setCustomers(updatedCustomers);
      saveStoredCustomers(updatedCustomers);
    }
  };

  const handleUpdateOrder = (updated: Order) => {
    const updatedOrders = orders.map((o) => (o.id === updated.id ? updated : o));
    setOrders(updatedOrders);
    saveStoredOrders(updatedOrders);
  };

  const handleVerifyPayment = (
    paymentId: string,
    orderId: string,
    stage: PaymentStage,
    amount: number
  ) => {
    const updatedPayments = payments.map((p) =>
      p.id === paymentId
        ? {
            ...p,
            status: 'verified' as const,
            verifiedAt: new Date().toISOString(),
            verifier: '系統管理員',
          }
        : p
    );
    setPayments(updatedPayments);
    saveStoredPayments(updatedPayments);

    const updatedOrders = orders.map((ord) => {
      if (ord.id !== orderId) return ord;

      if (stage === 'deposit') {
        const newPaid = (ord.depositPaidTwd || 0) + amount;
        return {
          ...ord,
          depositPaidTwd: newPaid,
          depositPaymentStatus: 'paid' as const,
          status: ord.status === 'pending_deposit' ? ('purchasing' as const) : ord.status,
        };
      } else {
        const newPaid = (ord.balancePaidTwd || 0) + amount;
        return {
          ...ord,
          balancePaidTwd: newPaid,
          balancePaymentStatus: 'paid' as const,
        };
      }
    });
    setOrders(updatedOrders);
    saveStoredOrders(updatedOrders);

    if (selectedOrder && selectedOrder.id === orderId) {
      const refreshed = updatedOrders.find((o) => o.id === orderId);
      if (refreshed) setSelectedOrder(refreshed);
    }
  };

  const handleRejectPayment = (paymentId: string, reason: string) => {
    const updatedPayments = payments.map((p) =>
      p.id === paymentId
        ? {
            ...p,
            status: 'rejected' as const,
            notes: `駁回原因: ${reason}`,
          }
        : p
    );
    setPayments(updatedPayments);
    saveStoredPayments(updatedPayments);
  };

  const handleManualRecordPayment = (
    payload: Omit<PaymentRecord, 'id' | 'paymentNo' | 'createdAt'>
  ) => {
    const newRecord: PaymentRecord = {
      ...payload,
      id: `pay-${Date.now()}`,
      paymentNo: `PAY-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(
        Math.random() * 90 + 10
      )}`,
      createdAt: new Date().toISOString(),
    };

    const updatedPayments = [newRecord, ...payments];
    setPayments(updatedPayments);
    saveStoredPayments(updatedPayments);

    handleVerifyPayment(newRecord.id, payload.orderId, payload.stage, payload.amount);
  };

  const handleUpdateOrderItemStatus = (
    orderId: string,
    itemId: string,
    newStatus: 'pending' | 'purchased' | 'out_of_stock',
    actualCost?: number,
    note?: string,
    buyerDetails?: {
      assignedPurchaserName?: string;
      purchaserPricingType?: 'self' | 'commission_fixed' | 'commission_percent' | 'flat_cost';
      purchaserCommissionTwd?: number;
      actualPurchaseCostTwd?: number;
    }
  ) => {
    const updatedOrders = orders.map((o) => {
      if (o.id !== orderId) return o;
      const updatedItems = o.items.map((it) => {
        if (it.id !== itemId) return it;
        return {
          ...it,
          purchaseStatus: newStatus,
          actualPurchaseCostOriginal: actualCost ?? it.actualPurchaseCostOriginal,
          purchaseNote: note ?? it.purchaseNote,
          assignedPurchaserName: buyerDetails?.assignedPurchaserName ?? it.assignedPurchaserName,
          purchaserPricingType: buyerDetails?.purchaserPricingType ?? it.purchaserPricingType,
          purchaserCommissionTwd: buyerDetails?.purchaserCommissionTwd ?? it.purchaserCommissionTwd,
          actualPurchaseCostTwd: buyerDetails?.actualPurchaseCostTwd ?? it.actualPurchaseCostTwd,
        };
      });

      const allOutOfStock = updatedItems.length > 0 && updatedItems.every((it) => it.purchaseStatus === 'out_of_stock');
      if (allOutOfStock && newStatus === 'out_of_stock') {
        return {
          ...o,
          items: updatedItems,
          status: 'out_of_stock' as OrderStatus,
          isOutOfStock: true,
          outOfStockReason: note || '買手回報專櫃/官網已售罄斷貨',
          outOfStockNotifiedAt: new Date().toISOString(),
          refundStatus: (o.depositPaidTwd || 0) > 0 ? ('pending_info' as const) : ('none' as const),
          refundAmountTwd: o.depositPaidTwd || 0,
        };
      }

      return { ...o, items: updatedItems };
    });

    setOrders(updatedOrders);
    saveStoredOrders(updatedOrders);
  };

  const handleSaveCustomer = (customer: Customer) => {
    const exists = customers.some((c) => c.id === customer.id);
