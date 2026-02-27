import { useEffect, useState } from 'react';

import axios from 'axios';

import 'assets/scss/week2.scss';

// --- API ---
const API_BASE = import.meta.env.VITE_API_BASE;
const API_PATH = import.meta.env.VITE_API_PATH;

const login = data => axios.post(`${API_BASE}/admin/signin`, data);

const checkLogin = () => axios.post(`${API_BASE}/api/user/check`);

const getProducts = token =>
  axios.get(`${API_BASE}/api/${API_PATH}/admin/products`, { headers: { Authorization: token } });

function Week2() {
  // --- State ---
  // 登入相關
  const [isAuth, setIsAuth] = useState(false);
  const [formData, setFormData] = useState({
    username: '', // 先給定空值，避免 input 從 undefined 變成有值，而出現 uncontrolled 變為 controlled 的報錯
    password: '',
  });

  // 產品相關
  const [products, setProducts] = useState([]);
  const [tempProduct, setTempProduct] = useState(null);

  // Loading 相關
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // --- Event Handler ---
  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async e => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setLoadingMessage('驗證中...');

      const {
        data: { token, expired },
      } = await login(formData);

      document.cookie = `hexToken=${token}; expires=${new Date(expired)}`;

      setLoadingMessage('正在取得產品列表...');

      const response = await getProducts(token);
      setProducts(response.data.products);

      setIsAuth(true);
    } catch (error) {
      setIsAuth(false);
      alert(`出現錯誤：${error.response?.data?.message || error.code || '未知錯誤'}`);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  // --- Side Effects ---
  // 元件 mount 時，驗證是否已登入
  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        setLoadingMessage('驗證中...');

        const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('hexToken'))
          ?.split('=')[1];

        if (!token) return;

        axios.defaults.headers.common['Authorization'] = token;

        await checkLogin();

        setLoadingMessage('正在取得產品列表...');

        const response = await getProducts(token);
        setProducts(response.data.products);

        setIsAuth(true);
      } catch (error) {
        setIsAuth(false);
        alert(`出現錯誤：${error.response?.data?.message || error.code || '未知錯誤'}`);
      } finally {
        setIsLoading(false);
        setLoadingMessage('');
      }
    })();
  }, []);

  return (
    <div className="week2-wrapper">
      {/* Loading 畫面 */}
      {isLoading && (
        <div className="container">
          <p className="text-center">{loadingMessage}</p>
        </div>
      )}
      {/* 產品列表、產品詳細 */}
      {!isLoading && isAuth && (
        <div className="container">
          <div className="row mt-5">
            {/* 產品列表 */}
            <div className="col-md-6">
              <h2>產品列表</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>產品名稱</th>
                    <th>原價</th>
                    <th>售價</th>
                    <th>是否啟用</th>
                    <th>查看細節</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => (
                    <tr key={product.id}>
                      <td>{product.title}</td>
                      <td>{`${product.origin_price} 元`}</td>
                      <td>{`${product.price} 元`}</td>
                      <td>{product.is_enabled ? '是' : '否'}</td>
                      <td>
                        <button
                          className="btn btn-primary"
                          onClick={() => {
                            setTempProduct(product);
                          }}
                        >
                          查看細節
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* 產品詳細資訊 */}
            <div className="col-md-6">
              <h2>單一產品細節</h2>
              {tempProduct ? (
                <div className="card mb-3">
                  <img src={tempProduct.imageUrl} className="card-img-top primary-image" alt={tempProduct.title} />
                  <div className="card-body">
                    <h5 className="card-title">
                      {tempProduct.title}
                      <span className="badge bg-primary ms-2">{tempProduct.category}</span>
                    </h5>
                    <p className="card-text">商品描述：{tempProduct.content}</p>
                    <p className="card-text">商品內容：{tempProduct.description}</p>
                    <div className="d-flex">
                      <p className="card-text text-secondary">
                        <del>{tempProduct.origin_price}</del>
                      </p>
                      元 / {tempProduct.price} 元
                    </div>
                    <h5 className="mt-3">更多圖片：</h5>
                    <div className="d-flex flex-wrap">
                      {tempProduct.imagesUrl.map((imageUrl, index) => (
                        <img key={index} src={imageUrl} className="images" alt={`${tempProduct.title}${index + 1}`} />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-secondary">請選擇一個商品查看</p>
              )}
            </div>
          </div>
        </div>
      )}
      {/* 登入頁 */}
      {!isLoading && !isAuth && (
        <div className="container login">
          <div className="row justify-content-center">
            <h1 className="h3 mb-3 font-weight-normal text-center">請先登入</h1>
            <div className="col-8">
              {/* 登入表單 */}
              <form id="form" className="form-signin" onSubmit={handleFormSubmit}>
                <div className="form-floating mb-3">
                  <input
                    type="email"
                    className="form-control"
                    id="username"
                    name="username"
                    placeholder="name@example.com"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    autoFocus
                  />
                  <label htmlFor="username">Email address</label>
                </div>
                <div className="form-floating">
                  <input
                    type="password"
                    className="form-control"
                    id="password"
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                  <label htmlFor="password">Password</label>
                </div>
                <button className="btn btn-lg btn-primary w-100 mt-3" type="submit">
                  登入
                </button>
              </form>
            </div>
          </div>
          <p className="mt-5 mb-3 text-muted">&copy; 2026~∞ - 六角學院</p>
        </div>
      )}
    </div>
  );
}

export default Week2;
