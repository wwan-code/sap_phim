import asyncHandler from 'express-async-handler';
import * as seriesService from '../services/series.service.js';

const getAllSeries = asyncHandler(async (req, res) => {
  const series = await seriesService.getAllSeries();
  res.status(200).json({
    success: true,
    data: series,
  });
});

/**
 * @desc    Lấy danh sách series
 * @route   GET /api/series
 * @access  Public
 */
const getSeries = asyncHandler(async (req, res) => {
  const result = await seriesService.getSeries(req.query);
  res.status(200).json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
});

/**
 * @desc    Lấy chi tiết một series
 * @route   GET /api/series/:id
 * @access  Public
 */
const getSeriesById = asyncHandler(async (req, res) => {
  const series = await seriesService.getSeriesById(req.params.id);
  if (series) {
    res.status(200).json({
      success: true,
      data: series,
    });
  } else {
    res.status(404);
    throw new Error('Series không được tìm thấy.');
  }
});

/**
 * @desc    Tạo một series mới
 * @route   POST /api/series
 * @access  Private/Admin
 */
const createSeries = asyncHandler(async (req, res) => {
  const createdSeries = await seriesService.createSeries(req.body);
  res.status(201).json({
    success: true,
    data: createdSeries,
    message: 'Tạo series mới thành công.',
  });
});

/**
 * @desc    Cập nhật một series
 * @route   PUT /api/series/:id
 * @access  Private/Admin
 */
const updateSeries = asyncHandler(async (req, res) => {
  const updatedSeries = await seriesService.updateSeries(req.params.id, req.body);
  res.status(200).json({
    success: true,
    data: updatedSeries,
    message: 'Cập nhật series thành công.',
  });
});

/**
 * @desc    Xóa một series
 * @route   DELETE /api/series/:id
 * @access  Private/Admin
 */
const deleteSeries = asyncHandler(async (req, res) => {
  await seriesService.deleteSeries(req.params.id);
  res.status(200).json({
    success: true,
    message: 'Xóa series thành công.',
  });
});

export {
  getAllSeries,
  getSeries,
  getSeriesById,
  createSeries,
  updateSeries,
  deleteSeries,
};
