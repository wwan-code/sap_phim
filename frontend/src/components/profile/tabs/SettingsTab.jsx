import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { updateUserProfile, uploadUserAvatar, uploadUserCover } from '@/store/slices/authSlice';

const SettingsTab = () => {
  const dispatch = useDispatch();
  const { user, loading } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phoneNumber: '',
    sex: '',
    bio: ''
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
  const [selectedCoverFile, setSelectedCoverFile] = useState(null);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        sex: user.sex || '',
        bio: user.bio || ''
      });
      setAvatarPreview(user.avatarUrl ? `${import.meta.env.VITE_SERVER_URL}${user.avatarUrl}` : null);
      setCoverPreview(user.coverUrl ? `${import.meta.env.VITE_SERVER_URL}${user.coverUrl}` : null);
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmitProfile = async (e) => {
    e.preventDefault();
    try {
      await dispatch(updateUserProfile(formData)).unwrap();
      toast.success('Cập nhật thông tin thành công!');
    } catch (err) {
      toast.error(err.message || 'Cập nhật thông tin thất bại.');
    }
  };

  const handleUploadAvatar = async () => {
    if (!selectedAvatarFile) return;
    try {
      const formData = new FormData();
      formData.append('avatar', selectedAvatarFile);
      await dispatch(uploadUserAvatar(formData)).unwrap();
      toast.success('Cập nhật ảnh đại diện thành công!');
      setSelectedAvatarFile(null);
    } catch (err) {
      toast.error(err.message || 'Tải lên ảnh đại diện thất bại.');
    }
  };

  const handleUploadCover = async () => {
    if (!selectedCoverFile) return;
    try {
      const formData = new FormData();
      formData.append('cover', selectedCoverFile);
      await dispatch(uploadUserCover(formData)).unwrap();
      toast.success('Cập nhật ảnh bìa thành công!');
      setSelectedCoverFile(null);
    } catch (err) {
      toast.error(err.message || 'Tải lên ảnh bìa thất bại.');
    }
  };

  return (
    <div className="settings-tab">
      <form onSubmit={handleSubmitProfile} className="settings-tab__form">
        <h3 className="settings-tab__subtitle">Ảnh đại diện & Ảnh bìa</h3>
        <div className="settings-tab__image-upload">
          <div className="image-upload__group">
            <label>Ảnh đại diện</label>
            <img
              src={avatarPreview || 'https://placehold.co/150?text=Avatar'}
              alt="Avatar Preview"
              className="image-upload__preview image-upload__preview--avatar"
            />
            <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
            <label htmlFor="avatar-upload" className="btn btn-sm">Chọn ảnh</label>
            {selectedAvatarFile && (
              <button type="button" onClick={handleUploadAvatar} className="btn btn-sm btn-primary">
                Lưu
              </button>
            )}
          </div>
          <div className="image-upload__group">
            <label>Ảnh bìa</label>
            <img
              src={coverPreview || 'https://placehold.co/400x150?text=Cover'}
              alt="Cover Preview"
              className="image-upload__preview image-upload__preview--cover"
            />
            <input id="cover-upload" type="file" accept="image/*" onChange={handleCoverChange} style={{ display: 'none' }} />
            <label htmlFor="cover-upload" className="btn btn-sm">Chọn ảnh</label>
            {selectedCoverFile && (
              <button type="button" onClick={handleUploadCover} className="btn btn-sm btn-primary">
                Lưu
              </button>
            )}
          </div>
        </div>

        <h3 className="settings-tab__subtitle">Thông tin cá nhân</h3>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="username">Tên người dùng</label>
            <input type="text" id="username" name="username" value={formData.username} onChange={handleChange} className="form-control" />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" name="email" value={formData.email} className="form-control" disabled />
          </div>
          <div className="form-group">
            <label htmlFor="phoneNumber">Số điện thoại</label>
            <input type="text" id="phoneNumber" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} className="form-control" />
          </div>
          <div className="form-group">
            <label htmlFor="sex">Giới tính</label>
            <select id="sex" name="sex" value={formData.sex} onChange={handleChange} className="form-select">
              <option value="">Chọn giới tính</option>
              <option value="nam">Nam</option>
              <option value="nữ">Nữ</option>
              <option value="khác">Khác</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="bio">Tiểu sử</label>
          <textarea id="bio" name="bio" value={formData.bio} onChange={handleChange} className="form-control" rows="3"></textarea>
        </div>
        <button type="submit" className="btn btn-primary settings-tab__submit-btn" disabled={loading}>
          {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </form>
    </div>
  );
};

export default SettingsTab;
