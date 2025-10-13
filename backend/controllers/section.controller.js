import asyncHandler from 'express-async-handler';
import * as sectionService from '../services/section.service.js';

/**
 * @desc    Lấy danh sách section
 * @route   GET /api/sections
 * @route   GET /api/movies/:movieId/sections
 * @access  Public
 */
const getSectionOfMovie = asyncHandler(async (req, res) => {
  const { movieId } = req.params;
  const result = await sectionService.getSectionByMovieId(movieId, req.query);
  res.status(200).json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
});

/**
 * @desc    Lấy danh sách tất cả sections với phân trang và lọc
 * @route   GET /api/sections
 * @access  Public
 */
const getSections = asyncHandler(async (req, res) => {
  const result = await sectionService.getSections(req.query);
  res.status(200).json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
});

/**
 * @desc    Lấy chi tiết một section
 * @route   GET /api/sections/:id
 * @access  Public
 */
const getSectionById = asyncHandler(async (req, res) => {
  const section = await sectionService.getSectionById(req.params.id);
  if (section) {
    res.status(200).json({
      success: true,
      data: section,
    });
  } else {
    res.status(404);
    throw new Error('Section không được tìm thấy.');
  }
});

/**
 * @desc    Tạo một section mới
 * @route   POST /api/sections
 * @access  Private/Admin
 */
const createSection = asyncHandler(async (req, res) => {
  const createdSection = await sectionService.createSection(req.body);
  res.status(201).json({
    success: true,
    data: createdSection,
    message: 'Tạo section mới thành công.',
  });
});

/**
 * @desc    Cập nhật một section
 * @route   PUT /api/sections/:id
 * @access  Private/Admin
 */
const updateSection = asyncHandler(async (req, res) => {
  const updatedSection = await sectionService.updateSection(req.params.id, req.body);
  res.status(200).json({
    success: true,
    data: updatedSection,
    message: 'Cập nhật section thành công.',
  });
});

/**
 * @desc    Xóa một section
 * @route   DELETE /api/sections/:id
 * @access  Private/Admin
 */
const deleteSection = asyncHandler(async (req, res) => {
  await sectionService.deleteSection(req.params.id);
  res.status(200).json({
    success: true,
    message: 'Xóa section thành công.',
  });
});

export {
  getSectionOfMovie,
  getSections,
  getSectionById,
  createSection,
  updateSection,
  deleteSection,
};
