function Pagination({ pagination: { current_page, has_next, has_pre, total_pages }, onChangePage }) {
  return (
    <nav aria-label="Page navigation">
      <ul className="pagination justify-content-center">
        {total_pages > 0 && (
          <li className={`page-item ${!has_pre && 'disabled'}`}>
            <a className="page-link" href="#" aria-label="Previous" onClick={e => onChangePage(e, current_page - 1)}>
              <span aria-hidden="true">&laquo;</span>
            </a>
          </li>
        )}
        {Array.from({ length: total_pages }).map((_, index) => (
          <li key={index} className="page-item">
            <a
              className={`${current_page === index + 1 && 'active'} page-link`}
              href="#"
              onClick={e => onChangePage(e, index + 1)}
            >
              {index + 1}
            </a>
          </li>
        ))}
        {total_pages > 0 && (
          <li className={`page-item ${!has_next && 'disabled'}`}>
            <a className="page-link" href="#" aria-label="Next" onClick={e => onChangePage(e, current_page + 1)}>
              <span aria-hidden="true">&raquo;</span>
            </a>
          </li>
        )}
      </ul>
    </nav>
  );
}

export default Pagination;
