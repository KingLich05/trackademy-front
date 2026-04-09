'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { AuthenticatedApiService } from '../../services/AuthenticatedApiService';
import { ExportApiService } from '../../services/ExportApiService';
import { ExportMarketModal, ExportMarketParams } from '../../components/ExportMarketModal';
import { Group, GroupsResponse } from '../../types/Group';
import {
  CoinAccountDetailedDto,
  CoinAccountDto,
  MarketItemDto,
  PurchaseDto,
  RewardRuleDto,
  MarketItemType,
  PurchaseStatus,
  CoinTransactionType,
  RewardEventType,
} from '../../types/Market';
import { BaseModal } from '../../components/ui/BaseModal';
import {
  ShoppingBagIcon,
  WalletIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon,
  GiftIcon,
  StarIcon,
  AdjustmentsHorizontalIcon,
  CogIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function txColor(type: CoinTransactionType) {
  switch (type) {
    case CoinTransactionType.Reward: return 'text-green-600 dark:text-green-400';
    case CoinTransactionType.Purchase: return 'text-red-500 dark:text-red-400';
    case CoinTransactionType.AdminAdjustment: return 'text-blue-600 dark:text-blue-400';
    case CoinTransactionType.Refund: return 'text-emerald-600 dark:text-emerald-400';
    default: return 'text-gray-600 dark:text-gray-400';
  }
}

function StatusBadge({ status }: { status: PurchaseStatus }) {
  if (status === PurchaseStatus.Pending)
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Ожидает</span>;
  if (status === PurchaseStatus.Fulfilled)
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Выполнена</span>;
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Отменена</span>;
}

function eventLabel(t: RewardEventType) {
  switch (t) {
    case RewardEventType.AttendanceMarked: return 'Посещение урока';
    case RewardEventType.ScoreReceived: return 'Получение оценки';
    case RewardEventType.SubmissionCompleted: return 'Сдача задания';
    case RewardEventType.BonusManual: return 'Ручное начисление';
    case RewardEventType.Late: return 'Опоздание';
    default: return 'Неизвестно';
  }
}

const defaultItemForm = {
  name: '', description: '', price: '' as string | number,
  itemType: MarketItemType.Virtual as MarketItemType,
  imageUrl: '', stockQuantity: '', maxPerStudent: '', isActive: true,
};

const defaultRuleForm = {
  name: '', eventType: RewardEventType.AttendanceMarked as RewardEventType,
  coinAmount: '' as string | number, minScore: '', isActive: true,
};

// ─── page ────────────────────────────────────────────────────────────────────

export default function MarketPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  const router = useRouter();

  const isAdmin = user?.role === 'Administrator' || user?.role === 'Owner';
  const orgId: string = user?.organizationId
    || (typeof window !== 'undefined' ? localStorage.getItem('userOrganizationId') ?? '' : '')
    || '';

  const [activeTab, setActiveTab] = useState('shop');

  // data
  const [items, setItems] = useState<MarketItemDto[]>([]);
  const [myAccount, setMyAccount] = useState<CoinAccountDetailedDto | null>(null);
  const [myPurchases, setMyPurchases] = useState<PurchaseDto[]>([]);
  const [allBalances, setAllBalances] = useState<CoinAccountDto[]>([]);
  const [allPurchases, setAllPurchases] = useState<PurchaseDto[]>([]);
  const [rewardRules, setRewardRules] = useState<RewardRuleDto[]>([]);

  // loading
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [loadingMyPurchases, setLoadingMyPurchases] = useState(false);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [loadingAllPurchases, setLoadingAllPurchases] = useState(false);
  const [loadingRules, setLoadingRules] = useState(false);

  // buy modal
  const [buyingItem, setBuyingItem] = useState<MarketItemDto | null>(null);
  const [isBuying, setIsBuying] = useState(false);

  // adjust modal
  const [adjustAccount, setAdjustAccount] = useState<CoinAccountDto | null>(null);
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustDesc, setAdjustDesc] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  // rule modal
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<RewardRuleDto | null>(null);
  const [ruleForm, setRuleForm] = useState({ ...defaultRuleForm });
  const [savingRule, setSavingRule] = useState(false);

  // item modal
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MarketItemDto | null>(null);
  const [itemForm, setItemForm] = useState({ ...defaultItemForm });
  const [savingItem, setSavingItem] = useState(false);

  // purchase filter
  const [purchaseFilter, setPurchaseFilter] = useState<'all' | 'pending' | 'fulfilled' | 'cancelled'>('all');

  // market export
  const [isMarketExportModalOpen, setIsMarketExportModalOpen] = useState(false);
  const [isExportingMarket, setIsExportingMarket] = useState(false);
  const [exportGroups, setExportGroups] = useState<Group[]>([]);

  // ── initial load ──
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role === 'Teacher') { router.push('/'); return; }
    loadItems();
    if (!isAdmin) {
      loadMyBalance();
      loadMyPurchases();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading]);

  // ── tab-driven loads ──
  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === 'balances') loadAllBalances();
    if (activeTab === 'admin-purchases') loadAllPurchases();
    if (activeTab === 'rules') loadRewardRules();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAdmin]);

  // ── loaders ──
  async function loadItems() {
    if (!orgId) return;
    try {
      setLoadingItems(true);
      setItems(await AuthenticatedApiService.getMarketItems(orgId));
    } catch { showError('Ошибка при загрузке товаров'); }
    finally { setLoadingItems(false); }
  }

  async function loadMyBalance() {
    if (!orgId || !user?.id) return;
    try {
      setLoadingBalance(true);
      setMyAccount(await AuthenticatedApiService.getMyBalance(user.id, orgId));
    } catch { showError('Ошибка при загрузке баланса'); }
    finally { setLoadingBalance(false); }
  }

  async function loadMyPurchases() {
    if (!orgId || !user?.id) return;
    try {
      setLoadingMyPurchases(true);
      setMyPurchases(await AuthenticatedApiService.getMyPurchases(user.id, orgId));
    } catch { showError('Ошибка при загрузке покупок'); }
    finally { setLoadingMyPurchases(false); }
  }

  async function loadAllBalances() {
    if (!orgId) return;
    try {
      setLoadingBalances(true);
      setAllBalances(await AuthenticatedApiService.getAllCoinBalances(orgId));
    } catch { showError('Ошибка при загрузке балансов'); }
    finally { setLoadingBalances(false); }
  }

  async function loadAllPurchases() {
    if (!orgId) return;
    try {
      setLoadingAllPurchases(true);
      setAllPurchases(await AuthenticatedApiService.getAllPurchases(orgId));
    } catch { showError('Ошибка при загрузке покупок'); }
    finally { setLoadingAllPurchases(false); }
  }

  async function loadRewardRules() {
    if (!orgId) return;
    try {
      setLoadingRules(true);
      setRewardRules(await AuthenticatedApiService.getRewardRules(orgId));
    } catch { showError('Ошибка при загрузке правил'); }
    finally { setLoadingRules(false); }
  }

  // ── actions ──
  async function handleBuy() {
    if (!buyingItem) return;
    try {
      setIsBuying(true);
      await AuthenticatedApiService.purchaseItem(orgId, { marketItemId: buyingItem.id });
      showSuccess(`Товар «${buyingItem.name}» успешно куплен!`);
      setBuyingItem(null);
      await loadMyBalance();
      await loadMyPurchases();
      await loadItems();
    } catch (err: unknown) {
      const status = (err as { status?: number; response?: { status?: number; data?: { message?: string } } })?.response?.status
        ?? (err as { status?: number })?.status;
      const msg = ((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? (err as { message?: string })?.message ?? '').toLowerCase();
      if (status === 409) {
        if (msg.includes('balance') || msg.includes('coin') || msg.includes('баланс')) {
          showError('Недостаточно монет для покупки');
        } else if (msg.includes('stock')) {
          showError('Товар закончился на складе');
        } else if (msg.includes('limit') || msg.includes('max')) {
          showError('Вы достигли лимита покупок для этого товара');
        } else {
          showError('Невозможно совершить покупку');
        }
      } else {
        showError('Ошибка при покупке товара');
      }
    } finally { setIsBuying(false); }
  }

  async function handleAdjust() {
    if (!adjustAccount || !adjustDesc.trim()) { showError('Заполните все поля'); return; }
    try {
      setIsAdjusting(true);
      await AuthenticatedApiService.adminAdjustCoins(orgId, {
        studentId: adjustAccount.studentId,
        amount: adjustAmount,
        description: adjustDesc.trim(),
      });
      showSuccess('Баланс успешно скорректирован');
      setAdjustAccount(null);
      setAdjustAmount(0);
      setAdjustDesc('');
      await loadAllBalances();
    } catch { showError('Ошибка при корректировке баланса'); }
    finally { setIsAdjusting(false); }
  }

  async function handleFulfill(p: PurchaseDto) {
    try {
      await AuthenticatedApiService.fulfillPurchase(p.id, orgId);
      showSuccess('Покупка выдана');
      await loadAllPurchases();
    } catch { showError('Ошибка при выдаче покупки'); }
  }

  async function handleCancelPurchase(p: PurchaseDto) {
    if (!confirm(`Отменить покупку «${p.itemName}» студента ${p.studentName}?`)) return;
    try {
      await AuthenticatedApiService.cancelPurchase(p.id, orgId);
      showSuccess('Покупка отменена');
      await loadAllPurchases();
    } catch { showError('Ошибка при отмене покупки'); }
  }

  function openRuleModal(rule?: RewardRuleDto) {
    if (rule) {
      setEditingRule(rule);
      setRuleForm({
        name: rule.name,
        eventType: rule.eventType,
        coinAmount: String(rule.coinAmount),
        minScore: rule.minScore !== null ? String(rule.minScore) : '',
        isActive: rule.isActive,
      });
    } else {
      setEditingRule(null);
      setRuleForm({ ...defaultRuleForm });
    }
    setShowRuleModal(true);
  }

  async function handleSaveRule() {
    if (!ruleForm.name.trim() || !ruleForm.coinAmount) { showError('Заполните обязательные поля'); return; }
    try {
      setSavingRule(true);
      const minScore = ruleForm.minScore !== '' ? Number(ruleForm.minScore) : null;
      if (editingRule) {
        await AuthenticatedApiService.updateRewardRule(editingRule.id, orgId, {
          name: ruleForm.name.trim(),
          coinAmount: Number(ruleForm.coinAmount),
          minScore,
          isActive: ruleForm.isActive,
        });
        showSuccess('Правило обновлено');
      } else {
        await AuthenticatedApiService.createRewardRule(orgId, {
          name: ruleForm.name.trim(),
          eventType: Number(ruleForm.eventType) as RewardEventType,
          coinAmount: Number(ruleForm.coinAmount),
          minScore,
        });
        showSuccess('Правило создано');
      }
      setShowRuleModal(false);
      await loadRewardRules();
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message;
      showError(message && message !== 'Failed to fetch' ? message : 'Ошибка при сохранении правила');
    }
    finally { setSavingRule(false); }
  }

  async function handleDeleteRule(rule: RewardRuleDto) {
    if (!confirm(`Удалить правило «${rule.name}»?`)) return;
    try {
      await AuthenticatedApiService.deleteRewardRule(rule.id, orgId);
      showSuccess('Правило удалено');
      await loadRewardRules();
    } catch { showError('Ошибка при удалении правила'); }
  }

  function openItemModal(item?: MarketItemDto) {
    if (item) {
      setEditingItem(item);
      setItemForm({
        name: item.name,
        description: item.description ?? '',
        price: String(item.price),
        itemType: item.itemType,
        imageUrl: item.imageUrl ?? '',
        stockQuantity: item.stockQuantity !== null ? String(item.stockQuantity) : '',
        maxPerStudent: item.maxPerStudent !== null ? String(item.maxPerStudent) : '',
        isActive: item.isActive,
      });
    } else {
      setEditingItem(null);
      setItemForm({ ...defaultItemForm });
    }
    setShowItemModal(true);
  }

  async function handleSaveItem() {
    if (!itemForm.name.trim() || !itemForm.price) { showError('Заполните обязательные поля'); return; }
    try {
      setSavingItem(true);
      const stockQuantity = itemForm.stockQuantity !== '' ? Number(itemForm.stockQuantity) : null;
      const maxPerStudent = itemForm.maxPerStudent !== '' ? Number(itemForm.maxPerStudent) : null;
      if (editingItem) {
        await AuthenticatedApiService.updateMarketItem(editingItem.id, orgId, {
          name: itemForm.name.trim(),
          description: itemForm.description || null,
          price: Number(itemForm.price),
          itemType: Number(itemForm.itemType) as MarketItemType,
          imageUrl: itemForm.imageUrl || null,
          stockQuantity,
          maxPerStudent,
          isActive: itemForm.isActive,
        });
        showSuccess('Товар обновлён');
      } else {
        await AuthenticatedApiService.createMarketItem(orgId, {
          name: itemForm.name.trim(),
          description: itemForm.description || null,
          price: Number(itemForm.price),
          itemType: Number(itemForm.itemType) as MarketItemType,
          imageUrl: itemForm.imageUrl || null,
          stockQuantity,
          maxPerStudent,
        });
        showSuccess('Товар создан');
      }
      setShowItemModal(false);
      await loadItems();
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message;
      showError(message && message !== 'Failed to fetch' ? message : 'Ошибка при сохранении товара');
    }
    finally { setSavingItem(false); }
  }

  async function handleDeleteItem(item: MarketItemDto) {
    if (!confirm(`Удалить товар «${item.name}»?`)) return;
    try {
      await AuthenticatedApiService.deleteMarketItem(item.id, orgId);
      showSuccess('Товар удалён');
      await loadItems();
    } catch { showError('Ошибка при удалении товара'); }
  }

  async function handleOpenMarketExport() {
    try {
      const response = await AuthenticatedApiService.post<GroupsResponse>('/Group/get-groups', {
        pageNumber: 1,
        pageSize: 200,
        organizationId: orgId,
      });
      setExportGroups(response.items || []);
    } catch {
      setExportGroups([]);
    }
    setIsMarketExportModalOpen(true);
  }

  async function handleExportMarket(params: ExportMarketParams) {
    if (!orgId) return;
    setIsExportingMarket(true);
    try {
      const blob = await ExportApiService.exportMarketStats(
        orgId,
        params.startDate,
        params.endDate,
        params.groupIds,
        params.statuses
      );
      ExportApiService.downloadFile(
        blob,
        ExportApiService.getExportFilename('market', 'xlsx')
      );
      showSuccess('Файл успешно экспортирован');
      setIsMarketExportModalOpen(false);
    } catch (error: unknown) {
      showError('Ошибка при экспорте маркета: ' + ((error as Error)?.message || 'Неизвестная ошибка'));
    } finally {
      setIsExportingMarket(false);
    }
  }

  // ── render helpers ──

  const visibleItems = isAdmin ? items : items.filter(i => i.isActive);

  function renderShop() {
    return (
      <div>
        {loadingItems ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 border-b-2 border-amber-500 rounded-full" />
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBagIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">Товаров пока нет</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleItems.map(item => (
              <div
                key={item.id}
                className={`bg-white dark:bg-gray-800 rounded-xl border flex flex-col ${
                  item.isActive
                    ? 'border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow'
                    : 'border-dashed border-gray-300 dark:border-gray-600 opacity-60'
                }`}
              >
                <div className="h-36 bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-t-xl flex items-center justify-center overflow-hidden">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-t-xl" />
                  ) : item.itemType === MarketItemType.Physical ? (
                    <GiftIcon className="h-14 w-14 text-amber-400" />
                  ) : (
                    <StarIcon className="h-14 w-14 text-amber-400" />
                  )}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">{item.name}</h3>
                    {isAdmin && !item.isActive && (
                      <span className="ml-1 text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded whitespace-nowrap">Скрыт</span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                      {item.itemTypeName || (item.itemType === MarketItemType.Physical ? 'Физический' : 'Виртуальный')}
                    </span>
                    {item.stockQuantity !== null && (
                      <span className={`px-2 py-0.5 rounded-full ${
                        item.stockQuantity > 0
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      }`}>
                        {item.stockQuantity > 0 ? `Осталось: ${item.stockQuantity}` : 'Нет в наличии'}
                      </span>
                    )}
                  </div>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                      <SparklesIcon className="h-4 w-4" />
                      <span>{item.price}</span>
                      <span className="text-xs font-normal text-gray-500 dark:text-gray-400">монет</span>
                    </div>
                    {!isAdmin && item.isActive && (
                      <button
                        onClick={() => setBuyingItem(item)}
                        disabled={item.stockQuantity !== null && item.stockQuantity <= 0}
                        className="text-xs px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                      >
                        Купить
                      </button>
                    )}
                    {isAdmin && (
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => openItemModal(item)} className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors">
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeleteItem(item)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderWallet() {
    if (loadingBalance) return (
      <div className="flex justify-center py-16">
        <div className="animate-spin h-8 w-8 border-b-2 border-amber-500 rounded-full" />
      </div>
    );
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-amber-400 to-yellow-500 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <WalletIcon className="h-7 w-7" />
            <span className="text-lg font-medium opacity-90">Мой кошелёк</span>
          </div>
          <div className="text-5xl font-bold mb-1">{myAccount?.balance ?? '—'}</div>
          <div className="text-sm opacity-80">монет</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">История транзакций</h3>
          </div>
          {!myAccount?.recentTransactions?.length ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Транзакций пока нет</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {myAccount.recentTransactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{tx.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(tx.createdAt)}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className={`font-bold text-sm ${txColor(tx.type)}`}>
                      {tx.amount >= 0 ? '+' : ''}{tx.amount}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{tx.balanceAfter} монет</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderMyPurchases() {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Мои покупки</h3>
        </div>
        {loadingMyPurchases ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 border-b-2 border-amber-500 rounded-full" />
          </div>
        ) : myPurchases.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Покупок пока нет</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {myPurchases.map(p => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{p.itemName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(p.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-amber-600 dark:text-amber-400 font-bold text-sm flex items-center gap-1">
                    <SparklesIcon className="h-3.5 w-3.5" />{p.pricePaid}
                  </span>
                  <StatusBadge status={p.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderAllBalances() {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Балансы студентов ({allBalances.length})</h3>
        </div>
        {loadingBalances ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 border-b-2 border-amber-500 rounded-full" />
          </div>
        ) : allBalances.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Балансов пока нет</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {[...allBalances].sort((a, b) => b.balance - a.balance).map((acc, idx) => (
              <div key={acc.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    idx === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' :
                    idx === 1 ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' :
                    idx === 2 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                    'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                  }`}>{idx + 1}</span>
                  <span className="font-medium text-gray-900 dark:text-white text-sm">{acc.studentName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 text-sm">
                    <SparklesIcon className="h-4 w-4" />{acc.balance}
                  </span>
                  <button
                    onClick={() => { setAdjustAccount(acc); setAdjustAmount(0); setAdjustDesc(''); }}
                    className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                    title="Скорректировать баланс"
                  >
                    <AdjustmentsHorizontalIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const filteredPurchases = allPurchases.filter(p => {
    if (purchaseFilter === 'pending') return p.status === PurchaseStatus.Pending;
    if (purchaseFilter === 'fulfilled') return p.status === PurchaseStatus.Fulfilled;
    if (purchaseFilter === 'cancelled') return p.status === PurchaseStatus.Cancelled;
    return true;
  });

  function renderAllPurchases() {
    return (
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'fulfilled', 'cancelled'] as const).map(f => (
            <button
              key={f}
              onClick={() => setPurchaseFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                purchaseFilter === f
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {f === 'all' ? 'Все' : f === 'pending' ? 'Ожидают' : f === 'fulfilled' ? 'Выполнены' : 'Отменены'}
            </button>
          ))}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          {loadingAllPurchases ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin h-8 w-8 border-b-2 border-amber-500 rounded-full" />
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Покупок нет</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredPurchases.map(p => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{p.itemName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{p.studentName} · {formatDate(p.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-amber-600 dark:text-amber-400 font-bold text-sm flex items-center gap-1">
                      <SparklesIcon className="h-3.5 w-3.5" />{p.pricePaid}
                    </span>
                    <StatusBadge status={p.status} />
                    {p.status === PurchaseStatus.Pending && (
                      <div className="flex gap-0.5">
                        <button onClick={() => handleFulfill(p)} className="p-1.5 text-gray-400 hover:text-green-600 transition-colors" title="Выдать">
                          <CheckCircleIcon className="h-5 w-5" />
                        </button>
                        <button onClick={() => handleCancelPurchase(p)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Отменить">
                          <XCircleIcon className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderRewardRules() {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <button
            onClick={() => openRuleModal()}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <PlusIcon className="h-4 w-4" />
            Добавить правило
          </button>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Правила автоматического начисления монет студентам за действия в системе
            </p>
          </div>
          {loadingRules ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin h-8 w-8 border-b-2 border-amber-500 rounded-full" />
            </div>
          ) : rewardRules.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Правил пока нет</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {rewardRules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-gray-900 dark:text-white text-sm">{rule.name}</span>
                      {!rule.isActive && (
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">Отключено</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span>{eventLabel(rule.eventType)}</span>
                      {rule.minScore !== null && <span>Мин. оценка: {rule.minScore}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 text-sm">
                      <SparklesIcon className="h-4 w-4" />+{rule.coinAmount}
                    </span>
                    <button onClick={() => openRuleModal(rule)} className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDeleteRule(rule)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderManageItems() {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <button
            onClick={() => openItemModal()}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <PlusIcon className="h-4 w-4" />
            Добавить товар
          </button>
        </div>
        {renderShop()}
      </div>
    );
  }

  // ── tabs config ──

  const studentTabs = [
    { id: 'shop', label: 'Магазин', icon: ShoppingBagIcon },
    { id: 'wallet', label: 'Кошелёк', icon: WalletIcon },
    { id: 'my-purchases', label: 'Мои покупки', icon: ClipboardDocumentListIcon },
  ];

  const adminTabs = [
    { id: 'shop', label: 'Магазин', icon: ShoppingBagIcon },
    { id: 'balances', label: 'Балансы', icon: UserGroupIcon },
    { id: 'admin-purchases', label: 'Покупки', icon: ClipboardDocumentListIcon },
    { id: 'items', label: 'Товары', icon: CogIcon },
    { id: 'rules', label: 'Правила', icon: SparklesIcon },
  ];

  const tabs = isAdmin ? adminTabs : studentTabs;

  // ── main render ──

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 page-container max-w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl flex items-center justify-center shadow">
              <SparklesIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Маркет</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isAdmin ? 'Управление монетами и магазином' : 'Обменивайте монеты на призы'}
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={handleOpenMarketExport}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors text-sm font-medium shadow-sm"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
              Экспорт
            </button>
          )}
          {!isAdmin && myAccount && (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 rounded-xl px-4 py-2 font-bold text-lg">
              <SparklesIcon className="h-5 w-5" />
              {myAccount.balance}
              <span className="text-sm font-normal text-amber-600 dark:text-amber-500">монет</span>
            </div>
          )}
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === 'shop' && renderShop()}
          {activeTab === 'wallet' && renderWallet()}
          {activeTab === 'my-purchases' && renderMyPurchases()}
          {activeTab === 'balances' && renderAllBalances()}
          {activeTab === 'admin-purchases' && renderAllPurchases()}
          {activeTab === 'items' && renderManageItems()}
          {activeTab === 'rules' && renderRewardRules()}
        </div>
      </div>

      {/* Buy confirmation modal */}
      <BaseModal isOpen={!!buyingItem} onClose={() => setBuyingItem(null)} title="Подтвердить покупку">
        {buyingItem && (
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
              <p className="font-semibold text-gray-900 dark:text-white mb-1">{buyingItem.name}</p>
              {buyingItem.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{buyingItem.description}</p>
              )}
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-lg">
                <SparklesIcon className="h-5 w-5" />
                {buyingItem.price} монет
              </div>
            </div>
            {myAccount && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ваш баланс:{' '}
                <span className="font-semibold text-gray-900 dark:text-white">{myAccount.balance} монет</span>
                {' '}→ после:{' '}
                <span className={`font-semibold ${myAccount.balance - buyingItem.price < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                  {myAccount.balance - buyingItem.price} монет
                </span>
              </p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setBuyingItem(null)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Отмена
              </button>
              <button
                onClick={handleBuy}
                disabled={isBuying || (myAccount !== null && myAccount.balance < buyingItem.price)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
              >
                {isBuying ? 'Покупка...' : 'Купить'}
              </button>
            </div>
          </div>
        )}
      </BaseModal>

      {/* Adjust balance modal */}
      <BaseModal isOpen={!!adjustAccount} onClose={() => setAdjustAccount(null)} title={`Корректировка баланса — ${adjustAccount?.studentName}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Сумма (+ начислить / − списать)
            </label>
            <input
              type="number"
              value={adjustAmount}
              onChange={e => setAdjustAmount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Причина <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={adjustDesc}
              onChange={e => setAdjustDesc(e.target.value)}
              placeholder="Укажите причину корректировки"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setAdjustAccount(null)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Отмена
            </button>
            <button
              onClick={handleAdjust}
              disabled={isAdjusting || !adjustDesc.trim()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              {isAdjusting ? 'Сохранение...' : 'Применить'}
            </button>
          </div>
        </div>
      </BaseModal>

      {/* Reward rule modal */}
      <BaseModal isOpen={showRuleModal} onClose={() => setShowRuleModal(false)} title={editingRule ? 'Редактировать правило' : 'Новое правило'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Название <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={ruleForm.name}
              onChange={e => setRuleForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Например: Посещение занятия"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-amber-500 focus:border-amber-500"
              autoFocus
            />
          </div>
          {!editingRule && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Событие <span className="text-red-500">*</span></label>
              <select
                value={ruleForm.eventType}
                onChange={e => setRuleForm(prev => ({ ...prev, eventType: Number(e.target.value) as RewardEventType }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-amber-500 focus:border-amber-500"
              >
                <option value={RewardEventType.AttendanceMarked}>Посещение урока</option>
                <option value={RewardEventType.ScoreReceived}>Получение оценки</option>
                <option value={RewardEventType.SubmissionCompleted}>Сдача задания</option>
                <option value={RewardEventType.BonusManual}>Ручное начисление</option>
                <option value={RewardEventType.Late}>Опоздание</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Количество монет <span className="text-red-500">*</span></label>
            <input
              type="number"
              min={1}
              value={ruleForm.coinAmount}
              onChange={e => setRuleForm(prev => ({ ...prev, coinAmount: e.target.value }))}
              placeholder="Например: 5"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          {(ruleForm.eventType === RewardEventType.ScoreReceived || editingRule?.eventType === RewardEventType.ScoreReceived) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Минимальная оценка (необязательно)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={ruleForm.minScore}
                onChange={e => setRuleForm(prev => ({ ...prev, minScore: e.target.value }))}
                placeholder="Оставьте пустым для любой оценки"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          )}
          {editingRule && (
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={ruleForm.isActive} onChange={e => setRuleForm(prev => ({ ...prev, isActive: e.target.checked }))} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
              <span className="text-sm text-gray-700 dark:text-gray-300">Активно</span>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowRuleModal(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Отмена
            </button>
            <button onClick={handleSaveRule} disabled={savingRule || !ruleForm.name.trim()} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium">
              {savingRule ? 'Сохранение...' : editingRule ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </div>
      </BaseModal>

      {/* Market item modal */}
      <BaseModal isOpen={showItemModal} onClose={() => setShowItemModal(false)} title={editingItem ? 'Редактировать товар' : 'Новый товар'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Название <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={itemForm.name}
              onChange={e => setItemForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Название товара"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-amber-500 focus:border-amber-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Описание</label>
            <textarea
              rows={2}
              value={itemForm.description}
              onChange={e => setItemForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Необязательное описание"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-amber-500 focus:border-amber-500 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Цена (монет) <span className="text-red-500">*</span></label>
              <input
                type="number"
                min={1}
                value={itemForm.price}
                onChange={e => setItemForm(prev => ({ ...prev, price: e.target.value }))}
                placeholder="Например: 10"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Тип</label>
              <select
                value={itemForm.itemType}
                onChange={e => setItemForm(prev => ({ ...prev, itemType: Number(e.target.value) as MarketItemType }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-amber-500 focus:border-amber-500"
              >
                <option value={MarketItemType.Virtual}>Виртуальный</option>
                <option value={MarketItemType.Physical}>Физический</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Кол-во на складе</label>
              <input
                type="number"
                min={0}
                value={itemForm.stockQuantity}
                onChange={e => setItemForm(prev => ({ ...prev, stockQuantity: e.target.value }))}
                placeholder="Без ограничений"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Макс. на студента</label>
              <input
                type="number"
                min={1}
                value={itemForm.maxPerStudent}
                onChange={e => setItemForm(prev => ({ ...prev, maxPerStudent: e.target.value }))}
                placeholder="Без ограничений"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL изображения</label>
            <input
              type="text"
              value={itemForm.imageUrl}
              onChange={e => setItemForm(prev => ({ ...prev, imageUrl: e.target.value }))}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          {editingItem && (
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={itemForm.isActive} onChange={e => setItemForm(prev => ({ ...prev, isActive: e.target.checked }))} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
              <span className="text-sm text-gray-700 dark:text-gray-300">Активен (виден студентам)</span>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowItemModal(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Отмена
            </button>
            <button onClick={handleSaveItem} disabled={savingItem || !itemForm.name.trim()} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium">
              {savingItem ? 'Сохранение...' : editingItem ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </div>
      </BaseModal>

      <ExportMarketModal
        isOpen={isMarketExportModalOpen}
        onClose={() => setIsMarketExportModalOpen(false)}
        onExport={handleExportMarket}
        groups={exportGroups}
        isExporting={isExportingMarket}
      />
    </div>
  );
}
