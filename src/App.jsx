import { useState } from 'react';

import Week2 from './pages/week2/Week2.jsx';

function App() {
  const [page, setPage] = useState(0);

  const renderPage = () => {
    switch (page) {
      case 2:
        return <Week2 />;

      default:
        return (
          <div className="container py-5">
            <h1 className="text-center mb-4">2025 六角 React 冬季班 主線任務</h1>
            <div className="d-flex flex-column gap-3 align-items-center">
              <button type="button" className="btn btn-primary" onClick={() => setPage(2)}>
                第二週 - RESTful API 串接
              </button>
            </div>
          </div>
        );
    }
  };

  return <>{renderPage()}</>;
}

export default App;
