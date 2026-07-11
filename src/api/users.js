import { api } from './client.js';

// ============================================================================
// API de perfil de usuário — mapeada de UsersController.cs
// ============================================================================
// GET /api/users/me                 → 200 UserProfileResponse
// PUT /api/users/me/personal-info   → 200 UserProfileResponse | 400 { message }
// PUT /api/users/me/language        → 200 UserProfileResponse | 400 { message }
// PUT /api/users/me/email           → 200 UserProfileResponse | 400 { message }
// PUT /api/users/me/password        → 204                     | 400 { message }
// ============================================================================

export async function getProfile() {
  const { data } = await api.get('/api/users/me');
  return data;
}

export async function updatePersonalInfo({ username, dateOfBirth, bloodType, biologicalSex }) {
  const { data } = await api.put('/api/users/me/personal-info', {
    username,
    dateOfBirth,
    bloodType,
    biologicalSex,
  });
  return data;
}

export async function updateLanguage(preferredLanguage) {
  const { data } = await api.put('/api/users/me/language', { preferredLanguage });
  return data;
}

export async function updateEmail(newEmail, currentPassword) {
  const { data } = await api.put('/api/users/me/email', { newEmail, currentPassword });
  return data;
}

export async function updatePassword(currentPassword, newPassword) {
  await api.put('/api/users/me/password', { currentPassword, newPassword });
}
