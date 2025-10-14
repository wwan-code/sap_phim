import React from 'react';
import PropTypes from 'prop-types';
import classNames from '../../utils/classNames';
import '../../assets/scss/components/admin/_stat-card.scss';

const StatCard = ({ title, value, icon: Icon, className }) => {
  return (
    <div className={classNames('stat-card', className)}>
      <div className="stat-card__icon-wrapper">
        {Icon && <Icon className="stat-card__icon" />}
      </div>
      <div className="stat-card__content">
        <h3 className="stat-card__title">{title}</h3>
        <p className="stat-card__value">{value}</p>
      </div>
    </div>
  );
};

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.elementType,
  className: PropTypes.string,
};

StatCard.defaultProps = {
  icon: null,
  className: '',
};

export default StatCard;
