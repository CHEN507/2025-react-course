import { useEffect, useRef, useState } from 'react';

import axios from 'axios';

import { Modal } from 'bootstrap';

import 'assets/scss/week3.scss';

// --- Helpers ---
const getTokenFromCookie = () => {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('hexToken'))
    ?.split('=')[1];
};

const formDataToPayload = formData => {
  const { price, origin_price, imagesUrl, ...rest } = formData;
  return {
    data: { price: Number(price), origin_price: Number(origin_price), imagesUrl: imagesUrl.filter(Boolean), ...rest },
  };
};

const payloadToFormData = formData => {
  const { id: _id, num: _num, ...rest } = formData;
  return { ...INITIAL_PRODUCT_FORM_DATA, ...rest };
};

// --- Constants ---
const INITIAL_PRODUCT_FORM_DATA = {
  title: '',
  category: '',
  origin_price: '',
  price: '',
  unit: '',
  description: '',
  content: '',
  is_enabled: 1,
  imageUrl: '',
  imagesUrl: [],
};

const IMAGE_PLACEHOLDER = 'https://placehold.co/400?text=No+Image,+please+enter+an+URL';

// --- API ---
const API_BASE = import.meta.env.VITE_API_BASE;
const API_PATH = import.meta.env.VITE_API_PATH;

const login = data => axios.post(`${API_BASE}/admin/signin`, data);

const checkLogin = () => axios.post(`${API_BASE}/api/user/check`);

const getProducts = token =>
  axios.get(`${API_BASE}/api/${API_PATH}/admin/products`, { headers: { Authorization: token } });

const getAllProducts = token =>
  axios.get(`${API_BASE}/api/${API_PATH}/admin/products/all`, { headers: { Authorization: token } });

const createProduct = (token, data) =>
  axios.post(`${API_BASE}/api/${API_PATH}/admin/product`, data, { headers: { Authorization: token } });

const updateProduct = (token, id, data) =>
  axios.put(`${API_BASE}/api/${API_PATH}/admin/product/${id}`, data, { headers: { Authorization: token } });

const deleteProduct = (token, id) =>
  axios.delete(`${API_BASE}/api/${API_PATH}/admin/product/${id}`, { headers: { Authorization: token } });

