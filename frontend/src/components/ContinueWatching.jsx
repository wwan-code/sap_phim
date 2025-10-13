import React, { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { toast } from 'react-toastify';

import watchHistoryService from '@/services/watchHistoryService';
import ContinueWatchingCard from './ContinueWatchingCard';
import MovieCardSkeleton from './skeletons/MovieCardSkeleton';

import 'swiper/css';
import 'swiper/css/navigation';
import classNames from '../utils/classNames';

const ContinueWatching = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useSelector((state) => state.auth);

  const navigationPrevRef = useRef(null);
  const navigationNextRef = useRef(null);
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await watchHistoryService.getHistory({ page: 1, limit: 12 });
        if (response.success) {
          setHistory(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch watch history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [currentUser]);

  const handleDelete = async (id) => {
    try {
      const response = await watchHistoryService.deleteOne(id);
      if (response.success) {
        setHistory(prev => prev.filter(item => item.id !== id));
        toast.success('Đã xóa khỏi lịch sử xem.');
      } else {
        toast.error(response.message || 'Xóa thất bại.');
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Xóa thất bại.');
    }
  };

  if (!currentUser || (!loading && history.length === 0)) {
    return null;
  }

  return (
    <section className="card-section">
      <div className="section-title">
        <h3 className="section-title__text">Tiếp tục xem phim</h3>
      </div>
      <div className="continue-watch section-slider">
        <Swiper
          modules={[Navigation]}
          spaceBetween={24}
          slidesPerView={2}
          navigation={{
            prevEl: navigationPrevRef.current,
            nextEl: navigationNextRef.current,
          }}
          onBeforeInit={(swiper) => {
            swiper.params.navigation.prevEl = navigationPrevRef.current;
            swiper.params.navigation.nextEl = navigationNextRef.current;
          }}
          onSlideChange={(swiper) => {
            setIsBeginning(swiper.isBeginning);
            setIsEnd(swiper.isEnd);
          }}
          onUpdate={(swiper) => {
            setIsBeginning(swiper.isBeginning);
            setIsEnd(swiper.isEnd);
          }}
          breakpoints={{
            320: {
              slidesPerView: 2,
              spaceBetween: 16,
            },
            768: {
              slidesPerView: 4,
              spaceBetween: 20,
            },
            1200: {
              slidesPerView: 6,
              spaceBetween: 24,
            }
          }}
        >
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
              <SwiperSlide key={index}>
                <MovieCardSkeleton />
              </SwiperSlide>
            ))
            : history.map(item => (
              <SwiperSlide key={item.id}>
                <ContinueWatchingCard item={item} onDelete={handleDelete} />
              </SwiperSlide>
            ))}
        </Swiper>

        <button
          className={classNames('swiper-button-custom swiper-button-prev-custom', { 'swiper-button-disabled': isBeginning })}
          ref={navigationPrevRef}
        >
          <FaChevronLeft />
        </button>
        <button
          className={classNames('swiper-button-custom swiper-button-next-custom', { 'swiper-button-disabled': isEnd })}
          ref={navigationNextRef}
        >
          <FaChevronRight />
        </button>
      </div>
    </section>
  );
};

export default ContinueWatching;
