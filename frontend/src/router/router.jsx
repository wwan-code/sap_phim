import React from 'react';
import { createBrowserRouter, createRoutesFromElements, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

import PrivateRoute from '@/components/common/PrivateRoute';

// Layouts
import AppLayout from '@/app/AppLayout';
import AdminLayout from '@/app/AdminLayout';

// Pages
import HomePage from '@/pages/HomePage';
import ProfilePage from '@/pages/ProfilePage';
import Dashboard from '@/pages/admin/Dashboard';
import Genres from '@/pages/admin/Genres';
import Countries from '@/pages/admin/Countries';
import Categories from '@/pages/admin/Categories';
import MovieList from '@/pages/admin/Movies/MovieList';
import MovieForm from '@/pages/admin/Movies/MovieForm';
import MovieDetail from '@/pages/admin/Movies/MovieDetail';
import Episodes from '@/pages/admin/Episodes';
import Series from '@/pages/admin/Series';
import Sections from '@/pages/admin/Sections';
import ReportedComments from '@/pages/admin/ReportedComments';
import CommentAnalytics from '@/pages/admin/CommentAnalytics';
import NotFoundPage from '@/pages/errors/NotFoundPage';
import UnauthorizedPage from '@/pages/errors/UnauthorizedPage';
import MovieDetailPage from '@/pages/MovieDetailPage';
import MovieWatchPage from '@/pages/MovieWatchPage';
import LatestMoviesPage from '@/pages/LatestMoviesPage';
import TheaterMoviesPage from '@/pages/TheaterMoviesPage';
import SettingPage from '@/pages/SettingPage';
// import ReelsPage from '@/pages/ReelsPage';

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* Public Routes */}
      <Route path="/" element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        <Route path="profile/:uuid" element={<ProfilePage />} />
        <Route path="settings" element={<PrivateRoute><SettingPage /></PrivateRoute>} />
        <Route path="movie/:slug" element={<MovieDetailPage />} />
        <Route path="watch/:slug/episode/:episodeNumber" element={<MovieWatchPage />} />
        <Route path="phim-moi-cap-nhat" element={<LatestMoviesPage />} />
        <Route path="phim-chieu-rap" element={<TheaterMoviesPage />} />
        {/* <Route path="reels" element={<ReelsPage />} /> */}
      </Route>
      {/* Error Pages */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/*" element={<NotFoundPage />} />

      {/* Admin Routes */}
      <Route path="/admin" element={<PrivateRoute allowedRoles={['admin', 'editor']}><AdminLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users" element={<div>Admin Users Page</div>} />
        <Route path="genres" element={<Genres />} />
        <Route path="countries" element={<Countries />} />
        <Route path="categories" element={<Categories />} />
        <Route path="movies" element={<MovieList />} />
        <Route path="movies/new" element={<MovieForm />} />
        <Route path="movies/:id" element={<MovieDetail />} />
        <Route path="movies/:id/edit" element={<MovieForm />} />
        <Route path="episodes" element={<Episodes />} />
        <Route path="series" element={<Series />} />
        <Route path="sections" element={<Sections />} />
        <Route path="comments/reported" element={<ReportedComments />} />
        <Route path="comments/analytics" element={<CommentAnalytics />} />
        <Route path="settings" element={<div>Admin Settings Page</div>} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
    </>
  )
);

export default router;
