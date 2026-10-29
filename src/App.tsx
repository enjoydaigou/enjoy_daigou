import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // 代購表單狀態
  const [productName, setProductName] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [specs, setSpecs] = useState('');
  const [orders, setOrders] = useState<any[]>([]);

  // 1. 初始化與監聽身分驗證狀態
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchOrders(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchOrders(session.user.id);
      } else {
        setOrders([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. 抓取使用者的專屬訂單清單
  const fetchOrders = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setOrders(data);
    } catch (err: any) {
      console.error('取得訂單失敗:', err.message);
    }
  };

  // 3. 處理註冊
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      alert(`註冊失敗: ${error.message}`);
    } else {
      alert('註冊成功！若有啟用信箱驗證，請至信箱點擊確認信，或直接嘗試登入。');
    }
  };

  // 4. 處理登入
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      alert(`登入失敗: ${error.message}`);
    }
  };

  // 5. 處理登出
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // 6. 提交代購單
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('請先登入');
    setLoading(true);

    const { error } = await supabase.from('orders').insert([
      {
        user_id: user.id,
        customer_email: user.email,
        product_name: productName,
        product_url: productUrl,
        specs: specs,
        status: '待報價',
      },
    ]);

    setLoading(false);
    if (error) {
      alert(`下單失敗: ${error.message}`);
    } else {
      alert('代購委託已成功送出！');
      setProductName('');
      setProductUrl('');
      setSpecs('');
      fetchOrders(user.id);
    }
  };

  return (
    <div style={{ maxWidth: '680px', margin: '40px auto', padding: '0 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#333' }}>
      <header style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', margin: '0 0 8px 0', color: '#111' }}>享受代購 Enjoy Daigou</h1>
        <p style={{ color: '#666', margin: 0 }}>透明報價 · 全程進度追蹤 · 安心委託</p>
      </header>

      {!user ? (
        <div style={{ background: '#fff', border: '1px solid #e1e4e8', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '20px', marginTop: 0, marginBottom: '20px' }}>
            {isRegisterMode ? '註冊新帳號' : '會員登入'}
          </h2>
          <form onSubmit={isRegisterMode ? handleSignUp : handleSignIn}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>電子郵件</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@mail.com"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>密碼</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位數密碼"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '12px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}
            >
              {loading ? '處理中...' : isRegisterMode ? '建立帳號' : '登入系統'}
            </button>
          </form>

          <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '14px' }}>
            {isRegisterMode ? (
              <span>已經有帳號？ <button type="button" onClick={() => setIsRegisterMode(false)} style={{ background: 'none', border: 'none', color: '#0070f3', cursor: 'pointer', textDecoration: 'underline' }}>前往登入</button></span>
            ) : (
              <span>還沒有帳號？ <button type="button" onClick={() => setIsRegisterMode(true)} style={{ background: 'none', border: 'none', color: '#0070f3', cursor: 'pointer', textDecoration: 'underline' }}>立即免費註冊</button></span>
            )}
          </div>
        </div>
      ) : (
        <div>
          {/* 會員資訊欄 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f6f8fa', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px' }}>
            <span style={{ fontSize: '14px' }}>已登入：<strong>{user.email}</strong></span>
            <button
              onClick={handleSignOut}
              style={{ padding: '6px 12px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}
            >
              登出
            </button>
          </div>

          {/* 送出代購單 */}
          <div style={{ background: '#fff', border: '1px solid #e1e4e8', borderRadius: '12px', padding: '24px', marginBottom: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '18px', marginTop: 0, marginBottom: '16px' }}>填寫代購委託單</h2>
            <form onSubmit={handleCreateOrder}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>商品名稱 *</label>
                <input
                  type="text"
                  required
                  placeholder="例如：日本限定 聯名保溫瓶"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>商品網址 (URL) *</label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>規格與備註</label>
                <textarea
                  rows={3}
                  placeholder="顏色、尺寸、數量或特別注意事項"
                  value={specs}
                  onChange={(e) => setSpecs(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', padding: '12px', background: '#2ea44f', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}
              >
                {loading ? '正在送出...' : '送出代購委託'}
              </button>
            </form>
          </div>

          {/* 歷史委託清單與進度 */}
          <div>
            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>我的委託進度</h2>
            {orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', border: '1px dashed #d1d5db', borderRadius: '8px', color: '#6b7280' }}>
                尚無代購訂單紀錄，請於上方表單提交委託。
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {orders.map((o) => (
                  <div key={o.id} style={{ border: '1px solid #e1e4e8', borderRadius: '8px', padding: '16px', background: '#fafbfc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '16px' }}>{o.product_name}</strong>
                      <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#e1f5fe', color: '#0288d1', fontSize: '12px', fontWeight: 600 }}>
                        {o.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', color: '#555', marginBottom: '6px' }}>
                      規格備註：{o.specs || '無'}
                    </div>
                    <div style={{ fontSize: '13px', color: '#0070f3', wordBreak: 'break-all', marginBottom: '8px' }}>
                      <a href={o.product_url} target="_blank" rel="noreferrer" style={{ color: '#0070f3' }}>
                        點此查看原始商品連結 ↗
                      </a>
                    </div>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                      委託時間：{new Date(o.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
