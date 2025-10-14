import React from 'react';
import classNames from '@/utils/classNames';
import '@/assets/scss/components/common/_pagination.scss';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const pages = [...Array(totalPages).keys()].map(i => i + 1);

  return (
    <nav className="pagination" aria-label="Page navigation">
      <ul className="pagination__list">
        <li className={classNames('pagination__item', { 'pagination__item--disabled': currentPage === 1 })}>
          <button
            className="pagination__link"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous"
          >
            &laquo;
          </button>
        </li>
        {pages.map(page => (
          <li
            key={page}
            className={classNames('pagination__item', { 'pagination__item--active': currentPage === page })}
          >
            <button
              className="pagination__link"
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          </li>
        ))}
        <li className={classNames('pagination__item', { 'pagination__item--disabled': currentPage === totalPages })}>
          <button
            className="pagination__link"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next"
          >
            &raquo;
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Pagination;
