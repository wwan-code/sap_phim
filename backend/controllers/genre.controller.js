import genreService from '../services/genre.service.js';

const createGenre = async (req, res, next) => {
  try {
    const genre = await genreService.createGenre(req.body);
    res.status(201).json(genre);
  } catch (error) {
    next(error);
  }
};

const getAllGenres = async (req, res, next) => {
  try {
    const genres = await genreService.getAllGenres();
    res.status(200).json({
      success: true,
      data: genres,
      message: 'Lấy tất cả thể loại thành công.',
    });
  } catch (error) {
    next(error);
  }
};

const getGenres = async (req, res, next) => {
  try {
    const genres = await genreService.getGenres(req.query);
    res.status(200).json({
      success: true,
      data: genres.data,
      meta: genres.meta,
      message: 'Lấy thể loại thành công.',
    });
  } catch (error) {
    next(error);
  }
};

const getGenreById = async (req, res, next) => {
  try {
    const genre = await genreService.getGenreById(req.params.id);
    if (!genre) {
      return res.status(404).json({ message: 'Genre not found' });
    }
    res.status(200).json(genre);
  } catch (error) {
    next(error);
  }
};

const updateGenre = async (req, res, next) => {
  try {
    const genre = await genreService.updateGenre(req.params.id, req.body);
    res.status(200).json(genre);
  } catch (error) {
    next(error);
  }
};

const deleteGenre = async (req, res, next) => {
  try {
    const result = await genreService.deleteGenre(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export default {
  createGenre,
  getGenres,
  getAllGenres,
  getGenreById,
  updateGenre,
  deleteGenre,
};
