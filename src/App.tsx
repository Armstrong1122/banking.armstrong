import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  Plus, 
  Minus,
  TrendingUp,
  CreditCard,
  ShieldCheck,
  LayoutDashboard,
  LogOut,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Transaction {
  id: number;
  type: 'deposit' | 'withdrawal';
  amount: number;
  description: string;
  timestamp: string;
}

interface Notification {
  id: number;
  message: string;
  timestamp: string;
}

interface AccountInfo {
  name: string;
  account_number: string;
  balance: number;
  profile_picture?: string;
}

type Tab = 'Dashboard' | 'Accounts' | 'Transactions' | 'Notifications';

interface User {
  id: number;
  name: string;
  email: string;
  account_number: string;
  profile_picture?: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('Dashboard');
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [showActionModal, setShowActionModal] = useState<'deposit' | 'withdraw' | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [atmRequestStatus, setAtmRequestStatus] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user) return;
    try {
      const [accountRes, transactionsRes, notificationsRes] = await Promise.all([
        fetch(`/api/account/${user.id}`),
        fetch(`/api/transactions/${user.id}`),
        fetch(`/api/notifications/${user.id}`)
      ]);

      if (!accountRes.ok || !transactionsRes.ok || !notificationsRes.ok) {
        throw new Error('One or more API requests failed');
      }

      const accountData = await accountRes.json();
      const transactionsData = await transactionsRes.json();
      const notificationsData = await notificationsRes.json();
      
      setAccountInfo(accountData);
      setTransactions(transactionsData);
      setNotifications(notificationsData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Unable to connect to the banking server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchData();
    }
  }, [user]);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      const endpoint = showActionModal === 'deposit' ? '/api/deposit' : '/api/withdraw';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, amount: numAmount, description })
      });

      const data = await response.json();
      if (data.success) {
        await fetchData();
        setShowActionModal(null);
        setAmount('');
        setDescription('');
      } else {
        setError(data.error || 'Transaction failed');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }
  };

  const handleRequestATM = async () => {
    if (!user) return;
    try {
      const response = await fetch('/api/request-atm', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      if (response.ok) {
        setAtmRequestStatus('Request sent successfully!');
        fetchData();
        setTimeout(() => setAtmRequestStatus(null), 3000);
      }
    } catch (err) {
      console.error('Failed to request ATM:', err);
    }
  };

  if (!user) {
    return <LandingPage onLogin={setUser} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-zinc-200 rounded-full" />
          <div className="h-4 w-32 bg-zinc-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-zinc-50">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-200 bg-white hidden md:flex flex-col p-6">
        <div className="flex items-center gap-2 mb-10 px-2">
          <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
            <ShieldCheck className="text-white w-5 h-5" />
          </div>
          <span className="font-semibold text-lg tracking-tight">Nexus Bank</span>
        </div>

        <nav className="space-y-1 flex-1">
          <SidebarLink 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={activeTab === 'Dashboard'} 
            onClick={() => setActiveTab('Dashboard')}
          />
          <SidebarLink 
            icon={<CreditCard size={20} />} 
            label="Accounts" 
            active={activeTab === 'Accounts'} 
            onClick={() => setActiveTab('Accounts')}
          />
          <SidebarLink 
            icon={<History size={20} />} 
            label="Transactions" 
            active={activeTab === 'Transactions'} 
            onClick={() => setActiveTab('Transactions')}
          />
          <SidebarLink 
            icon={<Bell size={20} />} 
            label="Notifications" 
            active={activeTab === 'Notifications'} 
            onClick={() => setActiveTab('Notifications')}
          />
        </nav>

        <div className="pt-6 border-t border-zinc-100">
          <SidebarLink icon={<LogOut size={20} />} label="Sign Out" onClick={() => setUser(null)} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            {accountInfo?.profile_picture ? (
              <img 
                src={accountInfo.profile_picture} 
                alt="Profile" 
                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-500">
                <ShieldCheck size={24} />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900">Welcome back, {accountInfo?.name}</h1>
              <p className="text-zinc-500 text-sm">Here's what's happening with your account today.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowActionModal('deposit')}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              <span>Fund</span>
            </button>
            <button 
              onClick={() => setShowActionModal('withdraw')}
              className="btn-secondary flex items-center gap-2"
            >
              <Minus size={18} />
              <span>Withdraw</span>
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'Dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="card p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-zinc-100 rounded-lg">
                      <Wallet className="text-zinc-600" size={20} />
                    </div>
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+2.4%</span>
                  </div>
                  <p className="text-zinc-500 text-sm font-medium mb-1">Total Balance</p>
                  <h2 className="text-3xl font-semibold text-zinc-900">
                    ${accountInfo?.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h2>
                </div>

                <div className="card p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-zinc-100 rounded-lg">
                      <ArrowUpRight className="text-zinc-600" size={20} />
                    </div>
                  </div>
                  <p className="text-zinc-500 text-sm font-medium mb-1">Monthly Deposits</p>
                  <h2 className="text-3xl font-semibold text-zinc-900">
                    ${transactions
                      .filter(t => t.type === 'deposit')
                      .reduce((acc, curr) => acc + curr.amount, 0)
                      .toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </h2>
                </div>

                <div className="card p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-zinc-100 rounded-lg">
                      <TrendingUp className="text-zinc-600" size={20} />
                    </div>
                  </div>
                  <p className="text-zinc-500 text-sm font-medium mb-1">Savings Goal</p>
                  <div className="flex items-end gap-2">
                    <h2 className="text-3xl font-semibold text-zinc-900">74%</h2>
                    <p className="text-zinc-400 text-sm mb-1">of $10k</p>
                  </div>
                  <div className="w-full bg-zinc-100 h-2 rounded-full mt-4 overflow-hidden">
                    <div className="bg-zinc-900 h-full w-[74%]" />
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="card">
                <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                  <h3 className="font-semibold text-zinc-900">Recent Transactions</h3>
                  <button onClick={() => setActiveTab('Transactions')} className="text-sm text-zinc-500 hover:text-zinc-900 font-medium">View all</button>
                </div>
                <div className="divide-y divide-zinc-100">
                  {transactions.slice(0, 5).map((t) => (
                    <TransactionRow key={t.id} transaction={t} />
                  ))}
                  {transactions.length === 0 && <EmptyState message="No transactions yet." />}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'Accounts' && (
            <motion.div
              key="accounts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="card p-8">
                <div className="flex flex-col md:flex-row justify-between gap-8">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">Account Holder</h3>
                      <p className="text-xl font-medium text-zinc-900">{accountInfo?.name}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">Account Number</h3>
                      <p className="text-xl font-mono text-zinc-900 tracking-widest">{accountInfo?.account_number}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">Account Type</h3>
                      <p className="text-xl font-medium text-zinc-900">Premium Savings</p>
                    </div>
                  </div>
                  
                  <div className="bg-zinc-900 text-white p-8 rounded-3xl w-full max-w-sm relative overflow-hidden shadow-2xl">
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-12">
                        <ShieldCheck size={32} />
                        <span className="text-xs font-mono opacity-60">NEXUS PLATINUM</span>
                      </div>
                      <p className="text-lg font-mono tracking-widest mb-8">**** **** **** 4829</p>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] opacity-60 uppercase mb-1">Card Holder</p>
                          <p className="text-sm font-medium">{accountInfo?.name}</p>
                        </div>
                        <div className="w-10 h-6 bg-zinc-700 rounded-md opacity-50" />
                      </div>
                    </div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12" />
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-zinc-100">
                  <h3 className="text-lg font-semibold text-zinc-900 mb-4">ATM Card Services</h3>
                  <div className="bg-zinc-50 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                      <p className="font-medium text-zinc-900 mb-1">Request a physical ATM card</p>
                      <p className="text-sm text-zinc-500">Get a premium metal card delivered to your doorstep within 5-7 business days.</p>
                    </div>
                    <button 
                      onClick={handleRequestATM}
                      disabled={!!atmRequestStatus}
                      className="btn-primary whitespace-nowrap"
                    >
                      {atmRequestStatus || 'Request Card'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'Transactions' && (
            <motion.div
              key="transactions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="card">
                <div className="p-6 border-b border-zinc-100">
                  <h3 className="font-semibold text-zinc-900">All Transactions</h3>
                </div>
                <div className="divide-y divide-zinc-100">
                  {transactions.map((t) => (
                    <TransactionRow key={t.id} transaction={t} />
                  ))}
                  {transactions.length === 0 && <EmptyState message="No transactions found." />}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'Notifications' && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="card">
                <div className="p-6 border-b border-zinc-100">
                  <h3 className="font-semibold text-zinc-900">Activity Notifications</h3>
                </div>
                <div className="divide-y divide-zinc-100">
                  {notifications.map((n) => (
                    <div key={n.id} className="p-6 flex gap-4 hover:bg-zinc-50 transition-colors">
                      <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center shrink-0">
                        <Bell size={18} className="text-zinc-500" />
                      </div>
                      <div>
                        <p className="text-zinc-900 font-medium mb-1">{n.message}</p>
                        <p className="text-xs text-zinc-400">
                          {new Date(n.timestamp).toLocaleDateString()} • {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {notifications.length === 0 && <EmptyState message="No notifications yet." />}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Action Modal */}
      <AnimatePresence>
        {showActionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowActionModal(null)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-8">
                <h3 className="text-xl font-semibold text-zinc-900 mb-2">
                  {showActionModal === 'deposit' ? 'Fund Your Account' : 'Withdraw Funds'}
                </h3>
                <p className="text-zinc-500 text-sm mb-6">
                  {showActionModal === 'deposit' 
                    ? 'Add money to your balance instantly.' 
                    : 'Transfer money out of your account.'}
                </p>

                <form onSubmit={handleAction} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">$</span>
                      <input 
                        type="number" 
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="input-field pl-8"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Description (Optional)</label>
                    <input 
                      type="text" 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={showActionModal === 'deposit' ? 'e.g. Salary' : 'e.g. Rent'}
                      className="input-field"
                    />
                  </div>

                  {error && (
                    <p className="text-rose-600 text-sm font-medium bg-rose-50 p-3 rounded-xl">{error}</p>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={() => setShowActionModal(null)}
                      className="btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="btn-primary flex-1"
                    >
                      Confirm
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LandingPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [showAuth, setShowAuth] = useState<'login' | 'register' | null>(null);

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans">
      {/* Navigation */}
      <nav className="flex justify-between items-center px-6 py-6 md:px-12 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
            <ShieldCheck className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight">Nexus</span>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setShowAuth('login')} className="text-sm font-medium hover:text-zinc-600 transition-colors">Sign In</button>
          <button onClick={() => setShowAuth('register')} className="bg-zinc-900 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-zinc-800 transition-colors">Open Account</button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-20 md:px-12 md:py-32 max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-6xl md:text-8xl font-bold leading-[0.9] tracking-tighter mb-8">
            BANKING <br /> FOR THE <br /> <span className="text-zinc-400">FUTURE.</span>
          </h1>
          <p className="text-lg text-zinc-500 max-w-md mb-10 leading-relaxed">
            Experience a modern way to manage your wealth. Secure, transparent, and built for the next generation of digital finance.
          </p>
          <div className="flex gap-4">
            <button onClick={() => setShowAuth('register')} className="bg-zinc-900 text-white px-8 py-4 rounded-full font-semibold hover:bg-zinc-800 transition-all hover:scale-105">
              Get Started
            </button>
            <button className="border border-zinc-200 px-8 py-4 rounded-full font-semibold hover:bg-zinc-50 transition-all">
              Learn More
            </button>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          <div className="aspect-square bg-zinc-100 rounded-[3rem] overflow-hidden relative">
            <img 
              src="https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&q=80&w=1000" 
              alt="Modern Banking" 
              className="object-cover w-full h-full grayscale hover:grayscale-0 transition-all duration-700"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent" />
          </div>
          {/* Floating Card UI */}
          <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-3xl shadow-2xl border border-zinc-100 hidden md:block">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <TrendingUp className="text-emerald-600" size={20} />
              </div>
              <div>
                <p className="text-xs text-zinc-400 font-medium uppercase">Savings Growth</p>
                <p className="text-lg font-bold">+12.4%</p>
              </div>
            </div>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(i => <div key={i} className="w-8 h-1 bg-zinc-100 rounded-full overflow-hidden"><div className="bg-emerald-500 h-full" style={{width: `${i*20}%`}} /></div>)}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="bg-zinc-50 py-24 px-6 md:px-12">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12">
          <FeatureCard 
            icon={<ShieldCheck size={24} />}
            title="Military Grade Security"
            description="Your assets are protected by the most advanced encryption and security protocols available."
          />
          <FeatureCard 
            icon={<Wallet size={24} />}
            title="Instant Transfers"
            description="Send and receive money across the globe in seconds, not days. No hidden fees."
          />
          <FeatureCard 
            icon={<CreditCard size={24} />}
            title="Premium Cards"
            description="Access exclusive benefits with our range of metal cards designed for the modern traveler."
          />
        </div>
      </section>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuth && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuth(null)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-10">
                <AuthForm type={showAuth} onToggle={() => setShowAuth(showAuth === 'login' ? 'register' : 'login')} onSuccess={onLogin} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="space-y-4">
      <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-zinc-100 flex items-center justify-center text-zinc-900">
        {icon}
      </div>
      <h3 className="text-xl font-bold tracking-tight">{title}</h3>
      <p className="text-zinc-500 leading-relaxed">{description}</p>
    </div>
  );
}

function AuthForm({ type, onToggle, onSuccess }: { type: 'login' | 'register', onToggle: () => void, onSuccess: (user: User) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [passport, setPassport] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = type === 'login' ? '/api/login' : '/api/register';
      const body = type === 'login' 
        ? { email, password } 
        : { email, password, name, passport_number: passport, dob, phone_number: phone, address, postal_code: postalCode, profile_picture: profilePicture };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (response.ok) {
        if (type === 'login') {
          onSuccess(data.user);
        } else {
          // After register, auto login
          const loginRes = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const loginData = await loginRes.json();
          onSuccess(loginData.user);
        }
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight mb-2">
          {type === 'login' ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-zinc-500 text-sm">
          {type === 'login' ? 'Enter your credentials to access your vault.' : 'Join thousands of users banking with Nexus.'}
        </p>
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
        {type === 'register' && (
          <>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Full Name</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field" 
                placeholder="John Doe"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Passport/ID Number</label>
                <input 
                  type="text" 
                  required
                  value={passport}
                  onChange={(e) => setPassport(e.target.value)}
                  className="input-field" 
                  placeholder="A1234567"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Date of Birth</label>
                <input 
                  type="date" 
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="input-field" 
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Phone Number</label>
              <input 
                type="tel" 
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-field" 
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Residential Address</label>
              <input 
                type="text" 
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="input-field" 
                placeholder="123 Finance St, Capital City"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Postal Code</label>
              <input 
                type="text" 
                required
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="input-field" 
                placeholder="10001"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Profile Picture (Passport)</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center overflow-hidden border-2 border-zinc-200">
                  {profilePicture ? (
                    <img src={profilePicture} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Plus size={24} className="text-zinc-400" />
                  )}
                </div>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileChange}
                  className="text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-900 file:text-white hover:file:bg-zinc-800"
                />
              </div>
            </div>
          </>
        )}
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Email Address</label>
          <input 
            type="email" 
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field" 
            placeholder="name@example.com"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Password</label>
          <input 
            type="password" 
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field" 
            placeholder="••••••••"
          />
        </div>
      </div>

      {error && <p className="text-rose-500 text-sm font-medium bg-rose-50 p-3 rounded-xl">{error}</p>}

      <button 
        type="submit" 
        disabled={loading}
        className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all disabled:opacity-50"
      >
        {loading ? 'Processing...' : type === 'login' ? 'Sign In' : 'Create Account'}
      </button>

      <p className="text-center text-sm text-zinc-500">
        {type === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
        <button type="button" onClick={onToggle} className="text-zinc-900 font-bold hover:underline">
          {type === 'login' ? 'Sign Up' : 'Sign In'}
        </button>
      </p>
    </form>
  );
}

function SidebarLink({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void, key?: any }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
        active 
          ? 'bg-zinc-900 text-white' 
          : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function TransactionRow({ transaction: t }: { transaction: Transaction, key?: any }) {
  return (
    <div className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-full ${t.type === 'deposit' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {t.type === 'deposit' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
        </div>
        <div>
          <p className="font-medium text-zinc-900">{t.description}</p>
          <p className="text-xs text-zinc-400">{new Date(t.timestamp).toLocaleDateString()} • {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>
      <p className={`font-semibold ${t.type === 'deposit' ? 'text-emerald-600' : 'text-zinc-900'}`}>
        {t.type === 'deposit' ? '+' : '-'}${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-12 text-center">
      <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <History className="text-zinc-300" size={24} />
      </div>
      <p className="text-zinc-500">{message}</p>
    </div>
  );
}