function Week3() {
  // --- State ---
  // Loading 相關
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // 登入相關
  const [isAuth, setIsAuth] = useState(false);
  const [loginData, setLoginData] = useState({
    username: '', // 給定初始值，避免 uncontrolled 變為 controlled 的報錯
    password: '',
  });

  // 產品相關
  const [products, setProducts] = useState([]);

  // 產品表單相關
  const [productDraft, setProductDraft] = useState(INITIAL_PRODUCT_FORM_DATA); // 必須有預設值，避免 uncontrolled 變為 controlled 的報錯
  const [editingId, setEditingId] = useState('');

  // Modal 相關
  const [modalType, setModalType] = useState(''); // 有新增產品(create)/編輯產品(edit)兩種模式

  // --- Ref ---
  const productModalRef = useRef(null); // 儲存 productModal 的 DOM
  const productModalInstRef = useRef(null); // 儲存 bootstrap 實例

  // --- Derived State ---
  const isImagesUrlEmpty = productDraft.imagesUrl.length === 0;
  const isImagesUrlFulled = productDraft.imagesUrl.length >= 5;

  // --- Event Handler ---
  // 登入相關
  const handleLoginInputChange = e => {
    const { name, value } = e.target;
    setLoginData(prev => ({ ...prev, [name]: value }));
  };

  const handleLoginFormSubmit = async e => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setLoadingMessage('驗證中...');

      const {
        data: { token, expired },
      } = await login(loginData);
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

  // 商品相關
  // Modal 相關
  const handleOpenModal = async (modalType, id = '') => {
    if (!modalType) return;
    setModalType(modalType);

    // 將表單重設為初始值
    if (modalType === 'create') setProductDraft(INITIAL_PRODUCT_FORM_DATA);

    if (modalType === 'edit') {
      const initialData = await handleGetProductById(id);
      if (!initialData) return;
      setProductDraft(payloadToFormData(initialData));
    }

    productModalInstRef.current.show();
  };

  const handleCloseModal = () => {
    productModalInstRef.current.hide();
  };

  // 產品表單相關
  // 每當欄位 onChange 時，將資料存進 productDraft
  const handleProductInputChange = e => {
    const { name, value, checked, type } = e.target;
    if (type === 'checkbox') {
      setProductDraft(prev => ({ ...prev, [name]: checked ? 1 : 0 }));
    } else if (name.startsWith('subImageUrl')) {
      const index = name.split('-')[1] - 1;
      const newImagesUrl = [...productDraft.imagesUrl];
      newImagesUrl[index] = value;
      setProductDraft(prev => ({ ...prev, imagesUrl: newImagesUrl }));
    } else {
      setProductDraft(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleProductFormSubmit = e => {
    e.preventDefault();
    if (modalType === 'create') handleCreateProduct();
    if (modalType === 'edit') handleUpdateProduct();
  };

  // 圖片相關
  const handleAddImage = () => {
    if (productDraft.imagesUrl.length >= 5) {
      return;
    }

    const newImagesUrl = [...productDraft.imagesUrl];
    newImagesUrl.push('');
    setProductDraft(prev => ({ ...prev, imagesUrl: newImagesUrl }));
  };

  const handleRemoveImage = () => {
    if (productDraft.imagesUrl.length === 0) return;

    const newImagesUrl = [...productDraft.imagesUrl];
    newImagesUrl.pop();
    setProductDraft(prev => ({ ...prev, imagesUrl: newImagesUrl }));
  };

  // 產品 CRUD 相關
  const handleGetProductById = async id => {
    if (!id) return;
    setEditingId(id);

    const token = getTokenFromCookie();
    if (!token) {
      setIsAuth(false);
      return;
    }

    try {
      setIsLoading(true);
      setLoadingMessage('正在取得產品資料...');
      const response = await getAllProducts(token);
      const initialData = response.data.products[id];
      return initialData;
    } catch (error) {
      alert(error.response?.data?.message || error.code || '未知錯誤');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleDeleteProduct = async id => {
    const token = getTokenFromCookie();
    if (!token) {
      setIsAuth(false);
      return;
    }
    try {
      setIsLoading(true);
      setLoadingMessage('正在刪除產品...');
      await deleteProduct(token, id);

      setLoadingMessage('正在重新取得產品列表...');
      const response = await getProducts(token);
      setProducts(response.data.products);
    } catch (error) {
      alert(`出現錯誤：${error.response?.data?.message || error.code || '未知錯誤'}`);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleCreateProduct = async () => {
    const data = formDataToPayload(productDraft);
    if (!data) return;

    // TODO: 確定 productDraft 是否與初始值一模一樣，若不同即 return，減少無用 API 請求

    const token = getTokenFromCookie();
    if (!token) {
      setIsAuth(false);
      return;
    }

    handleCloseModal();
    try {
      setIsLoading(true);
      setLoadingMessage('正在新增產品...');
      await createProduct(token, data);

      setLoadingMessage('正在重新取得產品列表...');
      const response = await getProducts(token);
      setProducts(response.data.products);
    } catch (error) {
      alert(`出現錯誤：${error.response?.data?.message || error.code || '未知錯誤'}`);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
      setProductDraft(INITIAL_PRODUCT_FORM_DATA);
    }
  };

  const handleUpdateProduct = async () => {
    const id = editingId;
    const data = formDataToPayload(productDraft);
    if (!id || !data) return;

    // TODO: 確定 productDraft 是否與初始值一模一樣，若不同即 return，減少無用 API 請求
    const token = getTokenFromCookie();
    if (!token) {
      setIsAuth(false);
      return;
    }

    handleCloseModal();
    try {
      setIsLoading(true);
      setLoadingMessage('正在更新產品...');
      await updateProduct(token, id, data);

      setLoadingMessage('正在重新取得產品列表...');
      const response = await getProducts(token);
      setProducts(response.data.products);
    } catch (error) {
      alert(`出現錯誤：${error.response?.data?.message || error.code || '未知錯誤'}`);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
      setEditingId('');
      setProductDraft(INITIAL_PRODUCT_FORM_DATA);
    }
  };

  // --- Logic Helper ---
  const bindField = name => ({
    name,
    onChange: handleProductInputChange,
    ...(name === 'is_enabled' ? { checked: productDraft[name] } : { value: productDraft[name] }),
  });

  const getAddImageBtnText = () => {
    if (isImagesUrlEmpty) return '新增副圖';
    else if (isImagesUrlFulled) return '副圖最多僅能新增五張';
    else return '再新增一張附圖';
  };

  // --- Side Effects ---
  // 元件 mount 時，驗證是否已登入
  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        setLoadingMessage('驗證中...');

        const token = getTokenFromCookie();
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

  useEffect(() => {
    productModalInstRef.current = new Modal(productModalRef.current, { keyboard: false });
  }, []);

  return (
    <div className="week3-wrapper">
      {/* Loading 畫面 */}
      {isLoading && (
        <div className="container">
          <p className="text-center">{loadingMessage}</p>
        </div>
      )}
      {/* 產品列表頁 */}
      {!isLoading && isAuth && (
        <>
          <div className="container">
            <div className="text-end mt-4">
              <button className="btn btn-primary" onClick={() => handleOpenModal('create')}>
                建立新的產品
              </button>
            </div>
            {/* 產品列表 */}
            <table className="table mt-4">
              {/* 表頭 */}
              <thead>
                <tr>
                  <th width="120">分類</th>
                  <th>產品名稱</th>
                  <th width="120">原價</th>
                  <th width="120">售價</th>
                  <th width="100">是否啟用</th>
                  <th width="120">編輯</th>
                </tr>
              </thead>
              {/* 內容 */}
              <tbody>
                {products.map(product => (
                  <tr key={product.id}>
                    <td>{product.category}</td>
                    <td>{product.title}</td>
                    <td>{`${product.origin_price} 元`}</td>
                    <td>{`${product.price} 元`}</td>
                    <td className={`${product.is_enabled && 'text-success'}`}>{product.is_enabled ? '是' : '否'}</td>
                    <td>
                      <div className="btn-group">
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => handleOpenModal('edit', product.id)}
                        >
                          編輯
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => {
                            handleDeleteProduct(product.id);
                          }}
                        >
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {/* 產品新增/編輯 Modal */}
      <div
        id="productModal"
        className="modal fade"
        tabIndex="-1"
        aria-labelledby="productModalLabel"
        aria-hidden="true"
        ref={productModalRef}
      >
        <div className="modal-dialog modal-xl">
          <div className="modal-content border-0">
            <form onSubmit={handleProductFormSubmit}>
              {/* Modal 標題 */}
              <div className="modal-header bg-dark text-white">
                <h5 id="productModalLabel" className="modal-title">
                  <span>{modalType === 'create' ? '新增產品' : '更新產品'}</span>
                </h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              {/* 產品新增/編輯表單 */}
              <div className="modal-body">
                <div className="row">
                  {/* 圖片設定 */}
                  <div className="col-sm-4">
                    {/* 主圖 */}
                    <div className="pb-3 mb-3 border-bottom">
                      <div className="mb-2">
                        <div className="mb-2">
                          <label htmlFor="imageUrl" className="form-label">
                            主圖
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="請輸入圖片連結"
                            {...bindField('imageUrl')}
                          />
                        </div>
                        <img
                          className="img-fluid"
                          src={productDraft.imageUrl || IMAGE_PLACEHOLDER}
                          alt={productDraft.title}
                        />
                      </div>
                      <div>
                        <button type="button" className="btn btn-secondary btn-sm d-block w-100" disabled>
                          主圖無法刪除
                        </button>
                      </div>
                    </div>
                    {/* 副圖 */}
                    {productDraft.imagesUrl.map((subImageUrl, index) => (
                      <div key={index} className="pb-3 mb-3 border-bottom">
                        <div className="mb-2">
                          <div className="mb-2">
                            <label htmlFor={`${subImageUrl}-${index + 1}`} className="form-label">
                              副圖{index + 1}
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="請輸入圖片連結"
                              {...bindField(`${subImageUrl}-${index + 1}`)}
                            />
                          </div>
                          <img
                            className="img-fluid"
                            src={productDraft.imageUrl[index] || IMAGE_PLACEHOLDER}
                            alt={`${productDraft.title}-${index + 1}`}
                          />
                        </div>
                        <div>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm d-block w-100"
                            onClick={handleRemoveImage}
                          >
                            刪除圖片
                          </button>
                        </div>
                      </div>
                    ))}
                    {/* 新增圖片按鈕 */}
                    <div>
                      <button
                        type="button"
                        className={`btn btn-sm d-block w-100${isImagesUrlFulled ? ' btn-secondary' : ' btn-outline-primary'}`}
                        onClick={handleAddImage}
                        disabled={isImagesUrlFulled}
                      >
                        {getAddImageBtnText()}
                      </button>
                    </div>
                  </div>
                  {/* 基本設定 */}
                  <div className="col-sm-8">
                    {/* 標題 */}
                    <div className="mb-3">
                      <label htmlFor="title" className="form-label">
                        標題
                      </label>
                      <input
                        id="title"
                        type="text"
                        className="form-control"
                        placeholder="請輸入標題"
                        {...bindField('title')}
                      />
                    </div>
                    {/* 分類、單位 */}
                    <div className="row">
                      <div className="mb-3 col-md-6">
                        <label htmlFor="category" className="form-label">
                          分類
                        </label>
                        <input
                          id="category"
                          type="text"
                          className="form-control"
                          placeholder="請輸入分類"
                          {...bindField('category')}
                        />
                      </div>
                      <div className="mb-3 col-md-6">
                        <label htmlFor="unit" className="form-label">
                          單位
                        </label>
                        <input
                          id="unit"
                          type="text"
                          className="form-control"
                          placeholder="請輸入單位"
                          {...bindField('unit')}
                        />
                      </div>
                    </div>
                    {/* 原價、售價 */}
                    <div className="row">
                      <div className="mb-3 col-md-6">
                        <label htmlFor="origin_price" className="form-label">
                          原價
                        </label>
                        <input
                          id="origin_price"
                          type="number"
                          min="0"
                          className="form-control"
                          placeholder="請輸入原價"
                          {...bindField('origin_price')}
                        />
                      </div>
                      <div className="mb-3 col-md-6">
                        <label htmlFor="price" className="form-label">
                          售價
                        </label>
                        <input
                          id="price"
                          type="number"
                          min="0"
                          className="form-control"
                          placeholder="請輸入售價"
                          {...bindField('price')}
                        />
                      </div>
                    </div>
                    <hr />
                    {/* 描述 */}
                    <div className="mb-3">
                      <label htmlFor="description" className="form-label">
                        產品描述
                      </label>
                      <textarea
                        id="description"
                        className="form-control"
                        placeholder="請輸入產品描述"
                        {...bindField('description')}
                      ></textarea>
                    </div>
                    {/* 內容 */}
                    <div className="mb-3">
                      <label htmlFor="content" className="form-label">
                        說明內容
                      </label>
                      <textarea
                        id="content"
                        className="form-control"
                        placeholder="請輸入說明內容"
                        {...bindField('content')}
                      ></textarea>
                    </div>
                    {/* 是否啟用 */}
                    <div className="mb-3">
                      <div className="form-check">
                        <input
                          id="is_enabled"
                          className="form-check-input"
                          type="checkbox"
                          {...bindField('is_enabled')}
                        />
                        <label className="form-check-label" htmlFor="is_enabled">
                          是否啟用
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Modal 操作 */}
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={handleCloseModal}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  確認
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* 登入頁 */}
      {!isLoading && !isAuth && (
        <div className="container login">
          <div className="row justify-content-center">
            <h1 className="h3 mb-3 font-weight-normal text-center">請先登入</h1>
            <div className="col-8">
              {/* 登入表單 */}
              <form id="form" className="form-signin" onSubmit={handleLoginFormSubmit}>
                <div className="form-floating mb-3">
                  <input
                    type="email"
                    className="form-control"
                    id="username"
                    name="username"
                    placeholder="name@example.com"
                    value={loginData.username}
                    onChange={handleLoginInputChange}
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
                    value={loginData.password}
                    onChange={handleLoginInputChange}
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

export default Week3;
